import type { Request, Response } from 'express';
import { developerService } from './developer.service';

export const developerController = {
  dashboard: async (_req: Request, res: Response) =>
    res.json(await developerService.getDashboard()),

  overview: async (_req: Request, res: Response) => res.json(await developerService.overview()),

  banUser: async (req: Request, res: Response) => res.json(await developerService.banUser(req.params.id)),

  listPendingShelters: async (_req: Request, res: Response) =>
    res.json(await developerService.listPendingShelters()),

  reviewShelter: async (req: Request, res: Response) =>
    res.json(
      await developerService.reviewShelter({
        shelterId: req.params.id,
        developerId: req.auth!.id,
        ...req.body,
      }),
    ),

  systemConfig: async (_req: Request, res: Response) =>
    res.json(await developerService.systemConfig()),

  listFlags: async (req: Request, res: Response) =>
    res.json(await developerService.listFlags(req.query.status as never)),

  resolveFlag: async (req: Request, res: Response) =>
    res.json(
      await developerService.resolveFlag({
        flagId: req.params.id,
        developerId: req.auth!.id,
        ...req.body,
      }),
    ),
};
