export const DELIVERY_ATTACHMENT_MAX_COUNT = 5;
export const DELIVERY_ATTACHMENT_MAX_FILE_BYTES = 25 * 1024 * 1024;
export const DELIVERY_ATTACHMENT_MAX_TOTAL_BYTES = 75 * 1024 * 1024;

export const DELIVERY_ATTACHMENT_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
  "text/plain",
  "application/zip",
  "application/x-zip-compressed",
]);

export function validateDeliveryAttachments(files: File[]): string | null {
  if (files.length > DELIVERY_ATTACHMENT_MAX_COUNT) {
    return "You can attach up to 5 files.";
  }
  if (files.some((file) => file.size === 0)) {
    return "Empty files cannot be attached.";
  }
  if (files.some((file) => file.size > DELIVERY_ATTACHMENT_MAX_FILE_BYTES)) {
    return "Each attachment must be 25 MB or smaller.";
  }
  if (
    files.reduce((total, file) => total + file.size, 0) >
    DELIVERY_ATTACHMENT_MAX_TOTAL_BYTES
  ) {
    return "Attachments must total 75 MB or less.";
  }
  if (files.some((file) => !DELIVERY_ATTACHMENT_TYPES.has(file.type))) {
    return "Use JPEG, PNG, WebP, PDF, plain text, or ZIP files.";
  }
  return null;
}

export function mergeDeliveryAttachments(
  current: File[],
  selected: File[],
): File[] {
  const result = [...current];
  const known = new Set(
    current.map((file) => `${file.name}\0${file.size}\0${file.lastModified}`),
  );
  for (const file of selected) {
    const key = `${file.name}\0${file.size}\0${file.lastModified}`;
    if (!known.has(key)) {
      known.add(key);
      result.push(file);
    }
  }
  return result;
}

export function readableFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function safeDownloadFilename(
  contentDisposition: string | null,
  fallback: string,
): string {
  const utf = contentDisposition?.match(/filename\*=UTF-8''([^;]+)/i)?.[1];
  const basic = contentDisposition?.match(/filename="?([^";]+)"?/i)?.[1];
  let candidate = fallback;
  try {
    candidate = decodeURIComponent(utf ?? basic ?? fallback);
  } catch {
    candidate = fallback;
  }
  const leaf = candidate.replaceAll("\\", "/").split("/").pop() ?? fallback;
  return leaf.replace(/[^\p{L}\p{N}._() -]/gu, "_").slice(0, 200) || "attachment";
}
