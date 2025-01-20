import { cn } from "@/lib/utils";

interface ChatMessageProps {
  content: string;
  isBot?: boolean;
}

export const ChatMessage = ({ content, isBot = false }: ChatMessageProps) => {
  return (
    <div
      className={cn(
        "flex w-full animate-message-fade-in",
        isBot ? "justify-start" : "justify-end"
      )}
    >
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