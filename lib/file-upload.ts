import { supabase } from "./supabaseClient";
import type { RFQAttachment } from "./types";

export const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "image/jpeg",
  "image/png",
  "image/jpg",
];

export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

export const RFQ_ATTACHMENTS_BUCKET = "rfq-attachments";

export function validateFile(file: File): { valid: boolean; error?: string } {
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return { valid: false, error: "File type not supported. Allowed: PDF, DOC, DOCX, XLS, XLSX, PNG, JPG" };
  }
  if (file.size > MAX_FILE_SIZE) {
    return { valid: false, error: "File too large (max 10 MB)" };
  }
  return { valid: true };
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Upload a single file to Supabase Storage.
 * Returns the attachment metadata on success, or null on failure.
 */
export async function uploadRFQAttachment(
  rfqId: string,
  file: File,
  onProgress?: (percent: number) => void
): Promise<RFQAttachment | null> {
  if (!supabase) {
    console.warn("[FileUpload] Supabase not configured — skipping upload");
    return null;
  }

  const validation = validateFile(file);
  if (!validation.valid) {
    console.error("[FileUpload] Invalid file:", validation.error);
    return null;
  }

  const id = crypto.randomUUID();
  // Keep only the last extension to prevent double-extension attacks
  const dotIdx = file.name.lastIndexOf(".");
  const baseName = dotIdx > 0 ? file.name.slice(0, dotIdx) : file.name;
  const ext = dotIdx > 0 ? file.name.slice(dotIdx) : "";
  const safeBase = baseName.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 60);
  const safeName = `${safeBase}${ext}`;
  const storagePath = `${rfqId}/${id}_${safeName}`;

  // Simulate early progress while uploading (Supabase JS v2 doesn't expose upload progress natively)
  onProgress?.(10);

  const { error } = await supabase.storage
    .from(RFQ_ATTACHMENTS_BUCKET)
    .upload(storagePath, file, { upsert: false });

  if (error) {
    console.error("[FileUpload] Upload failed:", error.message);
    onProgress?.(0);
    return null;
  }

  onProgress?.(90);

  const { data: urlData } = supabase.storage
    .from(RFQ_ATTACHMENTS_BUCKET)
    .getPublicUrl(storagePath);

  onProgress?.(100);

  return {
    id,
    fileName: file.name,
    fileSize: file.size,
    fileUrl: urlData.publicUrl,
    storagePath,
    mimeType: file.type,
    uploadedAt: new Date().toISOString(),
  };
}

/**
 * Delete a file from Supabase Storage by its storage path (rfqId/fileName).
 */
export async function deleteRFQAttachment(storagePath: string): Promise<boolean> {
  if (!supabase) return false;
  const { error } = await supabase.storage
    .from(RFQ_ATTACHMENTS_BUCKET)
    .remove([storagePath]);
  if (error) {
    console.error("[FileUpload] Delete failed:", error.message);
    return false;
  }
  return true;
}
