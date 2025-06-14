import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { MessageProcessor } from "./MessageProcessor";

interface Message {
  content: string;
  isBot: boolean;
  isProcessing?: boolean;
  model?: string;
  translatedTo?: string;
  sources?: Array<{
    title: string;
    url: string;
    domain: string;
    icon?: string;
  }>;
}

interface ChatLogicProps {
  currentChatId: string | null;
  onMessagesChange: (messages: Message[]) => void;
  onLoadingChange: (loading: boolean) => void;
}

export const useChatLogic = ({ currentChatId, onMessagesChange, onLoadingChange }: ChatLogicProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Create MessageProcessor instance
  const messageProcessor = MessageProcessor({
    onSend: (messageContentFromHandler: string, options?: { targetLanguage?: string }) => {
      // This callback is used by handlers (like web search, weather) to send their responses.
      // These are always considered bot messages.
      console.log("MessageProcessor.onSend: Adding bot/handler message to messages:", { content: messageContentFromHandler, isBot: true });
      setMessages((prev) => [...prev, { content: messageContentFromHandler, isBot: true }]);
    }
  });

  useEffect(() => {
    onMessagesChange(messages);
  }, [messages, onMessagesChange]);

  useEffect(() => {
    onLoadingChange(isLoading);
  }, [isLoading, onLoadingChange]);

  const handleImageUpload = async (file: File) => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('images')
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (error) {
      console.error('Error uploading image:', error);
      throw error;
    }
  };

  const handleSendMessage = async (content: string, options?: { targetLanguage?: string }) => {
    if (!currentChatId) return;

    const promptLower = content.toLowerCase();
    let detectedLanguage = options?.targetLanguage;
    
    if (promptLower.includes("in urdu") || promptLower.includes("to urdu") || 
        promptLower.includes("respond in urdu") || promptLower.includes("answer in urdu") || 
        promptLower.includes("reply in urdu") || promptLower.includes("using urdu") ||
        promptLower.includes("speak urdu") || promptLower.includes("in the urdu language") || 
        promptLower.includes("urdu language") || promptLower.includes("urdu translation")) {
      detectedLanguage = "ur";
    } else if (promptLower.includes("in hindi") || promptLower.includes("to hindi") || 
               promptLower.includes("respond in hindi") || promptLower.includes("answer in hindi") ||
               promptLower.includes("speak hindi") || promptLower.includes("in the hindi language")) {
      detectedLanguage = "hi";
    } else if (promptLower.includes("in marathi") || promptLower.includes("to marathi") || 
               promptLower.includes("respond in marathi") || promptLower.includes("answer in marathi") ||
               promptLower.includes("in the marathi language")) {
      detectedLanguage = "mr";
    } else if (promptLower.includes("in sanskrit") || promptLower.includes("to sanskrit") || 
               promptLower.includes("respond in sanskrit") || promptLower.includes("answer in sanskrit") ||
               promptLower.includes("in the sanskrit language")) {
      detectedLanguage = "sa";
    } else if (promptLower.includes("in english") || promptLower.includes("to english") || 
               promptLower.includes("respond in english") || promptLower.includes("answer in english") || 
               promptLower.includes("reply in english") || promptLower.includes("using english") ||
               promptLower.includes("speak english") || promptLower.includes("in the english language")) {
      detectedLanguage = "en";
    } else if (promptLower.includes("in arabic") || promptLower.includes("to arabic") || 
               promptLower.includes("respond in arabic") || promptLower.includes("answer in arabic") || 
               promptLower.includes("reply in arabic") || promptLower.includes("using arabic") ||
               promptLower.includes("speak arabic") || promptLower.includes("in the arabic language") ||
               promptLower.includes("arabic language")) {
      detectedLanguage = "ar";
    }

    const searchMatch = content.match(/^\/search\s+(.+)/i);
    
    if (searchMatch) {
      const searchQueryText = searchMatch[1].trim(); // This is the part after "/search ", e.g., "who is modi"
      
      // Add the user's actual search query (e.g., "who is modi") to messages, marked as not from bot.
      console.log("handleSendMessage: Adding user's search query to messages:", { content: searchQueryText, isBot: false });
      setMessages((prev) => [...prev, { content: searchQueryText, isBot: false }]);
      
      // Process the original, full command (e.g., "/search who is modi").
      // The MessageProcessor will use its onSend callback (defined above) to add AI responses.
      await messageProcessor.processMessage(content, [], detectedLanguage);
      return; // Processing for search command is complete.
    }

    // For non-search messages:
    // Add the user's original message to messages, marked as not from bot.
    console.log("handleSendMessage: Adding user's general message to messages:", { content: content, isBot: false });
    setMessages((prev) => [...prev, { content: content, isBot: false }]);

    // Process the message using MessageProcessor (for other handlers like weather, distance, etc.)
    // The `content` here is the original user message.
    const wasProcessedByHandler = await messageProcessor.processMessage(content, [], detectedLanguage);
    
    if (wasProcessedByHandler) {
      // If a handler (e.g., weather) processed it and sent a response via MessageProcessor.onSend,
      // then no need to send to the main AI.
      return;
    }

    // If not processed by any specific handler, send to the main AI.
    console.log("handleSendMessage: Sending message to main AI. Adding processing placeholder.");
    setMessages((prev) => [...prev, { content: "", isBot: true, isProcessing: true }]);
    setIsLoading(true);

    try {
      await supabase
        .from('messages')
        .insert({
          chat_id: currentChatId,
          content: content, // Log the original content from the user
          is_bot: false,
        });

      const { data, error } = await supabase.functions.invoke('chat-with-gemini', {
        body: { 
          prompt: content, 
          targetLanguage: detectedLanguage,
          model: "gemini-pro-1.5"
        },
      });

      if (error) {
        console.error('Supabase function error:', error);
        throw new Error(`Supabase function error: ${error.message || 'Unknown error'}`);
      }

      if (!data || !data.response) {
        throw new Error('Received empty response from AI');
      }

      await supabase
        .from('messages')
        .insert({
          chat_id: currentChatId,
          content: data.response,
          is_bot: true,
        });
      
      console.log("handleSendMessage: Received AI response. Updating messages.");
      setMessages((prev) => [
        ...prev.slice(0, -1), // Remove the processing placeholder
        { 
          content: data.response, 
          isBot: true, 
          sources: data.sources || [],
          model: data.model || "gemini-pro-1.5",
          translatedTo: data.translatedTo
        },
      ]);
    } catch (error) {
      console.error('Error calling Gemini:', error);
      
      console.log("handleSendMessage: Error with AI. Removing processing placeholder if exists and adding error message.");
      setMessages((prev) => {
        // Remove processing message if it's the last one
        if (prev.length > 0 && prev[prev.length - 1].isBot && prev[prev.length - 1].isProcessing) {
          return prev.slice(0, -1);
        }
        return prev;
      });
      
      setMessages((prev) => [
        ...prev,
        { 
          content: "I'm sorry, I encountered an issue processing your request. Please try again or rephrase your question.", 
          isBot: true 
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const loadChat = async (chatId: string) => {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('chat_id', chatId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      const formattedMessages = data.map(msg => ({
        content: msg.content,
        isBot: msg.is_bot,
      }));

      if (formattedMessages.length === 0) {
        formattedMessages.push({
          content: "Welcome to CHICHA AI! How can I help you today? I can chat, answer questions about images you upload, or search the web if you type '/search your query'.",
          isBot: true,
        });
      }

      setMessages(formattedMessages);
    } catch (error) {
      console.error('Error loading chat:', error);
    }
  };

  const resetMessages = () => {
    setMessages([
      {
        content: "Welcome to CHICHA AI! How can I help you today? I can chat, answer questions about images you upload, or search the web if you type '/search your query'.",
        isBot: true,
      },
    ]);
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
