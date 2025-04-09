
import { Toaster } from "@/components/ui/toaster";
import { ChatContainer } from "@/components/ChatContainer";
import { ChatInput } from "@/components/ChatInput";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { LogOut, Plus, Trash2, ChevronLeft, ChevronRight, Home, Globe } from "lucide-react";
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
    return window.innerWidth >= 768; // Default visible on desktop, hidden on mobile
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
            content: "Hi! I'm CHICHA, your friendly AI assistant. I can search the web to help answer your questions and translate content into multiple languages including English, Hindi, Marathi, Sanskrit, Urdu (اردو), and Arabic (العربية). How can I help you today?",
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
      fetchChatHistory(); // Refresh chat history
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
          content: "Hi! I'm CHICHA, your friendly AI assistant. I can search the web to help answer your questions and translate content into multiple languages including English, Hindi, Marathi, Sanskrit, Urdu (اردو), and Arabic (العربية). How can I help you today?",
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

    // Check if user is requesting a response in a specific language
    const promptLower = content.toLowerCase();
    let detectedLanguage = options?.targetLanguage;
    
    // Detect language requests in the prompt
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
        content: "Hi! I'm CHICHA, your friendly AI assistant powered by Gemini. I can search the web to help answer your questions and translate content into multiple languages including English, Hindi, Marathi, Sanskrit, Urdu (اردو), and Arabic (العربية). How can I help you today?",
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

  const toggleSidebar = () => {
    setIsSidebarVisible(!isSidebarVisible);
  };

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Backdrop overlay for mobile */}
      {isMobileView && isSidebarVisible && (
        <div 
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-30"
          onClick={() => setIsSidebarVisible(false)}
        />
      )}

      {/* Sidebar */}
      <aside 
        className={`
          ${isMobileView ? 'fixed' : 'relative'} 
          z-40 h-full w-[250px]
          transition-all duration-300 ease-in-out
          ${isSidebarVisible ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        <div className="w-full h-full border-r border-border bg-card p-2 md:p-4 flex flex-col">
          {/* Close button - only on mobile */}
          {isMobileView && (
            <Button 
              variant="ghost" 
              onClick={() => setIsSidebarVisible(false)} 
              size="sm" 
              className="mb-4 self-end"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
          )}
          
          <div className="space-y-4">
            <Button 
              variant="outline" 
              onClick={() => navigate("/home")} 
              className="w-full flex items-center gap-2"
            >
              <Home className="h-4 w-4" />
              Back to Home
            </Button>
            <Button 
              variant="outline" 
              onClick={handleNewChat} 
              className="w-full flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              New Chat
            </Button>
            <div className="space-y-2">
              {chatHistory.map((chat) => (
                <div key={chat.id} className="flex items-center gap-2">
                  <Button
                    variant={currentChatId === chat.id ? "secondary" : "ghost"}
                    onClick={() => loadChat(chat.id)}
                    className="flex-1 justify-start text-left truncate"
                  >
                    {chat.title || "New Chat"}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDeleteChat(chat.id)}
                    className="h-8 w-8 flex-shrink-0"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
          <Button 
            variant="outline" 
            onClick={handleLogout} 
            className="mt-auto mb-4"
          >
            <LogOut className="mr-2 h-4 w-4" />
            Logout
          </Button>
        </div>
      </aside>

      {/* Toggle button - visible when sidebar is hidden */}
      {!isSidebarVisible && (
        <button
          className="fixed z-50 top-4 left-4 p-2 bg-background/95 border border-border rounded-md shadow-md hover:bg-accent transition-colors"
          onClick={() => setIsSidebarVisible(true)}
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      )}

      {/* Main content area */}
      <div 
        className="flex-1 flex flex-col h-full w-full overflow-hidden transition-all duration-300 ease-in-out"
        style={{
          marginLeft: isMobileView ? 0 : (isSidebarVisible ? '0' : '0'),
        }}
      >
        {/* Header section */}
        <div className="mb-2 md:mb-4 text-center flex items-center justify-between w-full">
          <div className="flex-1 flex items-center">
            {isSidebarVisible && (
              <Button 
                variant="ghost" 
                onClick={toggleSidebar}
                className="md:hidden mr-2"
                size="sm"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
            )}
          </div>
          
          <div className="flex items-center justify-center gap-2">
            <img 
              src="/lovable-uploads/8af0d91e-2677-445f-9de9-657b8af84348.png" 
              alt="CHICHA Logo" 
              className="w-10 h-10 md:w-16 md:h-16 object-contain"
            />
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-primary">
              CHICHA
            </h1>
          </div>
          
          <div className="flex-1 flex justify-end">
            <Button 
              variant="outline" 
              onClick={handleNewChat}
              size="sm"
              className="ml-auto"
            >
              <Plus className="h-4 w-4" />
              <span className="hidden md:inline ml-1">New Chat</span>
            </Button>
          </div>
        </div>

        <p className="text-xs md:text-sm text-muted-foreground text-center mb-2 md:mb-4">
          Your AI Assistant with Web Search and Translation (English, Hindi, Marathi, Sanskrit, Urdu, Arabic)
        </p>

        {/* Chat container */}
        <div className="flex-1 overflow-hidden rounded-lg border bg-card shadow-sm">
          <ChatContainer messages={messages} />
        </div>

        {/* Input section */}
        <div className="mt-2 md:mt-4">
          <ChatInput 
            onSend={handleSendMessage} 
            isLoading={isLoading}
            onImageSelect={setSelectedImage}
          />
        </div>

        {/* Selected image indicator */}
        {selectedImage && (
          <div className="mt-2 flex items-center gap-2 text-xs md:text-sm">
            <span className="text-muted-foreground truncate">
              {selectedImage.name}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedImage(null)}
            >
              Remove
            </Button>
          </div>
        )}
      </div>

      <Toaster />
    </div>
  );
};

export default Index;
