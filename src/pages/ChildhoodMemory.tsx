
import { ChildhoodMemoryGeneratorHF } from "@/components/ChildhoodMemoryGeneratorHF";
import { MainNav } from "@/components/MainNav";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export default function ChildhoodMemoryPage() {
  const [apiStatus, setApiStatus] = useState<"checking" | "available" | "error">("checking");

  // Check API status on component mount
  useEffect(() => {
    const checkApiStatus = async () => {
      try {
        // Use a minimal test prompt to check API status
        const { data, error } = await supabase.functions.invoke("generate-childhood-image-hf", {
          body: { prompt: "test connection" }
        });
        
        if (error || (data && data.error)) {
          console.log("API check result:", error || data);
          // Check if it's a credit limit error (which means the API is working but out of credits)
          if (data && data.errorType === "CREDIT_LIMIT") {
            setApiStatus("error");
          } else if (error && error.message && error.message.includes("Edge Function returned a non-2xx status code")) {
            setApiStatus("error");
          } else {
            setApiStatus("available");
          }
        } else {
          setApiStatus("available");
        }
      } catch (e) {
        console.error("Error checking API status:", e);
        setApiStatus("error");
      }
    };

    checkApiStatus();
  }, []);

  return (
    <div className="flex min-h-screen flex-col">
      <MainNav />
      <main className="flex-1 p-6 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl font-bold mb-4">Childhood Memory Generator</h1>
          <p className="text-muted-foreground mb-6">Transform your childhood memories into beautiful images using AI</p>
          
          {apiStatus === "error" && (
            <Alert variant="warning" className="mb-6">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>API Usage Limit Reached</AlertTitle>
              <AlertDescription>
                The AI image generation API has reached its daily/monthly usage limit. 
                The generator is still available to use, but new images cannot be generated at this time.
                <div className="mt-2">
                  <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
                    Refresh Page
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          )}
          
          <ChildhoodMemoryGeneratorHF />
        </div>
      </main>
    </div>
  );
}
