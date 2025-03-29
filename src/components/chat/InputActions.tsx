
import React from "react";
import { Button } from "../ui/button";
import { Paperclip, Globe, Send, Mic, Wand2, Code, Thermometer, Navigation2, MapPin, CloudSun } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "../ui/dropdown-menu";

interface InputActionsProps {
  onImageClick: () => void;
  onSearchClick: (engine?: string) => void;
  onMicClick: () => void;
  onSendClick: () => void;
  onGenerateImage: () => void;
  onGenerateCode: () => void;
  onWeatherClick: () => void;
  onNavigateClick: () => void;
  onMapClick: () => void;
  isListening: boolean;
  isLoading: boolean;
  isGeneratingImage: boolean;
  isEditingImage?: boolean;
  hasContent: boolean;
}

export const InputActions = ({
  onImageClick,
  onSearchClick,
  onMicClick,
  onSendClick,
  onGenerateImage,
  onGenerateCode,
  onWeatherClick,
  onNavigateClick,
  onMapClick,
  isListening,
  isLoading,
  isGeneratingImage,
  isEditingImage,
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
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              size="icon"
              variant="ghost"
              className="h-9 w-9"
              disabled={isLoading || !hasContent}
              aria-label="Search web"
            >
              <Globe className="h-5 w-5 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuLabel>Search Engines</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onSearchClick('firecrawl')}>
              Firecrawl Search
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onSearchClick('google')}>
              Google Search
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onSearchClick('bing')}>
              Bing Search
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onSearchClick('duckduckgo')}>
              DuckDuckGo Search
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        
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
        <Button
          size="icon"
          variant="ghost"
          onClick={onGenerateCode}
          className="h-9 w-9"
          disabled={isLoading || !hasContent}
          aria-label="Generate code"
        >
          <Code className="h-5 w-5 text-muted-foreground" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          onClick={onWeatherClick}
          className="h-9 w-9"
          aria-label="Check weather"
        >
          <CloudSun className="h-5 w-5 text-muted-foreground" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          onClick={onNavigateClick}
          className="h-9 w-9"
          aria-label="Get directions"
        >
          <Navigation2 className="h-5 w-5 text-muted-foreground" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          onClick={onMapClick}
          className="h-9 w-9"
          aria-label="Find locations"
        >
          <MapPin className="h-5 w-5 text-muted-foreground" />
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
