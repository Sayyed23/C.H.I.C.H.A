import { Plus, MessageSquare } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { ChatHistory } from "@/types/chat";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@/components/ui/sidebar";

export function ChatSidebar() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const { data: chats, refetch: refetchChats } = useQuery({
    queryKey: ['chats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('chat_history')
        .select('*')
        .order('updated_at', { ascending: false });

      if (error) throw error;
      return data as ChatHistory[];
    },
  });

  const createNewChat = async () => {
    try {
      const { data, error } = await supabase
        .from('chat_history')
        .insert([{}])
        .select()
        .single();

      if (error) throw error;
      
      await refetchChats();
      navigate(`/?chat=${data.id}`);
    } catch (error) {
      console.error('Error creating new chat:', error);
      toast({
        title: "Error",
        description: "Failed to create new chat. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <Sidebar>
      <SidebarHeader>
        <div className="p-2">
          <Button 
            onClick={createNewChat}
            className="w-full justify-start"
            variant="outline"
          >
            <Plus className="mr-2 h-4 w-4" />
            New Chat
          </Button>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {chats?.map((chat) => (
                <SidebarMenuItem key={chat.id}>
                  <SidebarMenuButton
                    asChild
                    tooltip={chat.title}
                    isActive={window.location.search.includes(chat.id)}
                  >
                    <a href={`/?chat=${chat.id}`}>
                      <MessageSquare className="h-4 w-4" />
                      <span>{chat.title}</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}