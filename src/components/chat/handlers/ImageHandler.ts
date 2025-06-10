
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export const handleImageGeneration = async (
  message: string,
  imageUrls: string[],
  onSend: (message: string, options?: { targetLanguage?: string }) => void
): Promise<boolean> => {
  const imageGenMatch = message.match(/(?:generate|create|make)\s+(?:a\s+)?(?:picture|image|photo|drawing|illustration)\s+(?:of|with|showing|featuring)?\s+(.+)/i);
  if (!imageGenMatch) return false;

  const imagePrompt = imageGenMatch[1].trim();
  
  if (!imagePrompt) {
    onSend("Please provide more details about what you'd like in your image. For example: 'Generate an image of a sunset over mountains'");
    return true;
  }
  
  try {
    onSend(`🎨 Creating an image of: "${imagePrompt}"... This might take a minute.`);
    
    const sourceImageUrl = imageUrls.length > 0 ? imageUrls[0] : null;
    
    if (sourceImageUrl) {
      const { data, error } = await supabase.functions.invoke('edit-image', {
        body: { 
          prompt: imagePrompt,
          imageUrl: sourceImageUrl
        }
      });

      if (error) throw error;
      
      if (data && data.imageUrl) {
        onSend(`✨ Here's your transformed image based on "${imagePrompt}":\n\n![Edited Image](${data.imageUrl})`);
      } else {
        throw new Error("Failed to edit image");
      }
    } else {
      const { data, error } = await supabase.functions.invoke('generate-image', {
        body: { prompt: imagePrompt }
      });

      if (error) throw error;
      
      if (data && data.imageUrl) {
        onSend(`✨ Here's your generated image of "${imagePrompt}":\n\n![Generated Image](${data.imageUrl})`);
      } else {
        throw new Error("Failed to generate image");
      }
    }
  } catch (error) {
    console.error('Image generation error:', error);
    toast({
      title: "Image Generation Error",
      description: "Failed to generate image. Please try again.",
      variant: "destructive",
    });
    onSend("Sorry, I encountered an error while generating your image. Please try again later.");
  }
  
  return true;
};
