import { buildServerAuthHeaders, readServerAccessToken } from '../utils/serverAuth';

type SupabaseErrorLike = {
    message: string;
    code?: string;
};

type QueryResult<T = unknown[]> = {
    data: T | null;
    error: SupabaseErrorLike | null;
};

type QueryFilter = {
    op: 'eq' | 'neq' | 'lt';
    column: string;
    value: unknown;
};

type QueryState = {
    table: string;
    action: 'select' | 'insert' | 'upsert' | 'update' | 'delete';
    columns: string;
    returnColumns: string;
    filters: QueryFilter[];
    orderBy: { column: string; ascending: boolean } | null;
    single: boolean;
    values: unknown;
    onConflict: string;
};

type JsonObject = Record<string, unknown>;

type QueryBuilder = {
    select(columns?: string): QueryBuilder;
    eq(column: string, value: unknown): QueryBuilder;
    neq(column: string, value: unknown): QueryBuilder;
    lt(column: string, value: unknown): QueryBuilder;
    order(column: string, options?: { ascending?: boolean }): QueryBuilder;
    limit(count?: number): QueryBuilder;
    maybeSingle(): QueryBuilder;
    insert(values: unknown): QueryBuilder;
    upsert(values: unknown, options?: { onConflict?: string }): QueryBuilder;
    update(values: unknown): QueryBuilder;
    delete(): QueryBuilder;
    then<TResult1 = QueryResult<unknown[]>, TResult2 = never>(
        onfulfilled?: ((value: QueryResult<unknown[]>) => TResult1 | PromiseLike<TResult1>) | null,
        onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
    ): PromiseLike<TResult1 | TResult2>;
};

type SessionLike = {
    user: SupabaseUser;
    access_token?: string;
    expires_at?: number;
};

type SupabaseUserIdentity = {
    provider?: string;
    identity_data?: Record<string, unknown>;
};

type SupabaseUser = {
    id: string;
    email?: string;
    created_at?: string;
    app_metadata?: Record<string, unknown>;
    user_metadata?: Record<string, unknown>;
    identities?: SupabaseUserIdentity[];
};

const SESSION_KEY = 'mahean_server_auth_session';
const RESET_TOKEN_KEY = 'mahean_password_reset_token';
const OAUTH_STATE_KEY = 'mahean_google_oauth_state';
const OAUTH_REDIRECT_KEY = 'mahean_google_oauth_redirect';
const OAUTH_CALLBACK_QUERY_KEYS = [
    'code',
    'state',
    'scope',
    'authuser',
    'prompt',
    'error',
    'error_description'
];
const GOOGLE_AUTH_ENDPOINT = 'https://accounts.google.com/o/oauth2/v2/auth';

const authListeners = new Set<(event: string, session: SessionLike | null) => void>();

const toError = (message: string, code = 'REQUEST_FAILED'): SupabaseErrorLike => ({ message, code });
const isRecord = (value: unknown): value is JsonObject =>
    typeof value === 'object' && value !== null;

const readSession = (): SessionLike | null => {
    if (typeof window === 'undefined') return null;
    try {
        const raw = localStorage.getItem(SESSION_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw) as SessionLike;
        if (!parsed?.user?.id) return null;
        const expiresAt = Number(parsed.expires_at);
        const nowSec = Math.floor(Date.now() / 1000);
        if (Number.isFinite(expiresAt) && expiresAt > 0 && expiresAt <= nowSec) {
            localStorage.removeItem(SESSION_KEY);
            return null;
        }
        return parsed;
    } catch {
        return null;
    }
};

const writeSession = (session: SessionLike | null) => {
    if (typeof window === 'undefined') return;
    if (!session) {
        localStorage.removeItem(SESSION_KEY);
        return;
    }
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
};

const buildSession = (
    user: SupabaseUser,
    payload?: { sessionToken?: unknown; sessionExpiresAt?: unknown }
): SessionLike => {
    const tokenFromPayload = typeof payload?.sessionToken === 'string'
        ? payload.sessionToken.trim()
        : '';
    const token = tokenFromPayload || readServerAccessToken();
    const expiresAt = Number(payload?.sessionExpiresAt);
    return {
        user,
        access_token: token || undefined,
        expires_at: Number.isFinite(expiresAt) ? expiresAt : undefined
    };
};

const notifyAuth = (event: string, session: SessionLike | null) => {
    authListeners.forEach((listener) => {
        try {
            listener(event, session);
        } catch (error) {
            console.warn('Auth listener failed', error);
        }
    });
};

