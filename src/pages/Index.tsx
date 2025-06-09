
import { Toaster } from "@/components/ui/toaster";
import { ChatContainer } from "@/components/ChatContainer";
import { ChatInput } from "@/components/ChatInput";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { LogOut, Plus, Trash2, Settings, Home } from "lucide-react";
import { useState, useEffect } from "react";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { useNavigate } from "react-router-dom";

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

interface ChatHistory {
  id: string;
  title: string;
  created_at: string;
}

const Index = () => {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [chatHistory, setChatHistory] = useState<ChatHistory[]>([]);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [isSidebarVisible, setIsSidebarVisible] = useState(() => {
    return window.innerWidth >= 768;
  });
  const [isMobileView, setIsMobileView] = useState(window.innerWidth < 768);
  const { transcript, isListening, startListening, stopListening } = useSpeechRecognition();

  useEffect(() => {
    const initializeChat = async () => {
      const history = await fetchChatHistory();
      if (history.length === 0) {
        await createNewChat();
        setMessages([
          {
            content: "Welcome to CHICHA AI! How can I help you today? I can chat, answer questions about images you upload, or search the web if you type '/search your query'.",
            isBot: true,
          },
        ]);
      } else {
        const mostRecentChat = history[0];
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

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobileView(mobile);
      if (!mobile && !isSidebarVisible) {
        setIsSidebarVisible(true);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isSidebarVisible]);

  const fetchChatHistory = async () => {
    try {
      const { data, error } = await supabase
        .from('chat_history')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setChatHistory(data);
      return data;
    } catch (error) {
      console.error('Error fetching chat history:', error);
      return [];
    }
  };

  const createNewChat = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('chat_history')
        .insert({ user_id: user.id })
        .select()
        .single();

      if (error) throw error;
      setCurrentChatId(data.id);
      fetchChatHistory();
    } catch (error) {
      console.error('Error creating new chat:', error);
    }
  };

  const handleDeleteChat = async (chatId: string) => {
    try {
      const { error } = await supabase
        .from('chat_history')
        .delete()
        .eq('id', chatId);

      if (error) throw error;

      setChatHistory(prev => prev.filter(chat => chat.id !== chatId));
      
      if (chatId === currentChatId) {
        handleNewChat();
      }
    } catch (error) {
      console.error('Error deleting chat:', error);
    }
  };

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
      setCurrentChatId(chatId);
    } catch (error) {
      console.error('Error loading chat:', error);
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

    let imageUrl = null;
    if (selectedImage) {
      try {
        imageUrl = await handleImageUpload(selectedImage);
        setSelectedImage(null);
      } catch (error) {
        console.error('Failed to upload image:', error);
        return;
      }
    }

    const userMessage = imageUrl 
      ? `${content}\n![Image](${imageUrl})`
      : content;

    setMessages((prev) => [...prev, { content: userMessage, isBot: false }]);
    setMessages((prev) => [...prev, { content: "", isBot: true, isProcessing: true }]);
    setIsLoading(true);

    try {
      await supabase
        .from('messages')
        .insert({
          chat_id: currentChatId,
          content: userMessage,
          is_bot: false,
        });

      const { data, error } = await supabase.functions.invoke('chat-with-gemini', {
        body: { 
          prompt: content, 
          imageUrl,
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

  const handleNewChat = async () => {
    setMessages([
      {
        content: "Welcome to CHICHA AI! How can I help you today? I can chat, answer questions about images you upload, or search the web if you type '/search your query'.",
        isBot: true,
      },
    ]);
    await createNewChat();
  };

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const formatChatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
  };

  return (
    <div className="w-full h-screen flex bg-gray-50 overflow-hidden">
      {/* Backdrop overlay for mobile */}
      {isMobileView && isSidebarVisible && (
        <div 
          className="fixed inset-0 bg-black/50 z-30"
          onClick={() => setIsSidebarVisible(false)}
        />
      )}

      {/* Sidebar */}
      <aside 
        className={`
          ${isMobileView ? 'fixed' : 'relative'} 
          z-40 h-full w-[300px] bg-white border-r border-gray-200 flex-shrink-0
          transition-all duration-300 ease-in-out
          ${isSidebarVisible ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        <div className="w-full h-full flex flex-col">
          {/* Header */}
          <div className="p-4 border-b border-gray-200 flex-shrink-0">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 bg-teal-500 rounded-lg flex items-center justify-center">
                <span className="text-white text-sm font-bold">💬</span>
              </div>
              <h1 className="text-xl font-bold text-gray-900">CHICHA</h1>
            </div>
            <div className="text-xs text-gray-500 mb-2">CHICHA AI Logo</div>
          </div>

          {/* New Chat Button */}
          <div className="p-4 flex-shrink-0">
            <Button 
              onClick={handleNewChat} 
              className="w-full bg-teal-500 hover:bg-teal-600 text-white rounded-lg py-3 flex items-center justify-center gap-2"
            >
              <Plus className="h-4 w-4" />
              New Chat
            </Button>
          </div>

          {/* Chat History */}
          <div className="flex-1 overflow-y-auto px-4 min-h-0">
            {chatHistory.map((chat) => (
              <div 
                key={chat.id} 
                className={`
                  flex items-center justify-between p-3 mb-2 rounded-lg cursor-pointer
                  ${currentChatId === chat.id ? 'bg-teal-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}
                `}
                onClick={() => loadChat(chat.id)}
              >
                <div className="flex-1">
                  <div className="text-sm font-medium">
                    Chat - {formatChatTime(chat.created_at)}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteChat(chat.id);
                  }}
                  className={`h-6 w-6 ${currentChatId === chat.id ? 'text-white hover:text-gray-200' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-gray-200 space-y-2 flex-shrink-0">
            <Button 
              variant="ghost" 
              onClick={() => navigate("/home")} 
              className="w-full justify-start text-gray-600 hover:text-gray-900 hover:bg-gray-100"
            >
              <Home className="h-4 w-4 mr-2" />
              Back to Home
            </Button>
            <Button 
              variant="ghost" 
              className="w-full justify-start text-gray-600 hover:text-gray-900 hover:bg-gray-100"
            >
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </Button>
            <Button 
              variant="ghost" 
              onClick={handleLogout} 
              className="w-full justify-start text-gray-600 hover:text-gray-900 hover:bg-gray-100"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </aside>

      {/* Main content area */}
      <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {!isSidebarVisible && (
                <Button 
                  variant="ghost" 
                  onClick={() => setIsSidebarVisible(true)}
                  size="sm"
                >
                  ☰
                </Button>
              )}
              <div className="w-8 h-8 bg-teal-500 rounded-lg flex items-center justify-center">
                <span className="text-white text-sm font-bold">💬</span>
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  CHICHA Chat - {new Date().toLocaleTimeString('en-US', { 
                    hour: '2-digit', 
                    minute: '2-digit',
                    hour12: true 
                  })}
                </h2>
              </div>
            </div>
            {isSidebarVisible && !isMobileView && (
              <Button 
                variant="ghost" 
                onClick={() => setIsSidebarVisible(false)}
                size="sm"
              >
                ←
              </Button>
            )}
          </div>
        </div>

        {/* Chat container */}
        <div className="flex-1 min-h-0 overflow-hidden bg-white">
          <ChatContainer messages={messages} />
        </div>

        {/* Input section */}
        <div className="bg-white border-t border-gray-200 p-4 flex-shrink-0">
          <ChatInput 
            onSend={handleSendMessage} 
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
