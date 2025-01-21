export interface ChatHistory {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface ChatMessage {
  id: string;
  content: string;
  is_bot: boolean;
  created_at: string;
}