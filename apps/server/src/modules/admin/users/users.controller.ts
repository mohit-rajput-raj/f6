import type { Request, Response } from "express";
import { userService, type UserFilters } from "./users.service.js";

export class UsersController {
  async getUsers(req: Request, res: Response) {
    const {
      search,
      role,
      emailVerified,
      joinedFrom,
      joinedTo,
      page,
      limit,
      sortBy,
      sortOrder,
    } = req.query;

    const filters: UserFilters = {
      search: typeof search === "string" ? search : undefined,
      role: typeof role === "string" ? role : undefined,
      emailVerified: typeof emailVerified === "string" ? emailVerified : undefined,
      joinedFrom: typeof joinedFrom === "string" ? joinedFrom : undefined,
      joinedTo: typeof joinedTo === "string" ? joinedTo : undefined,
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 10,
      sortBy: (sortBy as any) || "createdAt",
      sortOrder: (sortOrder as any) || "desc",
    };

    const result = await userService.getAllusers(filters);
    res.json({
      success: true,
      data: result.users,
      pagination: result.pagination,
      stats: result.stats,
    });
  }

  async getUserById(req: Request, res: Response) {
    const userId = req.params.id as string;
    const user = await userService.getUserById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.json({
      success: true,
      data: user,
    });
  }
}

export const usersController = new UsersController();
