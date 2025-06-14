
export interface MessageSource {
  title: string;
  url: string;
  domain: string;
  icon?: string;
}

export interface Message {
  content: string;
  isBot: boolean;
  isProcessing?: boolean;
  model?: string;
  translatedTo?: string;
  sources?: MessageSource[];
}
