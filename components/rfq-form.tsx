"use client";

import { useState, useRef } from "react";
import { useStore } from "@/lib/store";
import type { RequestType, RFQStatus, RFQAttachment } from "@/lib/types";
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
import { Progress } from "@/components/ui/progress";
import { AlertTriangle, Zap, Package, Paperclip, X, FileText, Image, File } from "lucide-react";
import { uploadRFQAttachment, deleteRFQAttachment, validateFile, formatFileSize, ALLOWED_MIME_TYPES } from "@/lib/file-upload";

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

  const [attachments, setAttachments] = useState<RFQAttachment[]>(editRFQ?.attachments || []);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [uploading, setUploading] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const [uploadErrors, setUploadErrors] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      const newAttachments = await uploadPendingFiles(editId);
      const allAttachments = [...attachments, ...newAttachments];
      updateRFQ(editId, { ...form, status, attachments: allAttachments });
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
      const rfqId = addRFQ({ ...form, status, createdBy: user.id, attachments: [] });
      const newAttachments = await uploadPendingFiles(rfqId);
      if (newAttachments.length > 0) {
        updateRFQ(rfqId, { attachments: newAttachments });
      }
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
        <div className="border rounded-md p-3 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-semibold flex items-center gap-1.5">
              <Paperclip className="h-3.5 w-3.5" />
              Attachments
            </Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              + Add File
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept={ALLOWED_MIME_TYPES.join(",")}
              className="hidden"
              onChange={handleFileSelect}
            />
          </div>

          {fileError && (
            <p className="text-xs text-red-500">{fileError}</p>
          )}

          {uploadErrors.length > 0 && (
            <ul className="flex flex-col gap-0.5">
              {uploadErrors.map((err, i) => (
                <li key={i} className="text-xs text-red-500">{err}</li>
              ))}
            </ul>
          )}

          {/* Already-uploaded attachments */}
          {attachments.length > 0 && (
            <ul className="flex flex-col gap-1">
              {attachments.map((att) => (
                <li
                  key={att.id}
                  className="flex items-center justify-between rounded bg-muted px-2 py-1"
                >
                  <div className="flex items-center gap-2 overflow-hidden">
                    {getFileIcon(att.mimeType)}
                    <a
                      href={att.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs truncate max-w-[280px] hover:underline"
                    >
                      {att.fileName}
                    </a>
                    <span className="text-[10px] text-muted-foreground shrink-0">
                      {formatFileSize(att.fileSize)}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeAttachment(att)}
                    className="ml-2 text-muted-foreground hover:text-destructive shrink-0"
                    aria-label="Remove attachment"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </li>
              ))}
            </ul>
          )}

          {/* Pending (not yet uploaded) files */}
          {pendingFiles.length > 0 && (
            <ul className="flex flex-col gap-1">
              {pendingFiles.map((file, idx) => (
                <li
                  key={idx}
                  className="flex items-center justify-between rounded border border-dashed px-2 py-1"
                >
                  <div className="flex items-center gap-2 overflow-hidden">
                    {getFileIcon(file.type)}
                    <span className="text-xs truncate max-w-[280px]">{file.name}</span>
                    <span className="text-[10px] text-muted-foreground shrink-0">
                      {formatFileSize(file.size)}
                    </span>
                    <Badge variant="outline" className="text-[9px] h-4 px-1">
                      Pending
                    </Badge>
                  </div>
                  <button
                    type="button"
                    onClick={() => removePendingFile(idx)}
                    className="ml-2 text-muted-foreground hover:text-destructive shrink-0"
                    aria-label="Remove pending file"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </li>
              ))}
            </ul>
          )}

          {attachments.length === 0 && pendingFiles.length === 0 && (
            <p className="text-[10px] text-muted-foreground text-center py-2">
              No attachments. Click &ldquo;+ Add File&rdquo; to upload PDFs, documents, or images.
            </p>
          )}

          {/* Upload progress */}
          {uploading && (
            <div className="flex flex-col gap-1">
              <Progress value={uploadProgress} className="h-1.5" />
              <p className="text-[10px] text-muted-foreground text-center">
                Uploading… {uploadProgress}%
              </p>
            </div>
          )}
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
            Submit RFQ
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

