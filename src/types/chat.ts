export interface ChatHistory {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  user_id: string;
}

export interface ChatMessage {
  id: string;
  chat_id: string;
  content: string;
  is_bot: boolean;
  created_at: string;
}