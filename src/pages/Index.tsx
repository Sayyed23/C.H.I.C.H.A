import { Toaster } from "@/components/ui/toaster";
import { ChatContainer } from "@/components/ChatContainer";
import { ChatInput } from "@/components/ChatInput";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Menu } from "lucide-react";
import { useState, useEffect } from "react";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import { AppSidebar } from "../components/AppSidebar";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";

interface Message {
  content: string;
  isBot: boolean;
  isProcessing?: boolean;
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
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [chatHistory, setChatHistory] = useState<ChatHistory[]>([]);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const { toast } = useToast();
  const { transcript, isListening, startListening, stopListening } = useSpeechRecognition();
  const isMobile = useIsMobile();

  useEffect(() => {
    const initializeChat = async () => {
      const history = await fetchChatHistory();
      if (history.length === 0) {
        await createNewChat();
        setMessages([
          {
            content: "Hi! I'm CHICHA, your friendly AI assistant . How can I help you today?",
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
      toast({
        title: "Error",
        description: "Failed to fetch chat history",
        variant: "destructive",
      });
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
      toast({
        title: "Error",
        description: "Failed to create new chat",
        variant: "destructive",
      });
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

      toast({
        title: "Success",
        description: "Chat deleted successfully",
      });
    } catch (error) {
      console.error('Error deleting chat:', error);
      toast({
        title: "Error",
        description: "Failed to delete chat",
        variant: "destructive",
      });
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
          content: "Hi! I'm CHICHA, your friendly AI assistant. How can I help you today?",
          isBot: true,
        });
      }

      setMessages(formattedMessages);
      setCurrentChatId(chatId);
    } catch (error) {
      console.error('Error loading chat:', error);
      toast({
        title: "Error",
        description: "Failed to load chat history",
        variant: "destructive",
      });
    }
  };

  const handleSendMessage = async (content: string) => {
    if (!currentChatId) return;

    let imageUrl = null;
    if (selectedImage) {
      try {
        imageUrl = await handleImageUpload(selectedImage);
        setSelectedImage(null);
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to upload image",
          variant: "destructive",
        });
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
        body: { prompt: content, imageUrl },
      });

      if (error) throw error;

      await supabase
        .from('messages')
        .insert({
          chat_id: currentChatId,
          content: data.response,
          is_bot: true,
        });

      setMessages((prev) => [
        ...prev.slice(0, -1),
        { content: data.response, isBot: true, sources: data.sources || [] },
      ]);
    } catch (error) {
      console.error('Error calling Gemini:', error);
      toast({
        title: "Error",
        description: "Failed to get response from AI",
        variant: "destructive",
      });
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setIsLoading(false);
    }
  };

  const handleNewChat = async () => {
    setMessages([
      {
        content: "Hi! I'm CHICHA, your friendly AI assistant. How can I help you today?",
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
      toast({
        title: "Error",
        description: "Failed to sign out",
        variant: "destructive",
      });
    }
  };

  const toggleSidebar = () => {
    if (isMobile) {
      document.body.style.overflow = 'auto';
    }
  };

  return (
    <SidebarProvider>
      <div className="flex h-screen w-full bg-background overflow-hidden">
        <AppSidebar 
          chatHistory={chatHistory}
          currentChatId={currentChatId}
          onChatSelect={loadChat}
          onNewChat={handleNewChat}
          onDeleteChat={handleDeleteChat}
        />

        <div className="flex-1 flex flex-col min-h-0">
          {/* Mobile Header */}
          <div className="sticky top-0 z-40 bg-background border-b border-border p-4 flex items-center justify-between sm:hidden">
            <SidebarTrigger />
            <div className="flex items-center gap-2">
              <img 
                src="/lovable-uploads/97c0654d-b95a-4ba5-b4de-e9261711ede4.png" 
                alt="CHICHA Logo" 
                className="w-8 h-8"
              />
              <h1 className="text-xl font-bold text-primary">CHICHA</h1>
            </div>
            <div className="w-10" /> {/* Spacer for alignment */}
          </div>

          {/* Desktop Header */}
          <div className="hidden sm:block p-4 border-b border-border">
            <div className="flex items-center justify-between">
              <SidebarTrigger />
              <div className="flex items-center gap-2">
                <img 
                  src="/lovable-uploads/97c0654d-b95a-4ba5-b4de-e9261711ede4.png" 
                  alt="CHICHA Logo" 
                  className="w-10 h-10"
                />
                <h1 className="text-2xl font-bold tracking-tight text-primary">
                  CHICHA
                </h1>
              </div>
              <div className="w-10" /> {/* Spacer for alignment */}
            </div>
          </div>

          {/* Chat Container */}
          <div className="flex-1 overflow-hidden">
            <div className="h-full flex flex-col">
              <div className="flex-1 overflow-hidden">
                <ChatContainer messages={messages} />
              </div>
              <div className="p-4 border-t border-border">
                <ChatInput 
                  onSend={handleSendMessage} 
                  isLoading={isLoading} 
                  onImageSelect={setSelectedImage}
                />
                {selectedImage && (
                  <div className="mt-2 flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">
                      Selected image: {selectedImage.name}
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
            </div>
          </div>
        </div>
      </div>
      <Toaster />
    </SidebarProvider>
  );
};

export default Index;