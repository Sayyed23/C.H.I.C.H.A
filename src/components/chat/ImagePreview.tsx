import React, { useState } from "react";
import { X, Maximize2, Minimize2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from "@/components/ui/dialog";

interface ImagePreviewProps {
  imagePreview: string | null;
  onClear: () => void;
}

export const ImagePreview = ({ imagePreview, onClear }: ImagePreviewProps) => {
  const [isOpen, setIsOpen] = useState(false);

  if (!imagePreview) return null;

  return (
    <>
      <div className="relative inline-block">
        <div className="w-16 h-16 rounded-lg overflow-hidden border border-border">
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <button className="w-full h-full relative group">
                <img
                  src={imagePreview}
                  alt="Preview"
                  className="w-full h-full object-cover cursor-pointer"
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Maximize2 className="h-4 w-4 text-white" />
                </div>
              </button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl w-full p-0">
              <div className="relative">
                <img
                  src={imagePreview}
                  alt="Full size preview"
                  className="w-full h-auto max-h-[80vh] object-contain"
                />
                <button
                  onClick={() => setIsOpen(false)}
                  className="absolute top-2 right-2 bg-black/60 text-white rounded-full p-1 hover:bg-black/80 transition-colors"
                >
                  <Minimize2 className="h-4 w-4" />
                </button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
        <button
          onClick={onClear}
          className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full w-5 h-5 flex items-center justify-center hover:bg-destructive/90 transition-colors"
          aria-label="Remove image"
        >
          <X className="h-3 w-3" />
        </button>
      </div>
    </>
  );
};