const normalizeProvider = (value: unknown) => {
    const provider = String(value || '').trim().toLowerCase();
    if (provider === 'google') return 'google';
    if (provider === 'email' || provider === 'local') return 'email';
    return '';
};

const mapServerUserToSupabaseUser = (user: unknown): SupabaseUser => {
    const candidate = isRecord(user) ? user : {};
    const rawProviders = Array.isArray(candidate.providers) ? candidate.providers : [];
    const providers = rawProviders
        .map((entry: unknown) => normalizeProvider(entry))
        .filter((entry: string): entry is 'google' | 'email' => entry === 'google' || entry === 'email');
    const uniqueProviders: Array<'google' | 'email'> = Array.from(new Set(providers));
    const effectiveProviders: Array<'google' | 'email'> = uniqueProviders.length ? uniqueProviders : ['email'];
    const primaryProvider = effectiveProviders.includes('google') ? 'google' : 'email';
    const email = typeof candidate.email === 'string' ? candidate.email : undefined;
    const displayName = typeof candidate.displayName === 'string'
        ? candidate.displayName
        : undefined;
    const photoUrl = typeof candidate.photoURL === 'string' ? candidate.photoURL : undefined;

    return {
        id: String(candidate.id || ''),
        email,
        created_at: typeof candidate.createdAt === 'string' ? candidate.createdAt : new Date().toISOString(),
        app_metadata: {
            role: candidate.role === 'admin' ? 'admin' : 'moderator',
            provider: primaryProvider
        },
        user_metadata: {
            full_name: displayName || email || 'User',
            avatar_url: photoUrl || undefined
        },
        identities: effectiveProviders.map((provider) => ({
            provider,
            identity_data: {
                email
            }
        }))
    };
};

const requestJson = async (url: string, payload: unknown): Promise<{ data: JsonObject | null; error: SupabaseErrorLike | null }> => {
    if (typeof window === 'undefined') {
        return { data: null, error: toError('Browser API not available.', 'NO_BROWSER') };
    }

    try {
        const headers = buildServerAuthHeaders({
            'Content-Type': 'application/json'
        });

        const response = await fetch(url, {
            method: 'POST',
            credentials: 'same-origin',
            headers,
            body: JSON.stringify(payload)
        });
        const parsedResponse: unknown = await response.json().catch(() => ({}));
        const parsed = isRecord(parsedResponse) ? parsedResponse : {};
        if (!response.ok) {
            const parsedError = parsed.error;
            const message = typeof parsedError === 'string'
                ? parsedError
                : isRecord(parsedError) && typeof parsedError.message === 'string'
                    ? parsedError.message
                    : `Request failed with ${response.status}`;
            return { data: null, error: toError(message, 'HTTP_ERROR') };
        }
        return { data: parsed, error: null };
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Network request failed.';
        return { data: null, error: toError(message, 'NETWORK_ERROR') };
    }
};

const baseQueryState = (table: string): QueryState => ({
    table,
    action: 'select',
    columns: '*',
    returnColumns: '*',
    filters: [],
    orderBy: null,
    single: false,
    values: null,
    onConflict: 'id'
});

const executeQuery = async (state: QueryState): Promise<QueryResult<unknown[]>> => {
    const payload = {
        table: state.table,
        action: state.action,
        columns: state.action === 'delete' ? state.returnColumns : state.columns,
        filters: state.filters,
        orderBy: state.orderBy,
        single: state.single,
        values: state.values,
        onConflict: state.onConflict
    };
    const { data, error } = await requestJson('/api/db', payload);
    if (error) {
        return { data: state.single ? null : [], error };
    }
    const resultData = (data?.data ?? (state.single ? null : [])) as unknown[] | null;
    const queryError = isRecord(data?.error) ? data.error : null;
    const resultError = queryError
        ? toError(
            typeof queryError.message === 'string' ? queryError.message : 'Database error.',
            typeof queryError.code === 'string' ? queryError.code : 'DB_ERROR'
        )
        : null;
    return {
        data: resultData,
        error: resultError
    };
};

