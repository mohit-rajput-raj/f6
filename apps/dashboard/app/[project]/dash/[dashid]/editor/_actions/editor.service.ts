"use server";

import { useSession } from "@/lib/auth-client";
import { prisma } from "@repo/db";

export const createWorkFlow = async ({id,name}:{id:string, name:string}) => {
  try {
    
    if (!id) {
      throw new Error("User not authenticated");
    }
    
    const newWorkflow = await prisma.workflow.create({
      data: {
        userId: id,
        name,
        definition: {
          meta: { version: "1.0", createdAt: new Date().toISOString() },
          reactFlow: {
            nodes: [],
            edges: [],
            viewport: { x: 0, y: 0, zoom: 1 },
          },
        },
        tags: [],
      },
    });
    
    return newWorkflow;
  } catch (error) {
    console.error("Failed to create workflow:", error);
    throw error;
  }
};
export async function getWorkFlow(id: string) {
  console.log("getWorkFlow called with id:", id); 

  const res = await prisma.workflow.findUnique({
    where: {
      id: id,
    },
   
  });

  console.log("hit - workflows found:", res);  

  return res;  
}
export async function getAllWorkFlow(id:string) {
  return prisma.workflow.findMany({
    where:{
        userId:id,
        
    },
    select: {
      name: true,
      id:true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: { createdAt: 'desc' },
   
  });
}

export async function GETusers() {
  return prisma.user.findFirst();
}
export const deleteWorkFlow = async ({
  flowId,
  id,
}: {
  id: string
  flowId: string
}) => {
  try {
    const workflow = await prisma.workflow.findFirst({
      where: {
        id: flowId,
        userId: id, 
      },
    })

    if (!workflow) {
      throw new Error("Workflow not found or unauthorized")
    }

    const deleted = await prisma.workflow.delete({
      where: {
        id: flowId,
      },
    })

    return deleted
  } catch (error) {
    console.error("Delete workflow error:", error)
    throw error
  }
}
