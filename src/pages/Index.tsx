import { useState, useEffect } from "react";
import { ChatContainer } from "@/components/ChatContainer";
import { ChatInput } from "@/components/ChatInput";
import { useToast } from "@/components/ui/use-toast";

interface Message {
  content: string;
  isBot: boolean;
}

const Index = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    // Load initial welcome message
    setMessages([
      {
        content: "Hi! I'm CHICHA, your friendly AI assistant. How can I help you today?",
        isBot: true,
      },
    ]);
  }, []);

  const handleSendMessage = async (content: string) => {
    // Add user message
    setMessages((prev) => [...prev, { content, isBot: false }]);
    setIsLoading(true);

    try {
      // Simulate AI response for now - we'll integrate OpenAI later
      const response = "I'm currently in development, but I'll be able to help you soon!";
      
      setTimeout(() => {
        setMessages((prev) => [...prev, { content: response, isBot: true }]);
        setIsLoading(false);
      }, 1000);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to get response. Please try again.",
        variant: "destructive",
      });
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-screen flex-col bg-background p-4">
      <div className="mb-4 text-center">
        <h1 className="text-2xl font-bold text-primary">CHICHA</h1>
        <p className="text-sm text-muted-foreground">Your AI Assistant</p>
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