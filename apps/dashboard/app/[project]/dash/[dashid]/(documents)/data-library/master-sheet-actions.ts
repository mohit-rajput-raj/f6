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
            userId: true,
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
        const isOwner = userId ? s.masterSheet.userId === userId : false;
        sheetMap.set(s.masterSheet.id, {
          ...s.masterSheet,
          isOwner,
          sharedBy: isOwner ? "Personal Desk" : (s.invitedEmail || "Shared Collaborator"),
        });
      }
    });
  }

  // 2. Fetch master sheets owned by userId
  if (userId && userId.trim() !== "") {
    const ownSheets = await prisma.masterSheet.findMany({
      where: { userId: userId.trim() },
      select: {
        id: true,
        userId: true,
        name: true,
        data: true,
        metadata: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { updatedAt: "desc" },
    });

    ownSheets.forEach((s) => {
      sheetMap.set(s.id, {
        ...s,
        isOwner: true,
        sharedBy: "Personal Desk",
      });
    });
  }

  // 3. Fetch master sheets shared with userEmail
  if (userEmail && userEmail.trim() !== "") {
    const sharedEntries = await prisma.deskShare.findMany({
      where: { invitedEmail: { equals: userEmail.trim(), mode: "insensitive" } },
      include: {
        masterSheet: {
          select: {
            id: true,
            userId: true,
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
        const isOwner = userId ? s.masterSheet.userId === userId : false;
        if (!sheetMap.has(s.masterSheet.id)) {
          sheetMap.set(s.masterSheet.id, {
            ...s.masterSheet,
            isOwner,
            sharedBy: isOwner ? "Personal Desk" : "Shared Non-Personal Desk",
          });
        }
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

export async function checkIsDeskOwner(dashid?: string, userId?: string): Promise<boolean> {
  if (!dashid || !userId) return false;
  try {
    const workflow = await prisma.workflow.findUnique({
      where: { id: dashid.trim() },
      select: { userId: true },
    });
    if (workflow && workflow.userId === userId) return true;

    // Fallback check masterSheet owner linked to desk
    const share = await prisma.deskShare.findFirst({
      where: { projectWorkflowId: dashid.trim(), masterSheet: { userId } },
    });
    return !!share;
  } catch (e) {
    console.warn("Owner check warning:", e);
    return false;
  }
}
