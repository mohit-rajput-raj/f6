"use client"

import React, { useEffect, useState } from "react"
import { Bell, Check, X, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/components"
import { Badge } from "@repo/ui/components/ui/badge"
import { getPendingInvites, acceptInvite, rejectInvite } from "../desk-share-actions"
import { toast } from "sonner"

interface Invite {
  id: string
  invitedEmail: string
  permission: string
  projectWorkflowId: string | null
  masterSheet: {
    id: string
    name: string
  }
}

interface InviteNotificationProps {
  userEmail: string
}

export function InviteNotification({ userEmail }: InviteNotificationProps) {
  const [invites, setInvites] = useState<Invite[]>([])
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState<string | null>(null)

  useEffect(() => {
    if (!userEmail) return
    loadInvites()
  }, [userEmail])

  const loadInvites = async () => {
    try {
      setLoading(true)
      const result = await getPendingInvites(userEmail)
      setInvites(result as Invite[])
    } catch {
      // Silently fail — no notifications
    } finally {
      setLoading(false)
    }
  }

  const handleAccept = async (inviteId: string) => {
    setProcessing(inviteId)
    try {
      await acceptInvite(inviteId)
      toast.success("Invite accepted! You now have access to this desk.")
      setInvites(invites.filter((i) => i.id !== inviteId))
    } catch (err: any) {
      toast.error(err?.message || "Failed to accept invite")
    } finally {
      setProcessing(null)
    }
  }

  const handleReject = async (inviteId: string) => {
    setProcessing(inviteId)
    try {
      await rejectInvite(inviteId)
      toast.success("Invite rejected.")
      setInvites(invites.filter((i) => i.id !== inviteId))
    } catch (err: any) {
      toast.error(err?.message || "Failed to reject invite")
    } finally {
      setProcessing(null)
    }
  }

  if (loading || invites.length === 0) return null

  return (
    <div className="mx-4 mt-3 space-y-2">
      {invites.map((invite) => (
        <div
          key={invite.id}
          className="flex items-center justify-between px-4 py-2.5 rounded-lg border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950 animate-in slide-in-from-top"
        >
          <div className="flex items-center gap-2">
            <Bell className="size-4 text-amber-600" />
            <span className="text-sm text-amber-800 dark:text-amber-200">
              You've been invited to collaborate on{" "}
              <span className="font-semibold">"{invite.masterSheet.name}"</span>
            </span>
            <Badge variant="secondary" className="text-[9px]">
              {invite.permission}
            </Badge>
          </div>
          <div className="flex items-center gap-1.5">
            <Button
              size="sm"
              className="h-7 gap-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs"
              onClick={() => handleAccept(invite.id)}
              disabled={processing === invite.id}
            >
              {processing === invite.id ? (
                <Loader2 className="size-3 animate-spin" />
              ) : (
                <Check className="size-3" />
              )}
              Accept
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-xs text-red-500 hover:text-red-600"
              onClick={() => handleReject(invite.id)}
              disabled={processing === invite.id}
            >
              <X className="size-3" />
              Reject
            </Button>
          </div>
        </div>
      ))}
    </div>
  )
}
