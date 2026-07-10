import { spawn, type ChildProcess } from 'child_process';
import { mkdirSync } from 'fs';
import { logger } from './logger.js';

let torProcess: ChildProcess | null = null;
let _ready = false;
let _readyPromise: Promise<void> | null = null;

export function isTorReady(): boolean {
  return _ready;
}

export function startTor(): Promise<void> {
  if (_readyPromise) return _readyPromise;

  _readyPromise = new Promise<void>((resolve, reject) => {
    const dataDir = '/tmp/tor-data';
    mkdirSync(dataDir, { recursive: true });

    logger.info('Starting Tor daemon…');

    torProcess = spawn(
      'tor',
      [
        '--RunAsDaemon', '0',
        '--SocksPort', '9050',
        '--DataDirectory', dataDir,
        '--Log', 'notice stderr',
      ],
      { stdio: ['ignore', 'ignore', 'pipe'] },
    );

    const timer = setTimeout(() => {
      if (!_ready) {
        logger.error('Tor bootstrap timed out after 120 s');
        reject(new Error('Tor bootstrap timed out'));
      }
    }, 120_000);

    torProcess.stderr?.on('data', (chunk: Buffer) => {
      const line = chunk.toString().trim();
      logger.info({ tor: line }, 'tor');
      if (!_ready && line.includes('Bootstrapped 100%')) {
        _ready = true;
        clearTimeout(timer);
        logger.info('Tor ready');
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

  return _readyPromise;
}

export function stopTor(): void {
  torProcess?.kill('SIGTERM');
}
