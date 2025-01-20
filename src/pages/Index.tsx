import { Toaster } from "@/components/ui/toaster";
import { ChatContainer } from "@/components/ChatContainer";
import { ChatInput } from "@/components/ChatInput";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { LogOut } from "lucide-react";
import { useState, useEffect } from "react";

interface Message {
  content: string;
  isBot: boolean;
}

const Index = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    setMessages([
      {
        content: "Hi! I'm CHICHA, your friendly AI assistant powered by Gemini. I can search the web to help answer your questions. How can I help you today?",
        isBot: true,
      },
    ]);
  }, []);

  const handleSendMessage = async (content: string) => {
    setMessages((prev) => [...prev, { content, isBot: false }]);
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('chat-with-gemini', {
        body: { prompt: content },
      });

      if (error) throw error;

      setMessages((prev) => [...prev, { content: data.response, isBot: true }]);
    } catch (error) {
      console.error('Error calling Gemini:', error);
      toast({
        title: "Error",
        description: "Failed to get response from AI. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <div className="flex h-screen flex-col bg-background p-4 sm:p-6 font-sans">
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
    </div>
  );
};

export default Index;