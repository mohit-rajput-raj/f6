"use server";

import { initCloudinary } from "@repo/cloudinary";

export type UploadResult = {
  success: boolean;
  url?: string;
  error?: string;
};

/**
 * Server action to upload an image file using Cloudinary.
 * Accepts FormData containing a 'file' field.
 * Returns the uploaded image URL or a data URL fallback for local development.
 */
export async function uploadImage(formData: FormData): Promise<UploadResult> {
  try {
    const file = formData.get("file") as File | null;
    if (!file) {
      return { success: false, error: "No image file provided." };
    }

    // Validate file type
    if (!file.type.startsWith("image/")) {
      return { success: false, error: "Selected file must be an image." };
    }

    // Maximum file size check (5MB)
    const MAX_SIZE = 5 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      return { success: false, error: "Image size must be less than 5MB." };
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Check if Cloudinary credentials are provided in env
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;

    if (!cloudName || !apiKey || !apiSecret) {
      // Fallback for local dev if Cloudinary credentials are not set
      const base64 = buffer.toString("base64");
      const dataUrl = `data:${file.type};base64,${base64}`;
      return {
        success: true,
        url: dataUrl,
      };
    }

    const cloudinary = initCloudinary();

    return new Promise((resolve) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: "user_profiles",
          resource_type: "image",
          transformation: [{ width: 500, height: 500, crop: "limit" }],
        },
        (error, result) => {
          if (error || !result) {
            console.error("Cloudinary Upload Error:", error);
            // Fallback to data URL on error
            const base64 = buffer.toString("base64");
            const dataUrl = `data:${file.type};base64,${base64}`;
            resolve({ success: true, url: dataUrl });
          } else {
            resolve({ success: true, url: result.secure_url });
          }
        }
      );

      uploadStream.end(buffer);
    });
  } catch (err: any) {
    console.error("Image upload exception:", err);
    return { success: false, error: err?.message || "An unexpected error occurred during upload." };
  }
}