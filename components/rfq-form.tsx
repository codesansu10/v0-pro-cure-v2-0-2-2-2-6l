"use client";

import { useState, useRef } from "react";
import { useStore } from "@/lib/store";
import type { RequestType, RFQStatus } from "@/lib/types";
import { uploadRFQAttachment, deleteRFQAttachment, formatFileSize, getFileIcon } from "@/lib/file-upload";
import type { Attachment } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { AlertTriangle, Zap, Package, Upload, X } from "lucide-react";

interface RFQFormProps {
  open: boolean;
  onClose: () => void;
  editId?: string | null;
}

function getFileIcon(mimeType: string) {
  if (mimeType === "application/pdf") return <FileText className="h-3.5 w-3.5 text-red-500" />;
  if (mimeType.startsWith("image/")) return <Image className="h-3.5 w-3.5 text-blue-500" />;
  return <File className="h-3.5 w-3.5 text-gray-500" />;
}

export function RFQForm({ open, onClose, editId }: RFQFormProps) {
  const { addRFQ, updateRFQ, state, getCurrentUser, addNotification } = useStore();
  const editRFQ = editId ? state.rfqs.find((r) => r.id === editId) : null;

  const [form, setForm] = useState({
    project: editRFQ?.project || "",
    component: editRFQ?.component || "",
    quantity: editRFQ?.quantity || 0,
    budget: editRFQ?.budget || 0,
    deliveryTime: editRFQ?.deliveryTime || 4,
    plant: editRFQ?.plant || "",
    pspElement: editRFQ?.pspElement || "",
    technicalContact: editRFQ?.technicalContact || "",
    onSiteVisitRequired: editRFQ?.onSiteVisitRequired || false,
    requestType: (editRFQ?.requestType || "Manufacturing") as RequestType,
  });

  const [attachments, setAttachments] = useState<Attachment[]>(
    editRFQ?.attachments ?? []
  );
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Stable temporary folder for new (unsaved) RFQs so concurrent users don't collide
  const tempFolderRef = useRef<string>(
    `draft-${crypto.randomUUID().replace(/-/g, "").substring(0, 12)}`
  );

  const warnings = [];
  if (form.deliveryTime < 2)
    warnings.push({ icon: Zap, text: "Urgent Request", color: "bg-red-600" });
  if (form.quantity > 1000)
    warnings.push({
      icon: Package,
      text: "Bulk Supplier Suggested",
      color: "bg-amber-600",
    });
  if (form.budget > 0 && form.budget < 500)
    warnings.push({
      icon: AlertTriangle,
      text: "Low Budget Warning",
      color: "bg-orange-600",
    });

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    setFileError(null);
    const files = Array.from(e.target.files || []);
    const invalid = files.find((f) => !validateFile(f).valid);
    if (invalid) {
      setFileError(validateFile(invalid).error || "Invalid file");
      return;
    }
    setPendingFiles((prev) => [...prev, ...files]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function removePendingFile(index: number) {
    setPendingFiles((prev) => prev.filter((_, i) => i !== index));
  }

  function removeAttachment(att: RFQAttachment) {
    setAttachments((prev) => prev.filter((a) => a.id !== att.id));
    // Best-effort delete from storage; ignore failures (file stays in storage but not in the RFQ)
    if (att.storagePath) {
      deleteRFQAttachment(att.storagePath).catch(() => {});
    }
  }

  async function uploadPendingFiles(rfqId: string): Promise<RFQAttachment[]> {
    if (pendingFiles.length === 0) return [];
    setUploading(true);
    setUploadErrors([]);
    const uploaded: RFQAttachment[] = [];
    const errors: string[] = [];
    for (let i = 0; i < pendingFiles.length; i++) {
      const file = pendingFiles[i];
      const result = await uploadRFQAttachment(rfqId, file, (pct) => {
        setUploadProgress(Math.round(((i + pct / 100) / pendingFiles.length) * 100));
      });
      if (result) {
        uploaded.push(result);
      } else {
        errors.push(`Failed to upload "${file.name}"`);
      }
    }
    setUploading(false);
    setUploadProgress(0);
    setPendingFiles([]);
    if (errors.length > 0) setUploadErrors(errors);
    return uploaded;
  }

  async function handleSave(status: RFQStatus) {
    const user = getCurrentUser();
    if (editId) {
      updateRFQ(editId, { ...form, status, attachments });
      // Notify procurement if RFQ was submitted
      if (status === "Submitted") {
        addNotification({
          role: "procurement",
          rfqId: editId,
          title: "RFQ Updated",
          message: `RFQ ${editId} for ${form.project} - ${form.component} has been updated and resubmitted.`,
          type: "rfq",
        });
      }
    } else {
      const rfqId = addRFQ({ ...form, status, createdBy: user.id, attachments });
      // Notify procurement when engineer submits RFQ
      if (status === "Submitted") {
        addNotification({
          role: "procurement",
          rfqId,
          title: "New RFQ Submitted",
          message: `${user.name} submitted a new RFQ for ${form.project} - ${form.component}. Budget: ${form.budget.toLocaleString("de-DE")} EUR`,
          type: "rfq",
        });
      }
    }
    onClose();
  }

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.currentTarget.files;
    if (!files || files.length === 0) return;

    setUploadError(null);
    setUploading(true);

    // Use the RFQ number from editId, or a unique temporary folder
    const rfqRef = editId || tempFolderRef.current;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        const attachment = await uploadRFQAttachment(rfqRef, file);
        setAttachments((prev) => [...prev, attachment]);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Upload failed";
        setUploadError(msg);
      }
    }

    setUploading(false);
    // Reset file input so the same file can be re-selected after removal
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handleRemoveAttachment(attachment: Attachment) {
    setAttachments((prev) => prev.filter((a) => a.id !== attachment.id));
    // Best-effort: remove file from Supabase Storage (non-blocking)
    const rfqRef = editId || tempFolderRef.current;
    const fileName = attachment.fileUrl.split("/").pop();
    if (fileName) {
      deleteRFQAttachment(rfqRef, fileName).catch((err) =>
        console.warn("[Storage] Failed to delete attachment:", err)
      );
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-sm font-semibold">
            {editId ? `Edit RFQ — ${editId}` : "Create New RFQ"}
          </DialogTitle>
        </DialogHeader>

        {warnings.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {warnings.map((w, i) => (
              <Badge
                key={i}
                className={`${w.color} text-white text-[10px] border-0`}
              >
                <w.icon className="mr-1 h-3 w-3" />
                {w.text}
              </Badge>
            ))}
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs">Project</Label>
            <Input
              className="h-8 text-xs"
              value={form.project}
              onChange={(e) => setForm({ ...form, project: e.target.value })}
              placeholder="e.g. Steel Plant Modernization"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs">Component</Label>
            <Input
              className="h-8 text-xs"
              value={form.component}
              onChange={(e) => setForm({ ...form, component: e.target.value })}
              placeholder="e.g. Roller Bearing Assembly"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs">Quantity</Label>
            <Input
              className="h-8 text-xs"
              type="number"
              value={form.quantity || ""}
              onChange={(e) =>
                setForm({ ...form, quantity: parseInt(e.target.value) || 0 })
              }
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs">Budget (EUR)</Label>
            <Input
              className="h-8 text-xs"
              type="number"
              value={form.budget || ""}
              onChange={(e) =>
                setForm({ ...form, budget: parseFloat(e.target.value) || 0 })
              }
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs">Delivery Time (weeks)</Label>
            <Input
              className="h-8 text-xs"
              type="number"
              value={form.deliveryTime || ""}
              onChange={(e) =>
                setForm({
                  ...form,
                  deliveryTime: parseInt(e.target.value) || 0,
                })
              }
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs">Plant</Label>
            <Input
              className="h-8 text-xs"
              value={form.plant}
              onChange={(e) => setForm({ ...form, plant: e.target.value })}
              placeholder="e.g. Duisburg"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs">PSP Element</Label>
            <Input
              className="h-8 text-xs"
              value={form.pspElement}
              onChange={(e) => setForm({ ...form, pspElement: e.target.value })}
              placeholder="e.g. PSP-2026-0042"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs">Technical Contact</Label>
            <Input
              className="h-8 text-xs"
              value={form.technicalContact}
              onChange={(e) =>
                setForm({ ...form, technicalContact: e.target.value })
              }
              placeholder="e.g. Dr. Fischer"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs">Type of Request</Label>
            <Select
              value={form.requestType}
              onValueChange={(v) =>
                setForm({ ...form, requestType: v as RequestType })
              }
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Manufacturing" className="text-xs">
                  Manufacturing
                </SelectItem>
                <SelectItem value="Delivery" className="text-xs">
                  Delivery
                </SelectItem>
                <SelectItem value="Service" className="text-xs">
                  Service
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end gap-3 pb-1">
            <div className="flex items-center gap-2">
              <Switch
                checked={form.onSiteVisitRequired}
                onCheckedChange={(v) =>
                  setForm({ ...form, onSiteVisitRequired: v })
                }
              />
              <Label className="text-xs">On-site Visit Required</Label>
            </div>
          </div>
        </div>

        {/* Attachments Section */}
        <div className="border-t pt-4 space-y-3">
          <div>
            <h3 className="text-sm font-semibold mb-1">📎 Attachments &amp; Documents</h3>
            <p className="text-xs text-muted-foreground mb-3">
              Upload technical specifications, drawings, or requirements (PDF, DOC, XLS, images — max 10 MB each)
            </p>

            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
              className="hidden"
              onChange={handleFileSelect}
              disabled={uploading}
            />

            {/* Upload button */}
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="text-xs"
              disabled={uploading}
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="h-3 w-3 mr-1.5" />
              {uploading ? "Uploading…" : "Choose Files"}
            </Button>

            {/* Upload progress indicator */}
            {uploading && (
              <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                <div className="h-1.5 flex-1 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-[#00A0E3] animate-pulse rounded-full w-full" />
                </div>
                <span>Uploading…</span>
              </div>
            )}

            {/* Upload error */}
            {uploadError && (
              <p className="mt-2 text-xs text-red-500">{uploadError}</p>
            )}

            {/* Uploaded files list */}
            {attachments.length > 0 && (
              <div className="mt-3 space-y-1.5">
                <p className="text-xs font-medium text-muted-foreground">
                  Uploaded ({attachments.length})
                </p>
                {attachments.map((att) => (
                  <div
                    key={att.id}
                    className="flex items-center justify-between bg-muted px-3 py-2 rounded-md border text-xs"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span>{getFileIcon(att.mimeType)}</span>
                      <div className="min-w-0">
                        <p className="font-medium truncate">{att.fileName}</p>
                        <p className="text-muted-foreground">
                          {formatFileSize(att.fileSize)} ·{" "}
                          {new Date(att.uploadedAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 ml-2 flex-shrink-0"
                      onClick={() => handleRemoveAttachment(att)}
                      disabled={uploading}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {/* Empty state */}
            {attachments.length === 0 && !uploading && (
              <p className="mt-3 text-xs text-muted-foreground text-center py-4 border border-dashed rounded">
                No files uploaded yet
              </p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose} className="text-xs">
            Cancel
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="text-xs"
            onClick={() => handleSave("Draft")}
            disabled={uploading}
          >
            Save as Draft
          </Button>
          <Button
            size="sm"
            className="bg-[#00A0E3] text-white text-xs hover:bg-[#0090cc]"
            onClick={() => handleSave("Submitted")}
            disabled={uploading}
          >
            Submit RFQ{attachments.length > 0 && ` (${attachments.length} file${attachments.length > 1 ? "s" : ""})`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

