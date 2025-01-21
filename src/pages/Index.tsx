import { Toaster } from "@/components/ui/toaster";
import { ChatContainer } from "@/components/ChatContainer";
import { ChatInput } from "@/components/ChatInput";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { LogOut, Mic, MicOff } from "lucide-react";
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

const Index = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const { toast } = useToast();
  const {
    transcript,
    interimTranscript,
    isError,
    errorMessage,
    startListening,
    stopListening,
  } = useSpeechRecognition();

  useEffect(() => {
    setMessages([
      {
        content: "Hi! I'm CHICHA, your friendly AI assistant powered by Gemini. I can search the web to help answer your questions. How can I help you today?",
        isBot: true,
      },
    ]);
  }, []);

  useEffect(() => {
    if (transcript) {
      handleSendMessage(transcript);
    }
  }, [transcript]);

  const handleSendMessage = async (content: string) => {
    setMessages((prev) => [...prev, { content, isBot: false }]);
    setMessages((prev) => [...prev, { content: "", isBot: true, isProcessing: true }]);
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('chat-with-gemini', {
        body: { prompt: content },
      });

      if (error) throw error;

      setMessages((prev) => [
        ...prev.slice(0, -1),
        { content: data.response, isBot: true, sources: data.sources || [] },
      ]);
    } catch (error) {
      console.error('Error calling Gemini:', error);
      toast({
        title: "Error",
        description: "Failed to get response from AI. Please try again.",
        variant: "destructive",
      });
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartListening = () => {
    setIsListening(true);
    startListening();
  };

  const handleStopListening = () => {
    setIsListening(false);
    stopListening();
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      window.location.reload();
    } catch (error) {
      console.error('Error signing out:', error);
      toast({
        title: "Error",
        description: "Failed to sign out. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleNewChat = () => {
    setMessages([
      {
        content: "Hi! I'm CHICHA, your friendly AI assistant powered by Gemini. I can search the web to help answer your questions. How can I help you today?",
        isBot: true,
      },
    ]);
    setIsListening(false);
    stopListening();
  };

  const handleChatHistory = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('get-chat-history', {
        method: 'GET'
      });
      
      if (error) throw error;
      if (!data || !Array.isArray(data)) throw new Error('Invalid response format');

      // Convert the chat history format to messages format
      const chatMessages = data.length > 0 ? data[0].messages.map((msg: any) => ({
        content: msg.content,
        isBot: msg.is_bot,
      })) : [];

      setMessages(chatMessages);
    } catch (error) {
      console.error('Error getting chat history:', error);
      toast({
        title: "Error",
        description: "Failed to get chat history. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="flex h-screen flex-col bg-background p-4 sm:p-6 font-sans">
      <div className="flex flex-row h-full">
        <div className="w-1/4 p-4 border-r">
          <Button variant="outline" onClick={handleNewChat} className="w-full mb-4">
            New Chat
          </Button>
          <Button variant="outline" onClick={handleChatHistory} className="w-full">
            Chat History
          </Button>
        </div>
        <div className="flex-1 flex flex-col">
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

          <div className="mt-4 flex items-center">
            <ChatInput onSend={handleSendMessage} disabled={isLoading} />
            <Button variant="outline" onClick={isListening ? handleStopListening : handleStartListening} className="ml-2">
              {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            </Button>
          </div>

          {interimTranscript && (
            <div className="mt-2 text-muted-foreground">
              <p>Listening: {interimTranscript}</p>
            </div>
          )}

          <Toaster />
        </div>
      </div>
    </div>
  );
};

export default Index;