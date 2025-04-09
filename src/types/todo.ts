export interface Todo {
  id: string;
  title: string;
  description?: string;
  due_date?: string;
  calendar_event_id?: string;
  status?: string;
  gemini_suggestions?: string;
  created_at: string;
  updated_at: string;
  user_id: string;
}