import { Toaster } from "@/components/ui/toaster";
import { ChatContainer } from "@/components/ChatContainer";
import { ChatInput } from "@/components/ChatInput";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { LogOut, Plus, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import { useState, useEffect } from "react";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";

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
  const [isSidebarVisible, setIsSidebarVisible] = useState(true);
  const [isButtonVisible, setIsButtonVisible] = useState(true);
  const { toast } = useToast();
  const { transcript, isListening, startListening, stopListening } = useSpeechRecognition();

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
          content: "Hi! I'm CHICHA, your friendly AI assistant . How can I help you today?",
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

  const handleSendMessage = async (content: string, imageUrls?: string[]) => {
    if (!currentChatId) return;

    setMessages((prev) => [...prev, { content, isBot: false }]);
    setMessages((prev) => [...prev, { content: "", isBot: true, isProcessing: true }]);
    setIsLoading(true);

    try {
      await supabase
        .from('messages')
        .insert({
          chat_id: currentChatId,
          content: content,
          is_bot: false,
        });

      const { data, error } = await supabase.functions.invoke('chat-with-gemini', {
        body: { prompt: content, imageUrls },
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
    setIsSidebarVisible(!isSidebarVisible);
  };

  return (
    <div className="flex h-screen bg-background">
      {isSidebarVisible && (
        <div className="w-[20%] min-w-[250px] h-full border-r border-border bg-card p-4 flex flex-col">
          <Button 
            variant="outline" 
            onClick={toggleSidebar} 
            size="sm" 
            className="mb-4 self-end"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="space-y-4">
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
      )}
      {!isSidebarVisible && isButtonVisible && (
        <div 
          className="absolute top-4 left-0 h-10 w-10 flex items-center justify-center hover:w-12 hover:h-12 transition-all duration-300"
          onMouseEnter={() => setIsSidebarVisible(true)}
          onMouseLeave={() => setIsButtonVisible(false)}
        >
          <Button 
            variant="outline" 
            onClick={toggleSidebar} 
            size="sm"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      <div className="flex-1 flex flex-col h-full p-4" style={{ width: isSidebarVisible ? '80%' : '100%' }}>
        <div className="mb-4 text-center">
          <div className="flex items-center justify-center gap-2">
            <img 
              src="/lovable-uploads/8af0d91e-2677-445f-9de9-657b8af84348.png" 
              alt="CHICHA Logo" 
              className="w-16 h-16 object-contain"
            />
            <h1 className="text-2xl font-bold tracking-tight text-primary whitespace-nowrap overflow-hidden text-ellipsis">
              CHICHA
            </h1>
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            Your AI Assistant with Web Search (Powered by Gemini)
          </p>
        </div>

        <div className="flex-1 overflow-hidden rounded-lg border bg-card shadow-sm">
          <ChatContainer messages={messages} />
        </div>

        <div className="mt-4">
          <ChatInput 
            onSend={handleSendMessage} 
            isLoading={isLoading} 
          />
        </div>
      </div>

      <Toaster />
    </div>
  );
};

export default Index;