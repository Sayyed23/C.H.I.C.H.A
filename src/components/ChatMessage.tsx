import { cn } from "@/lib/utils";
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
import { Languages } from "lucide-react";
import { useToast } from "./ui/use-toast";

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
  const { toast } = useToast();

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

  const processingSteps = [
    { text: "Analyzing query", completed: true },
    { text: "Generating search query", completed: true },
    { text: "Searching knowledge base", completed: true },
    { text: "Processing information", completed: true },
    { text: "Generating response", completed: false },
  ];

  return (
    <div
      className={cn(
        "flex w-full flex-col animate-message-fade-in gap-2",
        isBot ? "items-start" : "items-end"
      )}
    >
      {isBot && sources && <SearchResults sources={sources} showViewMore={sources.length > 2} />}
      {isBot && isProcessing && <ProcessingState steps={processingSteps} />}
      <div className="flex flex-col gap-2">
        <div
          className={cn(
            "max-w-[85%] sm:max-w-[75%] rounded-2xl px-4 sm:px-6 py-3 font-medium leading-relaxed tracking-wide",
            isBot 
              ? "bg-secondary text-secondary-foreground" 
              : "bg-primary text-primary-foreground"
          )}
        >
          {translatedContent || content}
        </div>
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