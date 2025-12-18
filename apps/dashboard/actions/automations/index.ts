'use server'

import prisma from "@/lib/prisma"


export const getAllPosts = async () => {
    try {
        const res = await prisma.post.findMany();
        return res;
    } catch (error) {
        
        console.error("Error fetching data:", error);
        return [];
    }
}
export const getAllusers = async () => {
    try {
        const res = await prisma.user.findMany();
        return res;
    } catch (error) {
        
        console.error("Error fetching data:", error);
        return [];
    }
}