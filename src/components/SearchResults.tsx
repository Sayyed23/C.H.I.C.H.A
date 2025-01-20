import { ExternalLink, Eye } from "lucide-react";
import { Card } from "./ui/card";

interface Source {
  title: string;
  url: string;
  domain: string;
  icon?: string;
}

interface SearchResultsProps {
  sources?: Source[];
  showViewMore?: boolean;
}

export const SearchResults = ({ sources, showViewMore }: SearchResultsProps) => {
  if (!sources?.length) return null;

  return (
    <div className="w-full space-y-2 mb-4">
      <div className="flex gap-2 mb-2">
        {sources.slice(0, 3).map((source, i) => (
          <img 
            key={i}
            src={source.icon || "https://www.google.com/favicon.ico"}
            alt={source.domain}
            className="w-6 h-6 rounded"
          />
        ))}
      </div>
      
      {sources.slice(0, 2).map((source, i) => (
        <Card key={i} className="p-4">
          <div className="flex items-start gap-3">
            <img 
              src={source.icon || "https://www.google.com/favicon.ico"}
              alt={source.domain}
              className="w-8 h-8 rounded"
            />
            <div className="flex-1">
              <h3 className="font-semibold text-lg">{source.title}</h3>
              <p className="text-sm text-muted-foreground">{source.domain}</p>
              <a 
                href={source.url}
                target="_blank"
                rel="noopener noreferrer" 
                className="text-blue-500 hover:underline inline-flex items-center gap-1 mt-1"
              >
                Visit Source
                <ExternalLink className="h-4 w-4" />
              </a>
            </div>
          </div>
        </Card>
      ))}
      
      {showViewMore && (
        <button className="flex items-center gap-2 text-blue-500 hover:underline">
          <Eye className="h-4 w-4" />
          View {sources.length - 2} more
        </button>
      )}
    </div>
  );
};