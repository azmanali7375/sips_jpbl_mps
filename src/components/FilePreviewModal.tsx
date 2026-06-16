import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X, Download, ExternalLink } from "lucide-react";
import { useState } from "react";

interface FilePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  fileUrl: string;
  fileName: string;
  fileType: "pdf" | "image";
}

export function FilePreviewModal({
  isOpen,
  onClose,
  fileUrl,
  fileName,
  fileType,
}: FilePreviewModalProps) {
  const [loading, setLoading] = useState(true);

  const handleDownload = () => {
    window.open(fileUrl, "_blank");
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl h-[90vh] flex flex-col">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <span className="truncate max-w-md">{fileName}</span>
            </DialogTitle>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownload}
              >
                <Download className="h-4 w-4 mr-2" />
                Muat Turun
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(fileUrl, "_blank")}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Buka Tab Baharu
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-hidden bg-muted/30 rounded-lg relative">
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground">Memuatkan dokumen...</p>
              </div>
            </div>
          )}

          {fileType === "pdf" ? (
            <iframe
              src={fileUrl}
              className="w-full h-full"
              onLoad={() => setLoading(false)}
              title={fileName}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center p-4">
              <img
                src={fileUrl}
                alt={fileName}
                className="max-w-full max-h-full object-contain"
                onLoad={() => setLoading(false)}
              />
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}