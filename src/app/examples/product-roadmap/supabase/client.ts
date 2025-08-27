import { createClient } from '@supabase/supabase-js';

// Check if Supabase environment variables are available
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_KEY;

// Export a flag to indicate if Supabase is available
export const isSupabaseAvailable = !!(supabaseUrl && supabaseKey);

// Create Supabase client only if both URL and key are available
export const supabase = isSupabaseAvailable
	? createClient(supabaseUrl!, supabaseKey!)
	: null;

// Log the storage mode for debugging
if (typeof window !== 'undefined') {
	console.log(
		`Product Roadmap storage mode: ${
			isSupabaseAvailable ? 'Supabase' : 'localStorage'
		}`
	);
}
