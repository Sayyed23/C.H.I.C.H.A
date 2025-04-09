
import { Link, useLocation } from "react-router-dom";
import { Button } from "./ui/button";
import { Home, MessageSquare, Image } from "lucide-react";

export function MainNav() {
  const location = useLocation();
  
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center">
        <div className="mr-4 hidden md:flex">
          <Link to="/" className="mr-6 flex items-center space-x-2">
            <span className="font-bold">Childhood Memory App</span>
          </Link>
          <nav className="flex items-center space-x-4 text-sm font-medium">
            <Link to="/">
              <Button 
                variant={location.pathname === "/" ? "default" : "ghost"} 
                className="flex gap-2 items-center"
              >
                <Home className="h-4 w-4" />
                <span>Home</span>
              </Button>
            </Link>
            <Link to="/chat">
              <Button 
                variant={location.pathname === "/chat" ? "default" : "ghost"} 
                className="flex gap-2 items-center"
              >
                <MessageSquare className="h-4 w-4" />
                <span>Chat</span>
              </Button>
            </Link>
            <Link to="/childhood-memory">
              <Button 
                variant={location.pathname === "/childhood-memory" ? "default" : "ghost"} 
                className="flex gap-2 items-center"
              >
                <Image className="h-4 w-4" />
                <span>Memory Generator</span>
              </Button>
            </Link>
          </nav>
        </div>
        <div className="flex md:hidden">
          <Link to="/">
            <Button 
              variant={location.pathname === "/" ? "default" : "ghost"} 
              size="icon"
            >
              <Home className="h-5 w-5" />
            </Button>
          </Link>
          <Link to="/chat">
            <Button 
              variant={location.pathname === "/chat" ? "default" : "ghost"} 
              size="icon"
            >
              <MessageSquare className="h-5 w-5" />
            </Button>
          </Link>
          <Link to="/childhood-memory">
            <Button 
              variant={location.pathname === "/childhood-memory" ? "default" : "ghost"} 
              size="icon"
            >
              <Image className="h-5 w-5" />
            </Button>
          </Link>
        </div>
      </div>
    </header>
  );
}
