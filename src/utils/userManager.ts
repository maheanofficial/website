import { v4 as uuidv4 } from 'uuid';

export interface User {
    id: string;
    username: string;
    password?: string; // In a real app, this would be hashed. For local mock, plain text is fine but usually bad practice.
    role: 'admin' | 'writer';
    createdAt: string;
    displayName?: string;
    photoURL?: string;
}

const STORAGE_KEY = 'mahean_users';
const CURRENT_USER_KEY = 'mahean_current_user';

// Mock Admin User
const ADMIN_USER: User = {
    id: 'admin-123',
    username: 'admin',
    password: 'mahean123', // Hardcoded as per original AdminPage logic
    role: 'admin',
    createdAt: new Date().toISOString(),
    displayName: 'Admin'
};

const getUsers = (): User[] => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [ADMIN_USER];
};

const saveUsers = (users: User[]) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(users));
};

export const registerUser = (username: string, password: string): { success: boolean; message: string; user?: User } => {
    const users = getUsers();

    if (users.find(u => u.username === username)) {
        return { success: false, message: 'এই নাম ব্যবহারকারীর অস্তিত্ব আছে (Username already exists)' };
    }

    const newUser: User = {
        id: uuidv4(),
        username,
        password,
        role: 'writer', // Default role for signup
        createdAt: new Date().toISOString(),
        displayName: username
    };

    users.push(newUser);
    saveUsers(users);

    return { success: true, message: 'রেজিস্ট্রেশন সফল হয়েছে! (Registration Successful)', user: newUser };
};

export const loginUser = (username: string, password: string): { success: boolean; message: string; user?: User } => {
    // Special check for hardcoded admin if not in LS yet
    if (username === ADMIN_USER.username && password === ADMIN_USER.password) {
        // Ensure admin is in the list
        const users = getUsers();
        if (!users.find(u => u.id === ADMIN_USER.id)) {
            users.push(ADMIN_USER);
            saveUsers(users);
        }
        return { success: true, message: 'Login Successful', user: ADMIN_USER };
    }

    const users = getUsers();
    const user = users.find(u => u.username === username && u.password === password);

    if (user) {
        return { success: true, message: 'Login Successful', user };
    }

    return { success: false, message: 'ভুল ইউজারনেম বা পাসওয়ার্ড (Invalid Credentials)' };
};

export const getCurrentUser = (): User | null => {
    const stored = localStorage.getItem(CURRENT_USER_KEY);
    return stored ? JSON.parse(stored) : null;
};

export const setCurrentUserSession = (user: User) => {
    // Determine if we need to filter password out before saving to session storage
    // const { password, ...safeUser } = user; 
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));

    // Also set the legacy flag for backward compatibility if needed, though we should migrate away from it.
    localStorage.setItem('mahean_admin_logged', 'true');
};

export const logoutUser = () => {
    localStorage.removeItem(CURRENT_USER_KEY);
    localStorage.removeItem('mahean_admin_logged');
};
