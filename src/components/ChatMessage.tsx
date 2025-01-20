import { cn } from "@/lib/utils";
import { ProcessingState } from "./ProcessingState";
import { SearchResults } from "./SearchResults";

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

export const ChatMessage = ({ 
  content, 
  isBot = false, 
  isProcessing = false,
  sources
}: ChatMessageProps) => {
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
        "flex w-full flex-col animate-message-fade-in",
        isBot ? "items-start" : "items-end"
      )}
    >
      {isBot && sources && <SearchResults sources={sources} showViewMore={sources.length > 2} />}
      {isBot && isProcessing && <ProcessingState steps={processingSteps} />}
      <div
        className={cn(
          "max-w-[85%] sm:max-w-[75%] rounded-2xl px-4 sm:px-6 py-3 font-medium leading-relaxed tracking-wide",
          isBot 
            ? "bg-secondary text-secondary-foreground" 
            : "bg-primary text-primary-foreground"
        )}
      >
        {content}
      </div>
    </div>
  );
};