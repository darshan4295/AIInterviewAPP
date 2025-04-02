import { supabase } from './supabase';

export type UserRole = 'interviewer' | 'candidate';

interface AuthResponse {
  user: {
    id: string;
    email: string;
    role: UserRole;
  } | null;
  error: Error | null;
}

export async function signIn(email: string, password: string, role: UserRole): Promise<AuthResponse> {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (error) throw error;

    // Check user's role in the profiles table
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', data.user.id)
      .single();

    if (profileError) throw profileError;
    
    if (profile.role !== role) {
      throw new Error('Invalid role for this login type');
    }

    return {
      user: {
        id: data.user.id,
        email: data.user.email!,
        role: profile.role
      },
      error: null
    };
  } catch (error) {
    return {
      user: null,
      error: error as Error
    };
  }
}

export async function signUp(email: string, password: string, role: UserRole): Promise<AuthResponse> {
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });
    
    if (error) throw error;
    if (!data.user) throw new Error('User creation failed');

    // Create profile with role
    const { error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: data.user.id,
        email: data.user.email,
        role: role
      });

    if (profileError) throw profileError;

    return {
      user: {
        id: data.user.id,
        email: data.user.email!,
        role
      },
      error: null
    };
  } catch (error) {
    return {
      user: null,
      error: error as Error
    };
  }
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function getCurrentUser(): Promise<{
  id: string;
  email: string;
  role: UserRole;
} | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) return null;

    // Try to get the profile
    let { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    if (profileError) {
      console.error('Error fetching profile:', profileError);
    }

    // If no profile exists, try to create one
    if (!profile) {
      try {
        const { data: newProfile, error: insertError } = await supabase
          .from('profiles')
          .insert({
            id: user.id,
            email: user.email,
            role: 'candidate'
          })
          .select('role')
          .single();

        if (insertError) {
          // If it's a duplicate key error, try to fetch the existing profile
          if (insertError.code === '23505') {
            const { data: existingProfile, error: fetchError } = await supabase
              .from('profiles')
              .select('role')
              .eq('id', user.id)
              .single();

            if (fetchError) {
              console.error('Error fetching existing profile:', fetchError);
              return null;
            }
            profile = existingProfile;
          } else {
            console.error('Error creating profile:', insertError);
            return null;
          }
        } else {
          profile = newProfile;
        }
      } catch (err) {
        console.error('Error in profile creation:', err);
        return null;
      }
    }

    return {
      id: user.id,
      email: user.email!,
      role: profile.role as UserRole
    };
  } catch (error) {
    console.error('Error in getCurrentUser:', error);
    return null;
  }
}