"use client";

import { Button } from "@/components/ui/button";
import { Download, X, ExternalLink } from "lucide-react";

interface PDFViewerProps {
  url: string;
  fileName: string;
  onDownload?: () => void;
  onClose?: () => void;
}

export default function PDFViewer({
  url,
  fileName,
  onDownload,
  onClose,
}: PDFViewerProps) {
  return (
    <div className="flex flex-col h-full bg-gray-900 text-white rounded-md overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-700 flex-shrink-0">
        <span className="text-sm font-medium truncate max-w-[60%]" title={fileName}>
          {fileName}
        </span>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="text-gray-300 hover:text-white hover:bg-gray-700"
            onClick={() => window.open(url, "_blank")}
            title="Open in new tab"
          >
            <ExternalLink className="h-4 w-4" />
          </Button>
          {onDownload && (
            <Button
              variant="ghost"
              size="sm"
              className="text-gray-300 hover:text-white hover:bg-gray-700"
              onClick={onDownload}
              title="Download file"
            >
              <Download className="h-4 w-4" />
            </Button>
          )}
          {onClose && (
            <Button
              variant="ghost"
              size="sm"
              className="text-gray-300 hover:text-white hover:bg-gray-700"
              onClick={onClose}
              title="Close viewer"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* PDF Display */}
      <div className="flex-1 overflow-auto bg-gray-800">
        <iframe
          src={url}
          className="w-full h-full border-0"
          style={{ minHeight: "560px" }}
          title={fileName}
        />
      </div>
    </div>
  );
}
