import { cn } from "@/lib/utils";
import { Check, Download, Languages, X } from "lucide-react";
import { ProcessingState } from "./ProcessingState";
import { SearchResults } from "./SearchResults";
import { Button } from "./ui/button";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { Card } from "./ui/card";
import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from "@/components/ui/dialog";
import { LocationMap } from "./maps/LocationMap";

interface ChatMessageProps {
  content: string;
  isBot?: boolean;
  isProcessing?: boolean;
  sources?: Array<{
    title: string;
    url: string;
    domain: string;
    icon?: string;
  }>;
}

const languages = [
  { name: "Hindi", code: "hi" },
  { name: "Marathi", code: "mr" },
  { name: "Sanskrit", code: "sa" },
];

export const ChatMessage = ({ 
  content, 
  isBot = false, 
  isProcessing = false,
  sources
}: ChatMessageProps) => {
  const [translatedContent, setTranslatedContent] = useState<string | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);
  const [isImageDialogOpen, setIsImageDialogOpen] = useState(false);
  const { toast } = useToast();

  const processingSteps = [
    { text: "Analyzing query", completed: true },
    { text: "Generating search query", completed: true },
    { text: "Searching knowledge base", completed: true },
    { text: "Processing information", completed: true },
    { text: "Generating response", completed: false },
  ];

  const handleTranslate = async (languageCode: string) => {
    setIsTranslating(true);
    try {
      const { data, error } = await supabase.functions.invoke('translate', {
        body: { 
          text: content,
          targetLanguage: languageCode
        },
      });

      if (error) throw error;
      setTranslatedContent(data.translatedText);
    } catch (error) {
      console.error('Translation error:', error);
      toast({
        title: "Translation Error",
        description: "Failed to translate the message. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsTranslating(false);
    }
  };

  const handleDownloadImage = async (imageUrl: string) => {
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `generated-image-${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: "Success",
        description: "Image downloaded successfully",
      });
    } catch (error) {
      console.error('Download error:', error);
      toast({
        title: "Download Error",
        description: "Failed to download the image. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Function to safely render content with links
  const renderContent = (text: string) => {
    // Match markdown links [text](url)
    const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = linkRegex.exec(text)) !== null) {
      // Add text before the link
      if (match.index > lastIndex) {
        parts.push(text.slice(lastIndex, match.index));
      }

      // Add the link
      const [fullMatch, linkText, url] = match;
      parts.push(
        <a
          key={match.index}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-500 hover:underline inline-flex items-center gap-1"
          onClick={(e) => {
            // Optional: Add confirmation for external links
            if (!window.confirm('You are about to visit an external website. Continue?')) {
              e.preventDefault();
            }
          }}
        >
          {linkText}
        </a>
      );

      lastIndex = match.index + fullMatch.length;
    }

    // Add remaining text
    if (lastIndex < text.length) {
      parts.push(text.slice(lastIndex));
    }

    return parts;
  };

  // Extract image URL if present in the content
  const imageUrlMatch = content.match(/!\[.*?\]\((.*?)\)/);
  const imageUrl = imageUrlMatch ? imageUrlMatch[1] : null;
  const textContent = content.replace(/!\[.*?\]\((.*?)\)/, '').trim();

  // Extract all locations from weather message
  const locationMatches = textContent.match(/Weather in ([^:,]+)(?:,|\:|$)/g);
  const locations = locationMatches 
    ? locationMatches.map(match => match.replace(/Weather in |\:$/g, '').trim())
    : [];

  return (
    <div
      className={cn(
        "flex w-full flex-col animate-message-fade-in gap-2",
        isBot ? "items-start" : "items-end"
      )}
    >
      {isBot && sources && <SearchResults sources={sources} showViewMore={sources.length > 2} />}
      {isBot && isProcessing && <ProcessingState steps={processingSteps} />}
      <div className="flex flex-col gap-2 max-w-[85%] sm:max-w-[75%]">
        {imageUrl && (
          <Dialog open={isImageDialogOpen} onOpenChange={setIsImageDialogOpen}>
            <DialogTrigger asChild>
              <Card className="overflow-hidden cursor-pointer hover:opacity-95 transition-opacity">
                <div className="relative">
                  <img 
                    src={imageUrl} 
                    alt="Generated content"
                    className="w-full h-auto object-cover rounded-t-lg"
                  />
                  <Button
                    variant="secondary"
                    size="icon"
                    className="absolute top-2 right-2 bg-background/80 hover:bg-background/90"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDownloadImage(imageUrl);
                    }}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
                <div className="p-4">
                  <p className="text-sm text-muted-foreground">
                    {renderContent(textContent)}
                  </p>
                </div>
              </Card>
            </DialogTrigger>
            <DialogContent className="max-w-4xl w-[95vw] p-0 bg-transparent border-none">
              <div className="relative rounded-lg overflow-hidden bg-background">
                <img
                  src={imageUrl}
                  alt="Full size preview"
                  className="w-full h-auto max-h-[90vh] object-contain"
                />
                <div className="absolute top-2 right-2 flex gap-2">
                  <Button
                    variant="secondary"
                    size="icon"
                    className="bg-background/80 hover:bg-background/90"
                    onClick={() => handleDownloadImage(imageUrl)}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="secondary"
                    size="icon"
                    className="bg-background/80 hover:bg-background/90"
                    onClick={() => setIsImageDialogOpen(false)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
        {!imageUrl && (
          <div
            className={cn(
              "rounded-2xl px-4 sm:px-6 py-3 font-medium leading-relaxed tracking-wide",
              isBot 
                ? "bg-secondary text-secondary-foreground" 
                : "bg-primary text-primary-foreground"
            )}
          >
            {renderContent(translatedContent || textContent)}
          </div>
        )}
        {locations.length > 0 && isBot && (
          <LocationMap 
            locations={locations}
            className="mt-2 w-full max-w-2xl"
          />
        )}
        {isBot && (
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="outline" 
                  size="sm"
                  disabled={isTranslating}
                  className="flex items-center gap-2"
                >
                  <Languages className="h-4 w-4" />
                  {isTranslating ? "Translating..." : "Translate"}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                {languages.map((lang) => (
                  <DropdownMenuItem
                    key={lang.code}
                    onClick={() => handleTranslate(lang.code)}
                  >
                    {lang.name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            {translatedContent && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setTranslatedContent(null)}
              >
                Show Original
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};