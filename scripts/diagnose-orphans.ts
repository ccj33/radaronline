
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Carregar variáveis de ambiente manualmente
const envPath = path.resolve(process.cwd(), '.env');
const envVars: Record<string, string> = {};

console.log(`Loading env from: ${envPath}`);

if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf-8');
    envContent.split('\n').forEach(line => {
        const match = line.match(/^([^=]+)=(.*)$/);
        if (match) {
            const key = match[1].trim();
            const value = match[2].trim().replace(/^["']|["']$/g, ''); // Remove quotes if present
            envVars[key] = value;
        }
    });
    console.log('Keys found in .env:', Object.keys(envVars));
} else {
    console.log('❌ .env file not found at:', envPath);
}

const SUPABASE_URL = envVars.VITE_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SERVICE_ROLE_KEY = envVars.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log(`URL Present: ${!!SUPABASE_URL}`);
console.log(`Service Role Key Present: ${!!SERVICE_ROLE_KEY}`);

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
    console.log('Ensure you have a .env file with these keys.');
    process.exit(1);
}

const customSupabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

async function diagnoseOrphans() {
    console.log('🔍 Starting diagnosis for Orphaned Users...');

    // 1. Fetch ALL Auth Users
    const { data: { users: authUsers }, error: authError } = await customSupabase.auth.admin.listUsers();

    if (authError) {
        console.error('❌ Error fetching auth users:', authError);
        return;
    }

    console.log(`✅ Found ${authUsers.length} users in Auth.`);

    // 2. Fetch ALL Profiles
    const { data: profiles, error: profileError } = await customSupabase
        .from('profiles')
        .select('id, email, role');

    if (profileError) {
        console.error('❌ Error fetching profiles:', profileError);
        return;
    }

    console.log(`✅ Found ${profiles.length} profiles in Public Table.`);

    // 3. Find Orphans (In Auth but NOT in Profiles)
    const profileIds = new Set(profiles.map(p => p.id));
    const orphans = authUsers.filter(u => !profileIds.has(u.id));

    console.log('---------------------------------------------------');
    if (orphans.length > 0) {
        console.log(`❌ Found ${orphans.length} ORPHANED users (Auth Logic Failure):`);
        orphans.forEach(u => {
            console.log(`   - ID: ${u.id} | Email: ${u.email} | Created: ${u.created_at}`);
        });
        console.log('\n💡 These users exist in Authentication but have no Profile. They will NOT appear in the App.');
    } else {
        console.log('✅ No orphaned users found. Sync seems correct.');
    }

    // 4. Find "Ghosts" (In Profiles but NOT in Auth - rare but possible if manually deleted)
    const authIds = new Set(authUsers.map(u => u.id));
    const ghosts = profiles.filter(p => !authIds.has(p.id));

    if (ghosts.length > 0) {
        console.log(`⚠️ Found ${ghosts.length} GHOST profiles (Profile exists, User deleted):`);
        ghosts.forEach(p => {
            console.log(`   - ID: ${p.id} | Email: ${p.email} | Role: ${p.role}`);
        });
    } else {
        // console.log('✅ No ghost profiles found.');
    }
    console.log('---------------------------------------------------');
}

diagnoseOrphans();
