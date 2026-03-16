import { supabase } from "./supabaseClient";
import type { Attachment } from "./types";

// Allowed file types
const ALLOWED_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "image/jpeg",
  "image/png",
  "image/jpg",
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export function validateFile(file: File): { valid: boolean; error?: string } {
  if (!ALLOWED_TYPES.includes(file.type)) {
    return { valid: false, error: `File type not supported: ${file.type}` };
  }
  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `File too large: ${(file.size / 1024 / 1024).toFixed(2)}MB (max 10MB)`,
    };
  }
  return { valid: true };
}

export async function uploadRFQAttachment(
  rfqNumber: string,
  file: File,
  onProgress?: (progress: number) => void
): Promise<Attachment> {
  if (!supabase) {
    throw new Error("Supabase client not available");
  }

  // Validate file
  const validation = validateFile(file);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  // Signal upload start
  onProgress?.(0);

  // Create unique filename
  const timestamp = Date.now();
  const random = crypto.randomUUID().replace(/-/g, "").substring(0, 8);
  const extPart = file.name.includes(".") ? `.${file.name.split(".").pop()}` : "";
  const uniqueName = `${rfqNumber}_${timestamp}_${random}${extPart}`;
  const path = `${rfqNumber}/${uniqueName}`;

  // Upload file
  const { error } = await supabase.storage
    .from("rfq-attachments")
    .upload(path, file, { upsert: false });

  if (error) throw error;

  // Signal upload complete
  onProgress?.(100);

  // Get public URL
  const { data: publicUrlData } = supabase.storage
    .from("rfq-attachments")
    .getPublicUrl(path);

  const attachment: Attachment = {
    id: `att_${crypto.randomUUID().replace(/-/g, "").substring(0, 12)}`,
    fileName: file.name,
    fileSize: file.size,
    fileUrl: publicUrlData.publicUrl,
    mimeType: file.type,
    uploadedAt: new Date().toISOString(),
  };

  return attachment;
}

export async function deleteRFQAttachment(
  rfqNumber: string,
  filePath: string
): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.storage
    .from("rfq-attachments")
    .remove([`${rfqNumber}/${filePath}`]);
  if (error) {
    console.error("File deletion failed:", error);
  }
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
}

export function getFileIcon(mimeType: string): string {
  if (mimeType === "application/pdf") return "📄";
  if (mimeType.includes("word")) return "📝";
  if (mimeType.includes("sheet") || mimeType.includes("excel")) return "📊";
  if (mimeType.includes("image")) return "🖼️";
  return "📎";
}
