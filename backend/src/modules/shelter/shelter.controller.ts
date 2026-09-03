import type { Request, Response } from 'express';
import { shelterService } from './shelter.service';

const sid = (req: Request) => req.auth!.shelterId ?? req.auth!.id;

export const shelterController = {
  register: async (req: Request, res: Response) =>
    res.status(201).json(await shelterService.register(req.body)),

  dashboard: async (req: Request, res: Response) =>
    res.json(await shelterService.getDashboard(sid(req))),

  listShelterAnimals: async (req: Request, res: Response) =>
    res.json(await shelterService.listShelterAnimals(sid(req))),
  addShelterAnimal: async (req: Request, res: Response) =>
    res.status(201).json(await shelterService.addShelterAnimal(sid(req), req.body)),

  postRecovered: async (req: Request, res: Response) =>
    res.status(201).json(await shelterService.postRecovered(sid(req), req.body)),

  listAreaReports: async (req: Request, res: Response) =>
    res.json(await shelterService.listAreaReports(sid(req))),

  updateCaseStatus: async (req: Request, res: Response) =>
    res.json(
      await shelterService.updateCaseStatus({
        shelterId: sid(req),
        caseId: req.params.id,
        status: req.body.status,
        notes: req.body.notes,
      }),
    ),

  updateProfile: async (req: Request, res: Response) =>
    res.json(await shelterService.updateProfile(sid(req), req.body)),

  listNotifications: async (req: Request, res: Response) =>
    res.json(await shelterService.listNotifications(sid(req))),
  markNotificationRead: async (req: Request, res: Response) =>
    res.json(await shelterService.markNotificationRead(sid(req), req.params.id)),
};
