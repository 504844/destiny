import { createClient } from '@supabase/supabase-js';

// Credentials provided by the user. 
// In a production environment, these should be environment variables.
const SUPABASE_URL = 'https://kvxkglnmsnhpwumynntj.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt2eGtnbG5tc25ocHd1bXlubnRqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk2MjAwODYsImV4cCI6MjA4NTE5NjA4Nn0.wwjBu63yn4dZAjb-_Lsi78UPK4ZOtWh6gY0Yl3-evpc';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);