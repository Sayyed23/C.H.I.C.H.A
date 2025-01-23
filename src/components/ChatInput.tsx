import { useState, useRef, useCallback } from "react";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";
import { Mic, Send, Image, Search } from "lucide-react";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "./ui/use-toast";

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

  const { isListening, startListening, stopListening, transcript } =
    useSpeechRecognition();

  const handleSend = useCallback(async () => {
    if (!message.trim() && !imageFile) return;

    let imageUrl = "";
    if (imageFile) {
      try {
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("images")
          .upload(`chat/${Date.now()}-${imageFile.name}`, imageFile);

        if (uploadError) {
          toast({
            title: "Upload Error",
            description: "Failed to upload image. Please try again.",
            variant: "destructive",
          });
          return;
        }

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
    <div className="flex flex-col gap-2 p-4 border-t bg-background">
      {imagePreview && (
        <div className="relative w-24 h-24">
          <img
            src={imagePreview}
            alt="Preview"
            className="w-full h-full object-cover rounded-lg"
          />
          <button
            onClick={() => {
              setImageFile(null);
              setImagePreview(null);
            }}
            className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full w-6 h-6 flex items-center justify-center"
          >
            ×
          </button>
        </div>
      )}
      <div className="flex gap-2">
        <Textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message..."
          className="min-h-[20px] max-h-[200px] resize-none"
          rows={1}
        />
        <div className="flex flex-col gap-2">
          <Button
            size="icon"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
          >
            <Image className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            variant="outline"
            onClick={handleWebSearch}
            disabled={isLoading || !message.trim()}
          >
            <Search className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            variant="outline"
            onClick={isListening ? stopListening : startListening}
            className={isListening ? "bg-primary text-primary-foreground" : ""}
          >
            <Mic className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            onClick={handleSend}
            disabled={isLoading || (!message.trim() && !imageFile)}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleImageSelect}
        accept="image/*"
        className="hidden"
      />
    </div>
  );
};