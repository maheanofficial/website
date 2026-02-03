// import { supabase } from '../lib/supabase';

export interface Author {
    id: string;
    name: string;
    bio?: string;
    avatar?: string;
    username?: string;
    links?: { name: string; url: string; }[];
}

const STORAGE_KEY = 'mahean_authors';

export const getAllAuthors = (): Author[] => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
};

export const getAuthorById = (id: string): Author | null => {
    const authors = getAllAuthors();
    return authors.find(a => a.id === id) || null;
};

export const getAuthorByName = (name: string): Author | null => {
    const authors = getAllAuthors();
    return authors.find(a => a.name === name || a.username === name) || null;
};

export const saveAuthor = async (author: Author) => {
    const authors = getAllAuthors();
    const existingIndex = authors.findIndex(a => a.id === author.id);

    if (existingIndex >= 0) {
        authors[existingIndex] = author;
    } else {
        authors.push(author);
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(authors));

    const { logActivity } = await import('./activityLogManager');
    await logActivity('create', 'author', `Saved author: ${author.name}`);
};

export const updateAuthor = async (author: Author) => {
    await saveAuthor(author);
    const { logActivity } = await import('./activityLogManager');
    await logActivity('update', 'author', `Updated author: ${author.name}`);
};

export const deleteAuthor = async (id: string) => {
    const authors = getAllAuthors();
    const author = authors.find(a => a.id === id);
    if (!author) return;

    const { moveToTrash } = await import('./trashManager');
    await moveToTrash('author', id, author, author.name);

    const filtered = authors.filter(a => a.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));

    const { logActivity } = await import('./activityLogManager');
    await logActivity('delete', 'author', `Deleted author: ${author.name}`);
};

export const restoreAuthor = async (author: Author) => {
    await saveAuthor(author);
    const { logActivity } = await import('./activityLogManager');
    await logActivity('restore', 'author', `Restored author: ${author.name}`);
};
