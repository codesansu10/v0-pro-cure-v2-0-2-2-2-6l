"use client";

import { useState } from "react";
import type { RFQ, Attachment } from "@/lib/types";
import { formatFileSize, getFileIcon, downloadFile } from "@/lib/file-upload";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { StatusBadge } from "./status-badge";
import PDFViewer from "./pdf-viewer";
import { Download, Eye } from "lucide-react";

interface RFQDetailsProps {
  rfq: RFQ;
  open: boolean;
  onClose: () => void;
}

export function RFQDetails({ rfq, open, onClose }: RFQDetailsProps) {
  const [previewAttachment, setPreviewAttachment] = useState<Attachment | null>(null);

  const attachments: Attachment[] = rfq.attachments ?? [];

  function handleDownload(attachment: Attachment) {
    downloadFile(attachment.fileUrl, attachment.fileName);
  }

  function handlePreview(attachment: Attachment) {
    if (attachment.mimeType === "application/pdf") {
      setPreviewAttachment(attachment);
    } else {
      handleDownload(attachment);
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold">
              RFQ Details — {rfq.id}
            </DialogTitle>
          </DialogHeader>

          {/* RFQ Info */}
          <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-xs">
            <div>
              <p className="text-muted-foreground">Project</p>
              <p className="font-medium">{rfq.project}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Component</p>
              <p className="font-medium">{rfq.component}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Quantity</p>
              <p className="font-medium">{rfq.quantity.toLocaleString("de-DE")}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Budget</p>
              <p className="font-medium">{rfq.budget.toLocaleString("de-DE")} EUR</p>
            </div>
            <div>
              <p className="text-muted-foreground">Delivery Time</p>
              <p className="font-medium">{rfq.deliveryTime} weeks</p>
            </div>
            <div>
              <p className="text-muted-foreground">Plant</p>
              <p className="font-medium">{rfq.plant || "—"}</p>
            </div>
            <div>
              <p className="text-muted-foreground">PSP Element</p>
              <p className="font-medium">{rfq.pspElement || "—"}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Technical Contact</p>
              <p className="font-medium">{rfq.technicalContact || "—"}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Request Type</p>
              <p className="font-medium">{rfq.requestType}</p>
            </div>
            <div>
              <p className="text-muted-foreground">On-site Visit</p>
              <p className="font-medium">{rfq.onSiteVisitRequired ? "Yes" : "No"}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Status</p>
              <StatusBadge status={rfq.status} />
            </div>
            <div>
              <p className="text-muted-foreground">Created</p>
              <p className="font-medium">
                {new Date(rfq.createdAt).toLocaleDateString("de-DE")}
              </p>
            </div>
          </div>

          {/* Attachments Section */}
          <div className="border-t pt-4">
            <h3 className="text-sm font-semibold mb-3">
              📎 Attachments ({attachments.length})
            </h3>

            {attachments.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-6 border border-dashed rounded">
                No attachments for this RFQ
              </p>
            ) : (
              <div className="space-y-2">
                {attachments.map((att) => (
                  <div
                    key={att.id}
                    className="flex items-center justify-between bg-muted px-3 py-2.5 rounded-md border text-xs hover:border-gray-400 transition-colors"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="text-base flex-shrink-0">
                        {getFileIcon(att.mimeType)}
                      </span>
                      <div className="min-w-0">
                        <p className="font-medium truncate">{att.fileName}</p>
                        <p className="text-muted-foreground">
                          {formatFileSize(att.fileSize)} ·{" "}
                          {new Date(att.uploadedAt).toLocaleDateString("de-DE")}
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-1.5 flex-shrink-0 ml-3">
                      {att.mimeType === "application/pdf" && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 px-2 text-[10px] gap-1"
                          onClick={() => handlePreview(att)}
                          title="Preview PDF"
                        >
                          <Eye className="h-3 w-3" />
                          Preview
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 px-2 text-[10px] gap-1"
                        onClick={() => handleDownload(att)}
                        title="Download file"
                      >
                        <Download className="h-3 w-3" />
                        Download
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* PDF Preview Modal */}
      {previewAttachment && (
        <Dialog
          open={!!previewAttachment}
          onOpenChange={() => setPreviewAttachment(null)}
        >
          <DialogContent className="max-w-4xl h-[85vh] p-0 overflow-hidden">
            <PDFViewer
              url={previewAttachment.fileUrl}
              fileName={previewAttachment.fileName}
              onDownload={() => handleDownload(previewAttachment)}
              onClose={() => setPreviewAttachment(null)}
            />
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
