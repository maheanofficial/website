import { v4 as uuidv4 } from 'uuid';

export type UserRole = 'admin' | 'moderator';

export interface User {
    id: string;
    username: string;
    email?: string;
    password?: string; // In a real app, this would be hashed. For local mock, plain text is fine but usually bad practice.
    role: UserRole;
    createdAt: string;
    displayName?: string;
    photoURL?: string;
}

const STORAGE_KEY = 'mahean_users';
const CURRENT_USER_KEY = 'mahean_current_user';
const PASSWORD_RESET_KEY = 'mahean_password_reset_user';
const ADMIN_EMAILS = ['mahean4bd@gmail.com'];

// Mock Admin User
const ADMIN_USER: User = {
    id: 'admin-123',
    username: 'admin',
    email: 'admin@local',
    password: 'mahean123', // Hardcoded as per original AdminPage logic
    role: 'admin',
    createdAt: new Date().toISOString(),
    displayName: 'Admin'
};

const normalizeRole = (role?: string): UserRole => (role === 'admin' ? 'admin' : 'moderator');

const isAdminEmail = (email?: string) => {
    if (!email) return false;
    return ADMIN_EMAILS.includes(email.toLowerCase());
};

const mergeRole = (existingRole?: UserRole, incomingRole?: UserRole) => {
    if (existingRole === 'admin' || incomingRole === 'admin') {
        return 'admin';
    }
    return 'moderator';
};

const normalizeUser = (user: User): User => {
    const normalizedEmail = user.email?.toLowerCase();
    const role = isAdminEmail(normalizedEmail) ? 'admin' : normalizeRole(user.role);
    return {
        ...user,
        email: normalizedEmail || user.email,
        role
    };
};

const getUsers = (): User[] => {
    const stored = localStorage.getItem(STORAGE_KEY);
    const parsed = stored ? JSON.parse(stored) : [];
    let users = Array.isArray(parsed) ? parsed.map((user) => normalizeUser(user as User)) : [];
    let didMutate = false;

    if (!users.some(u => u.id === ADMIN_USER.id || u.username === ADMIN_USER.username)) {
        users = [...users, ADMIN_USER];
        didMutate = true;
    }

    if (!users.length) {
        users = [ADMIN_USER];
        didMutate = true;
    }

    if (didMutate) {
        saveUsers(users);
    }

    return users;
};

const saveUsers = (users: User[]) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(users));
};

export const upsertUser = (user: User): User => {
    const users = getUsers();
    const normalizedUser = normalizeUser(user);
    const matchIndex = users.findIndex((existing) =>
        existing.id === normalizedUser.id
        || (normalizedUser.email && existing.email === normalizedUser.email)
        || (normalizedUser.username && existing.username === normalizedUser.username)
    );
    const nextRole = mergeRole(users[matchIndex]?.role, normalizedUser.role);
    const nextUser = matchIndex >= 0
        ? { ...users[matchIndex], ...normalizedUser, role: nextRole }
        : { ...normalizedUser, role: nextRole };

    if (matchIndex >= 0) {
        users[matchIndex] = nextUser;
    } else {
        users.push(nextUser);
    }

    saveUsers(users);
    return nextUser;
};

const normalizeIdentifier = (value: string) => value.trim().toLowerCase();

const findUserByIdentifier = (users: User[], identifier: string) => {
    const normalized = normalizeIdentifier(identifier);
    return users.find(user => {
        const username = user.username?.toLowerCase();
        const email = user.email?.toLowerCase();
        return username === normalized || email === normalized;
    });
};

export const registerUser = (email: string, password: string, displayName?: string): { success: boolean; message: string; user?: User } => {
    const users = getUsers();

    const normalizedEmail = normalizeIdentifier(email);

    if (findUserByIdentifier(users, normalizedEmail)) {
        return { success: false, message: 'এই নাম ব্যবহারকারীর অস্তিত্ব আছে (Username already exists)' };
    }

    const newUser: User = {
        id: uuidv4(),
        username: normalizedEmail,
        email: normalizedEmail,
        password,
        role: 'moderator', // Default role for signup
        createdAt: new Date().toISOString(),
        displayName: displayName || normalizedEmail.split('@')[0]
    };

    users.push(newUser);
    saveUsers(users);

    return { success: true, message: 'রেজিস্ট্রেশন সফল হয়েছে! (Registration Successful)', user: newUser };
};

export const loginUser = (identifier: string, password: string): { success: boolean; message: string; user?: User } => {
    const users = getUsers();
    const user = findUserByIdentifier(users, identifier);

    if (user && user.password === password) {
        return { success: true, message: 'Login Successful', user };
    }

    return { success: false, message: 'ভুল ইউজারনেম বা পাসওয়ার্ড (Invalid Credentials)' };
};

