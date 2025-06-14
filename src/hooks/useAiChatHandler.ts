
import { useCallback } from "react";
import { callGeminiAI, saveMessageToDb } from "@/services/chatApiService";
import { Message } from "@/types/chat";

interface UseAiChatHandlerProps {
  currentChatId: string | null;
  addProcessingMessage: () => void;
  setIsLoadingState: (loading: boolean) => void;
  replaceLastMessage: (message: Message) => void;
  removeLastMessageIfProcessing: () => void;
  addMessage: (message: Message) => void;
}

export const useAiChatHandler = ({
  currentChatId,
  addProcessingMessage,
  setIsLoadingState,
  replaceLastMessage,
  removeLastMessageIfProcessing,
  addMessage,
}: UseAiChatHandlerProps) => {
  const processWithMainAI = useCallback(async (content: string, detectedLanguage?: string | null) => {
    if (!currentChatId) {
      console.error("useAiChatHandler: currentChatId is null, cannot process message.");
      addMessage({
        content: "Error: No active chat session. Cannot send message.",
        isBot: true,
      });
      return;
    }

    console.log("useAiChatHandler: Processing with main AI. Content:", content, "Lang:", detectedLanguage);
    addProcessingMessage();
    setIsLoadingState(true);

    try {
      const aiResponseData = await callGeminiAI(content, detectedLanguage || undefined);
      
      // Save AI response to DB
      await saveMessageToDb(currentChatId, aiResponseData.response, true);
      
      console.log("useAiChatHandler: Received AI response. Updating messages.");
      replaceLastMessage({
        content: aiResponseData.response,
        isBot: true,
        sources: aiResponseData.sources || [],
        model: aiResponseData.model || "gemini-pro-1.5",
        translatedTo: aiResponseData.translatedTo,
      });
    } catch (error) {
      console.error('Error in useAiChatHandler (calling Gemini or processing AI response):', error);
      removeLastMessageIfProcessing(); // Remove placeholder if it exists
      addMessage({
        content: "I'm sorry, I encountered an issue processing your request with the main AI. Please try again.",
        isBot: true,
      });
    } finally {
      setIsLoadingState(false);
    }
  }, [
    currentChatId,
    addProcessingMessage,
    setIsLoadingState,
    replaceLastMessage,
    removeLastMessageIfProcessing,
    addMessage,
    // callGeminiAI and saveMessageToDb are stable function references from service
  ]);

  return { processWithMainAI };
};
