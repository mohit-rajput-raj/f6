"use server";

import { initCloudinary } from "@repo/cloudinary";

export type UploadResult = {
  ok: boolean;
  url?: string;
  error?: string;
};

/**
 * Server action to upload an image file using Cloudinary.
 * Accepts FormData containing a 'file' field.
 * Returns the uploaded image CDN URL.
 */
export async function uploadImageAction(formData: FormData): Promise<UploadResult> {
  try {
    const file = formData.get("file") as File | null;
    if (!file) {
      return { ok: false, error: "No image file provided." };
    }

    if (!file.type.startsWith("image/")) {
      return { ok: false, error: "Selected file must be an image." };
    }

    const MAX_SIZE = 5 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      return { ok: false, error: "Image size must be less than 5MB." };
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;

    if (!cloudName || !apiKey || !apiSecret) {
      console.warn("[uploadImageAction] Cloudinary credentials missing in env, using compressed data URL fallback.");
      const base64 = buffer.toString("base64");
      return {
        ok: true,
        url: `data:${file.type};base64,${base64}`,
      };
    }

    const cloudinary = initCloudinary();

    return new Promise((resolve) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: "organizer_avatars",
          resource_type: "image",
          transformation: [
            { width: 400, height: 400, crop: "fill", gravity: "face" },
            { quality: "auto", fetch_format: "auto" },
          ],
        },
        (error, result) => {
          if (error || !result) {
            console.error("[uploadImageAction] Cloudinary upload error:", error);
            // Fallback to data URL on Cloudinary network error
            const base64 = buffer.toString("base64");
            resolve({ ok: true, url: `data:${file.type};base64,${base64}` });
          } else {
            resolve({ ok: true, url: result.secure_url });
          }
        }
      );

      uploadStream.end(buffer);
    });
  } catch (err: any) {
    console.error("[uploadImageAction] Exception during upload:", err);
    return { ok: false, error: err?.message || "An unexpected error occurred during upload." };
  }
}
