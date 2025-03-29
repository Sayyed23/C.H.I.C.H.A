import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
  } from "@/components/ui/dropdown-menu";
  import { Button } from "@/components/ui/button";
  import { Languages } from "lucide-react";
  
  interface Language {
    name: string;
    code: string;
  }
  
  const languages: Language[] = [
    { name: "Hindi", code: "hi" },
    { name: "Marathi", code: "mr" },
    { name: "Sanskrit", code: "sa" },
    { name: "Spanish", code: "es" },
    { name: "French", code: "fr" },
    { name: "German", code: "de" },
    { name: "Italian", code: "it" },
    { name: "Portuguese", code: "pt" },
    { name: "Russian", code: "ru" },
    { name: "Chinese", code: "zh" },
    { name: "Japanese", code: "ja" },
    { name: "Korean", code: "ko" },
    { name: "Arabic", code: "ar" },
  ];
  
  interface LanguageSelectorProps {
    selectedLanguage: string | null;
    onSelectLanguage: (language: string | null) => void;
  }
  
  export const LanguageSelector = ({
    selectedLanguage,
    onSelectLanguage
  }: LanguageSelectorProps) => {
    return (
      <>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant={selectedLanguage ? "secondary" : "ghost"} 
              size="icon"
              className="flex-shrink-0"
              title="Choose response language"
            >
              <Languages className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onSelectLanguage(null)}>
              English (Default)
            </DropdownMenuItem>
            {languages.map((lang) => (
              <DropdownMenuItem
                key={lang.code}
                onClick={() => onSelectLanguage(lang.code)}
              >
                {lang.name}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        
        {selectedLanguage && (
          <div className="text-xs text-muted-foreground ml-1">
            Response will be in {languages.find(l => l.code === selectedLanguage)?.name || selectedLanguage}
            <Button 
              variant="link" 
              size="sm" 
              className="p-0 h-auto text-xs ml-1" 
              onClick={() => onSelectLanguage(null)}
            >
              Reset
            </Button>
          </div>
        )}
      </>
    );
  };
  