const createQueryBuilder = (table: string) => {
    const state = baseQueryState(table);

    const builder: QueryBuilder = {
        select(columns = '*') {
            if (state.action === 'delete') {
                state.returnColumns = String(columns || '*');
            } else {
                state.action = 'select';
                state.columns = String(columns || '*');
            }
            return builder;
        },
        eq(column: string, value: unknown) {
            state.filters.push({ op: 'eq', column, value });
            return builder;
        },
        neq(column: string, value: unknown) {
            state.filters.push({ op: 'neq', column, value });
            return builder;
        },
        lt(column: string, value: unknown) {
            state.filters.push({ op: 'lt', column, value });
            return builder;
        },
        order(column: string, options?: { ascending?: boolean }) {
            state.orderBy = {
                column,
                ascending: Boolean(options?.ascending)
            };
            return builder;
        },
        limit(count?: number) {
            void count;
            return builder;
        },
        maybeSingle() {
            state.single = true;
            return builder;
        },
        insert(values: unknown) {
            state.action = 'insert';
            state.values = values;
            return builder;
        },
        upsert(values: unknown, options?: { onConflict?: string }) {
            state.action = 'upsert';
            state.values = values;
            state.onConflict = options?.onConflict || 'id';
            return builder;
        },
        update(values: unknown) {
            state.action = 'update';
            state.values = values;
            return builder;
        },
        delete() {
            state.action = 'delete';
            return builder;
        },
        then(resolve, reject) {
            return executeQuery(state).then(resolve, reject);
        }
    };

    return builder;
};

const disabledOAuthError = () => toError('OAuth login is not configured.', 'OAUTH_DISABLED');

const isSameOrigin = (value: string) => {
    if (typeof window === 'undefined') return false;
    try {
        return new URL(value).origin === window.location.origin;
    } catch {
        return false;
    }
};

const isMaheanHost = (host: string) => {
    const normalized = String(host || '').trim().toLowerCase();
    return normalized === 'mahean.com' || normalized === 'www.mahean.com';
};

const preferredOAuthRedirectUrl = () => {
    if (typeof window === 'undefined') return '';
    if (isMaheanHost(window.location.hostname)) {
        return 'https://www.mahean.com/admin/dashboard';
    }
    return `${window.location.origin}/admin/dashboard`;
};

const toOAuthRedirectUrl = (value?: string) => {
    if (typeof window === 'undefined') return '';
    const fallback = preferredOAuthRedirectUrl();
    if (!value) return fallback;
    if (isSameOrigin(value)) return value;

    try {
        const parsed = new URL(value);
        if (isMaheanHost(window.location.hostname) && isMaheanHost(parsed.hostname) && parsed.protocol === 'https:') {
            return parsed.toString();
        }
    } catch {
        // Fall through to fallback.
    }

    return fallback;
};

const generateOAuthState = () => {
    if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
        const bytes = new Uint8Array(16);
        crypto.getRandomValues(bytes);
        return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
    }
    return `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`;
};

const readStoredOAuthState = () => {
    if (typeof window === 'undefined') return '';
    return localStorage.getItem(OAUTH_STATE_KEY) || '';
};

const readStoredOAuthRedirect = () => {
    if (typeof window === 'undefined') return '';
    return localStorage.getItem(OAUTH_REDIRECT_KEY) || '';
};

const storeOAuthState = (state: string, redirectUri: string) => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(OAUTH_STATE_KEY, state);
    localStorage.setItem(OAUTH_REDIRECT_KEY, redirectUri);
};

const clearOAuthState = () => {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(OAUTH_STATE_KEY);
    localStorage.removeItem(OAUTH_REDIRECT_KEY);
};

const clearOAuthQueryParams = () => {
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    let changed = false;
    OAUTH_CALLBACK_QUERY_KEYS.forEach((key) => {
        if (url.searchParams.has(key)) {
            url.searchParams.delete(key);
            changed = true;
        }
    });
    if (changed) {
        window.history.replaceState({}, document.title, `${url.pathname}${url.search}${url.hash}`);
    }
};

const exchangeGoogleCodeForSession = async (code: string, redirectUri: string) => {
    const { data, error } = await requestJson('/api/auth', {
        action: 'google-oauth-exchange',
        code,
        redirectUri
    });
    if (error) {
        return { data: null, error };
    }
    if (!data?.user) {
        return { data: null, error: toError('Google login failed.', 'OAUTH_EXCHANGE_FAILED') };
    }

    const user = mapServerUserToSupabaseUser(data.user);
    const session = buildSession(user, {
        sessionToken: data?.sessionToken,
        sessionExpiresAt: data?.sessionExpiresAt
    });
    writeSession(session);
    notifyAuth('SIGNED_IN', session);
    return {
        data: {
            user,
            session
        },
        error: null
    };
};

