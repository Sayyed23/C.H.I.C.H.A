import { cn } from "@/lib/utils";
import { Check, Download, Languages, X, Volume2, VolumeX } from "lucide-react";
import { ProcessingState } from "./ProcessingState";
import { SearchResults } from "./SearchResults";
import { Button } from "./ui/button";
import { useState, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Card } from "./ui/card";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { LocationMap } from "./maps/LocationMap";

interface ChatMessageProps {
  content: string;
  isBot?: boolean;
  isProcessing?: boolean;
  sources?: Array<{
    title: string;
    url: string;
    domain: string;
    icon?: string;
  }>;
}

const languages = [{
  name: "Hindi",
  code: "hi"
}, {
  name: "Marathi",
  code: "mr"
}, {
  name: "Sanskrit",
  code: "sa"
}, {
  name: "Arabic",
  code: "ar"
}, {
  name: "Urdu",
  code: "ur"
}, {
  name: "Spanish",
  code: "es"
}, {
  name: "French",
  code: "fr"
}, {
  name: "German",
  code: "de"
}, {
  name: "Italian",
  code: "it"
}, {
  name: "Japanese",
  code: "ja"
}, {
  name: "Chinese",
  code: "zh"
}];

// Language code mapping for speech synthesis
const speechLangMap: Record<string, string> = {
  'hi': 'hi-IN',
  'mr': 'mr-IN',
  'sa': 'sa-IN',
  'ar': 'ar-SA',
  'ur': 'ur-PK',
  'es': 'es-ES',
  'fr': 'fr-FR',
  'de': 'de-DE',
  'it': 'it-IT',
  'ja': 'ja-JP',
  'zh': 'zh-CN',
  'en': 'en-US'
};

