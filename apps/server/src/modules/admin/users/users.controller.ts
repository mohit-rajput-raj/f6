import type { Request, Response } from "express";
import { userService } from "./users.service";


export class UsersController{
    async getUsers(req:Request , res:Response){
        const users = await userService.getAllusers();
        res.json({success:true , data:users});
    }
     async getUserById(req:Request , res:Response){
        const userId = req.params.id as string;
        const user = await userService.getUserById(userId);
        res.json({success:true , data:user});
    }
}

export const usersController = new UsersController();