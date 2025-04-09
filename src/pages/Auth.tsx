
import { Auth } from "@supabase/auth-ui-react";
import { ThemeSupa } from "@supabase/auth-ui-shared";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { signInWithGoogle, isGoogleSession } from "@/integrations/auth/googleAuth";
import { Separator } from "@/components/ui/separator";
import { LogIn } from "lucide-react";

const TEST_EMAIL = "test@example.com";
const TEST_PASSWORD = "test123456";

const AuthPage = () => {
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Set up auth state listener
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event, session);
      if (event === 'SIGNED_IN' && session) {
        // Store the session in localStorage
        localStorage.setItem('supabase.auth.token', session.refresh_token || '');
        // Create profile if it doesn't exist
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select()
          .eq('id', session.user.id)
          .single();

        if (profileError && !profile) {
          const { error: insertError } = await supabase
            .from('profiles')
            .insert([
              { 
                id: session.user.id,
                username: session.user.email?.split('@')[0],
                avatar_url: session.user.user_metadata.avatar_url
              }
            ]);
          
          if (insertError) {
            console.error('Error creating profile:', insertError);
          }
        }
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
      setLoading(true);
      
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
            setLoading(false);
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
          setLoading(false);
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
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      setError('');
      setLoading(true);
      await signInWithGoogle();
    } catch (err) {
      // Error handling is done in the signInWithGoogle function
      console.error('Failed to initiate Google sign in');
    } finally {
      setLoading(false);
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

          {/* Google Sign-In Button */}
          <Button 
            variant="outline" 
            onClick={handleGoogleSignIn}
            className="w-full flex items-center justify-center gap-2"
            disabled={loading}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            {loading ? 'Signing in...' : 'Sign in with Google'}
          </Button>
          
          <Separator className="my-4" />
          
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
            providers={[]}
            redirectTo={`${window.location.origin}/auth/callback`}
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
                sign_up: {
                  email_label: "Email",
                  password_label: "Password",
                  email_input_placeholder: "Your email",
                  password_input_placeholder: "Your password",
                  button_label: "Sign up",
                  loading_button_label: "Signing up ...",
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
              disabled={loading}
            >
              {loading ? 'Processing...' : 'Create & Login Test Account'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AuthPage;
