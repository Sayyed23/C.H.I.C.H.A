import { useEffect, useRef } from "react";
import { ChatMessage } from "./ChatMessage";

interface Message {
  content: string;
  isBot: boolean;
  isProcessing?: boolean;
  sources?: Array<{
    title: string;
    url: string;
    domain: string;
    icon?: string;
  }>;
}

interface ChatContainerProps {
  messages: Message[];
}

export const ChatContainer = ({ messages }: ChatContainerProps) => {
  const bottomRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div 
      ref={containerRef}
      className="flex flex-col gap-4 overflow-y-auto p-4 sm:p-6 h-[calc(100vh-13rem)] sm:h-[calc(100vh-14rem)]"
    >
      {messages.map((message, index) => (
        <ChatMessage
          key={index}
          content={message.content}
          isBot={message.isBot}
          isProcessing={message.isProcessing}
          sources={message.sources}
        />
      ))}
      <div ref={bottomRef} />
    </div>
  );
};