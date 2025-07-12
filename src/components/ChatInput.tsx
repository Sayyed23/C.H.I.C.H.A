import { useState, useRef, useCallback, useEffect } from "react";
import { Textarea } from "./ui/textarea";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "./ui/use-toast";
import { ImagePreview } from "./chat/ImagePreview";
import { InputActions } from "./chat/InputActions";

interface ChatInputProps {
  onSend: (message: string, imageUrl?: string, enhancedMessage?: string) => void;
  isLoading?: boolean;
  onImageSelect?: (file: File) => void;
}

export const ChatInput = ({ onSend, isLoading, onImageSelect }: ChatInputProps) => {
  const [message, setMessage] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

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

      if (data.image) {
        onSend(`🎨 Generated image for "${message}": ![Generated Image](${data.image})`);
        setMessage("");
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

  const handleWeatherClick = () => {
    setMessage("What's the weather in [location]?");
  };

  const handleSend = useCallback(async () => {
    if (!message.trim() && !imageFile) return;

    // Check if the message is a navigation request
    const navigationMatch = message.match(/From:\s*([^To]+)\s*To:\s*(.+)/i);
    if (navigationMatch) {
      const [, from, to] = navigationMatch;
      const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(from.trim())}&destination=${encodeURIComponent(to.trim())}`;
      onSend(`🗺️ Here's your route: [Open in Google Maps](${googleMapsUrl})`);
      setMessage("");
      return;
    }

    let imageUrl = "";
    if (imageFile) {
      try {
        const fileExt = imageFile.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("images")
          .upload(`chat/${fileName}`, imageFile, {
            contentType: imageFile.type,
            upsert: false
          });

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from("images")
          .getPublicUrl(uploadData.path);
        
        imageUrl = publicUrl;
      } catch (error) {
        console.error('Image upload error:', error);
        toast({
          title: "Upload Error",
          description: "Failed to upload image. Please try again.",
          variant: "destructive",
        });
        return;
      }
    }

    // Check if the message is asking about weather
    const weatherKeywords = ['weather', 'temperature', 'forecast'];
    const isWeatherQuery = weatherKeywords.some(keyword => 
      message.toLowerCase().includes(keyword)
    );

    if (isWeatherQuery) {
      try {
        // Extract location from the message
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

    // Check if the message contains keywords indicating a request for real-time information
    const realTimeKeywords = ['current', 'latest', 'news', 'today', 'now', 'recent', 'update'];
    const shouldSearchWeb = realTimeKeywords.some(keyword => 
      message.toLowerCase().includes(keyword)
    );

    if (shouldSearchWeb) {
      try {
        // Send the search query to AI with web search context
        const { data, error } = await supabase.functions.invoke('web-search', {
          body: { query: message },
        });

        if (error || !data || !data.results || data.results.length === 0) {
          // If search fails or no results, proceed with normal AI processing
          console.log('Web search failed or no results, proceeding with AI');
          onSend(message, imageUrl);
          setMessage("");
          setImageFile(null);
          setImagePreview(null);
          return;
        }
        
        if (data && data.results && data.results.length > 0) {
          // Format search results for AI context
          const searchContext = data.results
            .map((result: any) => `Title: ${result.title}\nURL: ${result.url}\nSnippet: ${result.snippet}`)
            .join('\n\n---\n\n');
          
          // Create enhanced message for AI but show original message to user
          const enhancedMessage = `Based on the following current web search results, please provide a comprehensive answer to: "${message}"

Search Results:
${searchContext}

Please synthesize this information to provide an accurate, up-to-date response.`;
          
          // Show user's original message while sending enhanced version to AI
          onSend(message, imageUrl, enhancedMessage);
          setMessage("");
          setImageFile(null);
          setImagePreview(null);
          return;
        }
      } catch (error) {
        console.error('Web search error:', error);
        // If search fails, proceed with normal AI processing without showing error
        console.log('Search failed, proceeding with normal AI processing');
      }
    }

    onSend(message, imageUrl);
    setMessage("");
    setImageFile(null);
    setImagePreview(null);
  }, [message, imageFile, onSend, toast]);

  const handleWebSearch = async () => {
    if (!message.trim()) return;
    
    try {
      const { data, error } = await supabase.functions.invoke('web-search', {
        body: { query: message },
      });

      if (error || !data || !data.results || data.results.length === 0) {
        onSend(message);
        setMessage("");
        return;
      }
      
      if (data && data.results) {
        // Format search results for AI context
        const searchContext = data.results
          .map((result: any) => `Title: ${result.title}\nURL: ${result.url}\nSnippet: ${result.snippet}`)
          .join('\n\n---\n\n');
        
        // Create enhanced message for AI but show original message to user
        const enhancedMessage = `Based on the following current web search results, please provide a comprehensive answer to: "${message}"

Search Results:
${searchContext}

Please synthesize this information to provide an accurate, up-to-date response.`;
        
        // Show user's original message while sending enhanced version to AI
        onSend(message, undefined, enhancedMessage);
        setMessage("");
      }
    } catch (error) {
      console.error('Web search error:', error);
      onSend(message);
      setMessage("");
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Invalid File",
          description: "Please select an image file.",
          variant: "destructive",
        });
        return;
      }

      const MAX_SIZE = 5 * 1024 * 1024;
      if (file.size > MAX_SIZE) {
        toast({
          title: "File Too Large",
          description: "Please select an image under 5MB.",
          variant: "destructive",
        });
        return;
      }

      setImageFile(file);
      if (onImageSelect) {
        onImageSelect(file);
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col gap-2 p-4 border-t bg-background rounded-lg shadow-sm" role="region" aria-label="Message input">
      {imagePreview && (
        <ImagePreview 
          imagePreview={imagePreview}
          onClear={() => {
            setImageFile(null);
            setImagePreview(null);
          }}
        />
      )}
      <div className="flex flex-col gap-2">
        <Textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Message CHICHA... (Use words like 'current', 'latest', or 'today' for real-time information)"
          className="min-h-[20px] max-h-[200px] resize-none border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
          rows={1}
          aria-label="Message input"
        />
        <InputActions
          onImageClick={() => fileInputRef.current?.click()}
          onSearchClick={handleWebSearch}
          onMicClick={isListening ? stopListening : startListening}
          onSendClick={handleSend}
          onGenerateImage={handleGenerateImage}
          onWeatherClick={handleWeatherClick}
          onNavigateClick={handleNavigateClick}
          isListening={isListening}
          isLoading={!!isLoading}
          isGeneratingImage={isGeneratingImage}
          hasContent={!!message.trim() || !!imageFile}
        />
      </div>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleImageSelect}
        accept="image/*"
        className="hidden"
        aria-label="Upload image"
      />
    </div>
  );
};