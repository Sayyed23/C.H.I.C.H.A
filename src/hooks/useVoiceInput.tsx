
import { useState, useEffect } from "react";
import { useAudioRecorder } from "@/hooks/useAudioRecorder";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { supabase } from "@/integrations/supabase/client";

export const useVoiceInput = (setMessage: React.Dispatch<React.SetStateAction<string>>) => {
  const [isVoiceInputActive, setIsVoiceInputActive] = useState(false);
  
  const { 
    isRecording,
    audioBlob,
    startRecording,
    stopRecording,
    getBase64Audio
  } = useAudioRecorder();

  const { 
    transcript, 
    isListening, 
    startListening, 
    stopListening,
    isError,
    errorMessage,
    setLanguage,
    currentLanguage
  } = useSpeechRecognition();
  
  useEffect(() => {
    if (transcript && transcript.trim()) {
      setMessage(prev => prev + (prev ? ' ' : '') + transcript);
    }
  }, [transcript, setMessage]);

  useEffect(() => {
    if (isError) {
      console.error('Speech recognition error:', errorMessage);
    }
  }, [isError, errorMessage]);

  useEffect(() => {
    if (audioBlob) {
      handleVoiceTranscription();
    }
  }, [audioBlob]);
  
  const handleVoiceTranscription = async () => {
    if (!audioBlob) return;

    try {
      const base64Audio = await getBase64Audio();
      if (!base64Audio) return;

      console.log('Processing audio for transcription...');

      const { data, error } = await supabase.functions.invoke('speech-to-text', {
        body: { 
          audioData: base64Audio,
          language: currentLanguage
        }
      });

      if (error) throw error;

      if (data?.text) {
        setMessage(prev => prev + (prev ? ' ' : '') + data.text);
        console.log('Speech detected:', data.text);
      } else {
        console.log('No speech detected in the recording.');
      }
    } catch (error) {
      console.error('Voice transcription error:', error);
    } finally {
      setIsVoiceInputActive(false);
    }
  };

  const toggleVoiceInput = async () => {
    if (isRecording) {
      stopRecording();
    } else {
      setIsVoiceInputActive(true);
      await startRecording();
    }
  };
  
  const changeRecognitionLanguage = (languageCode: string) => {
    setLanguage(languageCode);
  };

  return {
    isVoiceInputActive,
    isRecording,
    isListening,
    toggleVoiceInput,
    startListening,
    stopListening,
    changeRecognitionLanguage,
    currentLanguage
  };
};
