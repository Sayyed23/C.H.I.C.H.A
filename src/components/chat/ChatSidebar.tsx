
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { LogOut, Plus, Trash2, Settings, Home, Menu } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface ChatHistory {
  id: string;
  title: string;
  created_at: string;
}

interface ChatSidebarProps {
  currentChatId: string | null;
  onChatSelect: (chatId: string) => void;
  onNewChatCreate: () => void;
  isSidebarVisible: boolean;
  onSidebarToggle: () => void;
  isMobileView: boolean;
}

export const useChatSidebar = () => {
  const navigate = useNavigate();
  const [chatHistory, setChatHistory] = useState<ChatHistory[]>([]);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [isSidebarVisible, setIsSidebarVisible] = useState(false);
  const [isMobileView, setIsMobileView] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobileView(mobile);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const fetchChatHistory = async () => {
    try {
      const { data, error } = await supabase
        .from('chat_history')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setChatHistory(data);
      return data;
    } catch (error) {
      console.error('Error fetching chat history:', error);
      return [];
    }
  };

  const createNewChat = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('chat_history')
        .insert({ user_id: user.id })
        .select()
        .single();

      if (error) throw error;
      setCurrentChatId(data.id);
      fetchChatHistory();
      return data.id;
    } catch (error) {
      console.error('Error creating new chat:', error);
    }
  };

  const handleDeleteChat = async (chatId: string) => {
    try {
      const { error } = await supabase
        .from('chat_history')
        .delete()
        .eq('id', chatId);

      if (error) throw error;

      setChatHistory(prev => prev.filter(chat => chat.id !== chatId));
      
      if (chatId === currentChatId) {
        const newChatId = await createNewChat();
        return newChatId;
      }
    } catch (error) {
      console.error('Error deleting chat:', error);
    }
  };

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const formatChatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
  };

  const toggleSidebar = () => {
    setIsSidebarVisible(!isSidebarVisible);
  };

  return {
    chatHistory,
    currentChatId,
    setCurrentChatId,
    isSidebarVisible,
    isMobileView,
    fetchChatHistory,
    createNewChat,
    handleDeleteChat,
    handleLogout,
    formatChatTime,
    toggleSidebar
  };
};

export const ChatSidebar = ({ 
  currentChatId, 
  onChatSelect, 
  onNewChatCreate, 
  isSidebarVisible, 
  onSidebarToggle, 
  isMobileView 
}: ChatSidebarProps) => {
  const navigate = useNavigate();
  const { 
    chatHistory, 
    handleDeleteChat, 
    handleLogout, 
    formatChatTime 
  } = useChatSidebar();

  if (!isSidebarVisible) return null;

  return (
    <>
      {/* Backdrop overlay for mobile */}
      {isMobileView && (
        <div 
          className="fixed inset-0 bg-black/50 z-30"
          onClick={() => onSidebarToggle()}
        />
      )}

      {/* Sidebar */}
      <aside 
        className={`
          ${isMobileView ? 'fixed' : 'relative'} 
          z-40 h-full w-[300px] bg-white border-r border-gray-200 flex-shrink-0
          transition-all duration-300 ease-in-out
        `}
      >
        <div className="w-full h-full flex flex-col">
          {/* Header */}
          <div className="p-4 border-b border-gray-200 flex-shrink-0">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 bg-teal-500 rounded-lg flex items-center justify-center">
                <span className="text-white text-sm font-bold">💬</span>
              </div>
              <h1 className="text-xl font-bold text-gray-900">CHICHA</h1>
            </div>
            <div className="text-xs text-gray-500 mb-2">CHICHA AI Logo</div>
          </div>

          {/* New Chat Button */}
          <div className="p-4 flex-shrink-0">
            <Button 
              onClick={onNewChatCreate} 
              className="w-full bg-teal-500 hover:bg-teal-600 text-white rounded-lg py-3 flex items-center justify-center gap-2"
            >
              <Plus className="h-4 w-4" />
              New Chat
            </Button>
          </div>

          {/* Chat History */}
          <div className="flex-1 overflow-y-auto px-4 min-h-0">
            {chatHistory.map((chat) => (
              <div 
                key={chat.id} 
                className={`
                  flex items-center justify-between p-3 mb-2 rounded-lg cursor-pointer
                  ${currentChatId === chat.id ? 'bg-teal-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}
                `}
                onClick={() => onChatSelect(chat.id)}
              >
                <div className="flex-1">
                  <div className="text-sm font-medium">
                    Chat - {formatChatTime(chat.created_at)}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteChat(chat.id);
                  }}
                  className={`h-6 w-6 ${currentChatId === chat.id ? 'text-white hover:text-gray-200' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-gray-200 space-y-2 flex-shrink-0">
            <Button 
              variant="ghost" 
              onClick={() => navigate("/home")} 
              className="w-full justify-start text-gray-600 hover:text-gray-900 hover:bg-gray-100"
            >
              <Home className="h-4 w-4 mr-2" />
              Back to Home
            </Button>
            <Button 
              variant="ghost" 
              className="w-full justify-start text-gray-600 hover:text-gray-900 hover:bg-gray-100"
            >
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </Button>
            <Button 
              variant="ghost" 
              onClick={handleLogout} 
              className="w-full justify-start text-gray-600 hover:text-gray-900 hover:bg-gray-100"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </aside>
    </>
  );
};
