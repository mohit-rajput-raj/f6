import { os } from "@orpc/server";
import { prisma } from "@repo/db";
// import { prisma } from "@repo/db";
import { z } from "zod";

export const listUsers = os
  .route({
    method: "GET",
    path: "/users",
    summary: "List users",
    description: "List users",
    tags: ["Users"],
  })
  .input(z.void())
  .output(
    z.object({
      users: z.array(
        z.object({
          id: z.number(),
          name: z.string().nullable(),
          email: z.string(),
        }),
      ),
    }),
  )
  .handler(async ({ input }) => {
    // try {
    //   const users = await prisma.session.findMany();
    // console.log(users + ".............");
    // } catch (error) {
    //   console.log(error);
      
      
    // }

    const data = [
      { id: 1, name: "John Doe", email: "john@example.com" },
      { id: 2, name: "Jane Smith", email: "jane@example.com" },
      { id: 3, name: "mohit rajput", email: "john@example.com" },
      { id: 4, name: "Jane Smith", email: "jane@example.com" },
    ];
    return { users: data };
    // const data = await prisma.;
    // return {
    //   users: data.map((user) => {
    //     return {
    //       id: typeof user.id === 'string' ? parseInt(user.id, 10) : user.id,
    //       name: user.name,
    //       email: user.email,
    //     };
    //   }),
    // };
    // // console.log(data);
    

    // return {
    //     users: data.map((user)=>{
    //       return {
    //         id: user.id,
    //         name: user.name,
    //         email: user.email
    //       }
    //     })
    // }
  });
