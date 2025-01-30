import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarGroupContent,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarProvider,
    SidebarTrigger,
  } from "@/components/ui/sidebar"
  import { LogOut, Plus, Trash2 } from "lucide-react"
  import { Button } from "./ui/button"
  import { supabase } from "@/integrations/supabase/client"
  import { useToast } from "./ui/use-toast"
  
  interface ChatHistory {
    id: string;
    title: string;
    created_at: string;
  }
  
  interface AppSidebarProps {
    chatHistory: ChatHistory[];
    currentChatId: string | null;
    onChatSelect: (chatId: string) => void;
    onNewChat: () => void;
    onDeleteChat: (chatId: string) => void;
  }
  
  export function AppSidebar({
    chatHistory,
    currentChatId,
    onChatSelect,
    onNewChat,
    onDeleteChat,
  }: AppSidebarProps) {
    const { toast } = useToast();
  
    const handleLogout = async () => {
      try {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
      } catch (error) {
        console.error('Error signing out:', error);
        toast({
          title: "Error",
          description: "Failed to sign out",
          variant: "destructive",
        });
      }
    };
  
    return (
      <Sidebar>
        <SidebarHeader>
          <Button 
            variant="outline" 
            onClick={onNewChat} 
            className="w-full flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            New Chat
          </Button>
        </SidebarHeader>
        
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                {chatHistory.map((chat) => (
                  <SidebarMenuItem key={chat.id}>
                    <SidebarMenuButton
                      isActive={currentChatId === chat.id}
                      onClick={() => onChatSelect(chat.id)}
                      className="flex items-center justify-between w-full"
                    >
                      <span className="truncate">{chat.title || "New Chat"}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteChat(chat.id);
                        }}
                        className="h-8 w-8 flex-shrink-0 opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
  
        <SidebarFooter>
          <Button 
            variant="outline" 
            onClick={handleLogout} 
            className="w-full flex items-center gap-2"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </Button>
        </SidebarFooter>
      </Sidebar>
    );
  }