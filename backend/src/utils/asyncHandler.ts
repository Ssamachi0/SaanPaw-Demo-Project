import type { NextFunction, Request, Response } from 'express';

/** Wrap async route handlers so rejected promises reach the error middleware. */
export const asyncHandler =
  <T extends Request>(fn: (req: T, res: Response, next: NextFunction) => Promise<unknown>) =>
  (req: T, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
