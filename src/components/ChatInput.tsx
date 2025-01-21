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
          const { data, error } = await supabase.storage.from('images').upload(`public/${image.name}`, image);
          if (error) {
            console.error('Error uploading image:', error);
            return;
          }
          imageUrl = data?.path ? supabase.storage.from('images').getPublicUrl(data.path).data.publicUrl : '';
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
    <form onSubmit={handleSubmit} className="flex gap-2 w-full">
      <Input
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Type your message..."
        disabled={disabled}
        className="flex-1"
      />
      <input
        type="file"
        accept="image/*"
        onChange={handleImageChange}
        disabled={disabled}
        className="hidden"
        id="image-upload"
      />
      <label htmlFor="image-upload" className="cursor-pointer">
        <Image className="h-6 w-6" />
      </label>
      <Button
        type="submit"
        disabled={disabled || isSubmitting || (!message.trim() && !image)}
        className="px-4 sm:px-6"
      >
        {isSubmitting ? (
          <div className="animate-spin h-4 w-4 border-2 border-gray-500 rounded-full" />
        ) : (
          <Send className="h-4 w-4" />
        )}
      </Button>
    </form>
  );
};