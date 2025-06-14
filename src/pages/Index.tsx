
import { Toaster } from "@/components/ui/toaster";
import { ChatContainer } from "@/components/ChatContainer";
import { ChatInput } from "@/components/ChatInput";
import { useState, useEffect } from "react";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { useChatLogic } from "@/components/chat/ChatLogic";
import { useChatSidebar, ChatSidebar } from "@/components/chat/ChatSidebar";
import { ChatHeader } from "@/components/chat/ChatHeader";

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

const Index = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const { transcript } = useSpeechRecognition();

  const {
    chatHistory,
    currentChatId,
    setCurrentChatId,
    isSidebarVisible,
    isMobileView,
    fetchChatHistory,
    createNewChat,
    toggleSidebar
  } = useChatSidebar();

  const {
    handleSendMessage,
    loadChat,
    resetMessages
  } = useChatLogic({
    currentChatId,
    onMessagesChange: setMessages,
    onLoadingChange: setIsLoading
  });

  useEffect(() => {
    const initializeChat = async () => {
      const history = await fetchChatHistory();
      if (history.length === 0) {
        const newChatId = await createNewChat();
        if (newChatId) {
          setCurrentChatId(newChatId);
        }
        resetMessages();
      } else {
        const mostRecentChat = history[0];
        setCurrentChatId(mostRecentChat.id);
        await loadChat(mostRecentChat.id);
      }
    };

    initializeChat();
  }, []);

  useEffect(() => {
    if (transcript && transcript.trim()) {
      handleSendMessage(transcript);
    }
  }, [transcript]);

  const handleChatSelect = async (chatId: string) => {
    setCurrentChatId(chatId);
    await loadChat(chatId);
  };

  const handleNewChat = async () => {
    resetMessages();
    const newChatId = await createNewChat();
    if (newChatId) {
      setCurrentChatId(newChatId);
    }
  };

  const handleSendMessageWithImage = async (content: string, options?: { targetLanguage?: string }) => {
    let imageUrl = null;
    if (selectedImage) {
      try {
        // Handle image upload logic here if needed
        setSelectedImage(null);
      } catch (error) {
        console.error('Failed to upload image:', error);
        return;
      }
    }

    await handleSendMessage(content, options);
  };

  return (
    <div className="w-full h-screen flex bg-gray-50 overflow-hidden">
      <ChatSidebar
        currentChatId={currentChatId}
        onChatSelect={handleChatSelect}
        onNewChatCreate={handleNewChat}
        isSidebarVisible={isSidebarVisible}
        onSidebarToggle={toggleSidebar}
        isMobileView={isMobileView}
      />

      {/* Main content area */}
      <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden">
        <ChatHeader onSidebarToggle={toggleSidebar} />

        {/* Chat container */}
        <div className="flex-1 min-h-0 overflow-hidden bg-white">
          <ChatContainer messages={messages} />
        </div>

        {/* Input section */}
        <div className="bg-white border-t border-gray-200 p-4 flex-shrink-0">
          <ChatInput 
            onSend={handleSendMessageWithImage} 
            isLoading={isLoading}
            onImageSelect={setSelectedImage}
          />
        </div>
      </div>
      <Toaster />
    </div>
  );
};

export default Index;
