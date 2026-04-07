-- Drop the existing constraint
ALTER TABLE platform_accounts DROP CONSTRAINT IF EXISTS platform_accounts_platform_check;

-- Add the new constraint with github and skillrack
ALTER TABLE platform_accounts ADD CONSTRAINT platform_accounts_platform_check 
CHECK (platform IN ('leetcode', 'codechef', 'codeforces', 'hackerrank', 'github', 'skillrack'));
