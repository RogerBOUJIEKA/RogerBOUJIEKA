import type { NextFunction, Request, Response } from 'express';

/** Routes ouvertes pendant la phase 0 : liste d'attente, lecture publique, connexion et outils de l'équipe. */
const OPEN_IN_WAITLIST: Array<[method: string, pattern: RegExp]> = [
  ['GET', /^\/health$/],
  ['*', /^\/waitlist(\/stats)?$/],
  ['GET', /^\/geo\//],
  ['GET', /^\/packs$/],
  ['GET', /^\/feed$/],
  ['GET', /^\/listings(\/[^/]+)?$/],
  ['POST', /^\/auth\/(otp\/request|otp\/verify|mfa)$/],
  ['GET', /^\/me$/],
  ['*', /^\/admin\//],
];

/** En phase 0, tout le reste de l'API répond « pas encore ouvert ». */
export function waitlistPhaseGate(req: Request, res: Response, next: NextFunction): void {
  const path = req.path.replace(/\/+$/, '') || '/';
  const open =
    req.method === 'OPTIONS' ||
    OPEN_IN_WAITLIST.some(([method, pattern]) => (method === '*' || method === req.method) && pattern.test(path));
  if (open) return next();
  res.status(403).json({ code: 'not_launched', message: 'Klé ouvre bientôt. Inscris-toi sur la liste d’attente.' });
}
