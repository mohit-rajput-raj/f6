 // adjust import

import { prisma } from "./client";



async function main() {
  try {
    const count = await prisma.car.count();
    console.log("Connection OK! Cars count =", count);
  } catch (e) {
    console.error("Connection failed:", e);
  } finally {
    await prisma.$disconnect();
  }
}

main();