import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Image } from "lucide-react";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface ChatInputProps {
  onSend: (message: string, imageUrl?: string) => void;
  disabled?: boolean;
}

export const ChatInput = ({ onSend, disabled }: ChatInputProps) => {
  const [message, setMessage] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() || image) {
      setIsSubmitting(true);
      try {
        let imageUrl;
        if (image) {
          const { data, error } = await supabase.storage
            .from('images')
            .upload(`public/${image.name}`, image);
          
          if (error) {
            console.error('Error uploading image:', error);
            return;
          }
          
          imageUrl = data?.path 
            ? supabase.storage.from('images').getPublicUrl(data.path).data.publicUrl 
            : undefined;
        }
        
        onSend(message, imageUrl);
        setMessage("");
        setImage(null);
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setImage(e.target.files[0]);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 w-full items-center">
      <div className="relative flex-1">
        <Input
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Type your message..."
          disabled={disabled}
          className="pr-10"
        />
        <label 
          htmlFor="image-upload" 
          className="absolute right-2 top-1/2 -translate-y-1/2 cursor-pointer hover:text-primary transition-colors"
        >
          <Image className="h-5 w-5" />
        </label>
      </div>
      <input
        type="file"
        accept="image/*"
        onChange={handleImageChange}
        disabled={disabled}
        className="hidden"
        id="image-upload"
      />
      <Button
        type="submit"
        disabled={disabled || isSubmitting || (!message.trim() && !image)}
        className="flex-shrink-0"
      >
        {isSubmitting ? (
          <div className="animate-spin h-4 w-4 border-2 border-current rounded-full" />
        ) : (
          <Send className="h-4 w-4" />
        )}
      </Button>
    </form>
  );
};