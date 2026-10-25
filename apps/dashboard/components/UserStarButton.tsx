"use client";

import React, { useState, useEffect } from "react";
import { Star } from "lucide-react";
import { Button } from "@repo/ui/components/ui/button";
import { toast } from "sonner";
import { supabase } from "@repo/db";
import { useSession } from "@/lib/auth-client";

interface UserStarButtonProps {
  targetUserId: string;
  initialStarsCount?: number;
  initialStarred?: boolean;
  className?: string;
}

export const UserStarButton: React.FC<UserStarButtonProps> = ({
  targetUserId,
  initialStarsCount = 0,
  initialStarred = false,
  className = "",
}) => {
  const { data: session } = useSession();
  const currentUserId = session?.user?.id;

  const [starred, setStarred] = useState(initialStarred);
  const [starsCount, setStarsCount] = useState(initialStarsCount);
  const [loading, setLoading] = useState(false);

  // Sync initial state from database
  useEffect(() => {
    let isMounted = true;
    async function fetchStarStatus() {
      try {
        const { count } = await supabase
          .from("user_star")
          .select("id", { count: "exact", head: true })
          .eq("targetUserId", targetUserId);

        if (isMounted && typeof count === "number") {
          setStarsCount(count);
        }

        if (currentUserId && isMounted) {
          const { data } = await supabase
            .from("user_star")
            .select("id")
            .eq("targetUserId", targetUserId)
            .eq("userId", currentUserId)
            .maybeSingle();

          if (isMounted) {
            setStarred(Boolean(data));
          }
        }
      } catch (err) {
        console.warn("Error fetching star status:", err);
      }
    }

    if (targetUserId) {
      fetchStarStatus();
    }

    return () => {
      isMounted = false;
    };
  }, [targetUserId, currentUserId]);

  const handleToggleStar = async () => {
    if (!currentUserId) {
      toast.info("Please sign in to star user profiles");
      return;
    }

    if (currentUserId === targetUserId) {
      toast.info("You cannot star your own profile");
      return;
    }

    // Optimistic toggle
    const nextStarred = !starred;
    const nextCount = nextStarred ? starsCount + 1 : Math.max(0, starsCount - 1);

    setStarred(nextStarred);
    setStarsCount(nextCount);
    setLoading(true);

    try {
      if (nextStarred) {
        await supabase.from("user_star").insert({
          id: `star_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          userId: currentUserId,
          targetUserId,
          createdAt: new Date().toISOString(),
        });
        toast.success("Profile starred!");
      } else {
        await supabase
          .from("user_star")
          .delete()
          .eq("userId", currentUserId)
          .eq("targetUserId", targetUserId);
        toast.info("Star removed");
      }
    } catch (err) {
      // Revert on error
      setStarred(!nextStarred);
      setStarsCount(starsCount);
      toast.error("Failed to update star");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`inline-flex items-center rounded-lg border border-border bg-card shadow-xs overflow-hidden ${className}`}>
      <Button
        variant="ghost"
        size="sm"
        disabled={loading}
        onClick={handleToggleStar}
        className={`h-8 px-2.5 text-xs font-semibold gap-1.5 transition-colors ${
          starred
            ? "bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 dark:text-amber-400"
            : "hover:bg-muted text-muted-foreground hover:text-foreground"
        }`}
      >
        <Star
          className={`size-3.5 transition-transform ${
            starred ? "fill-amber-500 text-amber-500 scale-110" : ""
          }`}
        />
        <span>{starred ? "Starred" : "Star"}</span>
      </Button>

      <div className="border-l border-border px-2.5 py-1 text-xs font-semibold text-foreground bg-muted/30">
        {starsCount}
      </div>
    </div>
  );
};
