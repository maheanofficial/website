const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const storiesFile = path.join(rootDir, 'data', 'table-stories.json');
const authorsFile = path.join(rootDir, 'data', 'table-authors.json');
const categoriesFile = path.join(rootDir, 'data', 'table-categories.json');

const storiesRaw = JSON.parse(fs.readFileSync(storiesFile, 'utf8')).rows || [];
const authorsRaw = JSON.parse(fs.readFileSync(authorsFile, 'utf8')).rows || [];
const categoriesRaw = JSON.parse(fs.readFileSync(categoriesFile, 'utf8')).rows || [];

const validAuthors = authorsRaw.filter((a) =>
    a &&
    a.name &&
    !['TEAM USELESS'].includes((a.name || '').toUpperCase()) &&
    a.username !== 'teamuseless1' &&
    a.username !== 'teamuseless2'
);

const cleanExcerptText = (value) => {
    let text = String(value || '').trim();
    if (text.startsWith('__MAHEAN_META__:')) {
        const endIdx = text.indexOf(':__MAHEAN_META_END__');
        if (endIdx >= 0) {
            text = text.slice(endIdx + ':__MAHEAN_META_END__'.length).trim();
        }
    }
    return text;
};

const LEGACY_SEEDED_STORY_IDS = new Set(['1', '2', '3', '4', '5', '6', '7', '8', '9', '10']);
const publishedStories = storiesRaw.filter((s) =>
    s &&
    (!s.status || s.status === 'published') &&
    !LEGACY_SEEDED_STORY_IDS.has(String(s.id))
).map(s => {
    // Map database column names to client Story object fields
    return {
        id: String(s.id),
        title: s.title || '',
        excerpt: cleanExcerptText(s.excerpt),
        content: s.content || '',
        authorId: String(s.author_id || s.authorId || ''),
        categoryId: String(s.category_id || s.categoryId || ''),
        views: Number(s.views) || 0,
        image: s.image || undefined,
        cover_image: s.cover_image || s.coverImage || undefined,
        date: s.date || new Date().toISOString(),
        slug: s.slug || undefined,
        author: s.author || undefined,
        category: s.category || undefined,
        tags: Array.isArray(s.tags) ? s.tags : [],
        parts: Array.isArray(s.parts) ? s.parts : [],
        comments: Number(s.comments) || 0,
        is_featured: Boolean(s.is_featured),
        readTime: s.read_time || s.readTime || undefined,
        season: s.season ? Number(s.season) : undefined,
        status: s.status || 'published',
        updatedAt: s.updated_at || s.updatedAt || undefined
    };
});

console.log('Processed published stories:', publishedStories.length);
console.log('Processed valid authors:', validAuthors.length);
console.log('Processed categories:', categoriesRaw.length);

const content = `// Auto-generated initial fallback data for instant zero-latency loading on fresh browsers & incognito

export interface InitialStory {
    id: string;
    title: string;
    excerpt: string;
    content: string;
    authorId: string;
    categoryId: string;
    views: number;
    image?: string;
    cover_image?: string;
    date: string;
    slug?: string;
    author?: string;
    category?: string;
    tags?: string[];
    parts?: any[];
    comments?: number;
    is_featured?: boolean;
    readTime?: string;
    season?: number;
    status?: 'published' | 'pending' | 'rejected' | 'draft';
    updatedAt?: string;
}

export interface InitialAuthor {
    id: string;
    name: string;
    bio?: string | null;
    avatar?: string | null;
    username?: string | null;
    links?: { name: string; url: string; }[];
}

export interface InitialCategory {
    id: string;
    name: string;
    slug?: string;
    description?: string | null;
    image?: string | null;
}

export const INITIAL_STORIES: InitialStory[] = ${JSON.stringify(publishedStories, null, 2)};

export const INITIAL_AUTHORS: InitialAuthor[] = ${JSON.stringify(validAuthors, null, 2)};

export const INITIAL_CATEGORIES: InitialCategory[] = ${JSON.stringify(categoriesRaw, null, 2)};
`;

const targetDir = path.join(rootDir, 'src', 'data');
if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
}

fs.writeFileSync(path.join(targetDir, 'initialSiteData.ts'), content, 'utf8');
console.log('Successfully written src/data/initialSiteData.ts!');
