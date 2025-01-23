import React from "react";
import { X } from "lucide-react";

interface ImagePreviewProps {
  imagePreview: string | null;
  onClear: () => void;
}

export const ImagePreview = ({ imagePreview, onClear }: ImagePreviewProps) => {
  if (!imagePreview) return null;

  return (
    <div className="relative inline-block">
      <div className="w-24 h-24 rounded-lg overflow-hidden border border-border">
        <img
          src={imagePreview}
          alt="Preview"
          className="w-full h-full object-cover"
        />
      </div>
      <button
        onClick={onClear}
        className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full w-6 h-6 flex items-center justify-center hover:bg-destructive/90 transition-colors"
        aria-label="Remove image"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
};