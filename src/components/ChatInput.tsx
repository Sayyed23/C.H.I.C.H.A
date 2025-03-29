
import { useState, useCallback } from "react";
import { Textarea } from "./ui/textarea";
import { ImagePreview } from "./chat/ImagePreview";
import { InputActions } from "./chat/InputActions";
import { useToast } from "@/hooks/use-toast";
import { LanguageSelector } from "./chat/LanguageSelector";
import { useImageUpload } from "@/hooks/useImageUpload";
import { useVoiceInput } from "@/hooks/useVoiceInput";
import { useMessageHandlers } from "@/hooks/useMessageHandlers";
import { MessageProcessor } from "./chat/MessageProcessor";
import { Button } from "./ui/button";
import { Mic, MicOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { VoiceAssistant } from "./VoiceAssistant";
import { Toast } from "@radix-ui/react-toast";

interface ChatInputProps {
  onSend: (message: string, options?: { targetLanguage?: string }) => void;
  isLoading?: boolean;
  onImageSelect?: (file: File | null) => void;
}

export const ChatInput = ({ onSend, isLoading, onImageSelect }: ChatInputProps) => {
  const [message, setMessage] = useState("");
  const [selectedLanguage, setSelectedLanguage] = useState<string | null>(null);
  const { toast } = useToast();
  
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
    handleWebSearch,
    handleGenerateCode,
    handleWeatherClick,
    handleMapClick
  } = useMessageHandlers(onSend, setMessage);

  const { processMessage } = MessageProcessor({ onSend , toast });
  
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

    // Process the message - if special handling occurred, processMessage returns true
    const handled = await processMessage(message, imageUrls, selectedLanguage);
    
    // Clear state after successful processing
    setMessage("");
    clearImages();
    setSelectedLanguage(null);
  }, [message, imageFiles, onSend, selectedLanguage, processMessage, clearImages, toast]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleVoiceAssistantMessage = (voiceMessage: string) => {
    setMessage(voiceMessage);
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
            placeholder={isRecording ? "Recording... speak now" : (imageFiles.length > 0 ? "Ask about the images..." : "Ask CHICHA for code, explanations, or help...")}
            className={`min-h-[20px] max-h-[200px] resize-none border-0 focus-visible:ring-0 focus-visible:ring-offset-0 flex-1 ${isRecording ? "animate-pulse" : ""}`}
            rows={1}
            aria-label="Message input"
          />
          
          <Button
            variant={isRecording ? "destructive" : "outline"}
            size="icon"
            onClick={toggleVoiceInput}
            className="flex-shrink-0"
            title={isRecording ? "Stop recording" : "Record voice message"}
          >
            {isRecording ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
          </Button>
          
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="secondary" size="sm" className="flex-shrink-0">
                Voice Assistant
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[400px] sm:w-[540px]">
              <SheetHeader>
                <SheetTitle>Voice Assistant</SheetTitle>
                <SheetDescription>
                  Speak with the assistant in multiple languages
                </SheetDescription>
              </SheetHeader>
              <div className="py-6">
                <VoiceAssistant 
                  onMessage={handleVoiceAssistantMessage} 
                />
              </div>
            </SheetContent>
          </Sheet>
          
          <LanguageSelector 
            selectedLanguage={selectedLanguage} 
            onSelectLanguage={setSelectedLanguage} 
          />
        </div>
        
        <InputActions
          onImageClick={() => fileInputRef.current?.click()}
          onSearchClick={(engine) => handleWebSearch(message, engine)}
          onMicClick={isListening ? stopListening : startListening}
          onSendClick={handleSend}
          onGenerateImage={() => handleGenerateImage(message)}
          onGenerateCode={() => handleGenerateCode(message)}
          onWeatherClick={handleWeatherClick}
          onNavigateClick={handleNavigateClick}
          onMapClick={handleMapClick}
          isListening={isListening}
          isLoading={!!isLoading}
          isGeneratingImage={isGeneratingImage}
          isEditingImage={isEditingImage}
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