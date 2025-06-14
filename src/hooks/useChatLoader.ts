
import { useCallback } from "react";
import { fetchChatMessagesFromDb } from "@/services/chatApiService";
import { Message } from "@/types/chat";

interface UseChatLoaderProps {
  setIsLoadingState: (loading: boolean) => void;
  setMessagesList: (messages: Message[]) => void;
  welcomeMessage: Message;
}

export const useChatLoader = ({
  setIsLoadingState,
  setMessagesList,
  welcomeMessage,
}: UseChatLoaderProps) => {
  const loadChat = useCallback(async (chatId: string) => {
    console.log("useChatLoader: Loading chat for ID:", chatId);
    setIsLoadingState(true);
    try {
      const fetchedMessages = await fetchChatMessagesFromDb(chatId);
      if (fetchedMessages.length === 0) {
        console.log("useChatLoader: No messages found, setting welcome message.");
        setMessagesList([welcomeMessage]);
      } else {
        console.log(`useChatLoader: Fetched ${fetchedMessages.length} messages.`);
        setMessagesList(fetchedMessages);
      }
    } catch (error) {
      console.error('Error in useChatLoader (loading chat):', error);
      setMessagesList([
        welcomeMessage,
        { content: "Failed to load previous messages for this chat.", isBot: true }
      ]);
    } finally {
      setIsLoadingState(false);
    }
  }, [setIsLoadingState, setMessagesList, welcomeMessage]); // fetchChatMessagesFromDb is stable

  return { loadChat };
};
