import { Router, type Request, type Response } from 'express';
import { logger } from '../lib/logger.js';

const router = Router();

router.post('/ext-ping', (req: Request, res: Response) => {
  const { v, ts } = req.body ?? {};
  const ip = req.headers['x-forwarded-for'] ?? req.socket.remoteAddress ?? 'unknown';
  const age = ts ? Date.now() - Number(ts) : null;

  logger.info(
    { extVersion: v, clientIp: ip, latencyMs: age },
    '🔌 [1xBet Extension] connected — heartbeat received'
  );

  res.json({ ok: true, serverTime: Date.now(), message: 'Extension connected ✓' });
});

export default router;