export const ChatMessage = ({
  content,
  isBot = false,
  isProcessing = false,
  sources
}: ChatMessageProps) => {
  const [translatedContent, setTranslatedContent] = useState<string | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);
  const [isImageDialogOpen, setIsImageDialogOpen] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const speechSynthesisRef = useRef<SpeechSynthesisUtterance | null>(null);
  const [currentSentenceIndex, setCurrentSentenceIndex] = useState(0);
  const [sentences, setSentences] = useState<string[]>([]);
  const [speechSynthesisTimeout, setSpeechSynthesisTimeout] = useState<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
      if (speechSynthesisRef.current && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      if (speechSynthesisTimeout) {
        clearTimeout(speechSynthesisTimeout);
      }
    };
  }, [audioUrl, speechSynthesisTimeout]);

  const processingSteps = [{
    text: "Analyzing query",
    completed: true
  }, {
    text: "Generating search query",
    completed: true
  }, {
    text: "Searching knowledge base",
    completed: true
  }, {
    text: "Processing information",
    completed: true
  }, {
    text: "Generating response",
    completed: false
  }];

  const handleTranslate = async (languageCode: string) => {
    setIsTranslating(true);
    try {
      console.log('Starting translation for language:', languageCode);
      const {
        data,
        error
      } = await supabase.functions.invoke('translate', {
        body: {
          text: content,
          targetLanguage: languageCode
        }
      });
      if (error) {
        console.error('Translation error from Supabase:', error);
        throw error;
      }
      console.log('Translation successful:', data);
      setTranslatedContent(data.translatedText);
    } catch (error) {
      console.error('Translation error:', error);
    } finally {
      setIsTranslating(false);
    }
  };

  const splitIntoSentences = (text: string, language: string = 'en'): string[] => {
    if (language === 'ja' || language === 'zh') {
      const pattern = language === 'ja' ? 
        /([。！？]+)/g : // Japanese punctuation
        /([。！？\.!?]+)/g; // Chinese punctuation plus western
      
      const parts = text.split(pattern);
      const result: string[] = [];
      
      for (let i = 0; i < parts.length - 1; i += 2) {
        if (parts[i] || parts[i+1]) {
          result.push((parts[i] || '') + (parts[i+1] || ''));
        }
      }
      
      if (parts.length % 2 === 1 && parts[parts.length - 1]) {
        result.push(parts[parts.length - 1]);
      }
      
      return result.flatMap(sentence => 
        sentence.length > 100 ? 
        splitLongSentence(sentence, language) : 
        [sentence]
      );
    }
    
    const sentenceEnders = /[.!?।॥]+\s*/g;
    const sentences = text.split(sentenceEnders).filter(Boolean);
    
    if (sentences.length <= 1 && text.length > 100) {
      const phraseEnders = /[,;:]+\s*/g;
      return text.split(phraseEnders).filter(Boolean);
    }
    
    return sentences.flatMap(sentence => 
      sentence.length > 150 ? splitLongSentence(sentence, language) : [sentence]
    );
  };

  const splitLongSentence = (sentence: string, language: string): string[] => {
    if (language === 'ja' || language === 'zh') {
      const result: string[] = [];
      const chunkSize = 50;
      
      for (let i = 0; i < sentence.length; i += chunkSize) {
        result.push(sentence.substring(i, i + chunkSize));
      }
      return result;
    }
    
    const conjunctions = / and | but | or | however | therefore | moreover | furthermore /g;
    const parts = sentence.split(conjunctions).filter(Boolean);
    
    if (parts.length > 1) {
      return parts;
    }
    
    const result: string[] = [];
    const chunkSize = 100;
    
    for (let i = 0; i < sentence.length; i += chunkSize) {
      result.push(sentence.substring(i, i + chunkSize));
    }
    return result;
  };

  const handleSpeakMessage = async () => {
    if (isPlayingAudio || !isBot) return;
    
    try {
      const textToSpeak = translatedContent || content;
      
      const cleanText = textToSpeak.replace(/!\[.*?\]\(.*?\)/g, '')
                                   .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1')
                                   .trim();
      
      const language = translatedContent 
        ? languages.find(lang => translatedContent.includes(lang.name))?.code || 
          (content.match(/[\u0900-\u097F]/) ? 'hi' : // Hindi Unicode range
          content.match(/[\u0980-\u09FF]/) ? 'bn' : // Bengali Unicode range
          content.match(/[\u0A00-\u0A7F]/) ? 'pa' : // Punjabi Unicode range
          content.match(/[\u0A80-\u0AFF]/) ? 'gu' : // Gujarati Unicode range
          content.match(/[\u0B00-\u0B7F]/) ? 'or' : // Oriya Unicode range
          content.match(/[\u0B80-\u0BFF]/) ? 'ta' : // Tamil Unicode range
          content.match(/[\u0C00-\u0C7F]/) ? 'te' : // Telugu Unicode range
          content.match(/[\u0C80-\u0CFF]/) ? 'kn' : // Kannada Unicode range
          content.match(/[\u0D00-\u0D7F]/) ? 'ml' : // Malayalam Unicode range
          content.match(/[\u0600-\u06FF]/) ? 'ar' : // Arabic Unicode range
          content.match(/[\u0750-\u077F]/) ? 'ar' : // Arabic Supplement Unicode range
          content.match(/[\u0590-\u05FF]/) ? 'he' : // Hebrew Unicode range
          content.match(/[\u3040-\u309F]|\u30A0-\u30FF|\u4E00-\u9FFF/) ? 'ja' : // Japanese Unicode ranges
          'en') 
        : 'en';
      
      const textSentences = splitIntoSentences(cleanText, language);
      setSentences(textSentences);
      
      if (audioUrl) {
        audioRef.current?.play();
        setIsPlayingAudio(true);
        return;
      }
      
      setIsPlayingAudio(true);
      
      const {
        data,
        error
      } = await supabase.functions.invoke('text-to-speech', {
        body: {
          text: cleanText,
          language: language
        }
      });

      if (error) {
        throw error;
      }

      if (data?.useBrowserSpeech || data?.hasMultipleChunks) {
        console.log("Using browser speech synthesis for language:", language);
        if (!window.speechSynthesis) {
          throw new Error("Browser speech synthesis not supported");
        }
        
        if (speechSynthesisRef.current) {
          window.speechSynthesis.cancel();
        }
        
        setCurrentSentenceIndex(0);
        
        const speakSentences = (index = 0) => {
          if (index >= textSentences.length) {
            setIsPlayingAudio(false);
            return;
          }
          
          setCurrentSentenceIndex(index);
          
          const utterance = new SpeechSynthesisUtterance(textSentences[index]);
          
          const langCode = speechLangMap[language] || 'en-US';
          utterance.lang = langCode;
          
          const allVoices = window.speechSynthesis.getVoices();
          
          let matchingVoices = allVoices.filter(voice => 
            voice.lang === langCode
          );
          
          if (matchingVoices.length === 0) {
            matchingVoices = allVoices.filter(voice => 
              voice.lang.startsWith(langCode.split('-')[0])
            );
          }
          
          if (matchingVoices.length === 0) {
            const langPrefix = langCode.split('-')[0];
            matchingVoices = allVoices.filter(voice => 
              voice.lang.includes(langPrefix)
            );
          }
          
          if (matchingVoices.length > 0) {
            if (language === 'ja') {
              const femaleVoice = matchingVoices.find(v => 
                v.name.includes('Female') || v.name.includes('女性')
              );
              utterance.voice = femaleVoice || matchingVoices[0];
            } else {
              utterance.voice = matchingVoices[0];
            }
            console.log(`Using voice: ${utterance.voice?.name} (${utterance.voice?.lang})`);
          }
          
          utterance.onend = () => {
            speakSentences(index + 1);
          };
          
          utterance.onerror = (event) => {
            console.error('Error speaking sentence', index, event);
            speakSentences(index + 1);
          };
          
          speechSynthesisRef.current = utterance;
          window.speechSynthesis.speak(utterance);
        };
        
        speakSentences(0);
        return;
      }
      
      if (data?.audioContent) {
        const audioBlob = base64ToBlob(data.audioContent, 'audio/mp3');
        const url = URL.createObjectURL(audioBlob);
        setAudioUrl(url);

        if (!audioRef.current) {
          audioRef.current = new Audio(url);
          audioRef.current.onended = () => {
            setIsPlayingAudio(false);
          };
        } else {
          audioRef.current.src = url;
        }
        
        await audioRef.current.play();
      } else {
        throw new Error("No audio content received");
      }
    } catch (error) {
      console.error('Text-to-speech error:', error);
      setIsPlayingAudio(false);
      
      try {
        if (window.speechSynthesis) {
          const textToSpeak = translatedContent || content;
          
          const cleanText = textToSpeak.replace(/!\[.*?\]\(.*?\)/g, '')
                                       .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1')
                                       .trim();
          
          const language = translatedContent ? 
            languages.find(lang => translatedContent.includes(lang.name))?.code || 'en' : 'en';
          
          const textSentences = splitIntoSentences(cleanText, language);
          setSentences(textSentences);
          
          setIsPlayingAudio(true);
          
          const speakSentences = (index = 0) => {
            if (index >= textSentences.length) {
              setIsPlayingAudio(false);
              return;
            }
            
            setCurrentSentenceIndex(index);
            
            const utterance = new SpeechSynthesisUtterance(textSentences[index]);
            
            const langCode = speechLangMap[language] || 'en-US';
            utterance.lang = langCode;
            
            const allVoices = window.speechSynthesis.getVoices();
            
            let matchingVoices = allVoices.filter(voice => 
              voice.lang === langCode || 
              voice.lang.startsWith(langCode.split('-')[0])
            );
            
            if (matchingVoices.length > 0) {
              utterance.voice = matchingVoices[0];
              console.log(`Using voice: ${utterance.voice.name} (${utterance.voice.lang})`);
            } else {
              console.log(`No matching voice found for ${langCode}, using default voice`);
            }
            
            utterance.onend = () => {
              speakSentences(index + 1);
            };
            
            utterance.onerror = (event) => {
              console.error('Error speaking sentence', index, event);
              speakSentences(index + 1);
            };
            
            speechSynthesisRef.current = utterance;
            window.speechSynthesis.speak(utterance);
          };
          
          if (window.speechSynthesis.getVoices().length === 0) {
            const timeoutId = setTimeout(() => {
              if (window.speechSynthesis.getVoices().length > 0) {
                speakSentences(0);
              } else {
                console.error('No voices available after timeout');
                setIsPlayingAudio(false);
              }
            }, 1000);
            
            setSpeechSynthesisTimeout(timeoutId);
            
            window.speechSynthesis.onvoiceschanged = () => {
              if (speechSynthesisTimeout) {
                clearTimeout(speechSynthesisTimeout);
                setSpeechSynthesisTimeout(null);
              }
              speakSentences(0);
              window.speechSynthesis.onvoiceschanged = null;
            };
          } else {
            speakSentences(0);
          }
        } else {
          throw new Error("Browser speech synthesis not supported");
        }
      } catch (fallbackError) {
        console.error('Fallback speech synthesis error:', fallbackError);
      }
    }
  };

  const stopSpeaking = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    if (speechSynthesisRef.current && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      speechSynthesisRef.current = null;
    }
    if (speechSynthesisTimeout) {
      clearTimeout(speechSynthesisTimeout);
      setSpeechSynthesisTimeout(null);
    }
    setIsPlayingAudio(false);
    setCurrentSentenceIndex(0);
  };

  const base64ToBlob = (base64: string, mimeType: string) => {
    const byteCharacters = atob(base64);
    const byteArrays = [];
    for (let offset = 0; offset < byteCharacters.length; offset += 512) {
      const slice = byteCharacters.slice(offset, offset + 512);
      const byteNumbers = new Array(slice.length);
      for (let i = 0; i < slice.length; i++) {
        byteNumbers[i] = slice.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      byteArrays.push(byteArray);
    }
    return new Blob(byteArrays, {
      type: mimeType
    });
  };

  const handleDownloadImage = async (imageUrl: string) => {
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `generated-image-${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Download error:', error);
    }
  };

  const renderContent = (text: string) => {
    const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
    const parts = [];
    let lastIndex = 0;
    let match;
    while ((match = linkRegex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push(text.slice(lastIndex, match.index));
      }
      const [fullMatch, linkText, url] = match;
      parts.push(<a key={match.index} href={url} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline inline-flex items-center gap-1" onClick={e => {
        if (!window.confirm('You are about to visit an external website. Continue?')) {
          e.preventDefault();
        }
      }}>
          {linkText}
        </a>);
      lastIndex = match.index + fullMatch.length;
    }
    if (lastIndex < text.length) {
      parts.push(text.slice(lastIndex));
    }
    return parts;
  };

  const imageUrlMatch = content.match(/!\[.*?\]\((.*?)\)/);
  const imageUrl = imageUrlMatch ? imageUrlMatch[1] : null;
  const textContent = content.replace(/!\[.*?\]\((.*?)\)/, '').trim();
  const locationMatches = textContent.match(/Weather in ([^:,]+)(?:,|\:|$)/g);
  const locations = locationMatches ? locationMatches.map(match => match.replace(/Weather in |\:$/g, '').trim()) : [];

  const currentDisplayText = translatedContent || textContent;
  const displaySentences = isPlayingAudio && sentences.length > 0 
    ? sentences
    : [];

  return <div className={cn("flex w-full flex-col animate-message-fade-in gap-2", isBot ? "items-start" : "items-end")}>
      {isBot && sources && <SearchResults sources={sources} showViewMore={sources.length > 2} />}
      {isBot && isProcessing && <ProcessingState steps={processingSteps} />}
      <div className="flex flex-col gap-2 max-w-[85%] sm:max-w-[75%]">
        {imageUrl && <Dialog open={isImageDialogOpen} onOpenChange={setIsImageDialogOpen}>
            <DialogTrigger asChild>
              <Card className="overflow-hidden cursor-pointer hover:opacity-95 transition-opacity">
                <div className="relative">
                  <img src={imageUrl} alt="Generated content" className="w-full h-auto object-cover rounded-t-lg" />
                  <Button variant="secondary" size="icon" className="absolute top-2 right-2 bg-background/80 hover:bg-background/90" onClick={e => {
                e.stopPropagation();
                handleDownloadImage(imageUrl);
              }}>
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
                <div className="p-4">
                  <p className="text-sm text-muted-foreground">
                    {renderContent(textContent)}
                  </p>
                </div>
              </Card>
            </DialogTrigger>
            <DialogContent className="max-w-4xl w-[95vw] p-0 bg-transparent border-none">
              <div className="relative rounded-lg overflow-hidden bg-background">
                <img src={imageUrl} alt="Full size preview" className="w-full h-auto max-h-[90vh] object-contain" />
                <div className="absolute top-2 right-2 flex gap-2">
                  <Button variant="secondary" size="icon" className="bg-background/80 hover:bg-background/90" onClick={() => handleDownloadImage(imageUrl)}>
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button variant="secondary" size="icon" className="bg-background/80 hover:bg-background/90" onClick={() => setIsImageDialogOpen(false)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>}
        {!imageUrl && <div className="flex flex-col gap-2">
            <div className={cn("rounded-2xl px-4 sm:px-6 py-3 font-medium leading-relaxed tracking-wide", isBot ? "bg-secondary text-secondary-foreground" : "bg-primary text-primary-foreground")}>
              {isPlayingAudio && displaySentences.length > 0 ? (
                displaySentences.map((sentence, index) => (
                  <span key={index} className={cn(
                    index === currentSentenceIndex ? "bg-primary/10 font-semibold" : ""
                  )}>
                    {sentence}{index < displaySentences.length - 1 ? ' ' : ''}
                  </span>
                ))
              ) : (
                renderContent(translatedContent || textContent)
              )}
            </div>
            {isBot && <div className="flex items-center gap-2 mt-1">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="secondary" size="sm" disabled={isTranslating} className="flex items-center gap-2">
                      <Languages className="h-4 w-4" />
                      {isTranslating ? "Translating..." : "Translate"}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    {languages.map(lang => <DropdownMenuItem key={lang.code} onClick={() => handleTranslate(lang.code)}>
                        {lang.name}
                      </DropdownMenuItem>)}
                  </DropdownMenuContent>
                </DropdownMenu>
                
                <Button 
                  variant="secondary" 
                  size="sm" 
                  onClick={isPlayingAudio ? stopSpeaking : handleSpeakMessage}
                  className="flex items-center gap-2"
                  disabled={!isBot}
                >
                  {isPlayingAudio ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                  {isPlayingAudio ? "Stop" : "Speak"}
                </Button>
                
                {translatedContent && <Button variant="ghost" size="sm" onClick={() => setTranslatedContent(null)} className="text-muted-foreground hover:text-foreground">
                    Show Original
                  </Button>}
              </div>}
          </div>}
        {locations.length > 0 && isBot && <LocationMap locations={locations} className="mt-2 w-full max-w-2xl" />}
      </div>
    </div>;
};
