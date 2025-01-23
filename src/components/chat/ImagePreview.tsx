import React from "react";

interface ImagePreviewProps {
  imagePreview: string | null;
  onClear: () => void;
}

export const ImagePreview = ({ imagePreview, onClear }: ImagePreviewProps) => {
  if (!imagePreview) return null;

  return (
    <div className="relative w-24 h-24">
      <img
        src={imagePreview}
        alt="Preview"
        className="w-full h-full object-cover rounded-lg"
      />
      <button
        onClick={onClear}
        className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full w-6 h-6 flex items-center justify-center"
        aria-label="Remove image"
      >
        ×
      </button>
    </div>
  );
};