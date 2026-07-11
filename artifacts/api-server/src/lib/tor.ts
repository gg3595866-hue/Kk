import { spawn, type ChildProcess } from 'child_process';
import { mkdirSync, existsSync, writeFileSync } from 'fs';
import https from 'node:https';
import { logger } from './logger.js';

let torProcess: ChildProcess | null = null;
let _ready = false;
let _readyPromise: Promise<void> | null = null;

export function isTorReady(): boolean {
  return _ready;
}

/** Download Tor's official geoip database from the Tor Project GitLab. */
async function downloadGeoip(destPath: string): Promise<void> {
  if (existsSync(destPath)) {
    logger.info({ destPath }, 'geoip file already cached');
    return;
  }

  const url =
    'https://gitlab.torproject.org/tpo/core/tor/-/raw/main/src/config/geoip';

  logger.info({ url, destPath }, 'Downloading Tor geoip database…');

  return new Promise((resolve, reject) => {
    const req = https.get(url, (res) => {
      if (res.statusCode !== 200) {
        reject(new Error(`geoip download failed: HTTP ${res.statusCode}`));
        return;
      }
      const chunks: Buffer[] = [];
      res.on('data', (c: Buffer) => chunks.push(c));
      res.on('end', () => {
        try {
          writeFileSync(destPath, Buffer.concat(chunks));
          logger.info({ destPath, bytes: Buffer.concat(chunks).length }, 'geoip saved');
          resolve();
        } catch (err) {
          reject(err);
        }
      });
    });
    req.on('error', reject);
    req.setTimeout(30_000, () => {
      req.destroy(new Error('geoip download timed out'));
    });
  });
}

export function startTor(): Promise<void> {
  if (_readyPromise) return _readyPromise;

  _readyPromise = (async () => {
    const dataDir = '/tmp/tor-data';
    mkdirSync(dataDir, { recursive: true });

    // Fetch the geoip database so country-code ExitNodes work
    const geoipPath = `${dataDir}/geoip`;
    try {
      await downloadGeoip(geoipPath);
    } catch (err) {
      logger.warn({ err }, 'Could not download geoip — country filters may not apply');
    }

    logger.info('Starting Tor daemon (African exit nodes)…');

    await new Promise<void>((resolve, reject) => {
      // African countries: ZA, NG, KE, EG, MA, GH, TZ, SN, CM, MZ, UG, ZM
      // StrictNodes 1 forces exits from these countries only.
      const args = [
        '--RunAsDaemon', '0',
        '--SocksPort', '9050',
        '--DataDirectory', dataDir,
        '--Log', 'notice stderr',
        '--ExitNodes', '{ZA},{NG},{KE},{EG},{MA},{GH},{TZ},{SN},{CM},{MZ},{UG},{ZM}',
        '--StrictNodes', '1',
      ];

      if (existsSync(geoipPath)) {
        args.push('--GeoIPFile', geoipPath);
      }

      torProcess = spawn('tor', args, { stdio: ['ignore', 'ignore', 'pipe'] });

      // Generous timeout — finding African exits can take longer than the
      // default 120 s since there are fewer of them in the network.
      const timer = setTimeout(() => {
        if (!_ready) {
          logger.error('Tor bootstrap timed out after 180 s');
          reject(new Error('Tor bootstrap timed out'));
        }
      }, 180_000);

      torProcess.stderr?.on('data', (chunk: Buffer) => {
        const line = chunk.toString().trim();
        logger.info({ tor: line }, 'tor');
        if (!_ready && line.includes('Bootstrapped 100%')) {
          _ready = true;
          clearTimeout(timer);
          logger.info('Tor ready — routing via African exit node');
          resolve();
        }
      });

      torProcess.on('error', (err) => {
        logger.error({ err }, 'Tor process error');
        if (!_ready) reject(err);
      });

      torProcess.on('exit', (code) => {
        _ready = false;
        _readyPromise = null;
        torProcess = null;
        logger.warn({ code }, 'Tor process exited');
        if (!_ready) reject(new Error(`Tor exited early (code ${code})`));
      });
    });
  })();

  // Reset the promise on failure so callers can retry
  _readyPromise.catch(() => {
    _readyPromise = null;
  });

  return _readyPromise;
}

export function stopTor(): void {
  torProcess?.kill('SIGTERM');
}
