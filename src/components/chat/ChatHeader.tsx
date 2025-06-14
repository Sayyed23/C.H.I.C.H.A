
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";

interface ChatHeaderProps {
  onSidebarToggle: () => void;
}

export const ChatHeader = ({ onSidebarToggle }: ChatHeaderProps) => {
  return (
    <div className="bg-white border-b border-gray-200 px-6 py-4 flex-shrink-0">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button 
            variant="ghost" 
            onClick={onSidebarToggle}
            size="sm"
            className="p-2"
          >
            <Menu className="h-5 w-5" />
          </Button>
          <div className="w-8 h-8 bg-teal-500 rounded-lg flex items-center justify-center">
            <span className="text-white text-sm font-bold">💬</span>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              CHICHA Chat - {new Date().toLocaleTimeString('en-US', { 
                hour: '2-digit', 
                minute: '2-digit',
                hour12: true 
              })}
            </h2>
          </div>
        </div>
      </div>
    </div>
  );
};
