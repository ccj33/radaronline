
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// 1. Load Env Vars Manually
const envPath = path.resolve(process.cwd(), '.env');
const envVars: Record<string, string> = {};


if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf-8');
    envContent.split('\n').forEach(line => {
        // Improve regex to handle optional export, spaces, and quotes
        // Matches: (optional export\s) KEY = VALUE (optional comments)
        const match = line.match(/^(?:export\s+)?([\w_]+)\s*=\s*(.*)$/);
        if (match) {
            const key = match[1].trim();
            let value = match[2].trim();

            // Remove inline comments if not inside quotes
            if (!value.startsWith('"') && !value.startsWith("'")) {
                const commentIndex = value.indexOf('#');
                if (commentIndex !== -1) {
                    value = value.substring(0, commentIndex).trim();
                }
            }

            // Remove surrounding quotes
            value = value.replace(/^["']|["']$/g, '');

            if (key && value) {
                envVars[key] = value;
            }
        }
    });

    console.log('✅ Loaded env keys (raw):', JSON.stringify(Object.keys(envVars)));

    const hasUrl = !!envVars['VITE_SUPABASE_URL'];
    const hasKey = !!envVars['SUPABASE_SERVICE_ROLE_KEY'];

    console.log(`Debug Check: VITE_SUPABASE_URL present? ${hasUrl}`);
    console.log(`Debug Check: SUPABASE_SERVICE_ROLE_KEY present? ${hasKey}`);

    if (!hasUrl) console.log('Available keys similar to URL:', Object.keys(envVars).filter(k => k.includes('URL')));
    if (!hasKey) console.log('Available keys similar to KEY:', Object.keys(envVars).filter(k => k.includes('KEY')));

} else {
    console.log('❌ .env file NOT found at:', envPath);
}

const SUPABASE_URL = envVars.VITE_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SERVICE_ROLE_KEY = envVars.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY from env entries.');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
});

async function syncProfiles() {
    console.log('🔄 Starting Profile Sync...');

    // 2. Fetch all Auth Users
    const { data: { users }, error: authError } = await supabase.auth.admin.listUsers();
    if (authError) {
        console.error('❌ Error fetching auth users:', authError);
        return;
    }
    console.log(`📊 Found ${users.length} Auth Users.`);

    // 3. Fetch all Profiles
    // Pagination might be needed if > 1000, but let's start simple or use range
    const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('id');

    if (profileError) {
        console.error('❌ Error fetching profiles:', profileError);
        return;
    }
    console.log(`📊 Found ${profiles.length} Profiles.`);

    const profileIds = new Set(profiles.map(p => p.id));
    const orphans = users.filter(u => !profileIds.has(u.id));

    console.log(`🔍 Detected ${orphans.length} orphans (Missing Profiles).`);

    if (orphans.length === 0) {
        console.log('✅ All synced. No action needed.');
        return;
    }

    // 4. Create missing profiles
    console.log('🛠️ Creating missing profiles...');

    let successCount = 0;
    let failCount = 0;

    for (const user of orphans) {
        // Determine default values
        const nome = user.user_metadata?.nome || user.email?.split('@')[0] || 'Usuario Sem Nome';
        const role = user.user_metadata?.role || 'usuario';
        const microregiao = user.user_metadata?.microregiaoId || null;

        const { error } = await supabase.from('profiles').insert({
            id: user.id,
            email: user.email,
            nome: nome,
            role: role,
            microregiao_id: microregiao === 'all' ? null : microregiao,
            ativo: true,
            first_access: true,
            avatar_id: `zg${Math.floor(Math.random() * 16) + 1}` // Random avatar
        });

        if (error) {
            console.error(`❌ Failed to create profile for ${user.email}:`, error.message);
            failCount++;
        } else {
            console.log(`✅ Created profile for: ${user.email}`);
            successCount++;
        }
    }

    console.log('-----------------------------------');
    console.log(`🏁 Sync Complete. Success: ${successCount}, Failed: ${failCount}`);
}

syncProfiles();
