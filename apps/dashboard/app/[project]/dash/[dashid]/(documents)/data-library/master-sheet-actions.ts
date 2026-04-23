"use server";

import { prisma } from "@repo/db";

export async function getMasterSheets(userId: string, userEmail?: string) {
  // Own sheets
  const ownSheets = await prisma.masterSheet.findMany({
    where: { userId },
    select: {
      id: true,
      name: true,
      data: true,
      metadata: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: { updatedAt: "desc" },
  });

  // Shared sheets (via email)
  if (userEmail) {
    const sharedEntries = await prisma.deskShare.findMany({
      where: { invitedEmail: userEmail },
      include: {
        masterSheet: {
          select: {
            id: true,
            name: true,
            data: true,
            metadata: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
    });

    const sharedSheets = sharedEntries
      .map((s) => s.masterSheet)
      .filter((s) => !ownSheets.some((own) => own.id === s.id));

    return [...ownSheets, ...sharedSheets];
  }

  return ownSheets;
}

export async function getMasterSheet(id: string, userId: string) {
  return prisma.masterSheet.findFirst({
    where: { id, userId },
  });
}

export async function getMasterSheetByName(name: string, userId: string) {
  return prisma.masterSheet.findFirst({
    where: { name, userId },
  });
}

export async function createMasterSheet({
  userId,
  name,
  data,
  metadata,
}: {
  userId: string;
  name: string;
  data: any;
  metadata?: any;
}) {
  return prisma.masterSheet.create({
    data: { userId, name, data, metadata },
  });
}

export async function updateMasterSheet(
  id: string,
  userId: string,
  updates: { name?: string; data?: any; metadata?: any }
) {
  const sheet = await prisma.masterSheet.findFirst({ where: { id, userId } });
  if (!sheet) throw new Error("Master sheet not found or unauthorized");
  return prisma.masterSheet.update({ where: { id }, data: updates });
}

/** Upsert by name: if a master sheet with this name exists for the user, update it; otherwise create it. */
export async function upsertMasterSheetByName({
  userId,
  name,
  data,
  metadata,
}: {
  userId: string;
  name: string;
  data: any;
  metadata?: any;
}) {
  const existing = await prisma.masterSheet.findFirst({
    where: { userId, name },
  });

  if (existing) {
    return prisma.masterSheet.update({
      where: { id: existing.id },
      data: { data, metadata, updatedAt: new Date() },
    });
  } else {
    return prisma.masterSheet.create({
      data: { userId, name, data, metadata },
    });
  }
}

export async function deleteMasterSheet(id: string, userId: string) {
  const sheet = await prisma.masterSheet.findFirst({ where: { id, userId } });
  if (!sheet) throw new Error("Master sheet not found or unauthorized");
  return prisma.masterSheet.delete({ where: { id } });
}

export async function addMasterSheetHistory({
  masterSheetId,
  userId,
  userName,
  action,
  dataBefore,
  dataAfter,
  changeSummary,
}: {
  masterSheetId: string;
  userId: string;
  userName: string;
  action: string;
  dataBefore?: any;
  dataAfter?: any;
  changeSummary?: string;
}) {
  return prisma.masterSheetHistory.create({
    data: {
      masterSheetId,
      userId,
      userName,
      action,
      dataBefore,
      dataAfter,
      changeSummary,
    },
  });
}

export async function getMasterSheetHistory(masterSheetId: string) {
  return prisma.masterSheetHistory.findMany({
    where: { masterSheetId },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
}
