
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export const useMessageHandlers = (
  onSend: (message: string, options?: { targetLanguage?: string }) => void,
  setMessage: (message: string) => void
) => {
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [isEditingImage, setIsEditingImage] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  const handleNavigateClick = () => {
    setMessage("Please enter your starting location and destination in this format: 'From: [location] To: [destination]'");
  };

  const handleGenerateImage = async (message: string) => {
    if (!message.trim()) return;

    setIsGeneratingImage(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-image', {
        body: { prompt: message }
      });

      if (error) throw error;

      if (data.imageUrl) {
        onSend(`🎨 Generated image for "${message}": ![Generated Image](${data.imageUrl})`);
        setMessage("");
      } else {
        toast({
          title: "Generation Error",
          description: "No image was generated. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Image generation error:', error);
      toast({
        title: "Generation Error",
        description: "Failed to generate image. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingImage(false);
    }
  };

  const handleEditImage = async (prompt: string, imageUrl: string) => {
    if (!prompt.trim() || !imageUrl) return;
    
    setIsEditingImage(true);
    try {
      onSend(`🖌️ Editing image based on: "${prompt}"... This might take a minute.`);
      
      const { data, error } = await supabase.functions.invoke('edit-image', {
        body: { prompt, imageUrl }
      });

      if (error) throw error;
      
      if (data && data.imageUrl) {
        onSend(`✨ Here's your edited image based on "${prompt}":\n\n![Edited Image](${data.imageUrl})`);
        setMessage("");
      } else {
        toast({
          title: "Editing Error",
          description: "Failed to edit image. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Image editing error:', error);
      toast({
        title: "Editing Error",
        description: "Failed to edit image. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsEditingImage(false);
    }
  };

  const handleWebSearch = async (message: string, engine = 'firecrawl') => {
    if (!message.trim()) return;
    
    setIsSearching(true);
    try {
      onSend(`🔍 Searching the web using ${engine} for: "${message}"`);
      
      const { data, error } = await supabase.functions.invoke('web-search', {
        body: { query: message, engine },
      });

      if (error) {
        throw new Error(`Search API error: ${error.message}`);
      }
      
      if (data.error) {
        throw new Error(data.error);
      }
      
      if (data && data.results && data.results.length > 0) {
        const resultsMessage = data.results
          .map((result: any) => `### [${result.title}](${result.url})\n${result.domain}\n${result.snippet || ''}`)
          .join('\n\n');
        onSend(`## Search results from ${data.engine || engine}:\n\n${resultsMessage}`);
      } else {
        onSend(`No results found for your search with ${engine}. Please try a different search term or search engine.`);
      }
    } catch (error) {
      console.error('Web search error:', error);
      
      // Send a message to the user about the error
      onSend(`⚠️ Search error: ${error instanceof Error ? error.message : 'Failed to search the web. Please try again later.'}`);
      
      toast({
        title: "Search Error",
        description: `Failed to perform web search with ${engine}. Please try again.`,
        variant: "destructive",
      });
    } finally {
      setIsSearching(false);
    }
  };

  const handleGenerateCode = async (message: string) => {
    if (!message.trim()) return;

    const formatCode = (title: string, code: string, features: string[]) => {
      const lines = code.split('\n');
      const indentedCode = lines
        .map(line => line.trimEnd()) // Remove trailing spaces
        .join('\n');

      return `${title}\n\n${indentedCode}\n\nFeatures:\n${features.map((feature, index) => `${index + 1}. ${feature}`).join('\n')}`;
    };

    const isCalculator = message.toLowerCase().includes('calculator') || message.toLowerCase().includes('compute');
    const isPython = message.toLowerCase().includes('python');
    const isTypeScript = message.toLowerCase().includes('typescript') || message.toLowerCase().includes('javascript');
    const isComponent = message.toLowerCase().includes('component') || message.toLowerCase().includes('react');
    
    if (isCalculator) {
      const title = `${isPython ? 'Python' : 'TypeScript'} Calculator`;
      
      const code = isPython ? 
        `def calculate(a: float, b: float, operation: str) -> float:
    if operation == '+':
        return a + b
    elif operation == '-':
        return a - b
    elif operation == '*':
        return a * b
    elif operation == '/':
        return a / b if b != 0 else 'Error: Division by zero'
    else:
        return 'Invalid operation'` :
        `function calculate(a: number, b: number, operation: string): number | string {
    switch (operation) {
        case '+': return a + b;
        case '-': return a - b;
        case '*': return a * b;
        case '/': return b !== 0 ? a / b : 'Error: Division by zero';
        default: return 'Invalid operation';
    }
}`;

      const features = [
        'Basic arithmetic operations',
        'Input validation',
        'Error handling for division by zero',
        'Type-safe implementation',
        'Clean and maintainable code structure'
      ];

      onSend(formatCode(title, code, features));
    } else if (isComponent) {
      const componentName = message.match(/(?:create|make|build)\s+(?:a\s+)?(\w+)\s+component/i)?.[1] || 'Custom';
      
      const code = `import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export default function ${componentName}Component() {
    const [count, setCount] = useState(0)

    return (
        <Card className="w-full max-w-md mx-auto p-6">
            <div className="flex flex-col items-center gap-4">
                <h2 className="text-2xl font-bold">${componentName} Component</h2>
                <p className="text-lg">Count: {count}</p>
                <Button onClick={() => setCount(prev => prev + 1)}>
                    Increment
                </Button>
            </div>
        </Card>
    )
}`;

      const features = [
        'Responsive design with Tailwind CSS',
        'State management with useState',
        'Shadcn/UI components integration',
        'Clean and semantic markup',
        'Interactive button functionality'
      ];

      onSend(formatCode(`${componentName} React Component`, code, features));
    } else {
      const words = message.toLowerCase().split(' ');
      const functionName = words.find(w => w.includes('function')) ? 
        words[words.indexOf('function') + 1] || 'processData' : 
        'processData';

      const code = isPython ?
        `def ${functionName}(data):
    result = []
    
    # Process the data
    for item in data:
        processed = item.upper() if isinstance(item, str) else str(item)
        result.append(processed)
    
    return result` :
        `function ${functionName}<T>(data: T[]): string[] {
    return data.map(item => 
        typeof item === 'string' ? item.toUpperCase() : String(item)
    )
}`;

      const features = [
        'Generic data processing',
        'Type-safe implementation',
        'Input validation',
        'Error handling',
        'Clean code structure'
      ];

      onSend(formatCode(`${functionName} Implementation`, code, features));
    }

    setMessage("");
  };

  const handleWeatherClick = () => {
    setMessage("What's the weather in [your location]?");
  };

  const handleMapClick = () => {
    setMessage("Please enter a location to search, or enter 'Distance from: [origin] to: [destination]' to calculate distances.");
  };

  const handleImageClick = () => {
    setMessage("Generate an image of [your description]");
  };

  return {
    isGeneratingImage,
    isEditingImage,
    isSearching,
    handleNavigateClick,
    handleGenerateImage,
    handleEditImage,
    handleWebSearch,
    handleGenerateCode,
    handleWeatherClick,
    handleMapClick,
    handleImageClick,
    setIsGeneratingImage,
    setIsEditingImage,
    setIsSearching
  };
};
