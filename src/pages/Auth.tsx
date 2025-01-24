import { Auth } from "@supabase/auth-ui-react";
import { ThemeSupa } from "@supabase/auth-ui-shared";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

const TEST_EMAIL = "test@example.com";
const TEST_PASSWORD = "test123456";

const AuthPage = () => {
  const [error, setError] = useState<string>("");
  const navigate = useNavigate();

  useEffect(() => {
    // Set up auth state listener
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session) {
        // Store the session in localStorage
        localStorage.setItem('supabase.auth.token', session.refresh_token || '');
        navigate('/');
      }
    });

    // Check if user is already signed in
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate('/');
      }
    });

    // Cleanup listener on unmount
    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, [navigate]);

  const createTestUser = async () => {
    try {
      setError(''); // Clear any previous errors
      
      // First try to sign in, in case the user already exists
      const { error: signInError, data: signInData } = await supabase.auth.signInWithPassword({
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
      });

      // If sign in fails because user doesn't exist, create new user
      if (signInError && signInError.message.includes('Invalid login credentials')) {
        const { error: signUpError, data: signUpData } = await supabase.auth.signUp({
          email: TEST_EMAIL,
          password: TEST_PASSWORD,
        });

        if (signUpError) throw signUpError;

        // Try to sign in immediately after creation
        const { error: finalSignInError, data: finalSignInData } = await supabase.auth.signInWithPassword({
          email: TEST_EMAIL,
          password: TEST_PASSWORD,
        });

        if (finalSignInError) {
          if (finalSignInError.message.includes('Email not confirmed')) {
            setError("Please disable email confirmation in Supabase Auth settings for development.");
            return;
          }
          throw finalSignInError;
        }

        // Store the session if sign in successful
        if (finalSignInData.session) {
          localStorage.setItem('supabase.auth.token', finalSignInData.session.refresh_token || '');
        }
      } else if (signInError) {
        if (signInError.message.includes('Email not confirmed')) {
          setError("Please disable email confirmation in Supabase Auth settings for development.");
          return;
        }
        throw signInError;
      } else if (signInData.session) {
        // Store the session if initial sign in was successful
        localStorage.setItem('supabase.auth.token', signInData.session.refresh_token || '');
      }

    } catch (err) {
      setError((err as Error).message);
      console.error('Authentication error:', err);
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
              style: {
                button: {
                  borderRadius: '6px',
                  height: '40px',
                },
                container: {
                  gap: '16px',
                },
              },
            }}
            providers={["google"]}
            redirectTo={window.location.origin}
            localization={{
              variables: {
                sign_in: {
                  email_label: "Email",
                  password_label: "Password",
                  email_input_placeholder: "Your email",
                  password_input_placeholder: "Your password",
                  button_label: "Sign in",
                  loading_button_label: "Signing in ...",
                },
              },
            }}
            view="sign_in"
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