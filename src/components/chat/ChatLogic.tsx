
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
    onSend: (message: string, options?: { targetLanguage?: string }) => {
      // Only add AI responses, never add user messages here
      setMessages((prev) => [...prev, { content: message, isBot: true }]);
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

    // Determine what to show as the user message - always show the original user input
    let userDisplayMessage = content;
    
    // For search commands, show only the search query to the user
    const searchMatch = content.match(/^\/search\s+(.+)/i);
    if (searchMatch) {
      userDisplayMessage = searchMatch[1].trim();
    }

    // Add user message first (only the clean user input)
    setMessages((prev) => [...prev, { content: userDisplayMessage, isBot: false }]);

    // Process the message using MessageProcessor (pass original content with any commands)
    const wasProcessed = await messageProcessor.processMessage(content, [], detectedLanguage);
    
    // If it was processed by a handler (like web search), don't send to AI
    if (wasProcessed) {
      return;
    }

    // If not processed by handlers, send to AI as normal
    setMessages((prev) => [...prev, { content: "", isBot: true, isProcessing: true }]);
    setIsLoading(true);

    try {
      await supabase
        .from('messages')
        .insert({
          chat_id: currentChatId,
          content: userDisplayMessage,
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

      setMessages((prev) => [
        ...prev.slice(0, -1),
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
      
      setMessages((prev) => {
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
