import { useState } from "react";
import { createClient, AuthError } from "@supabase/supabase-js";

const SUPABASE_URL = "https://your-supabase-url.supabase.co";
const SUPABASE_ANON_KEY = "a0705a5c54bca94cbfc6660ccd379eb0fb628bddfb4b09175e68cfe64ac5bba6";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const TEST_EMAIL = "test@example.com";
const TEST_PASSWORD = "test123456";

const AuthPage = () => {
  const [error, setError] = useState<string>("");

  const createTestUser = async () => {
    try {
      // First try to sign in, in case the user already exists
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
      });

      // If sign in fails because user doesn't exist, create new user
      if (signInError && signInError.message.includes('Invalid login credentials')) {
        const { error: signUpError } = await supabase.auth.signUp({
          email: TEST_EMAIL,
          password: TEST_PASSWORD,
        });

        if (signUpError) throw signUpError;

        // Try to sign in immediately after creation
        const { error: finalSignInError } = await supabase.auth.signInWithPassword({
          email: TEST_EMAIL,
          password: TEST_PASSWORD,
        });

        if (finalSignInError) {
          if (finalSignInError.message.includes('Email not confirmed')) {
            setError("Please disable email confirmation in Supabase Auth settings for development.");
            return;
          }
        }
      }
    } catch (error) {
      if (error instanceof AuthError) {
        setError(error.message);
      } else {
        setError("An unexpected error occurred.");
      }
    }
  };

  return (
    <div>
      <button onClick={createTestUser}>Create Test User</button>
      {error && <p>{error}</p>}
    </div>
  );
};

export default AuthPage;