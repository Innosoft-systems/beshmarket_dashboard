/**
 * Shared limits for image uploads.
 *
 * Three layers have to agree or the user gets an error nobody can explain:
 * nginx's `client_max_body_size`, the API's `MAX_FILE_SIZE`, and this check.
 * nginx sits in front, so when it is the strictest the request never reaches
 * the API and the response is an HTML 413 rather than a JSON error — which is
 * exactly how a 1 MB nginx default made every upload over 1 MB fail with
 * "Rasm yuklanmadi".
 *
 * Keep this in step with server `.env` MAX_FILE_SIZE and the nginx setting.
 */
export const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;

/** The API detects the type from the file's bytes, not its extension. */
export const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
] as const;

/** The `accept` attribute for a file input. Never `image/*`: HEIC and AVIF
 *  pass that filter and are then rejected by the API. */
export const IMAGE_ACCEPT = ALLOWED_IMAGE_TYPES.join(",");

/** Returns an error message to show, or null when the file is acceptable. */
export function validateImageFile(file: File): string | null {
  if (file.size > MAX_UPLOAD_BYTES) {
    return `Rasm hajmi ${MAX_UPLOAD_BYTES / 1024 / 1024}MB dan oshmasligi kerak`;
  }
  if (!ALLOWED_IMAGE_TYPES.includes(file.type as (typeof ALLOWED_IMAGE_TYPES)[number])) {
    return "Faqat JPEG, PNG, WebP yoki GIF formatlar";
  }
  return null;
}

/**
 * Pull an error message out of an upload response.
 *
 * A body-size rejection comes from nginx as HTML, so `res.json()` throws and
 * the real status is lost. Read the status first.
 */
export async function uploadErrorMessage(res: Response): Promise<string> {
  if (res.status === 413) {
    return `Rasm hajmi juda katta (server chegarasi). Maksimal ${MAX_UPLOAD_BYTES / 1024 / 1024}MB`;
  }
  const body = await res.json().catch(() => null);
  return (
    body?.error ??
    body?.message ??
    body?.data?.error ??
    `Yuklashda xatolik (${res.status})`
  );
}