export const getCurrentUser = (): User | null => {
    const stored = localStorage.getItem(CURRENT_USER_KEY);
    if (!stored) return null;
    try {
        return normalizeUser(JSON.parse(stored) as User);
    } catch (error) {
        console.warn('Failed to parse stored user session', error);
        return null;
    }
};

export const setCurrentUserSession = (user: User) => {
    // Determine if we need to filter password out before saving to session storage
    // const { password, ...safeUser } = user; 
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(normalizeUser(user)));

    // Also set the legacy flag for backward compatibility if needed, though we should migrate away from it.
    localStorage.setItem('mahean_admin_logged', 'true');
};

export const logoutUser = () => {
    localStorage.removeItem(CURRENT_USER_KEY);
    localStorage.removeItem('mahean_admin_logged');
};

export const updateUserProfile = (userId: string, updates: Partial<User>): User | null => {
    const users = getUsers();
    const userIndex = users.findIndex(u => u.id === userId);
    if (userIndex < 0) return null;

    const nextRole = mergeRole(users[userIndex].role, updates.role);
    const updated = { ...users[userIndex], ...updates, role: nextRole };
    users[userIndex] = updated;
    saveUsers(users);

    const currentUser = getCurrentUser();
    if (currentUser && currentUser.id === userId) {
        setCurrentUserSession(updated);
    }

    return updated;
};

export const updateUserPassword = (userId: string, newPassword: string, currentPassword?: string) => {
    const users = getUsers();
    const userIndex = users.findIndex(u => u.id === userId);
    if (userIndex < 0) {
        return { success: false, message: 'User not found.' };
    }

    const user = users[userIndex];
    if (currentPassword && user.password && user.password !== currentPassword) {
        return { success: false, message: 'Current password does not match.' };
    }

    const updated = { ...user, password: newPassword };
    users[userIndex] = updated;
    saveUsers(users);

    const currentUser = getCurrentUser();
    if (currentUser && currentUser.id === userId) {
        setCurrentUserSession(updated);
    }

    return { success: true, message: 'Password updated successfully.', user: updated };
};

export const getAllUsers = (): User[] => getUsers();

export const getUserById = (userId: string): User | null => {
    const users = getUsers();
    return users.find(user => user.id === userId) || null;
};

export const getUserByIdentifier = (identifier: string): User | null => {
    const users = getUsers();
    return findUserByIdentifier(users, identifier) || null;
};

export const updateUserRole = (userId: string, role: UserRole) => {
    const users = getUsers();
    const userIndex = users.findIndex(u => u.id === userId);
    if (userIndex < 0) {
        return { success: false, message: 'User not found.' };
    }
    const updated = { ...users[userIndex], role: normalizeRole(role) };
    users[userIndex] = updated;
    saveUsers(users);

    const currentUser = getCurrentUser();
    if (currentUser && currentUser.id === userId) {
        setCurrentUserSession(updated);
    }

    return { success: true, message: 'Role updated successfully.', user: updated };
};

export const createUser = (payload: {
    username?: string;
    email?: string;
    password: string;
    displayName?: string;
    role?: UserRole;
}): { success: boolean; message: string; user?: User } => {
    const users = getUsers();
    const normalizedEmail = payload.email ? normalizeIdentifier(payload.email) : '';
    const normalizedUsername = normalizeIdentifier(payload.username || normalizedEmail);

    if (!normalizedUsername) {
        return { success: false, message: 'Username is required.' };
    }

    if (findUserByIdentifier(users, normalizedUsername) || (normalizedEmail && findUserByIdentifier(users, normalizedEmail))) {
        return { success: false, message: 'Username already exists.' };
    }

    const newUser: User = {
        id: uuidv4(),
        username: normalizedUsername,
        email: normalizedEmail || undefined,
        password: payload.password,
        role: normalizeRole(payload.role),
        createdAt: new Date().toISOString(),
        displayName: payload.displayName || normalizedUsername.split('@')[0]
    };

    users.push(newUser);
    saveUsers(users);

    return { success: true, message: 'User created successfully.', user: newUser };
};

export const requestPasswordReset = (identifier: string) => {
    const users = getUsers();
    const user = findUserByIdentifier(users, identifier);
    if (!user) {
        return { success: false, message: 'No account found for this email.' };
    }

    localStorage.setItem(PASSWORD_RESET_KEY, user.id);
    return { success: true, message: 'Password reset initialized.' };
};

export const getPasswordResetUserId = () => localStorage.getItem(PASSWORD_RESET_KEY);

export const clearPasswordReset = () => {
    localStorage.removeItem(PASSWORD_RESET_KEY);
};

export const consumePasswordReset = (newPassword: string) => {
    const userId = getPasswordResetUserId();
    if (!userId) {
        return { success: false, message: 'No password reset request found.' };
    }

    const result = updateUserPassword(userId, newPassword);
    if (result.success) {
        clearPasswordReset();
    }

    return result;
};
