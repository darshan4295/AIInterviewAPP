import { supabase } from './supabase';

export type UserRole = 'interviewer' | 'candidate';

// Utility function for delay with exponential backoff
const delay = (attempt: number) => new Promise(resolve => 
  setTimeout(resolve, Math.min(1000 * Math.pow(2, attempt), 10000))
);

export async function signIn(email: string, password: string) {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) throw error;

    // Get user's role from profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', data.user.id)
      .single();

    return {
      user: {
        ...data.user,
        role: profile?.role || 'candidate'
      },
      error: null
    };
  } catch (error) {
    return { user: null, error };
  }
}

export async function signUp(email: string, password: string, role: UserRole, maxAttempts = 3) {
  let attempt = 0;
  
  while (attempt < maxAttempts) {
    try {
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { role },
          emailRedirectTo: `${window.location.origin}`,
        }
      });

      if (signUpError) {
        // If rate limited, retry with backoff
        if (signUpError.status === 429) {
          attempt++;
          if (attempt < maxAttempts) {
            await delay(attempt);
            continue;
          }
          throw new Error('Unable to sign up at this time. Please try again later.');
        }

        // If user already exists, try to sign in
        if (signUpError.message.includes('User already registered')) {
          return signIn(email, password);
        }
        
        throw signUpError;
      }

      if (!authData.user) throw new Error('Signup failed');

      // Create profile
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: authData.user.id,
          email: authData.user.email,
          role
        });

      if (profileError) throw profileError;

      // Since email confirmation is disabled, sign in immediately
      return signIn(email, password);
    } catch (error) {
      if (attempt === maxAttempts - 1) {
        return { 
          user: null, 
          error: error instanceof Error ? error : new Error('An unknown error occurred') 
        };
      }
      attempt++;
      await delay(attempt);
    }
  }

  return {
    user: null,
    error: new Error('Maximum retry attempts reached. Please try again later.')
  };
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function getCurrentUser() {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    return {
      id: user.id,
      email: user.email!,
      role: profile?.role || 'candidate'
    };
  } catch (error) {
    console.error('Error in getCurrentUser:', error);
    return null;
  }
}