
import { useCallback } from "react";
import { MessageProcessor } from "./MessageProcessor";
import { useMessageManager } from "@/hooks/useMessageManager";
import { 
  uploadChatImage, 
  saveMessageToDb, 
  callGeminiAI, 
  fetchChatMessagesFromDb 
} from "@/services/chatApiService";
import { detectLanguageInPrompt } from "@/utils/languageDetector";
import { Message } from "@/types/chat"; // Import Message type

interface ChatLogicProps {
  currentChatId: string | null;
  onMessagesChange: (messages: Message[]) => void;
  onLoadingChange: (loading: boolean) => void;
}

const WELCOME_MESSAGE: Message = {
  content: "Welcome to CHICHA AI! How can I help you today? I can chat, answer questions about images you upload, or search the web if you type '/search your query'.",
  isBot: true,
};

export const useChatLogic = ({ currentChatId, onMessagesChange, onLoadingChange }: ChatLogicProps) => {
  const {
    messages,
    isLoading,
    addMessage,
    addProcessingMessage,
    replaceLastMessage,
    removeLastMessageIfProcessing,
    setMessagesList,
    setIsLoadingState,
  } = useMessageManager({ 
    initialMessages: [WELCOME_MESSAGE], 
    onMessagesChange, 
    onLoadingChange 
  });

  const messageProcessor = MessageProcessor({
    onSend: useCallback((messageContentFromHandler: string, _options?: { targetLanguage?: string }) => {
      console.log("MessageProcessor.onSend: Adding bot/handler message:", { content: messageContentFromHandler, isBot: true });
      addMessage({ content: messageContentFromHandler, isBot: true });
    }, [addMessage])
  });

  const handleImageUpload = async (file: File) => {
    // No need to set loading state here, as it's usually tied to message sending
    return uploadChatImage(file);
  };

  const handleSendMessage = async (content: string, options?: { targetLanguage?: string }) => {
    if (!currentChatId) return;

    const userMessage: Message = { content, isBot: false };
    console.log("handleSendMessage: Adding user message:", userMessage);
    addMessage(userMessage);
    await saveMessageToDb(currentChatId, content, false);

    const detectedLanguage = options?.targetLanguage || detectLanguageInPrompt(content);

    const searchMatch = content.match(/^\/search\s+(.+)/i);
    if (searchMatch) {
      // For /search, MessageProcessor will handle adding the AI response via its onSend callback.
      // The user's original "/search query" is already added above.
      // We just need to call processMessage with the full command.
      await messageProcessor.processMessage(content, [], detectedLanguage);
      return;
    }
    
    // Try other handlers
    const wasProcessedByHandler = await messageProcessor.processMessage(content, [], detectedLanguage);
    if (wasProcessedByHandler) {
      // If a handler processed it and sent a response via MessageProcessor.onSend, we're done.
      return;
    }

    // If not processed by any specific handler, send to the main AI.
    console.log("handleSendMessage: Sending message to main AI. Adding processing placeholder.");
    addProcessingMessage();
    setIsLoadingState(true);

    try {
      const aiResponseData = await callGeminiAI(content, detectedLanguage);
      
      await saveMessageToDb(currentChatId, aiResponseData.response, true);
      
      console.log("handleSendMessage: Received AI response. Updating messages.");
      replaceLastMessage({
        content: aiResponseData.response,
        isBot: true,
        sources: aiResponseData.sources || [],
        model: aiResponseData.model || "gemini-pro-1.5",
        translatedTo: aiResponseData.translatedTo
      });
    } catch (error) {
      console.error('Error calling Gemini or processing AI response:', error);
      removeLastMessageIfProcessing(); // Remove placeholder if it exists
      addMessage({
        content: "I'm sorry, I encountered an issue processing your request. Please try again or rephrase your question.",
        isBot: true,
      });
    } finally {
      setIsLoadingState(false);
    }
  };

  const loadChat = async (chatId: string) => {
    setIsLoadingState(true);
    try {
      const fetchedMessages = await fetchChatMessagesFromDb(chatId);
      if (fetchedMessages.length === 0) {
        setMessagesList([WELCOME_MESSAGE]);
      } else {
        setMessagesList(fetchedMessages);
      }
    } catch (error) {
      console.error('Error loading chat:', error);
      setMessagesList([
        WELCOME_MESSAGE,
        { content: "Failed to load previous messages.", isBot: true }
      ]);
    } finally {
      setIsLoadingState(false);
    }
  };

  const resetMessages = () => {
    setMessagesList([WELCOME_MESSAGE]);
  };

  return {
    messages,
    isLoading,
    handleSendMessage,
    loadChat,
    resetMessages,
    handleImageUpload
  };
};
