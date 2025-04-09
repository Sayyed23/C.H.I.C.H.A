
import React from "react";
import { Button } from "../ui/button";
import { Paperclip, Globe, Send, Wand2, Code, Thermometer, Navigation2, MapPin, CloudSun, Loader2, Mic, MicOff, Image } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "../ui/dropdown-menu";
import { ButtonLink } from "../ui/button-link";

interface InputActionsProps {
  onImageClick: () => void;
  onSearchClick: (engine?: string) => void;
  onSendClick: () => void;
  onGenerateImage: () => void;
  onGenerateCode: () => void;
  onWeatherClick: () => void;
  onNavigateClick: () => void;
  onMapClick: () => void;
  onMicClick: () => void;
  isLoading: boolean;
  isGeneratingImage: boolean;
  isEditingImage?: boolean;
  isSearching?: boolean;
  isListening?: boolean;
  hasContent: boolean;
}

export const InputActions = ({
  onImageClick,
  onSearchClick,
  onSendClick,
  onGenerateImage,
  onGenerateCode,
  onWeatherClick,
  onNavigateClick,
  onMapClick,
  onMicClick,
  isLoading,
  isGeneratingImage,
  isEditingImage,
  isSearching,
  isListening,
  hasContent,
}: InputActionsProps) => {
  return (
    <div className="flex items-center gap-2">
      <div className="flex gap-1 overflow-x-auto pb-1 flex-wrap">
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
              variant={isSearching ? "secondary" : "ghost"}
              className="h-9 w-9"
              disabled={isLoading || isSearching || !hasContent}
              aria-label="Search web"
            >
              {isSearching ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Globe className="h-5 w-5 text-muted-foreground" />
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuLabel>Search Engines</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              onClick={() => onSearchClick('firecrawl')}
              disabled={isSearching}
            >
              Firecrawl Search
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={() => onSearchClick('google')}
              disabled={isSearching}
            >
              Google Search
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={() => onSearchClick('bing')}
              disabled={isSearching}
            >
              Bing Search
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={() => onSearchClick('duckduckgo')}
              disabled={isSearching}
            >
              DuckDuckGo Search
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        
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
        <Button
          size="icon"
          variant={isListening ? "secondary" : "ghost"}
          onClick={onMicClick}
          className="h-9 w-9"
          aria-label={isListening ? "Stop listening" : "Start listening"}
        >
          {isListening ? (
            <MicOff className="h-5 w-5" />
          ) : (
            <Mic className="h-5 w-5 text-muted-foreground" />
          )}
        </Button>
        <ButtonLink
          to="/childhood-memory"
          size="icon"
          variant="ghost"
          className="h-9 w-9"
          aria-label="Childhood Memory Generator"
        >
          <Image className="h-5 w-5 text-muted-foreground" />
        </ButtonLink>
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
