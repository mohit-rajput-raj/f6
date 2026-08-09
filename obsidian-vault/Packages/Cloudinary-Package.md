# Shared Cloudinary Package (`packages/cloudinary` / `@repo/cloudinary`)

The `@repo/cloudinary` package encapsulates Cloudinary SDK v2 initialization for handling image and document uploads across applications.

---

## 🛠️ Configuration ([`src/index.ts`](file:///D:/vscodes/turborepo/f6/packages/cloudinary/src/index.ts))

```typescript
import { v2 as cloudinary } from 'cloudinary';

export function initCloudinary() {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });

  return cloudinary;
}

export { cloudinary };
```

---

## 🔗 Related Notes
* [[Apps/Dashboard]] — Frontend image uploading logic in `apps/dashboard/lib/imageUpload.ts`.
* [[Operations/Environment-Variables]] — Cloudinary environment credentials.
