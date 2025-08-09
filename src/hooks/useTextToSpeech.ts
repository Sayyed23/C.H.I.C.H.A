import { useCallback, useEffect, useMemo, useRef, useState } from "react";

interface SpeakOptions {
  rate?: number; // 0.1 - 10
  pitch?: number; // 0 - 2
  volume?: number; // 0 - 1
  lang?: string;
}

export function useTextToSpeech() {
  const isSupported = typeof window !== "undefined" && "speechSynthesis" in window && "SpeechSynthesisUtterance" in window;

  const [enabled, setEnabled] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    try {
      return localStorage.getItem("ttsEnabled") === "true";
    } catch {
      return false;
    }
  });

  const [isSpeaking, setIsSpeaking] = useState(false);
  const currentUtterance = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem("ttsEnabled", String(enabled));
    } catch {}
  }, [enabled]);

  const stop = useCallback(() => {
    if (!isSupported) return;
    try {
      window.speechSynthesis.cancel();
      currentUtterance.current = null;
      setIsSpeaking(false);
    } catch {}
  }, [isSupported]);

  const speak = useCallback(
    (text: string, options?: SpeakOptions) => {
      if (!isSupported || !text) return;

      // Cancel any ongoing speech
      try {
        window.speechSynthesis.cancel();
      } catch {}

      const utter = new SpeechSynthesisUtterance(text);
      utter.rate = options?.rate ?? 1;
      utter.pitch = options?.pitch ?? 1;
      utter.volume = options?.volume ?? 1;
      if (options?.lang) utter.lang = options.lang;

      utter.onstart = () => setIsSpeaking(true);
      utter.onend = () => {
        setIsSpeaking(false);
        currentUtterance.current = null;
      };
      utter.onerror = () => {
        setIsSpeaking(false);
        currentUtterance.current = null;
      };

      currentUtterance.current = utter;
      try {
        window.speechSynthesis.speak(utter);
      } catch {}
    },
    [isSupported]
  );

  return {
    isSupported,
    enabled,
    setEnabled,
    isSpeaking,
    speak,
    stop,
  };
}
