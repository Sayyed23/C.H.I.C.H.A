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

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="flex flex-col gap-4 overflow-y-auto p-4">
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