// Map of Alias -> Primary Username (Display Name)
// Keys must be LOWERCASE for input matching.
// Values can be Capitalized for display purposes.
export const USER_ALIASES: Record<string, string> = {
  // Pirsis
  'pirsis': 'pirsis',
  'pirsis_': 'pirsis',
  'pirsis*': 'pirsis',
  'pirsis\\': 'pirsis',
  'pirsis/': 'pirsis',
  'pirsis.': 'pirsis',
  'pirsis ': 'pirsis',
  'pirsis_ ': 'pirsis',
  'pirsis* ': 'pirsis',
  'pirsis\\ ': 'pirsis',
  'pirsis__': 'pirsis',
  'pirsis\\_': 'pirsis',

  // ImantUlis (Using Capitalized Display Name)
  'imantulis': 'ImantUlis',
  'imantulis ^_^': 'ImantUlis',
  'imantulis ^\\^': 'ImantUlis',
  'imantulis ^*^': 'ImantUlis',
  'imantulis ^_^ ': 'ImantUlis',
  'imantulis ^\\^ ': 'ImantUlis',
  'imantUlis ^\\_^' : 'ImantUlis',
};

/**
 * Returns the primary username for a given nickname.
 * If no alias is found, returns the original name.
 */
export const getPrimaryUsername = (username: string | null): string => {
  if (!username) return 'Unknown';
  
  // Normalize: lowercase and trim whitespace to catch "pirsis " or "pirsis\ "
  const lower = username.toLowerCase().trim();
  
  // Return the mapped name if exists
  if (USER_ALIASES[lower]) {
    return USER_ALIASES[lower];
  }
  
  // Fallback: Return original (or trimmed original)
  return username;
};

/**
 * Returns an array of ALL possible aliases for a specific primary username.
 * Used for database queries to fetch all tracks for a user.
 */
export const getAllAliases = (primaryUsername: string): string[] => {
  const target = primaryUsername.toLowerCase().trim();
  
  // Find all keys in USER_ALIASES that point to this target (case-insensitive value check)
  const aliases = Object.keys(USER_ALIASES).filter(key => 
    USER_ALIASES[key].toLowerCase() === target
  );
  
  // Include the primary username itself (lowercased) to ensure we catch it in loose searches
  if (!aliases.includes(target)) {
    aliases.push(target);
  }

  // Also include the exact argument passed just in case
  if (!aliases.includes(primaryUsername)) {
    aliases.push(primaryUsername);
  }

  return aliases;
};