"use server";

import { prisma } from "@repo/db";

export async function getMasterSheets(dashid?: string, userId?: string, userEmail?: string) {
  const sheetMap = new Map<string, any>();

  // 1. Fetch master sheets explicitly linked to this desk (projectWorkflowId) via DeskShare
  if (dashid && dashid.trim() !== "") {
    const sharesForDesk = await prisma.deskShare.findMany({
      where: { projectWorkflowId: dashid.trim() },
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

    sharesForDesk.forEach((s) => {
      if (s.masterSheet) {
        sheetMap.set(s.masterSheet.id, s.masterSheet);
      }
    });
  }

  // 2. Fetch master sheets owned by userId
  if (userId && userId.trim() !== "") {
    const ownSheets = await prisma.masterSheet.findMany({
      where: { userId: userId.trim() },
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

    ownSheets.forEach((s) => sheetMap.set(s.id, s));
  }

  // 3. Fetch master sheets shared with userEmail
  if (userEmail && userEmail.trim() !== "") {
    const sharedEntries = await prisma.deskShare.findMany({
      where: { invitedEmail: { equals: userEmail.trim(), mode: "insensitive" } },
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

    sharedEntries.forEach((s) => {
      if (s.masterSheet) {
        sheetMap.set(s.masterSheet.id, s.masterSheet);
      }
    });
  }

  return Array.from(sheetMap.values());
}

export async function getMasterSheet(id: string, userId?: string) {
  return prisma.masterSheet.findFirst({
    where: { id },
  });
}

export async function getMasterSheetByName(name: string, userId?: string, dashid?: string) {
  if (dashid) {
    const deskShare = await prisma.deskShare.findFirst({
      where: { projectWorkflowId: dashid, masterSheet: { name } },
      include: { masterSheet: true },
    });
    if (deskShare?.masterSheet) {
      return deskShare.masterSheet;
    }
  }

  return prisma.masterSheet.findFirst({
    where: userId ? { name, userId } : { name },
  });
}

export async function createMasterSheet({
  userId,
  name,
  data,
  metadata,
  dashid,
}: {
  userId: string;
  name: string;
  data: any;
  metadata?: any;
  dashid?: string;
}) {
  const sheet = await prisma.masterSheet.create({
    data: { userId, name, data, metadata },
  });

  if (dashid) {
    try {
      const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } });
      await prisma.deskShare.create({
        data: {
          masterSheetId: sheet.id,
          projectWorkflowId: dashid,
          invitedEmail: user?.email || "owner@desk.com",
          invitedUserId: userId,
          permission: "editor",
          status: "accepted",
        },
      });
    } catch (e) {
      console.warn("Could not create desk share link for master sheet:", e);
    }
  }

  return sheet;
}

export async function updateMasterSheet(
  id: string,
  userId: string,
  updates: { name?: string; data?: any; metadata?: any }
) {
  const sheet = await prisma.masterSheet.findFirst({ where: { id } });
  if (!sheet) throw new Error("Master sheet not found");
  return prisma.masterSheet.update({ where: { id }, data: updates });
}

/** Upsert by name: if a master sheet with this name exists for the user or desk, update it; otherwise create it. */
export async function upsertMasterSheetByName({
  userId,
  name,
  data,
  metadata,
  dashid,
}: {
  userId: string;
  name: string;
  data: any;
  metadata?: any;
  dashid?: string;
}) {
  let existing = await getMasterSheetByName(name, userId, dashid);

  let sheet;
  if (existing) {
    sheet = await prisma.masterSheet.update({
      where: { id: existing.id },
      data: { data, metadata, updatedAt: new Date() },
    });
  } else {
    sheet = await prisma.masterSheet.create({
      data: { userId, name, data, metadata },
    });
  }

  if (dashid && sheet) {
    try {
      const existingShare = await prisma.deskShare.findFirst({
        where: { masterSheetId: sheet.id, projectWorkflowId: dashid },
      });
      if (!existingShare) {
        const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } });
        await prisma.deskShare.create({
          data: {
            masterSheetId: sheet.id,
            projectWorkflowId: dashid,
            invitedEmail: user?.email || "owner@desk.com",
            invitedUserId: userId,
            permission: "editor",
            status: "accepted",
          },
        });
      }
    } catch (e) {
      console.warn("Could not ensure desk share link for master sheet:", e);
    }
  }

  return sheet;
}

export async function deleteMasterSheet(id: string, userId?: string) {
  const sheet = await prisma.masterSheet.findFirst({ where: { id } });
  if (!sheet) throw new Error("Master sheet not found");
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
