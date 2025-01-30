import { useEffect, useRef } from "react";
import { ChatMessage } from "./ChatMessage";

interface Message {
  content: string;
  isBot: boolean;
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
      className="flex flex-col gap-4 overflow-y-auto p-4 h-full"
    >
      {messages.map((message, index) => (
        <ChatMessage
          key={index}
          content={message.content}
          isBot={message.isBot}
        />
      ))}
      <div ref={bottomRef} />
    </div>
  );
};