const fetchGoogleOAuthConfig = async (redirectUri: string) => {
    const { data, error } = await requestJson('/api/auth', {
        action: 'google-oauth-config',
        redirectUri
    });
    if (error) {
        return { data: null, error };
    }

    const clientId = String(data?.clientId || '').trim();
    const normalizedRedirectUri = String(data?.redirectUri || '').trim() || redirectUri;
    const enabled = data?.enabled !== false;
    if (!enabled || !clientId) {
        const message = typeof data?.error === 'string'
            ? data.error
            : disabledOAuthError().message;
        return { data: null, error: toError(message, 'OAUTH_DISABLED') };
    }

    return {
        data: {
            clientId,
            redirectUri: normalizedRedirectUri
        },
        error: null
    };
};

const auth = {
    async exchangeCodeForSession(payload?: { code?: string; redirectTo?: string }) {
        const code = String(payload?.code || '').trim();
        const redirectUri = toOAuthRedirectUrl(payload?.redirectTo);
        if (!code || !redirectUri) {
            return { data: null, error: toError('Missing OAuth code or redirect URL.', 'OAUTH_INVALID_REQUEST') };
        }
        return exchangeGoogleCodeForSession(code, redirectUri);
    },
    async setSession() {
        return { data: null, error: disabledOAuthError() };
    },
    async signInWithOAuth(payload: { provider?: string; options?: { redirectTo?: string } } = {}) {
        if (typeof window === 'undefined') {
            return { data: null, error: toError('Browser API not available.', 'NO_BROWSER') };
        }

        const provider = String(payload?.provider || '').trim().toLowerCase();
        if (provider !== 'google') {
            return { data: null, error: toError('Only Google OAuth is supported here.', 'OAUTH_UNSUPPORTED_PROVIDER') };
        }

        const requestedRedirectUri = toOAuthRedirectUrl(payload?.options?.redirectTo);
        const oauthConfig = await fetchGoogleOAuthConfig(requestedRedirectUri);
        if (oauthConfig.error || !oauthConfig.data) {
            return { data: null, error: oauthConfig.error || disabledOAuthError() };
        }

        const { clientId, redirectUri } = oauthConfig.data;
        const state = generateOAuthState();
        storeOAuthState(state, redirectUri);

        const authUrl = new URL(GOOGLE_AUTH_ENDPOINT);
        authUrl.searchParams.set('client_id', clientId);
        authUrl.searchParams.set('redirect_uri', redirectUri);
        authUrl.searchParams.set('response_type', 'code');
        authUrl.searchParams.set('scope', 'openid email profile');
        authUrl.searchParams.set('state', state);
        authUrl.searchParams.set('prompt', 'select_account');
        authUrl.searchParams.set('access_type', 'online');
        authUrl.searchParams.set('include_granted_scopes', 'true');

        window.location.assign(authUrl.toString());
        return { data: { provider: 'google' }, error: null };
    },
    async signOut() {
        try {
            await requestJson('/api/auth', { action: 'logout' });
        } catch {
            // Ignore sign-out API errors; local cleanup still proceeds.
        }
        writeSession(null);
        notifyAuth('SIGNED_OUT', null);
        return { error: null };
    },
    async getSession() {
        const cachedSession = readSession();

        try {
            const { data, error } = await requestJson('/api/auth', { action: 'session' });
            if (!error && data?.user) {
                const user = mapServerUserToSupabaseUser(data.user);
                const session = buildSession(user, {
                    sessionToken: data?.sessionToken,
                    sessionExpiresAt: data?.sessionExpiresAt
                });
                writeSession(session);
                return { data: { session }, error: null };
            }

            if (error?.code === 'NETWORK_ERROR' && cachedSession) {
                return { data: { session: cachedSession }, error: null };
            }

            // If server says session is invalid, clear local cache to prevent stale auth state.
            if (error?.code === 'HTTP_ERROR') {
                writeSession(null);
            }

            return { data: { session: null }, error: null };
        } catch {
            return { data: { session: cachedSession }, error: null };
        }
    },
    onAuthStateChange(callback: (event: string, session: SessionLike | null) => void) {
        authListeners.add(callback);
        return {
            data: {
                subscription: {
                    unsubscribe: () => authListeners.delete(callback)
                }
            }
        };
    },
    async resetPasswordForEmail(email: string, options?: { redirectTo?: string }) {
        void options;
        const { data, error } = await requestJson('/api/auth', {
            action: 'request-password-reset',
            identifier: email
        });
        if (error) {
            return { data: null, error };
        }
        if (typeof data?.resetToken === 'string' && data.resetToken) {
            localStorage.setItem(RESET_TOKEN_KEY, data.resetToken);
        } else {
            localStorage.removeItem(RESET_TOKEN_KEY);
        }
        return { data: { success: true }, error: null };
    },
    async signInWithPassword(payload: { email: string; password: string }) {
        const { data, error } = await requestJson('/api/auth', {
            action: 'login',
            identifier: payload.email,
            password: payload.password
        });
        if (error) {
            return { data: null, error };
        }
        const user = mapServerUserToSupabaseUser(data?.user);
        const session = buildSession(user, {
            sessionToken: data?.sessionToken,
            sessionExpiresAt: data?.sessionExpiresAt
        });
        writeSession(session);
        notifyAuth('SIGNED_IN', session);
        return {
            data: {
                user,
                session
            },
            error: null
        };
    },
    async signUp(payload: { email: string; password: string; options?: { data?: Record<string, unknown> } }) {
        const { data, error } = await requestJson('/api/auth', {
            action: 'signup',
            email: payload.email,
            password: payload.password,
            displayName: payload.options?.data?.full_name
        });
        if (error) {
            return { data: null, error };
        }
        const user = mapServerUserToSupabaseUser(data?.user);
        const session = buildSession(user, {
            sessionToken: data?.sessionToken,
            sessionExpiresAt: data?.sessionExpiresAt
        });
        writeSession(session);
        notifyAuth('SIGNED_IN', session);
        return {
            data: {
                user,
                session
            },
            error: null
        };
    },
    async updateUser(payload: { password?: string; currentPassword?: string | null }) {
        const session = readSession();
        if (!session?.user?.id) {
            return { data: null, error: toError('No active session.', 'NO_SESSION') };
        }
        if (!payload.password) {
            return { data: null, error: toError('Password is required.', 'INVALID_PASSWORD') };
        }
        const { data, error } = await requestJson('/api/auth', {
            action: 'update-password',
            newPassword: payload.password,
            currentPassword: payload.currentPassword || undefined
        });
        if (error) {
            return { data: null, error };
        }

        const nextSession = buildSession(session.user, {
            sessionToken: data?.sessionToken,
            sessionExpiresAt: data?.sessionExpiresAt
        });
        writeSession(nextSession);

        return { data: { user: session.user }, error: null };
    }
};

