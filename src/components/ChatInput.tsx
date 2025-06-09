
import { useState, useCallback } from "react";
import { Textarea } from "./ui/textarea";
import { ImagePreview } from "./chat/ImagePreview";
import { InputActions } from "./chat/InputActions";
import { LanguageSelector } from "./chat/LanguageSelector";
import { useImageUpload } from "@/hooks/useImageUpload";
import { useVoiceInput } from "@/hooks/useVoiceInput";
import { useMessageHandlers } from "@/hooks/useMessageHandlers";
import { MessageProcessor } from "./chat/MessageProcessor";
import { Button } from "./ui/button";
import { Mic, MicOff, Wand2, Image, Scissors, Paperclip, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { VoiceAssistant } from "./VoiceAssistant";
import { ChildhoodMemoryGeneratorHF } from "./ChildhoodMemoryGeneratorHF";

interface ChatInputProps {
  onSend: (message: string, options?: {
    targetLanguage?: string;
  }) => void;
  isLoading?: boolean;
  onImageSelect?: (file: File | null) => void;
}

export const ChatInput = ({
  onSend,
  isLoading,
  onImageSelect
}: ChatInputProps) => {
  const [message, setMessage] = useState("");
  const [selectedLanguage, setSelectedLanguage] = useState<string | null>(null);
  const [isImageEditMode, setIsImageEditMode] = useState(false);
  const {
    imageFiles,
    imagePreviews,
    fileInputRef,
    handleImageSelect,
    handleRemoveImage,
    clearImages
  } = useImageUpload();
  const {
    isVoiceInputActive,
    isRecording,
    isListening,
    toggleVoiceInput,
    startListening,
    stopListening
  } = useVoiceInput(setMessage);
  const {
    isGeneratingImage,
    isEditingImage,
    handleNavigateClick,
    handleGenerateImage,
    handleEditImage,
    handleWebSearch,
    handleGenerateCode,
    handleWeatherClick,
    handleMapClick,
    handleImageClick
  } = useMessageHandlers(onSend, setMessage);
  const {
    processMessage
  } = MessageProcessor({
    onSend
  });

  const handleSend = useCallback(async () => {
    if (!message.trim() && imageFiles.length === 0) return;
    let imageUrls: string[] = [];
    if (imageFiles.length > 0) {
      try {
        for (const file of imageFiles) {
          const fileExt = file.name.split('.').pop();
          const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
          const {
            data: uploadData,
            error: uploadError
          } = await supabase.storage.from("images").upload(`chat/${fileName}`, file, {
            contentType: file.type,
            upsert: false
          });
          if (uploadError) throw uploadError;
          const {
            data: {
              publicUrl
            }
          } = supabase.storage.from("images").getPublicUrl(uploadData.path);
          imageUrls.push(publicUrl);
        }
      } catch (error) {
        console.error('Image upload error:', error);
        return;
      }
    }

    if (isImageEditMode && imageUrls.length > 0 && message.trim()) {
      await handleEditImage(message, imageUrls[0]);
      setMessage("");
      clearImages();
      setIsImageEditMode(false);
      return;
    }

    const handled = await processMessage(message, imageUrls, selectedLanguage);

    setMessage("");
    clearImages();
    setSelectedLanguage(null);
    setIsImageEditMode(false);
  }, [message, imageFiles, onSend, selectedLanguage, processMessage, clearImages, isImageEditMode, handleEditImage]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const toggleImageEditMode = () => {
    setIsImageEditMode(!isImageEditMode);
    if (!isImageEditMode) {
      setMessage("Edit this image to ");
    }
  };

  const handleVoiceAssistantMessage = (voiceMessage: string) => {
    setMessage(voiceMessage);
  };

  return (
    <div className="flex flex-col gap-2" role="region" aria-label="Message input">
      {imagePreviews.length > 0 && (
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap gap-2">
            {imagePreviews.map((preview, index) => (
              <ImagePreview 
                key={index} 
                imagePreview={preview} 
                onClear={() => handleRemoveImage(index)} 
              />
            ))}
          </div>
          <div className="flex gap-2">
            <Button 
              variant={isImageEditMode ? "default" : "secondary"} 
              size="sm" 
              onClick={toggleImageEditMode} 
              disabled={isEditingImage} 
              className="flex items-center gap-1"
            >
              <Scissors className="h-4 w-4" />
              {isImageEditMode ? "Editing Mode ON" : "Edit This Image"}
            </Button>
          </div>
          
          {isImageEditMode && (
            <div className="p-2 bg-gray-100 rounded-md text-sm">
              <p className="font-medium">Image Edit Mode</p>
              <p className="text-gray-600">
                Describe how you want to edit the image above, then press Send
              </p>
            </div>
          )}
        </div>
      )}
      
      <div className="relative flex items-center gap-2 p-2 border border-gray-200 rounded-lg bg-white">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => fileInputRef.current?.click()}
          className="h-8 w-8 text-gray-500 hover:text-gray-700"
          aria-label="Attach file"
        >
          <Paperclip className="h-4 w-4" />
        </Button>
        
        <Textarea 
          value={message} 
          onChange={(e) => setMessage(e.target.value)} 
          onKeyDown={handleKeyDown} 
          placeholder={
            isRecording 
              ? "Recording... speak now" 
              : isImageEditMode 
                ? "Describe how to edit the image..." 
                : imageFiles.length > 0 
                  ? "Ask about the images..." 
                  : "Ask CHICHA... or type /search <your query>"
          }
          className="min-h-[40px] max-h-[120px] resize-none border-0 focus-visible:ring-0 focus-visible:ring-offset-0 flex-1 bg-transparent"
          rows={1}
          aria-label="Message input"
        />
        
        <Button
          onClick={handleSend}
          disabled={isLoading || (!message.trim() && imageFiles.length === 0)}
          size="icon"
          className="h-10 w-10 bg-teal-500 hover:bg-teal-600 text-white rounded-lg"
          aria-label="Send message"
        >
          <Send className="h-4 w-4" />
        </Button>
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
