
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Bot, Sparkles, FileSearch, Book, MessageSquare } from "lucide-react";

const Home = () => {
  const navigate = useNavigate();
  const [selectedTab, setSelectedTab] = useState("all");

  const chatbots = [
    {
      id: "gemini",
      name: "CHICHA (Gemini)",
      description: "Your AI Virtual Assistant with Web Search Powered by Google Gemini",
      icon: <Sparkles className="h-8 w-8 text-purple-500" />,
      category: "ai",
    },
    {
      id: "research",
      name: "Research Assistant",
      description: "Help with academic research and paper summaries",
      icon: <FileSearch className="h-8 w-8 text-blue-500" />,
      category: "productivity",
    },
    {
      id: "study",
      name: "Study Buddy",
      description: "Learn new concepts and get help with homework",
      icon: <Book className="h-8 w-8 text-green-500" />,
      category: "education",
    },
    {
      id: "chat",
      name: "Simple Chat",
      description: "Basic conversational assistant for everyday tasks",
      icon: <MessageSquare className="h-8 w-8 text-orange-500" />,
      category: "productivity",
    },
  ];

  const filteredChatbots = selectedTab === "all" 
    ? chatbots 
    : chatbots.filter(bot => bot.category === selectedTab);

  const handleSelectChatbot = (id: string) => {
    if (id === "gemini") {
      navigate("/chat");
    } else {
      // For future implementation of other chatbots
      navigate("/chat");
      // This will redirect to the main CHICHA chatbot until others are implemented
    }
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="text-center mb-8">
        <div className="flex items-center justify-center gap-3 mb-4">
          <img 
            src="/lovable-uploads/8af0d91e-2677-445f-9de9-657b8af84348.png" 
            alt="CHICHA Logo" 
            className="w-16 h-16 object-contain"
          />
          <h1 className="text-3xl font-bold text-primary">CHICHA</h1>
        </div>
        <p className="text-lg text-muted-foreground">
          Select your virtual assistant to get started
        </p>
      </div>

      <Tabs defaultValue="all" className="w-full max-w-4xl mx-auto" onValueChange={setSelectedTab}>
        <div className="flex justify-center mb-6">
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="ai">AI</TabsTrigger>
            <TabsTrigger value="productivity">Productivity</TabsTrigger>
            <TabsTrigger value="education">Education</TabsTrigger>
          </TabsList>
        </div>
        
        <TabsContent value="all" className="mt-0">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredChatbots.map((bot) => (
              <Card key={bot.id} className="overflow-hidden hover:shadow-md transition-shadow">
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-3">
                    {bot.icon}
                    <CardTitle className="text-xl">{bot.name}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">{bot.description}</p>
                </CardContent>
                <CardFooter>
                  <Button 
                    className="w-full" 
                    onClick={() => handleSelectChatbot(bot.id)}
                    variant={bot.id === "gemini" ? "default" : "outline"}
                  >
                    <Bot className="mr-2 h-4 w-4" />
                    {bot.id === "gemini" ? "Start Chatting" : "Coming Soon"}
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </TabsContent>
        
        <TabsContent value="ai" className="mt-0">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredChatbots.map((bot) => (
              <Card key={bot.id} className="overflow-hidden hover:shadow-md transition-shadow">
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-3">
                    {bot.icon}
                    <CardTitle className="text-xl">{bot.name}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">{bot.description}</p>
                </CardContent>
                <CardFooter>
                  <Button 
                    className="w-full" 
                    onClick={() => handleSelectChatbot(bot.id)}
                    variant={bot.id === "gemini" ? "default" : "outline"}
                  >
                    <Bot className="mr-2 h-4 w-4" />
                    {bot.id === "gemini" ? "Start Chatting" : "Coming Soon"}
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </TabsContent>
        
        <TabsContent value="productivity" className="mt-0">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredChatbots.map((bot) => (
              <Card key={bot.id} className="overflow-hidden hover:shadow-md transition-shadow">
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-3">
                    {bot.icon}
                    <CardTitle className="text-xl">{bot.name}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">{bot.description}</p>
                </CardContent>
                <CardFooter>
                  <Button 
                    className="w-full" 
                    onClick={() => handleSelectChatbot(bot.id)}
                    variant={bot.id === "gemini" ? "default" : "outline"}
                  >
                    <Bot className="mr-2 h-4 w-4" />
                    {bot.id === "gemini" ? "Start Chatting" : "Coming Soon"}
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </TabsContent>
        
        <TabsContent value="education" className="mt-0">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredChatbots.map((bot) => (
              <Card key={bot.id} className="overflow-hidden hover:shadow-md transition-shadow">
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-3">
                    {bot.icon}
                    <CardTitle className="text-xl">{bot.name}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">{bot.description}</p>
                </CardContent>
                <CardFooter>
                  <Button 
                    className="w-full" 
                    onClick={() => handleSelectChatbot(bot.id)}
                    variant={bot.id === "gemini" ? "default" : "outline"}
                  >
                    <Bot className="mr-2 h-4 w-4" />
                    {bot.id === "gemini" ? "Start Chatting" : "Coming Soon"}
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Home;