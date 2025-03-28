import { useState, useRef, useCallback, useEffect } from "react";
import { Textarea } from "./ui/textarea";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ImagePreview } from "./chat/ImagePreview";
import { InputActions } from "./chat/InputActions";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Languages } from "lucide-react";
import { Button } from "./ui/button";

interface ChatInputProps {
  onSend: (message: string, options?: { targetLanguage?: string }) => void;
  isLoading?: boolean;
  onImageSelect?: (file: File | null) => void;
}

const languages = [
  { name: "English", code: "en" },
  { name: "Hindi", code: "hi" },
  { name: "Marathi", code: "mr" },
  { name: "Sanskrit", code: "sa" },
  { name: "Urdu", code: "ur" },
  { name: "Arabic", code: "ar" },
];

export const ChatInput = ({ onSend, isLoading, onImageSelect }: ChatInputProps) => {
  const [message, setMessage] = useState("");
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [isEditingImage, setIsEditingImage] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState<string | null>(null);
  const [showTranslatePopup, setShowTranslatePopup] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const MAX_IMAGES = 5;

  const { 
    transcript, 
    isListening, 
    startListening, 
    stopListening,
    isError,
    errorMessage 
  } = useSpeechRecognition();

  useEffect(() => {
    if (transcript && transcript.trim()) {
      setMessage(prev => prev + (prev ? ' ' : '') + transcript);
    }
  }, [transcript]);

  useEffect(() => {
    if (isError) {
      toast({
        title: "Speech Recognition Error",
        description: errorMessage || "An error occurred with speech recognition",
        variant: "destructive",
      });
    }
  }, [isError, errorMessage, toast]);

  const handleNavigateClick = () => {
    setMessage("Please enter your starting location and destination in this format: 'From: [location] To: [destination]'");
  };

  const handleGenerateImage = async () => {
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

  const handleTranslate = useCallback(() => {
    setShowTranslatePopup(true);
  }, []);

  const handleWebSearch = async () => {
    if (!message.trim()) return;
    
    try {
      onSend(`🔍 Searching the web for: ${message}`);
      
      const { data, error } = await supabase.functions.invoke('web-search', {
        body: { query: message },
      });

      if (error) throw error;
      
      if (data && data.results) {
        const resultsMessage = data.results
          .map((result: any) => `${result.title}\n${result.url}\n${result.snippet}`)
          .join('\n\n');
        onSend(resultsMessage);
      } else {
        onSend("No results found for your search.");
      }
    } catch (error) {
      console.error('Web search error:', error);
      toast({
        title: "Search Error",
        description: "Failed to perform web search. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleWeatherClick = () => {
    setMessage("What's the weather in [location]?");
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    if (files.length === 0) return;

    if (imageFiles.length + files.length > MAX_IMAGES) {
      toast({
        title: "Too Many Images",
        description: `You can only upload up to ${MAX_IMAGES} images at once. Please remove some images.`,
        variant: "destructive",
      });
      return;
    }

    const validFiles = files.filter(file => {
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Invalid File",
          description: `${file.name} is not an image file.`,
          variant: "destructive",
        });
        return false;
      }

      const MAX_SIZE = 5 * 1024 * 1024; // 5MB
      if (file.size > MAX_SIZE) {
        toast({
          title: "File Too Large",
          description: `${file.name} is larger than 5MB.`,
          variant: "destructive",
        });
        return false;
      }

      return true;
    });

    if (validFiles.length === 0) return;

    setImageFiles(prev => [...prev, ...validFiles]);

    // Generate previews for valid files
    validFiles.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreviews(prev => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleRemoveImage = (index: number) => {
    setImageFiles(prev => prev.filter((_, i) => i !== index));
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handleSend = useCallback(async () => {
    if (!message.trim() && imageFiles.length === 0) return;

    let imageUrls: string[] = [];
    if (imageFiles.length > 0) {
      try {
        for (const file of imageFiles) {
          const fileExt = file.name.split('.').pop();
          const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

          const { data: uploadData, error: uploadError } = await supabase.storage
            .from("images")
            .upload(`chat/${fileName}`, file, {
              contentType: file.type,
              upsert: false
            });

          if (uploadError) throw uploadError;

          const { data: { publicUrl } } = supabase.storage
            .from("images")
            .getPublicUrl(uploadData.path);
          
          imageUrls.push(publicUrl);
        }
      } catch (error) {
        console.error('Image upload error:', error);
        toast({
          title: "Upload Error",
          description: "Failed to upload one or more images. Please try again.",
          variant: "destructive",
        });
        return;
      }
    }

    // Check if the message is a navigation request
    const navigationMatch = message.match(/From:\s*([^To]+)\s*To:\s*(.+)/i);
    if (navigationMatch) {
      const [, from, to] = navigationMatch;
      const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(from.trim())}&destination=${encodeURIComponent(to.trim())}`;
      onSend(`🗺️ Here's your route: [Open in Google Maps](${googleMapsUrl})`);
      setMessage("");
      return;
    }

    // Check if the message is asking about weather
    const weatherKeywords = ['weather', 'temperature', 'forecast'];
    const isWeatherQuery = weatherKeywords.some(keyword => 
      message.toLowerCase().includes(keyword)
    );

    if (isWeatherQuery) {
      try {
        const locationMatch = message.match(/(?:weather|temperature|forecast)\s+(?:in|at|for)\s+([^?.,]+)/i);
        const location = locationMatch ? locationMatch[1].trim() : null;

        if (!location) {
          onSend("I couldn't determine the location. Please specify a location, for example: 'What's the weather in London?'");
          return;
        }

        onSend(`🔍 Checking weather for ${location}...`);
        
        const { data, error } = await supabase.functions.invoke('get-weather', {
          body: { location },
        });

        if (error) throw error;
        
        if (data.message) {
          onSend(data.message);
          setMessage("");
        } else {
          onSend("Sorry, I couldn't fetch the weather information at this time.");
        }
      } catch (error) {
        console.error('Weather fetch error:', error);
        toast({
          title: "Weather Error",
          description: "Failed to fetch weather information. Please try again.",
          variant: "destructive",
        });
      }
      return;
    }

    // Combine message and image URLs into a single message string
    const fullMessage = [
      message,
      ...imageUrls.map(url => `![Image](${url})`)
    ].filter(Boolean).join('\n');

    // Pass selected language if available
    onSend(fullMessage, { targetLanguage: selectedLanguage || undefined });
    setMessage("");
    setImageFiles([]);
    setImagePreviews([]);
    setSelectedLanguage(null); // Reset language selection after sending
  }, [message, imageFiles, onSend, toast, selectedLanguage]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleGenerateCode = async () => {
    if (!message.trim()) return;

    const formatCode = (title: string, code: string, features: string[]) => {
      const lines = code.split('\n');
      const indentedCode = lines
        .map(line => line.trimEnd()) // Remove trailing spaces
        .join('\n');

      return `${title}

${indentedCode}

Features:
${features.map((feature, index) => `${index + 1}. ${feature}`).join('\n')}`;
    };

    const generateFunction = (functionName: string, params: string[], returnType: string, body: string) => {
      return `function ${functionName}(${params.join(', ')})${returnType ? `: ${returnType}` : ''} {
    ${body}
}`;
    };

    // Extract keywords and requirements from the message
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
      // Generate a default function based on the message
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

  return (
    <div className="flex flex-col gap-2 p-4 border-t bg-background rounded-lg shadow-sm" role="region" aria-label="Message input">
      {imagePreviews.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {imagePreviews.map((preview, index) => (
            <ImagePreview 
              key={index}
              imagePreview={preview}
              onClear={() => handleRemoveImage(index)}
            />
          ))}
        </div>
      )}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={imageFiles.length > 0 ? "Ask about the images..." : "Ask CHICHA for code, explanations, or help..."}
            className="min-h-[20px] max-h-[200px] resize-none border-0 focus-visible:ring-0 focus-visible:ring-offset-0 flex-1"
            rows={1}
            aria-label="Message input"
          />
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant={selectedLanguage ? "secondary" : "ghost"} 
                size="icon"
                className="flex-shrink-0"
                title="Choose response language"
              >
                <Languages className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setSelectedLanguage(null)}>
                English (Default)
              </DropdownMenuItem>
              {languages.map((lang) => (
                <DropdownMenuItem
                  key={lang.code}
                  onClick={() => setSelectedLanguage(lang.code)}
                  className="flex items-center gap-2"
                >
                  <span className="font-medium">{lang.name}</span>
                  {lang.code === "ur" && <span className="text-xs text-muted-foreground">(اردو)</span>}
                  {lang.code === "hi" && <span className="text-xs text-muted-foreground">(हिंदी)</span>}
                  {lang.code === "mr" && <span className="text-xs text-muted-foreground">(मराठी)</span>}
                  {lang.code === "sa" && <span className="text-xs text-muted-foreground">(संस्कृत)</span>}
                  {lang.code === "ar" && <span className="text-xs text-muted-foreground">(العربية)</span>}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        
        {selectedLanguage && (
          <div className="text-xs text-muted-foreground ml-1">
            Response will be in {languages.find(l => l.code === selectedLanguage)?.name || selectedLanguage}
            <Button 
              variant="link" 
              size="sm" 
              className="p-0 h-auto text-xs ml-1" 
              onClick={() => setSelectedLanguage(null)}
            >
              Reset
            </Button>
          </div>
        )}
        
        <InputActions
          onImageClick={() => fileInputRef.current?.click()}
          onTranslateClick={handleTranslate}
          onMicClick={isListening ? stopListening : startListening}
          onSendClick={handleSend}
          onGenerateImage={handleGenerateImage}
          onWeatherClick={handleWeatherClick} 
          onNavigateClick={handleNavigateClick}
          isListening={isListening}
          isLoading={!!isLoading}
          isGeneratingImage={isGeneratingImage}
          hasContent={!!message.trim() || imageFiles.length > 0}
        />
      </div>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleImageSelect}
        accept="image/*"
        multiple
        className="hidden"
        aria-label="Upload images"
      />
    </div>
  );
};