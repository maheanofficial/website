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
                bio: 'বিশ্বকবি এবং নোবেল বিজয়ী সাহিত্যিক।',
                avatar: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/80/Rabindranath_Tagore_unknown_photographer.jpg/800px-Rabindranath_Tagore_unknown_photographer.jpg',
                links: [{ name: 'Wiki', url: 'https://bn.wikipedia.org/wiki/রবীন্দ্রনাথ_ঠাকুর' }]
            },
            {
                id: '2',
                name: 'হুমায়ূন আহমেদ',
                username: 'humayun',
                bio: 'বাংলা সাহিত্যের অন্যতম জনপ্রিয় কথাশিল্পী ও চলচ্চিত্র নির্মাতা।',
                avatar: 'https://upload.wikimedia.org/wikipedia/en/8/84/Humayun_Ahmed.jpg',
                links: [{ name: 'Wiki', url: 'https://bn.wikipedia.org/wiki/হুমায়ূন_আহমেদ' }]
            },
            {
                id: '3',
                name: 'সুনীল গঙ্গোপাধ্যায়',
                username: 'sunil',
                bio: 'আধুনিক বাংলা কবিতার অন্যতম প্রধান কবি ও ঔপন্যাসিক।',
                avatar: 'https://upload.wikimedia.org/wikipedia/commons/a/aa/Sunil_Gangopadhyay_at_Kolkata_Book_Fair_2009.jpg',
                links: [{ name: 'Wiki', url: 'https://bn.wikipedia.org/wiki/সুনীল_গঙ্গোপাধ্যায়' }]
            },
            {
                id: '4',
                name: 'শরৎচন্দ্র চট্টোপাধ্যায়',
                username: 'sarat',
                bio: 'অজেয় কথাশিল্পী ও বাংলা সাহিত্যের অন্যতম জনপ্রিয় লেখক।',
                avatar: 'https://upload.wikimedia.org/wikipedia/commons/2/25/Sarat_Chandra_Chattopadhyay.jpg',
                links: [{ name: 'Wiki', url: 'https://bn.wikipedia.org/wiki/শরৎচন্দ্র_চট্টোপাধ্যায়' }]
            },
            {
                id: '5',
                name: 'সত্যজিৎ রায়',
                username: 'satyajit',
                bio: 'বিশ্ববরেণ্য চলচ্চিত্র পরিচালক ও ফেলুদা-প্রফেসর শঙ্কুর স্রষ্টা।',
                avatar: 'https://upload.wikimedia.org/wikipedia/commons/c/c3/Satyajit_Ray_in_New_York.jpg',
                links: [{ name: 'Wiki', url: 'https://bn.wikipedia.org/wiki/সত্যজিৎ_রায়' }]
            },
            {
                id: '6',
                name: 'বিভূতিভূষণ বন্দ্যোপাধ্যায়',
                username: 'bibhuti',
                bio: 'প্রকৃতিপ্রেমী লেখক, পথের পাঁচালীর রচয়িতা।',
                avatar: 'https://upload.wikimedia.org/wikipedia/commons/a/a2/Bibhutibhushan_Bandyopadhyay.jpg',
                links: [{ name: 'Wiki', url: 'https://bn.wikipedia.org/wiki/বিভূতিভূষণ_বন্দ্যোপাধ্যায়' }]
            },
            {
                id: '7',
                name: 'শীর্ষেন্দু মুখোপাধ্যায়',
                username: 'shirshendu',
                bio: 'অদ্ভুতুড়ে ও রোমাঞ্চকর গল্পের জাদুকর।',
                avatar: 'https://upload.wikimedia.org/wikipedia/commons/e/e0/Shirshendu_Mukhopadhyay_2013.jpg',
                links: [{ name: 'Wiki', url: 'https://bn.wikipedia.org/wiki/শীর্ষেন্দু_মুখোপাধ্যায়' }]
            },
            {
                id: '8',
                name: 'কাজী নজরুল ইসলাম',
                username: 'nazrul',
                bio: 'বিদ্রোহী কবি এবং বাংলাদেশের জাতীয় কবি।',
                avatar: 'https://upload.wikimedia.org/wikipedia/commons/3/3f/Kazi_Nazrul_Islam.jpg',
                links: [{ name: 'Wiki', url: 'https://bn.wikipedia.org/wiki/কাজী_নজরুল_ইসলাম' }]
            },
            {
                id: '9',
                name: 'বঙ্কিমচন্দ্র চট্টোপাধ্যায়',
                username: 'bankim',
                bio: 'বাংলা উপন্যাসের জনক ও সাহিত্যসম্রাট।',
                avatar: 'https://upload.wikimedia.org/wikipedia/commons/5/52/Bankim_Chandra_Chattopadhyay.jpg',
                links: [{ name: 'Wiki', url: 'https://bn.wikipedia.org/wiki/বঙ্কিমচন্দ্র_চট্টোপাধ্যায়' }]
            },
            {
                id: '10',
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