const storage = {
    from() {
        return {
            async upload() {
                return {
                    data: null,
                    error: toError('Use uploadImageToStorage for cPanel uploads.', 'STORAGE_DISABLED')
                };
            },
            getPublicUrl(path: string) {
                return {
                    data: {
                        publicUrl: path
                    }
                };
            }
        };
    }
};

export const supabase = {
    from: (table: string) => createQueryBuilder(table),
    auth,
    storage
};

export const safeSupabaseCall = async <T>(operation: Promise<T>) => {
    try {
        await operation;
    } catch (error) {
        console.error('Supabase operation failed:', error);
    }
};

export const restoreSessionFromUrl = async () => {
    if (typeof window === 'undefined') return false;

    const url = new URL(window.location.href);
    const code = String(url.searchParams.get('code') || '').trim();
    const state = String(url.searchParams.get('state') || '').trim();
    const oauthError = String(url.searchParams.get('error') || '').trim();

    if (!code && !oauthError) {
        return false;
    }

    if (oauthError) {
        clearOAuthState();
        clearOAuthQueryParams();
        return false;
    }

    const expectedState = readStoredOAuthState();
    if (!state || (expectedState && state !== expectedState)) {
        // Do not block exchange; host changes and tab restarts may lose local state.
        console.warn('OAuth state mismatch detected. Continuing with code exchange fallback.');
    }

    const redirectCandidates = Array.from(new Set([
        readStoredOAuthRedirect(),
        preferredOAuthRedirectUrl(),
        `${window.location.origin}/admin/dashboard`,
        `${window.location.origin}${window.location.pathname}`
    ].map((value) => toOAuthRedirectUrl(value)).filter(Boolean)));

    let data: { session?: { user?: unknown } } | null = null;
    let error: SupabaseErrorLike | null = null;

    for (const redirectUri of redirectCandidates) {
        const attempt = await exchangeGoogleCodeForSession(code, redirectUri);
        if (!attempt.error && attempt.data) {
            data = attempt.data;
            error = null;
            break;
        }
        error = attempt.error;
    }

    clearOAuthState();
    clearOAuthQueryParams();

    if (error) {
        throw new Error(error.message || 'Google login failed.');
    }

    return Boolean(data?.session?.user);
};
