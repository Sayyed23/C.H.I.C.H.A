import React from "react";
import { Button } from "../ui/button";
import { Paperclip, Globe, Send, Mic, Wand2 } from "lucide-react";

interface InputActionsProps {
  onImageClick: () => void;
  onSearchClick: () => void;
  onMicClick: () => void;
  onSendClick: () => void;
  onGenerateImage: () => void;
  isListening: boolean;
  isLoading: boolean;
  isGeneratingImage: boolean;
  hasContent: boolean;
}

export const InputActions = ({
  onImageClick,
  onSearchClick,
  onMicClick,
  onSendClick,
  onGenerateImage,
  isListening,
  isLoading,
  isGeneratingImage,
  hasContent,
}: InputActionsProps) => {
  return (
    <div className="flex items-center gap-2">
      <div className="flex gap-1">
        <Button
          size="icon"
          variant="ghost"
          onClick={onImageClick}
          className="h-9 w-9"
          aria-label="Upload image"
        >
          <Paperclip className="h-5 w-5 text-muted-foreground" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          onClick={onSearchClick}
          className="h-9 w-9"
          disabled={isLoading || !hasContent}
          aria-label="Search web"
        >
          <Globe className="h-5 w-5 text-muted-foreground" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          onClick={onMicClick}
          className={`h-9 w-9 ${isListening ? "bg-primary text-primary-foreground" : ""}`}
          aria-label={isListening ? "Stop recording" : "Start recording"}
        >
          <Mic className="h-5 w-5" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          onClick={onGenerateImage}
          className={`h-9 w-9 ${isGeneratingImage ? "bg-primary text-primary-foreground" : ""}`}
          disabled={isGeneratingImage || !hasContent}
          aria-label="Generate image"
        >
          <Wand2 className="h-5 w-5 text-muted-foreground" />
        </Button>
      </div>
      <Button
        size="icon"
        onClick={onSendClick}
        disabled={isLoading || !hasContent}
        className="h-9 w-9 ml-auto"
        aria-label="Send message"
      >
        <Send className="h-5 w-5" />
      </Button>
    </div>
  );
};