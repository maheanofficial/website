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
    if (!stored) {
        const initialAuthors: Author[] = [
            {
                id: '1',
                name: 'রবীন্দ্রনাথ ঠাকুর',
                username: 'rabindranath',
                bio: 'বাংলা সাহিত্যের নোবেল বিজয়ী কবি ও লেখক।',
                avatar: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/80/Rabindranath_Tagore_unknown_photographer.jpg/800px-Rabindranath_Tagore_unknown_photographer.jpg',
                links: [{ name: 'Wiki', url: 'https://bn.wikipedia.org/wiki/রবীন্দ্রনাথ_ঠাকুর' }]
            },
            {
                id: '2',
                name: 'হুমায়ূন আহমেদ',
                username: 'humayun',
                bio: 'জনপ্রিয় বাংলাদেশি ঔপন্যাসিক, ছোটগল্পকার, নাট্যকার ও গীতিকার।',
                avatar: 'https://upload.wikimedia.org/wikipedia/en/8/84/Humayun_Ahmed.jpg',
                links: [{ name: 'Wiki', url: 'https://bn.wikipedia.org/wiki/হুমায়ূন_আহমেদ' }]
            },
            {
                id: '3',
                name: 'সুনীল গঙ্গোপাধ্যায়',
                username: 'sunil',
                bio: 'প্রখ্যাত ভারতীয় বাঙালি সাহিত্যিক।',
                avatar: 'https://upload.wikimedia.org/wikipedia/commons/a/aa/Sunil_Gangopadhyay_at_Kolkata_Book_Fair_2009.jpg',
                links: [{ name: 'Wiki', url: 'https://bn.wikipedia.org/wiki/সুনীল_গঙ্গোপাধ্যায়' }]
            },
            {
                id: '4',
                name: 'মাহিয়ান আহমেদ',
                username: 'mahean',
                bio: 'ভয়েস আর্টিস্ট ও অডিওবুক ক্রিয়েটর।',
                avatar: 'https://mahean.com/mahean-3.jpg',
                links: [
                    { name: 'Facebook', url: 'https://facebook.com/maheanahmed' },
                    { name: 'YouTube', url: 'https://youtube.com/@maheanahmed' }
                ]
            }
        ];
        localStorage.setItem(STORAGE_KEY, JSON.stringify(initialAuthors));
        return initialAuthors;
    }
    return JSON.parse(stored);
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
