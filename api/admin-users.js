import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL =
    process.env.SUPABASE_URL
    || process.env.VITE_SUPABASE_URL
    || 'https://gepywlhveafqosoyitcb.supabase.co';

const SUPABASE_ANON_KEY =
    process.env.SUPABASE_ANON_KEY
    || process.env.VITE_SUPABASE_ANON_KEY
    || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdlcHl3bGh2ZWFmcW9zb3lpdGNiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAwODc2OTEsImV4cCI6MjA4NTY2MzY5MX0.Ibn6RPloHkN2VPYMlvYLssecy27DiP6CvXiPvoD_zPA';

const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const DEFAULT_ADMIN_ALLOWLIST = ['maheanpc@gmail.com'];

const ADMIN_EMAIL_ALLOWLIST = (
    process.env.ADMIN_EMAIL_ALLOWLIST
    || process.env.VITE_ADMIN_EMAIL_ALLOWLIST
    || DEFAULT_ADMIN_ALLOWLIST.join(',')
)
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);

const json = (res, statusCode, payload) => {
    res.statusCode = statusCode;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    res.end(JSON.stringify(payload));
};

const readJsonBody = async (req) => {
    if (req.body && typeof req.body === 'object') {
        return req.body;
    }

    let raw = '';
    for await (const chunk of req) {
        raw += chunk;
    }

    if (!raw) return {};
    return JSON.parse(raw);
};

const getBearerToken = (authHeader) => {
    if (typeof authHeader !== 'string') return null;
    const trimmed = authHeader.trim();
    if (!trimmed.toLowerCase().startsWith('bearer ')) return null;
    const token = trimmed.slice(7).trim();
    return token || null;
};

const toSafeRole = (value) => (value === 'admin' ? 'admin' : 'moderator');

const pickString = (value) => (typeof value === 'string' ? value : undefined);

const roleFromAppMetadata = (user) => {
    const appMetadata = user?.app_metadata;
    if (!appMetadata || typeof appMetadata !== 'object' || Array.isArray(appMetadata)) {
        return null;
    }
    return toSafeRole(pickString(appMetadata.admin_panel_role));
};

const isRequesterAdmin = (user) => {
    if (!user) return false;
    const role = roleFromAppMetadata(user);
    if (role === 'admin') {
        return true;
    }

    const email = (user.email || '').toLowerCase();
    return Boolean(email && ADMIN_EMAIL_ALLOWLIST.includes(email));
};

const normalizeDisplayName = (user) => {
    const metadata = user?.user_metadata;
    if (metadata && typeof metadata === 'object' && !Array.isArray(metadata)) {
        const fullName = pickString(metadata.full_name);
        const name = pickString(metadata.name);
        if (fullName?.trim()) return fullName.trim();
        if (name?.trim()) return name.trim();
    }

    const email = pickString(user?.email);
    if (email?.includes('@')) {
        return email.split('@')[0];
    }
    return 'User';
};

const normalizeProviders = (user) => {
    const identities = Array.isArray(user?.identities) ? user.identities : [];
    return identities
        .map((identity) => {
            if (!identity || typeof identity !== 'object') return '';
            const provider = pickString(identity.provider);
            return provider || '';
        })
        .filter(Boolean);
};

const toManagedUser = (user) => ({
    id: user.id,
    email: user.email || '',
    displayName: normalizeDisplayName(user),
    role: roleFromAppMetadata(user) || 'moderator',
    createdAt: user.created_at || new Date().toISOString(),
    providers: normalizeProviders(user)
});

const emailLooksValid = (value) => {
    if (typeof value !== 'string') return false;
    const trimmed = value.trim();
    if (!trimmed) return false;
    const parts = trimmed.split('@');
    return parts.length === 2 && parts[1].includes('.');
};

export default async function handler(req, res) {
    if (!['GET', 'POST', 'DELETE'].includes(req.method || '')) {
        json(res, 405, { error: 'Method not allowed.' });
        return;
    }

    if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
        json(res, 500, {
            error: 'Admin user API is not configured. Missing Supabase server environment variables.'
        });
        return;
    }

    const token = getBearerToken(req.headers.authorization);
    if (!token) {
        json(res, 401, { error: 'Missing bearer token.' });
        return;
    }

    const authClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
            detectSessionInUrl: false
        }
    });

    const { data: requesterData, error: requesterError } = await authClient.auth.getUser(token);
    if (requesterError || !requesterData?.user) {
        json(res, 401, { error: 'Invalid or expired session.' });
        return;
    }

    if (!isRequesterAdmin(requesterData.user)) {
        json(res, 403, { error: 'Admin access required.' });
        return;
    }

    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
            detectSessionInUrl: false
        }
    });

    if (req.method === 'GET') {
        const { data, error } = await adminClient.auth.admin.listUsers({ page: 1, perPage: 1000 });
        if (error) {
            json(res, 500, { error: `Failed to list users: ${error.message}` });
            return;
        }

        const users = (data?.users || []).map(toManagedUser);
        json(res, 200, { users });
        return;
    }

    if (req.method === 'POST') {
        let body;
        try {
            body = await readJsonBody(req);
        } catch {
            json(res, 400, { error: 'Invalid JSON body.' });
            return;
        }

        const email = pickString(body.email)?.trim().toLowerCase() || '';
        const password = pickString(body.password) || '';
        const displayName = pickString(body.displayName)?.trim() || undefined;
        const role = toSafeRole(pickString(body.role));

        if (!emailLooksValid(email)) {
            json(res, 400, { error: 'A valid email is required.' });
            return;
        }

        if (password.length < 8) {
            json(res, 400, { error: 'Password must be at least 8 characters.' });
            return;
        }

        const { data, error } = await adminClient.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: {
                full_name: displayName || email.split('@')[0]
            },
            app_metadata: {
                admin_panel_role: role
            }
        });

        if (error || !data?.user) {
            json(res, 500, {
                error: error?.message || 'Failed to create user in Supabase Auth.'
            });
            return;
        }

        json(res, 201, { user: toManagedUser(data.user) });
        return;
    }

    let body;
    try {
        body = await readJsonBody(req);
    } catch {
        json(res, 400, { error: 'Invalid JSON body.' });
        return;
    }

    const userId = pickString(body.userId)?.trim() || '';
    if (!userId) {
        json(res, 400, { error: 'userId is required.' });
        return;
    }

    if (userId === requesterData.user.id) {
        json(res, 400, { error: 'You cannot delete your own account.' });
        return;
    }

    const target = await adminClient.auth.admin.getUserById(userId);
    const targetUser = target.data?.user;
    if (!targetUser) {
        json(res, 404, { error: 'User not found.' });
        return;
    }

    const targetEmail = (targetUser.email || '').toLowerCase();
    if (targetEmail === 'admin@local') {
        json(res, 400, { error: 'System admin cannot be deleted.' });
        return;
    }

    const { error } = await adminClient.auth.admin.deleteUser(userId);
    if (error) {
        json(res, 500, { error: `Failed to delete user: ${error.message}` });
        return;
    }

    json(res, 200, { success: true });
}
