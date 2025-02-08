
import { useState, useRef, useCallback, useEffect } from "react";
import { Textarea } from "./ui/textarea";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "./ui/use-toast";
import { ImagePreview } from "./chat/ImagePreview";
import { InputActions } from "./chat/InputActions";

interface ChatInputProps {
  onSend: (message: string, imageUrls?: string[]) => void;
  isLoading?: boolean;
}

export const ChatInput = ({ onSend, isLoading }: ChatInputProps) => {
  const [message, setMessage] = useState("");
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [isEditingImage, setIsEditingImage] = useState(false);
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

    onSend(message, imageUrls);
    setMessage("");
    setImageFiles([]);
    setImagePreviews([]);
  }, [message, imageFiles, onSend, toast]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
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
        <Textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={imageFiles.length > 0 ? "Ask about the images..." : "Message CHICHA..."}
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