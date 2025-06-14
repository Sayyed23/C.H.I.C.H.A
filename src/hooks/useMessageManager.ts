
import { useState, useEffect, useCallback } from "react";
import { Message } from "@/types/chat";

interface UseMessageManagerProps {
  initialMessages?: Message[];
  onMessagesChange: (messages: Message[]) => void;
  onLoadingChange: (loading: boolean) => void;
}

export const useMessageManager = ({ 
  initialMessages = [], 
  onMessagesChange, 
  onLoadingChange 
}: UseMessageManagerProps) => {
  const [messages, setMessagesState] = useState<Message[]>(initialMessages);
  const [isLoading, setIsLoadingState] = useState(false);

  useEffect(() => {
    onMessagesChange(messages);
  }, [messages, onMessagesChange]);

  useEffect(() => {
    onLoadingChange(isLoading);
  }, [isLoading, onLoadingChange]);

  const addMessage = useCallback((message: Message) => {
    setMessagesState((prev) => [...prev, message]);
  }, []);

  const addProcessingMessage = useCallback(() => {
    addMessage({ content: "", isBot: true, isProcessing: true });
  }, [addMessage]);

  const replaceLastMessage = useCallback((newMessage: Message) => {
    setMessagesState((prev) => [...prev.slice(0, -1), newMessage]);
  }, []);
  
  const removeLastMessageIfProcessing = useCallback(() => {
    setMessagesState((prev) => {
      if (prev.length > 0 && prev[prev.length - 1].isBot && prev[prev.length - 1].isProcessing) {
        return prev.slice(0, -1);
      }
      return prev;
    });
  }, []);

  const setMessagesList = useCallback((newMessages: Message[]) => {
    setMessagesState(newMessages);
  }, []);

  return {
    messages,
    isLoading,
    addMessage,
    addProcessingMessage,
    replaceLastMessage,
    removeLastMessageIfProcessing,
    setMessagesList,
    setIsLoadingState, // Renamed from setIsLoading to avoid conflict if destructured
  };
};
