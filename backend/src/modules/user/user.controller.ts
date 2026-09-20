import type { Request, Response } from 'express';
import { userService } from './user.service';

const uid = (req: Request) => req.auth!.id;

export const userController = {
  register: async (req: Request, res: Response) =>
    res.status(201).json(await userService.register(req.body)),

  me: async (req: Request, res: Response) => res.json(await userService.getMe(uid(req))),
  updateProfile: async (req: Request, res: Response) =>
    res.json(await userService.updateProfile(uid(req), req.body)),
  myReports: async (req: Request, res: Response) =>
    res.json(await userService.listMyReports(uid(req))),

  dashboard: async (_req: Request, res: Response) =>
    res.json(await userService.getDashboard()),

  createLostReport: async (req: Request, res: Response) =>
    res.status(201).json(await userService.createLostReport(uid(req), req.body)),
  updateLostReportStatus: async (req: Request, res: Response) =>
    res.json(await userService.updateLostReportStatus(uid(req), req.params.id, req.body.status)),

  updateFoundReportStatus: async (req: Request, res: Response) =>
    res.json(await userService.updateFoundReportStatus(uid(req), req.params.id, req.body.status)),
  deleteReport: async (req: Request, res: Response) => {
    const kind = req.params.kind === 'found' ? 'found' : 'lost';
    res.json(await userService.deleteReport(uid(req), kind, req.params.id));
  },

  createFoundReport: async (req: Request, res: Response) =>
    res.status(201).json(await userService.createFoundReport(uid(req), req.body)),

  listShelters: async (_req: Request, res: Response) =>
    res.json(await userService.listShelters()),
  listShelterAnimals: async (req: Request, res: Response) =>
    res.json(await userService.listShelterAnimals(req.params.id)),

  matchSuggestions: async (req: Request, res: Response) =>
    res.json(await userService.matchSuggestions(req.params.id)),

  mapReports: async (req: Request, res: Response) => {
    const { lng, lat, radiusMeters } = req.query;
    const bbox =
      lng && lat && radiusMeters
        ? { lng: Number(lng), lat: Number(lat), radiusMeters: Number(radiusMeters) }
        : undefined;
    res.json(await userService.mapReports(bbox));
  },

  searchReports: async (req: Request, res: Response) =>
    res.json(await userService.searchReports(req.query as never)),

  listNotifications: async (req: Request, res: Response) =>
    res.json(await userService.listNotifications(uid(req))),
  markNotificationRead: async (req: Request, res: Response) =>
    res.json(await userService.markNotificationRead(uid(req), req.params.id)),
  updatePushToken: async (req: Request, res: Response) =>
    res.json(await userService.updatePushToken(uid(req), req.body.token)),
};
