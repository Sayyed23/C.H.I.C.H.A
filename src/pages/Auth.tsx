import { Auth } from "@supabase/auth-ui-react";
import { ThemeSupa } from "@supabase/auth-ui-shared";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useState } from "react";
import { AuthError } from "@supabase/supabase-js";

const TEST_EMAIL = "test@example.com";
const TEST_PASSWORD = "test123456";

const AuthPage = () => {
  const [error, setError] = useState<string>("");

  const createTestUser = async () => {
    try {
      const { error } = await supabase.auth.signUp({
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
      });

      if (error) throw error;

      // After creating the user, try to sign in
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
      });

      if (signInError) throw signInError;

    } catch (err) {
      if (err instanceof AuthError) {
        // If the user already exists, try to sign in directly
        if (err.message.includes('User already registered')) {
          try {
            const { error: signInError } = await supabase.auth.signInWithPassword({
              email: TEST_EMAIL,
              password: TEST_PASSWORD,
            });
            if (signInError) throw signInError;
          } catch (signInErr) {
            setError((signInErr as Error).message);
          }
        } else {
          setError(err.message);
        }
      } else {
        setError((err as Error).message);
      }
    }
  };

  return (
    <div className="container flex h-screen w-full flex-col items-center justify-center">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle>Welcome to CHICHA</CardTitle>
          <CardDescription>Sign in to continue to the application</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <Auth
            supabaseClient={supabase}
            appearance={{
              theme: ThemeSupa,
              variables: {
                default: {
                  colors: {
                    brand: 'rgb(var(--primary))',
                    brandAccent: 'rgb(var(--primary))',
                  },
                },
              },
            }}
            providers={["google"]}
            redirectTo={window.location.origin}
          />
          <div className="mt-4 text-center">
            <Button 
              variant="outline" 
              onClick={createTestUser}
              className="w-full"
            >
              Create & Login Test Account
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AuthPage;