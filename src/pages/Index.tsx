import { Toaster } from "@/components/ui/toaster";
import { ChatContainer } from "@/components/ChatContainer";
import { ChatInput } from "@/components/ChatInput";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { LogOut } from "lucide-react";
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { SidebarProvider } from "@/components/ui/sidebar";
import { ChatSidebar } from "@/components/ChatSidebar";
import { ChatMessage } from "@/types/chat";

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

const Index = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const currentChatId = searchParams.get('chat');

  const { data: chatMessages } = useQuery({
    queryKey: ['messages', currentChatId],
    queryFn: async () => {
      if (!currentChatId) return [];
      
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('chat_id', currentChatId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data as ChatMessage[];
    },
    enabled: !!currentChatId,
  });

  useEffect(() => {
    if (chatMessages) {
      setMessages(chatMessages.map(msg => ({
        content: msg.content,
        isBot: msg.is_bot,
      })));
    } else if (!currentChatId) {
      setMessages([{
        content: "Hi! I'm CHICHA, your friendly AI assistant powered by Gemini. I can search the web to help answer your questions. How can I help you today?",
        isBot: true,
      }]);
    }
  }, [chatMessages, currentChatId]);

  const handleSendMessage = async (content: string) => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Not authenticated');

      // If no chat exists, create one
      let chatId = currentChatId;
      if (!chatId) {
        const { data: newChat, error: chatError } = await supabase
          .from('chat_history')
          .insert([{ user_id: user.user.id }])
          .select()
          .single();

        if (chatError) throw chatError;
        chatId = newChat.id;
        window.history.pushState({}, '', `/?chat=${chatId}`);
      }

      // Add user message to the UI
      setMessages((prev) => [...prev, { content, isBot: false }]);
      
      // Save user message to database
      const { error: msgError } = await supabase
        .from('messages')
        .insert([{
          chat_id: chatId,
          content,
          is_bot: false,
        }]);

      if (msgError) throw msgError;

      // Add processing message
      setMessages((prev) => [...prev, { 
        content: "", 
        isBot: true,
        isProcessing: true 
      }]);
      
      setIsLoading(true);

      // Get AI response
      const { data, error } = await supabase.functions.invoke('chat-with-gemini', {
        body: { prompt: content },
      });

      if (error) throw error;

      // Save AI response to database
      await supabase
        .from('messages')
        .insert([{
          chat_id: chatId,
          content: data.response,
          is_bot: true,
        }]);

      // Update UI with AI response
      setMessages((prev) => [
        ...prev.slice(0, -1),
        { 
          content: data.response, 
          isBot: true,
          sources: data.sources
        }
      ]);
    } catch (error) {
      console.error('Error in chat:', error);
      toast({
        title: "Error",
        description: "Failed to process message. Please try again.",
        variant: "destructive",
      });
      // Remove processing message on error
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <SidebarProvider>
      <div className="flex h-screen w-full">
        <ChatSidebar />
        <div className="flex-1 flex flex-col bg-background p-4 sm:p-6">
          <div className="mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sm:gap-0">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-primary">CHICHA</h1>
              <p className="text-sm font-medium tracking-wide text-muted-foreground">
                Your AI Assistant with Web Search (Powered by Gemini)
              </p>
            </div>
            <Button variant="outline" onClick={handleLogout} className="w-full sm:w-auto">
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </Button>
          </div>
          
          <div className="flex-1 overflow-hidden rounded-lg border bg-card shadow-sm">
            <ChatContainer messages={messages} />
          </div>
          
          <div className="mt-4">
            <ChatInput onSend={handleSendMessage} disabled={isLoading} />
          </div>
          
          <Toaster />
        </div>
      </div>
    </SidebarProvider>
  );
};

export default Index;