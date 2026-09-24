import type { Request, Response } from "express";
import { subscribersService, type SubscriberFilters } from "./subscribers.service.js";

export class SubscribersController {
  async getSubscribers(req: Request, res: Response) {
    const {
      search,
      status,
      plan,
      joinedFrom,
      joinedTo,
      subscribedFrom,
      subscribedTo,
      page,
      limit,
      sortBy,
      sortOrder,
    } = req.query;

    const filters: SubscriberFilters = {
      search: typeof search === "string" ? search : undefined,
      status: typeof status === "string" ? status : undefined,
      plan: typeof plan === "string" ? plan : undefined,
      joinedFrom: typeof joinedFrom === "string" ? joinedFrom : undefined,
      joinedTo: typeof joinedTo === "string" ? joinedTo : undefined,
      subscribedFrom: typeof subscribedFrom === "string" ? subscribedFrom : undefined,
      subscribedTo: typeof subscribedTo === "string" ? subscribedTo : undefined,
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 10,
      sortBy: (sortBy as any) || "startedAt",
      sortOrder: (sortOrder as any) || "desc",
    };

    const result = await subscribersService.getSubscribers(filters);
    res.json({
      success: true,
      data: result.subscribers,
      pagination: result.pagination,
      stats: result.stats,
    });
  }

  async getSubscriberById(req: Request, res: Response) {
    const id = req.params.id as string;
    const subscriber = await subscribersService.getSubscriberById(id);

    if (!subscriber) {
      return res.status(404).json({
        success: false,
        message: "Subscriber not found",
      });
    }

    res.json({
      success: true,
      data: subscriber,
    });
  }
}

export const subscribersController = new SubscribersController();
