"use client";

import React, { useState, useRef, useTransition, useEffect } from "react";
import { uploadImage } from "@/lib/imageUpload";
import { useRouteAuthContextHook } from "@/context/routeContext";
import { authClient, useSession } from "@/lib/auth-client";
import { getUserProfile, updateUserProfile } from "../_actions/profile.service";
import { Avatar, AvatarImage, AvatarFallback } from "@repo/ui/components/ui/avatar";
import { Button } from "@repo/ui/components/ui/button";
import { Input } from "@repo/ui/components/ui/input";
import { Label } from "@repo/ui/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@repo/ui/components/ui/card";
import { Badge } from "@repo/ui/components/ui/badge";
import { toast } from "sonner";
import {
  IconCamera,
  IconLock,
  IconTrash,
  IconLoader2,
  IconCheck,
  IconUpload,
  IconUser,
  IconMail,
} from "@tabler/icons-react";
import { ProfileSkeleton } from "../../../_components/settings-skeletons";

export function ProfileForm() {
  const { main_id } = useRouteAuthContextHook();
  const { data: session } = useSession();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string>("");
  const [isUploading, setIsUploading] = useState(false);
  const [isLoadingUser, setIsLoadingUser] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [userLoading  , setLoadingUser] = useState(true);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch user data using main_id from useRouteAuthContextHook on mount / main_id update
  useEffect(() => {
    let isMounted = true;

    async function loadUserProfile() {
      setIsLoadingUser(true);
      const targetId = main_id && main_id !== "0" ? main_id : session?.user?.id;

      if (!targetId) {
        setIsLoadingUser(false);
        return;
      }

      try {
        setLoadingUser(true);
        const fetchedUser = await getUserProfile(targetId);
        if (isMounted) {
          if (fetchedUser) {
            setName(fetchedUser.name || "");
            setEmail(fetchedUser.email || "");
            setAvatarUrl(fetchedUser.image || "");
          } else if (session?.user) {
            setName(session.user.name || "");
            setEmail(session.user.email || "");
            setAvatarUrl(session.user.image || "");
          }
        }
      } catch (err) {
        console.error("Failed to fetch user profile:", err);
        if (isMounted && session?.user) {
          setName(session.user.name || "");
          setEmail(session.user.email || "");
          setAvatarUrl(session.user.image || "");
        }
      } finally {
        if (isMounted) {
          setIsLoadingUser(false);
        }
      }
    }

    loadUserProfile();

    return () => {
      isMounted = false;
    };
  }, [main_id, session]);

  // Handle image file selection
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image size must be less than 5MB.");
      return;
    }

    setIsUploading(true);
    const toastId = toast.loading("Uploading image via Cloudinary...");

    try {
      const formData = new FormData();
      formData.append("file", file);

      const result = await uploadImage(formData);

      if (result.success && result.url) {
        setAvatarUrl(result.url);
        toast.success("Profile photo updated successfully!", { id: toastId });
      } else {
        toast.error(result.error || "Failed to upload image.", { id: toastId });
      }
    } catch (err) {
      console.error("Upload error:", err);
      toast.error("An error occurred during upload.", { id: toastId });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleRemoveAvatar = () => {
    setAvatarUrl("");
    toast.info("Profile photo removed.");
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error("Name cannot be empty.");
      return;
    }

    const currentUserId = session?.user?.id;
    const targetUserId = main_id && main_id !== "0" ? main_id : currentUserId;

    // Verification check: ensure active session user matches main_id before patching data
    if (currentUserId && targetUserId && currentUserId !== targetUserId) {
      toast.error("Unauthorized: You can only update your own profile.");
      return;
    }

    if (!targetUserId) {
      toast.error("User session not found.");
      return;
    }

    startTransition(async () => {
      try {
        await updateUserProfile(targetUserId, {
          name,
          image: avatarUrl,
        });

        if (authClient && typeof (authClient as any).updateUser === "function") {
          await (authClient as any).updateUser({
            name,
            image: avatarUrl,
          });
        }

        toast.success("Profile settings saved successfully!");
      } catch (err) {
        console.error("Failed to save profile settings:", err);
        toast.error("Failed to save profile settings.");
      }
    });
  };

  // Helper to extract initials for fallback avatar
  const getInitials = (str: string) => {
    if (!str) return "U";
    return str
      .split(" ")
      .map((part) => part[0])
      .join("")
      .toUpperCase()
      .substring(0, 2);
  };
  if(isLoadingUser)return <ProfileSkeleton />;
  return (
    <Card className="w-full max-w-4xl border shadow-xs">
      <CardHeader className="space-y-1">
        <CardTitle className="text-xl font-bold tracking-tight">Public Profile</CardTitle>
        <CardDescription className="text-sm text-muted-foreground">
          Update your personal details, avatar photo, and manage how your profile appears across the workspace.
        </CardDescription>
      </CardHeader>

      <form onSubmit={handleSave}>
        <CardContent className="space-y-6">
          {/* Avatar Upload Section */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Profile Picture</Label>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 p-4 rounded-xl bg-muted/30 border border-border/60">
              <div className="relative group shrink-0">
                <Avatar className="size-24 border-2 border-background shadow-md">
                  <AvatarImage src={avatarUrl} alt={name} className="object-cover" />
                  <AvatarFallback className="text-lg font-bold bg-primary/10 text-primary">
                    {getInitials(name)}
                  </AvatarFallback>
                </Avatar>

                {isUploading && (
                  <div className="absolute inset-0 bg-background/70 backdrop-blur-xs rounded-full flex items-center justify-center">
                    <IconLoader2 className="size-6 text-primary animate-spin" />
                  </div>
                )}
              </div>

              <div className="space-y-2 flex-1">
                <div className="flex flex-wrap gap-3">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png, image/jpeg, image/webp, image/gif"
                    className="hidden"
                    onChange={handleFileChange}
                    disabled={isUploading}
                  />

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className="gap-2 font-medium"
                  >
                    {isUploading ? (
                      <IconLoader2 className="size-4 animate-spin" />
                    ) : (
                      <IconCamera className="size-4 text-muted-foreground" />
                    )}
                    {avatarUrl ? "Change Photo" : "Upload Photo"}
                  </Button>

                  {avatarUrl && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleRemoveAvatar}
                      disabled={isUploading}
                      className="gap-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      <IconTrash className="size-4" />
                      Remove
                    </Button>
                  )}
                </div>

                <p className="text-xs text-muted-foreground">
                  JPG, GIF, PNG or WEBP. Max file size 5MB. Powered by Cloudinary (`imageUpload.ts`).
                </p>
              </div>
            </div>
          </div>

          {/* Form Inputs */}
          <div className="grid gap-5 sm:grid-cols-1">
            {/* Name Field (Editable) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="name" className="text-sm font-medium flex items-center gap-1.5">
                  <IconUser className="size-4 text-muted-foreground" />
                  Full Name
                </Label>
                <span className="text-xs text-muted-foreground">Editable</span>
              </div>
              <Input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your full name"
                className="w-full"
                required
              />
              <p className="text-xs text-muted-foreground">
                This name will be visible to other members of your team and on documents you create.
              </p>
            </div>

            {/* Email Field (Non-editable) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="email" className="text-sm font-medium flex items-center gap-1.5">
                  <IconMail className="size-4 text-muted-foreground" />
                  Email Address
                </Label>
                <Badge variant="secondary" className="gap-1 text-[11px] font-normal text-muted-foreground">
                  <IconLock className="size-3" />
                  Non-editable
                </Badge>
              </div>
              <div className="relative">
                <Input
                  id="email"
                  type="email"
                  value={email}
                  readOnly
                  disabled
                  className="w-full bg-muted/50 cursor-not-allowed pr-10 text-muted-foreground select-none"
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  <IconLock className="size-4" />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Your email address is managed by your single sign-on provider and cannot be changed here.
              </p>
            </div>
          </div>
        </CardContent>

        <CardFooter className="flex justify-end gap-3 border-t bg-muted/20 px-6 py-4">
          <Button
            type="submit"
            disabled={isPending || isUploading}
            className="gap-2 px-6 font-semibold"
          >
            {isPending ? (
              <>
                <IconLoader2 className="size-4 animate-spin" />
                Saving Changes...
              </>
            ) : (
              <>
                <IconCheck className="size-4" />
                Save Changes
              </>
            )}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
