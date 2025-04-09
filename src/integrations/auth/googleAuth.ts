
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/use-toast";
import { Session, User } from "@supabase/supabase-js";

/**
 * Signs in with Google OAuth
 * Returns a promise that resolves when the auth flow is complete
 */
export const signInWithGoogle = async (): Promise<void> => {
  try {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    });

    if (error) {
      console.error('Google sign in error:', error);
      toast({
        title: "Authentication Error",
        description: error.message || "Failed to sign in with Google",
        variant: "destructive",
      });
      throw error;
    }
  } catch (err) {
    console.error('Google authentication error:', err);
    toast({
      title: "Authentication Error",
      description: (err as Error).message || "An unexpected error occurred",
      variant: "destructive",
    });
    throw err;
  }
};

/**
 * Signs out the current user
 */
export const signOut = async (): Promise<void> => {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Sign out error:', error);
      toast({
        title: "Sign Out Error",
        description: error.message || "Failed to sign out",
        variant: "destructive",
      });
      throw error;
    }
    
    toast({
      title: "Signed Out",
      description: "You have been signed out successfully",
    });
  } catch (err) {
    console.error('Sign out error:', err);
    toast({
      title: "Sign Out Error",
      description: (err as Error).message || "An unexpected error occurred",
      variant: "destructive",
    });
    throw err;
  }
};

/**
 * Gets the current session and user
 */
export const getCurrentSession = async (): Promise<{ session: Session | null, user: User | null }> => {
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    
    return { 
      session: data.session,
      user: data.session?.user || null 
    };
  } catch (err) {
    console.error('Get session error:', err);
    toast({
      title: "Authentication Error",
      description: (err as Error).message || "Failed to get current session",
      variant: "destructive",
    });
    return { session: null, user: null };
  }
};

/**
 * Checks if the current session is from a Google login
 */
export const isGoogleSession = async (): Promise<boolean> => {
  const { data } = await supabase.auth.getSession();
  const { session } = data;
  
  if (!session) return false;
  
  // Check if the provider is Google
  return session.user?.app_metadata?.provider === 'google';
};

/**
 * Handles the OAuth callback
 * Returns a promise that resolves to the session if successful
 */
export const handleAuthCallback = async (): Promise<Session | null> => {
  try {
    // The hash contains the token which supabase-js will process
    const { data, error } = await supabase.auth.getSession();
    
    if (error) throw error;
    return data.session;
  } catch (err) {
    console.error('Error handling auth callback:', err);
    toast({
      title: "Authentication Error",
      description: (err as Error).message || "Failed to complete authentication",
      variant: "destructive",
    });
    return null;
  }
};
