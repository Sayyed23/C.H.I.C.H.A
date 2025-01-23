import { useState, useRef, useCallback, useEffect } from "react";
import { Textarea } from "./ui/textarea";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "./ui/use-toast";
import { ImagePreview } from "./chat/ImagePreview";
import { InputActions } from "./chat/InputActions";

interface ChatInputProps {
  onSend: (message: string, imageUrl?: string) => void;
  isLoading?: boolean;
  onImageSelect?: (file: File) => void;
}

export const ChatInput = ({ onSend, isLoading, onImageSelect }: ChatInputProps) => {
  const [message, setMessage] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
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

  const handleSend = useCallback(async () => {
    if (!message.trim() && !imageFile) return;

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

    onSend(message, imageUrl);
    setMessage("");
    setImageFile(null);
    setImagePreview(null);
  }, [message, imageFile, onSend, toast]);

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
          placeholder="Message ChatGPT..."
          className="min-h-[20px] max-h-[200px] resize-none border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
          rows={1}
          aria-label="Message input"
        />
        <InputActions
          onImageClick={() => fileInputRef.current?.click()}
          onSearchClick={handleWebSearch}
          onMicClick={isListening ? stopListening : startListening}
          onSendClick={handleSend}
          isListening={isListening}
          isLoading={!!isLoading}
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