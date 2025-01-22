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
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
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
    createNewChat();
  }, []);

  useEffect(() => {
    if (transcript) {
      handleSendMessage(transcript);
    }
  }, [transcript]);

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
    } catch (error) {
      console.error('Error creating new chat:', error);
      toast({
        title: "Error",
        description: "Failed to create new chat. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleSendMessage = async (content: string, imageUrl?: string) => {
    if (!currentChatId) return;

    const userMessage = imageUrl 
      ? `${content}\n![Image](${imageUrl})`
      : content;

    setMessages((prev) => [...prev, { content: userMessage, isBot: false }]);
    setMessages((prev) => [...prev, { content: "", isBot: true, isProcessing: true }]);
    setIsLoading(true);

    try {
      // Save user message to database
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

      // Save bot response to database
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

  const handleNewChat = async () => {
    setMessages([
      {
        content: "Hi! I'm CHICHA, your friendly AI assistant powered by Gemini. I can search the web to help answer your questions. How can I help you today?",
        isBot: true,
      },
    ]);
    setIsListening(false);
    stopListening();
    await createNewChat();
  };

  const handleChatHistory = async () => {
    try {
      const { data, error } = await supabase
        .from('chat_history')
        .select(`
          id,
          messages (
            content,
            is_bot,
            created_at
          )
        `)
        .order('created_at', { ascending: true })
        .single();
      
      if (error) throw error;
      if (!data) throw new Error('No chat history found');

      const chatMessages = data.messages.map((msg: any) => ({
        content: msg.content,
        isBot: msg.is_bot,
      }));

      setMessages(chatMessages);
      setCurrentChatId(data.id);
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
    <div className="flex h-screen bg-background">
      {/* Sidebar - 30% width */}
      <div className="w-[30%] min-w-[250px] h-full border-r border-border bg-card p-4 flex flex-col">
        <div className="space-y-4">
          <Button variant="outline" onClick={handleNewChat} className="w-full">
            New Chat
          </Button>
          <Button variant="outline" onClick={handleChatHistory} className="w-full">
            Chat History
          </Button>
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

      {/* Main Chat Interface - 70% width */}
      <div className="flex-1 flex flex-col h-full p-4">
        <div className="mb-4">
          <h1 className="text-2xl font-bold tracking-tight text-primary">CHICHA</h1>
          <p className="text-sm text-muted-foreground">
            Your AI Assistant with Web Search (Powered by Gemini)
          </p>
        </div>

        <div className="flex-1 overflow-hidden rounded-lg border bg-card shadow-sm">
          <ChatContainer messages={messages} />
        </div>

        <div className="mt-4 flex items-center gap-2">
          <div className="flex-1">
            <ChatInput onSend={handleSendMessage} disabled={isLoading} />
          </div>
          <Button 
            variant="outline" 
            onClick={isListening ? handleStopListening : handleStartListening}
            className="flex-shrink-0"
          >
            {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
          </Button>
        </div>

        {interimTranscript && (
          <div className="mt-2 text-muted-foreground">
            <p>Listening: {interimTranscript}</p>
          </div>
        )}
      </div>

      <Toaster />
    </div>
  );
};

export default Index;