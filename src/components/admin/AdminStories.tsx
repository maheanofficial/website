import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Search, Plus, ArrowUpDown, Edit, Trash, Eye, Sparkles, ChevronDown, X, Globe, Lock } from 'lucide-react';
import './AdminStories.css';
import { getAllStories, saveStory, deleteStory, type Story, type StoryPart } from '../../utils/storyManager';
import { getCategories, saveCategory, type Category } from '../../utils/categoryManager';
import { getAllAuthors, saveAuthor, type Author } from '../../utils/authorManager';
import { slugify } from '../../utils/slugify';
import { uploadDataUrlToStorage } from '../../utils/imageStorage';
import ImageUploader from './ImageUploader';
import type { User } from '../../utils/userManager';

interface AdminStoriesProps {
    user?: User | null;
    initialViewMode?: 'list' | 'create' | 'edit';
}

const normalizeText = (value: string) => value.trim();

const hasCaseInsensitiveMatch = (values: string[], target: string) =>
    values.some((entry) => entry.toLowerCase() === target.toLowerCase());

const dedupeAndSort = (values: string[]) => Array.from(
    new Set(values.map(normalizeText).filter(Boolean))
).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));

const BANGLA_DIGIT_TO_LATIN: Record<string, string> = {
    '\u09e6': '0',
    '\u09e7': '1',
    '\u09e8': '2',
    '\u09e9': '3',
    '\u09ea': '4',
    '\u09eb': '5',
    '\u09ec': '6',
    '\u09ed': '7',
    '\u09ee': '8',
    '\u09ef': '9'
};

const LEGACY_BANGLA_PART_TITLE_REGEX = /^\u09aa\u09b0\u09cd\u09ac\s*([\u09e6-\u09ef0-9]+)$/u;
const ENGLISH_PART_TITLE_REGEX = /^part\s*[-: ]*\s*([\u09e6-\u09ef0-9]+)$/iu;
const NUMERIC_PART_TITLE_REGEX = /^[\u09e6-\u09ef0-9]+$/u;

const buildPartTitle = (partNumber: number) => {
    return String(partNumber).padStart(2, '0');
};

const buildPartSlug = (partNumber: number) => {
    return `part-${String(partNumber).padStart(2, '0')}`;
};

const parsePartNumber = (value: string) => {
    const trimmed = (value || '').trim();
    if (!trimmed) return null;

    let digitSource = '';
    const legacyMatch = trimmed.match(LEGACY_BANGLA_PART_TITLE_REGEX);
    const englishMatch = trimmed.match(ENGLISH_PART_TITLE_REGEX);
    if (legacyMatch) {
        digitSource = legacyMatch[1];
    } else if (englishMatch) {
        digitSource = englishMatch[1];
    } else if (NUMERIC_PART_TITLE_REGEX.test(trimmed)) {
        digitSource = trimmed;
    } else {
        return null;
    }

    const normalizedDigits = digitSource.replace(/[\u09e6-\u09ef]/g, (digit) => BANGLA_DIGIT_TO_LATIN[digit] || digit);
    const parsed = Number.parseInt(normalizedDigits, 10);
    if (!Number.isFinite(parsed) || parsed < 1) return null;
    return parsed;
};

const normalizeLegacyPartTitle = (value: string, fallbackIndex: number) => {
    const parsedPartNumber = parsePartNumber(value || '');
    if (parsedPartNumber !== null) return buildPartTitle(parsedPartNumber);

    const trimmed = (value || '').trim();
    if (trimmed) return trimmed;
    return buildPartTitle(fallbackIndex + 1);
};

const extractPartNumber = (title: string) => parsePartNumber(title || '');

const getNextPartNumber = (existingParts: StoryPart[]) => {
    const highestFromTitles = existingParts.reduce((highest, part) => {
        const detectedNumber = extractPartNumber(part.title || '');
        return detectedNumber ? Math.max(highest, detectedNumber) : highest;
    }, 0);
    return Math.max(existingParts.length, highestFromTitles) + 1;
};

const normalizePartSlug = (value: string) => slugify(value || '');

const AdminStories = ({ user, initialViewMode = 'list' }: AdminStoriesProps) => {
    const [stories, setStories] = useState<Story[]>([]);
    const [viewMode, setViewMode] = useState<'list' | 'create' | 'edit'>('list');
    const navigate = useNavigate();
    const { id: routeStoryId } = useParams<{ id: string }>();
    const isAdmin = user?.role === 'admin';
    const defaultStatus: Story['status'] = isAdmin ? 'published' : 'pending';
    const serverSyncErrorMessage = 'Server sync failed. This post was not submitted for approval. Please login with email/Google and try again.';

    // Search & Filter
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'public' | 'pending' | 'rejected' | 'private'>('all');

    // Form State
    const [editingId, setEditingId] = useState<string | null>(null);
    const [title, setTitle] = useState('');
    const [slug, setSlug] = useState('');
    const [isSlugManuallyEdited, setIsSlugManuallyEdited] = useState(false);
    const [category, setCategory] = useState('');
    const [tags, setTags] = useState<string[]>([]); // New Tags
    const [description, setDescription] = useState(''); // Maps to excerpt
    const [status, setStatus] = useState<Story['status']>(defaultStatus);
    const [categories, setCategories] = useState<string[]>([]);
    const [availableTags, setAvailableTags] = useState<string[]>([]);
    const [selectedTagOption, setSelectedTagOption] = useState('');
    const [newCategoryName, setNewCategoryName] = useState('');
    const [newTagName, setNewTagName] = useState('');
    const [authors, setAuthors] = useState<Author[]>([]);
    const [authorMode, setAuthorMode] = useState<'existing' | 'new'>('existing');
    const [selectedAuthorId, setSelectedAuthorId] = useState('');
    const [newAuthorName, setNewAuthorName] = useState('');
    const [newAuthorUsername, setNewAuthorUsername] = useState('');
    const [newAuthorBio, setNewAuthorBio] = useState('');
    const [newAuthorAvatar, setNewAuthorAvatar] = useState('');
    const [coverImage, setCoverImage] = useState('');
    const [parts, setParts] = useState<StoryPart[]>([{ id: '1', title: buildPartTitle(1), slug: '', content: '' }]);
    const [isGeneratingCover, setIsGeneratingCover] = useState(false);
    const isAuthExpiredMessage = (message?: string) =>
        (message || '').toLowerCase().includes('authentication is required');

    const loadData = useCallback(async () => {
        const [allStories, categoriesData, authorData] = await Promise.all([
            getAllStories(),
            getCategories(),
            getAllAuthors()
        ]);
        const categoryNames = dedupeAndSort([
            ...categoriesData.map((entry) => entry.name),
            ...allStories.map((story) => story.category || story.categoryId || '')
        ]);
        const tagNames = dedupeAndSort(
            allStories.flatMap((story) => story.tags || [])
        );
        setStories(allStories);
        setCategories(categoryNames);
        setAvailableTags(tagNames);
        setAuthors(authorData);
    }, []);

    const resetForm = useCallback(() => {
        setTitle('');
        setSlug('');
        setIsSlugManuallyEdited(false);
        setCategory('');
        setTags([]);
        setSelectedTagOption('');
        setNewCategoryName('');
        setNewTagName('');
        setDescription('');
        setStatus(defaultStatus);
        const hasAuthors = authors.length > 0;
        setAuthorMode(hasAuthors ? 'existing' : 'new');
        setSelectedAuthorId(hasAuthors ? authors[0]?.id || '' : '');
        setNewAuthorName('');
        setNewAuthorUsername('');
        setNewAuthorBio('');
        setNewAuthorAvatar('');
        setCoverImage('');
        setParts([{ id: '1', title: buildPartTitle(1), slug: '', content: '' }]);
    }, [authors, defaultStatus]);

    // Update viewMode if initialViewMode changes (e.g. navigation)
    useEffect(() => {
        if (initialViewMode) {
            setViewMode(initialViewMode);
            if (initialViewMode === 'create') {
                resetForm();
            }
        }
    }, [initialViewMode, resetForm]);

    useEffect(() => {
        void loadData();
    }, [loadData]);

    useEffect(() => {
        if (initialViewMode !== 'edit') return;
        if (!routeStoryId) return;
        if (!stories.length) return;

        const story = stories.find((entry) => entry.id === routeStoryId);
        if (!story) return;

        setEditingId(story.id);
        setTitle(story.title);
        setSlug(story.slug || '');
        setCategory(story.category || story.categoryId || '');
        setTags(story.tags || []);
        setSelectedTagOption('');
        setNewTagName('');
        setNewCategoryName('');
        setDescription(story.excerpt || '');
        setCoverImage(story.cover_image || story.image || '');
        const storyParts = story.parts?.length ? story.parts : [{ id: '1', title: buildPartTitle(1), slug: '', content: '' }];
        setParts(storyParts.map((part, index) => ({
            ...part,
            title: normalizeLegacyPartTitle(part.title || '', index),
            slug: part.slug || '',
            content: part.content || ''
        })));
        setStatus(story.status || defaultStatus);

        const matchedAuthor = authors.find(author => author.id === story.authorId)
            || authors.find(author => author.name === story.author);
        if (matchedAuthor) {
            setAuthorMode('existing');
            setSelectedAuthorId(matchedAuthor.id);
        } else {
            setAuthorMode('new');
            setSelectedAuthorId('');
            setNewAuthorName(story.author || '');
            setNewAuthorUsername('');
            setNewAuthorBio('');
            setNewAuthorAvatar('');
        }
    }, [initialViewMode, routeStoryId, stories, authors, defaultStatus]);

    useEffect(() => {
        if (viewMode !== 'create' || editingId) return;
        if (!authors.length) {
            setAuthorMode('new');
            return;
        }
        if (!selectedAuthorId) {
            setAuthorMode('existing');
            setSelectedAuthorId(authors[0]?.id || '');
        }
    }, [authors, viewMode, editingId, selectedAuthorId]);

    // Auto-generate slug from title if empty
    useEffect(() => {
        if (viewMode === 'create' && title && !editingId) {
            if (!isSlugManuallyEdited) {
                setSlug(slugify(title));
            }
        }
    }, [title, viewMode, editingId, isSlugManuallyEdited]);

    const resolveCoverAuthor = () => {
        if (authorMode === 'existing' && selectedAuthorId) {
            const author = authors.find(entry => entry.id === selectedAuthorId);
            if (author?.name) return author.name;
        }
        if (authorMode === 'new' && newAuthorName.trim()) {
            return newAuthorName.trim();
        }
        return user?.displayName || user?.email?.split('@')[0] || '\u09b2\u09c7\u0996\u0995';
    };

    const loadImage = (src: string) => new Promise<HTMLImageElement>((resolve, reject) => {
        const image = new Image();
        image.crossOrigin = 'anonymous';
        image.onload = () => resolve(image);
        image.onerror = () => reject(new Error('Failed to load image.'));
        image.src = src;
    });

    const wrapCanvasText = (ctx: CanvasRenderingContext2D, text: string, maxWidth: number) => {
        const words = text.split(/\s+/).filter(Boolean);
        const lines: string[] = [];
        let currentLine = '';

        const pushLine = () => {
            if (currentLine.trim()) {
                lines.push(currentLine.trim());
                currentLine = '';
            }
        };

        const pushWordAsLines = (word: string) => {
            let chunk = '';
            for (const char of word) {
                const testChunk = chunk + char;
                if (ctx.measureText(testChunk).width > maxWidth && chunk) {
                    lines.push(chunk);
                    chunk = char;
                } else {
                    chunk = testChunk;
                }
            }
            if (chunk) {
                lines.push(chunk);
            }
        };

        words.forEach((word) => {
            const nextLine = currentLine ? `${currentLine} ${word}` : word;
            if (ctx.measureText(nextLine).width <= maxWidth) {
                currentLine = nextLine;
                return;
            }

            pushLine();

            if (ctx.measureText(word).width <= maxWidth) {
                currentLine = word;
            } else {
                pushWordAsLines(word);
            }
        });

        pushLine();
        return lines.length ? lines : [text];
    };

    const generateStoryCardCover = async () => {
        if (typeof document !== 'undefined' && document.fonts?.ready) {
            await document.fonts.ready;
        }

        const canvas = document.createElement('canvas');
        const width = 1280;
        const height = 720;
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return '';

        ctx.fillStyle = '#050505';
        ctx.fillRect(0, 0, width, height);

        ctx.strokeStyle = '#1f2937';
        ctx.lineWidth = 3;
        ctx.strokeRect(18, 18, width - 36, height - 36);

        try {
            const logo = await loadImage('/assets/logo.png');
            const targetHeight = Math.round(height * 0.17);
            const scale = targetHeight / logo.height;
            const targetWidth = logo.width * scale;
            const logoX = width - targetWidth - Math.round(width * 0.025);
            const logoY = Math.round(height * 0.03);
            ctx.drawImage(logo, logoX, logoY, targetWidth, targetHeight);
        } catch (error) {
            console.warn('Logo load failed.', error);
        }

        const coverTitle = title.trim() || '\u0997\u09b2\u09cd\u09aa\u09c7\u09b0 \u09b6\u09bf\u09b0\u09cb\u09a8\u09be\u09ae';
        const coverAuthor = resolveCoverAuthor();
        const fontFamily = '"Hind Siliguri", "Noto Sans Bengali", "Nirmala UI", sans-serif';
        const maxTitleWidth = width - 240;
        const maxTitleHeight = height * 0.46;
        const maxLines = 4;
        let titleFontSize = 84;
        let titleLines: string[] = [];
        let titleLineHeight = Math.round(titleFontSize * 1.15);

        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#FF5C00';

        for (let size = 84; size >= 56; size -= 4) {
            ctx.font = `700 ${size}px ${fontFamily}`;
            const lines = wrapCanvasText(ctx, coverTitle, maxTitleWidth);
            const lineHeight = Math.round(size * 1.15);
            const totalHeight = lines.length * lineHeight;
            if (lines.length <= maxLines && totalHeight <= maxTitleHeight) {
                titleFontSize = size;
                titleLines = lines;
                titleLineHeight = lineHeight;
                break;
            }
            if (size === 56) {
                titleFontSize = size;
                titleLines = lines;
                titleLineHeight = lineHeight;
            }
        }

        const totalTitleHeight = titleLines.length * titleLineHeight;
        const startY = height * 0.5 - totalTitleHeight / 2;

        titleLines.forEach((line, index) => {
            ctx.fillText(line, width / 2, startY + index * titleLineHeight);
        });

        const authorFontSize = Math.max(28, Math.round(titleFontSize * 0.4));
        ctx.fillStyle = '#e5e7eb';
        ctx.font = `500 ${authorFontSize}px ${fontFamily}`;
        ctx.fillText(coverAuthor, width / 2, startY + totalTitleHeight + Math.round(authorFontSize * 1.35));

        return canvas.toDataURL('image/png');
    };

    const statusLabels: Record<string, string> = {
        published: '\u09aa\u09be\u09ac\u09b2\u09bf\u0995',
        pending: '\u09aa\u09c7\u09a8\u09cd\u09a1\u09bf\u0982',
        rejected: '\u09b0\u09bf\u099c\u09c7\u0995\u09cd\u099f\u09c7\u09a1',
        draft: '\u09aa\u09cd\u09b0\u09be\u0987\u09ad\u09c7\u099f'
    };

    const getStatusLabel = (value?: Story['status']) => {
        const normalized = value ?? 'published';
        return statusLabels[normalized] || normalized;
    };

    const getStatusClass = (value?: Story['status']) => {
        const normalized = value ?? 'published';
        if (normalized === 'pending') return 'pending';
        if (normalized === 'rejected') return 'rejected';
        if (normalized === 'draft') return 'draft';
        return 'published';
    };

    const isPublicStatus = (value?: Story['status']) => {
        const statusValue = value ?? 'published';
        return statusValue === 'published';
    };

    const handleGenerateCover = async () => {
        if (isGeneratingCover) return;
        setIsGeneratingCover(true);
        try {
            const dataUrl = await generateStoryCardCover();
            if (dataUrl) {
                const uploaded = await uploadDataUrlToStorage(dataUrl, { folder: 'stories/covers' });
                setCoverImage(uploaded.url);
            }
        } catch (error) {
            console.warn('Cover generation failed.', error);
            const message = error instanceof Error ? error.message : 'Failed to generate thumbnail.';
            alert(message);
        } finally {
            setIsGeneratingCover(false);
        }
    };

    const handleCreateNew = () => {
        navigate('/admin/dashboard/golpo/create');
    };

    const handleAuthorModeChange = (mode: 'existing' | 'new') => {
        setAuthorMode(mode);
        if (mode === 'existing' && !selectedAuthorId && authors.length > 0) {
            setSelectedAuthorId(authors[0]?.id || '');
        }
    };

    const handleCreateCategory = async () => {
        const trimmed = normalizeText(newCategoryName);
        if (!trimmed) return;

        const existing = categories.find((entry) => entry.toLowerCase() === trimmed.toLowerCase());
        if (existing) {
            setCategory(existing);
            setNewCategoryName('');
            return;
        }

        const nextId = `cat-${Date.now()}`;
        const payload: Category = {
            id: nextId,
            name: trimmed,
            slug: slugify(trimmed) || nextId
        };

        await saveCategory(payload);
        setCategories((prev) => dedupeAndSort([...prev, trimmed]));
        setCategory(trimmed);
        setNewCategoryName('');
    };

    const handleCategoryInputKeyDown = async (event: React.KeyboardEvent<HTMLInputElement>) => {
        if (event.key !== 'Enter') return;
        event.preventDefault();
        await handleCreateCategory();
    };

    const addTagToSelection = (rawTag: string) => {
        const trimmed = normalizeText(rawTag);
        if (!trimmed) return;

        setTags((prev) => (hasCaseInsensitiveMatch(prev, trimmed) ? prev : [...prev, trimmed]));
        setAvailableTags((prev) => (hasCaseInsensitiveMatch(prev, trimmed) ? prev : dedupeAndSort([...prev, trimmed])));
    };

    const handleAddTag = () => {
        addTagToSelection(newTagName);
        setNewTagName('');
    };

    const handleTagInputKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
        if (event.key !== 'Enter') return;
        event.preventDefault();
        handleAddTag();
    };

    const handleTagSelect = (event: React.ChangeEvent<HTMLSelectElement>) => {
        const selected = event.target.value;
        if (!selected) {
            setSelectedTagOption('');
            return;
        }
        addTagToSelection(selected);
        setSelectedTagOption('');
    };

    const removeTagFromSelection = (tag: string) => {
        setTags((prev) => prev.filter((entry) => entry !== tag));
    };

    const addPart = () => {
        setParts(prev => {
            const nextPartNumber = getNextPartNumber(prev);
            return [...prev, { id: `${Date.now()}-${nextPartNumber}`, title: buildPartTitle(nextPartNumber), slug: '', content: '' }];
        });
    };

    const buildDefaultPartTitle = (index: number) => {
        return buildPartTitle(index + 1);
    };
    const buildPartSlugFromTitle = (rawTitle: string, index: number) => {
        const parsedPartNumber = parsePartNumber(rawTitle || '');
        if (parsedPartNumber !== null) return buildPartSlug(parsedPartNumber);

        const normalizedTitle = normalizeLegacyPartTitle(rawTitle || '', index);
        return normalizePartSlug(normalizedTitle) || buildPartSlug(index + 1);
    };

    const updatePart = (
        id: string | undefined,
        index: number,
        field: 'title' | 'content',
        value: string
    ) => {
        setParts((prev) =>
            prev.map((part, idx) => {
                const matches = (id && part.id) ? part.id === id : idx === index;
                if (!matches) return part;
                return {
                    ...part,
                    id: part.id || id || `${Date.now()}-${index + 1}`,
                    [field]: value
                };
            })
        );
    };

    const resetPartTitle = (id: string | undefined, index: number) => {
        setParts((prev) =>
            prev.map((part, idx) => {
                const matches = (id && part.id) ? part.id === id : idx === index;
                if (!matches) return part;
                return {
                    ...part,
                    id: part.id || id || `${Date.now()}-${idx + 1}`,
                    title: buildDefaultPartTitle(idx)
                };
            })
        );
    };

    const removePart = (id: string | undefined, index: number) => {
        setParts((prev) => {
            if (prev.length <= 1) return prev;
            return prev.filter((part, idx) => {
                if (id && part.id) {
                    return part.id !== id;
                }
                return idx !== index;
            });
        });
    };

    const handleEdit = (story: Story) => {
        navigate(`/admin/dashboard/golpo/edit/${story.id}`);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (viewMode === 'edit' && !editingId) {
            alert('This story could not be loaded for editing. Please go back and open edit again.');
            return;
        }
        const existingStory = editingId ? stories.find(story => story.id === editingId) : null;
        const existingStatus = existingStory?.status || 'published';
        const nextStatus: Story['status'] = isAdmin
            ? (status || existingStatus)
            : existingStatus === 'published'
                ? 'published'
                : 'pending';
        const normalizedCategory = normalizeText(category);
        const normalizedTags = dedupeAndSort(tags);
        const storyId = editingId || Date.now().toString();
        const partSlugUseCount = new Map<string, number>();
        const normalizedParts = parts.map((part, index) => {
            const baseSlug = buildPartSlugFromTitle(part.title || '', index);
            const nextUseCount = (partSlugUseCount.get(baseSlug) || 0) + 1;
            partSlugUseCount.set(baseSlug, nextUseCount);
            const uniqueSlug = nextUseCount === 1 ? baseSlug : `${baseSlug}-${nextUseCount}`;

            return {
                ...part,
                id: part.id || `${Date.now()}-${index + 1}`,
                title: normalizeLegacyPartTitle(part.title || '', index),
                slug: uniqueSlug,
                content: part.content ?? ''
            };
        });
        const baseSlug = slug.trim() ? slug : title;
        let normalizedSlug = slugify(baseSlug);
        if (!normalizedSlug) {
            normalizedSlug = slugify(title);
        }
        if (normalizedSlug) {
            const hasConflict = stories.some((entry) =>
                entry.id !== storyId && slugify(entry.slug || '') === normalizedSlug
            );
            if (hasConflict) {
                normalizedSlug = `${normalizedSlug}-${storyId.slice(-5)}`;
            }
        }
        let authorName = existingStory?.author || user?.displayName || 'Admin';
        let authorId = existingStory?.authorId || user?.id || 'admin';

        if (authorMode === 'existing' && selectedAuthorId) {
            const selectedAuthor = authors.find(author => author.id === selectedAuthorId);
            if (selectedAuthor) {
                authorName = selectedAuthor.name;
                authorId = selectedAuthor.id;
            }
        }

        if (authorMode === 'new' && newAuthorName.trim()) {
            const trimmedName = newAuthorName.trim();
            const trimmedUsername = newAuthorUsername.trim() || slugify(trimmedName);
            const newAuthor: Author = {
                id: Date.now().toString(),
                name: trimmedName,
                username: trimmedUsername,
                bio: newAuthorBio.trim() || undefined,
                avatar: newAuthorAvatar || undefined,
                links: []
            };
            const nextAuthors = await saveAuthor(newAuthor);
            setAuthors(nextAuthors);
            setSelectedAuthorId(newAuthor.id);
            authorName = newAuthor.name;
            authorId = newAuthor.id;
        }

        const newStory: Story = {
            id: storyId,
            title,
            slug: normalizedSlug || undefined,
            category: normalizedCategory,
            categoryId: normalizedCategory, // Using name as ID for now
            tags: normalizedTags,
            cover_image: coverImage,
            parts: normalizedParts,
            status: nextStatus,
            date: existingStory?.date || new Date().toISOString(),
            author: authorName,
            authorId: authorId,
            submittedBy: existingStory?.submittedBy || user?.id || undefined,
            views: existingStory?.views ?? 0,
            comments: existingStory?.comments ?? 0,
            content: normalizedParts.map(p => p.content).join('\n'), // Legacy
            excerpt: description || normalizedParts[0]?.content.slice(0, 100) || ''
        };
        const saveResult = await saveStory(newStory);
        if (!saveResult.success || !saveResult.synced) {
            if (isAuthExpiredMessage(saveResult.message)) {
                alert('Your login session expired. Please log in again, then retry update.');
                navigate('/login');
                return;
            }
            alert(saveResult.message || serverSyncErrorMessage);
            return;
        }
        await loadData();
        navigate('/admin/dashboard/golpo');
    };

    const handleDelete = async (id: string) => {
        if (confirm('Are you sure?')) {
            await deleteStory(id);
            await loadData();
        }
    }

    const handleToggleVisibility = async (story: Story) => {
        const isPublic = isPublicStatus(story.status);
        const nextStatus = isAdmin
            ? (isPublic ? 'draft' : 'published')
            : (isPublic ? 'draft' : 'pending');
        const saveResult = await saveStory({ ...story, status: nextStatus });
        if (!saveResult.success || !saveResult.synced) {
            if (isAuthExpiredMessage(saveResult.message)) {
                alert('Your login session expired. Please log in again, then retry update.');
                navigate('/login');
                return;
            }
            alert(saveResult.message || serverSyncErrorMessage);
            return;
        }
        await loadData();
    };

    const getVisibilityTitle = (story: Story) => {
        const isPublic = isPublicStatus(story.status);
        if (isAdmin) {
            return isPublic
                ? '\u09aa\u09cd\u09b0\u09be\u0987\u09ad\u09c7\u099f \u0995\u09b0\u09c1\u09a8'
                : '\u09aa\u09be\u09ac\u09b2\u09bf\u0995 \u0995\u09b0\u09c1\u09a8';
        }
        return isPublic
            ? '\u09aa\u09cd\u09b0\u09be\u0987\u09ad\u09c7\u099f \u0995\u09b0\u09c1\u09a8'
            : '\u09b0\u09bf\u09ad\u09bf\u0989\u09a4\u09c7 \u09aa\u09be\u09a0\u09be\u09a8';
    };

    // Filter Logic
    const filteredStories = stories
        .filter(story => (isAdmin ? true : story.submittedBy === user?.id))
        .filter(story => {
            const matchesQuery = story.title.toLowerCase().includes(searchQuery.toLowerCase());
            if (!matchesQuery) return false;
            if (statusFilter === 'all') return true;
            const storyStatus = story.status || 'published';
            if (statusFilter === 'public') return isPublicStatus(storyStatus);
            if (statusFilter === 'private') return storyStatus === 'draft';
            return storyStatus === statusFilter;
        });

    if (viewMode === 'create' || viewMode === 'edit') {
        return (
            <div className="editor-overlay">
                <div className="editor-header w-full max-w-5xl mx-auto flex justify-between items-center mb-6">
                    <div></div>
                    <button onClick={() => navigate('/admin/dashboard/golpo')} className="w-8 h-8 flex items-center justify-center rounded-full bg-[#111] hover:bg-[#222] text-gray-400 transition-colors">
                        <X size={18} />
                    </button>
                </div>

                <div className="max-w-5xl mx-auto">
                    {/* Header Section */}
                    <div className="mb-8 text-left">
                        <h2 className="text-3xl font-bold text-white mb-2">{viewMode === 'create' ? 'নতুন গল্প যোগ করুন' : 'গল্প এডিট করুন'}</h2>
                        <p className="text-gray-400 text-sm">Fill out the details below to {viewMode === 'create' ? 'add a new story' : 'edit the story'}.</p>
                    </div>

                    <form onSubmit={handleSave} className="form-container-flat">

                        {/* Row 1: Title & Slug */}
                        <div className="form-grid-2 mb-8">
                            <div className="form-group">
                                <label className="form-label-flat">গল্প টাইটেল</label>
                                <input
                                    type="text"
                                    value={title}
                                    onChange={e => setTitle(e.target.value)}
                                    className="form-input-flat"
                                    placeholder="যেমন: এক সমুদ্র প্রেম"
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <div className="flex justify-between items-center mb-2">
                                    <label className="form-label-flat !mb-0">Slug</label>
                                     <button type="button" className="btn-auto-slug" onClick={() => {
                                         if (title) {
                                             setSlug(slugify(title));
                                            setIsSlugManuallyEdited(false);
                                         }
                                     }}>
                                         <Sparkles size={12} /> Auto-Generate Slug
                                     </button>
                                </div>
                                 <input
                                     type="text"
                                     value={slug}
                                    onChange={(e) => {
                                        setSlug(e.target.value);
                                        setIsSlugManuallyEdited(true);
                                    }}
                                     className="form-input-flat"
                                     placeholder="e.g., ek-samudro-prem"
                                 />
                             </div>
                         </div>

                        {/* Author Section */}
                        <div className="mb-8">
                            <div className="author-toggle-row">
                                <button
                                    type="button"
                                    className={`author-toggle-btn ${authorMode === 'existing' ? 'active' : ''}`}
                                    onClick={() => handleAuthorModeChange('existing')}
                                    disabled={!authors.length}
                                >
                                    {'\u09ac\u09bf\u09a6\u09cd\u09af\u09ae\u09be\u09a8 \u09b2\u09c7\u0996\u0995'}
                                </button>
                                <button
                                    type="button"
                                    className={`author-toggle-btn ${authorMode === 'new' ? 'active' : ''}`}
                                    onClick={() => handleAuthorModeChange('new')}
                                >
                                    {'\u09a8\u09a4\u09c1\u09a8 \u09b2\u09c7\u0996\u0995 \u09a4\u09c8\u09b0\u09bf'}
                                </button>
                            </div>

                            {authorMode === 'existing' ? (
                                <div className="form-group">
                                    <label className="form-label-flat">{'\u09b2\u09c7\u0996\u0995 \u09a8\u09bf\u09b0\u09cd\u09ac\u09be\u099a\u09a8 \u0995\u09b0\u09c1\u09a8'}</label>
                                    <div className="relative custom-select-wrapper">
                                        <select
                                            value={selectedAuthorId}
                                            onChange={e => setSelectedAuthorId(e.target.value)}
                                            className="form-select-flat"
                                        >
                                            <option value="">{'\u09b2\u09c7\u0996\u0995 \u09ac\u09be\u099b\u09be\u0987 \u0995\u09b0\u09c1\u09a8'}</option>
                                            {authors.map(author => (
                                                <option key={author.id} value={author.id}>
                                                    {author.name}{author.username ? ` (@${author.username})` : ''}
                                                </option>
                                            ))}
                                        </select>
                                        <ChevronDown className="select-arrow" size={16} />
                                    </div>
                                    {!authors.length && (
                                        <p className="helper-text">{'\u0995\u09cb\u09a8\u09cb \u09b2\u09c7\u0996\u0995 \u09a8\u09c7\u0987\u0964 \u09aa\u09cd\u09b0\u09a5\u09ae\u09c7 \u09a8\u09a4\u09c1\u09a8 \u09b2\u09c7\u0996\u0995 \u09a4\u09c8\u09b0\u09bf \u0995\u09b0\u09c1\u09a8\u0964'}</p>
                                    )}
                                    <button
                                        type="button"
                                        className="author-switch-link"
                                        onClick={() => handleAuthorModeChange('new')}
                                    >
                                        {'\u09a8\u09a4\u09c1\u09a8 \u09b2\u09c7\u0996\u0995 \u09a4\u09c8\u09b0\u09bf \u0995\u09b0\u09c1\u09a8'}
                                    </button>
                                </div>
                            ) : (
                                <div className="author-create-card">
                                    <div className="form-grid-2 mb-6">
                                        <div className="form-group">
                                            <label className="form-label-flat">{'\u09b2\u09c7\u0996\u0995\u09c7\u09b0 \u09a8\u09be\u09ae'}</label>
                                            <input
                                                type="text"
                                                value={newAuthorName}
                                                onChange={e => setNewAuthorName(e.target.value)}
                                                className="form-input-flat"
                                                placeholder="Full name"
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label-flat">Username</label>
                                            <input
                                                type="text"
                                                value={newAuthorUsername}
                                                onChange={e => setNewAuthorUsername(e.target.value)}
                                                className="form-input-flat"
                                                placeholder="auto-generated"
                                            />
                                        </div>
                                    </div>
                                    <div className="form-grid-2">
                                        <div className="form-group">
                                            <label className="form-label-flat">{'\u09b2\u09c7\u0996\u0995\u09c7\u09b0 \u099b\u09ac\u09bf'}</label>
                                            <ImageUploader
                                                value={newAuthorAvatar}
                                                onChange={setNewAuthorAvatar}
                                                isRound={true}
                                                folder="authors/avatars"
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label-flat">{'\u09ac\u09be\u09af\u09bc\u09cb'}</label>
                                            <textarea
                                                value={newAuthorBio}
                                                onChange={e => setNewAuthorBio(e.target.value)}
                                                rows={4}
                                                className="form-textarea-flat resize-none"
                                                placeholder="Short author bio"
                                            />
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        className="author-switch-link"
                                        onClick={() => handleAuthorModeChange('existing')}
                                    >
                                        {'\u09ac\u09bf\u09a6\u09cd\u09af\u09ae\u09be\u09a8 \u09b2\u09c7\u0996\u0995 \u09ac\u09be\u099b\u09be\u0987 \u0995\u09b0\u09c1\u09a8'}
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Row 2: Categories & Tags */}
                        <div className="form-grid-2 mb-8">
                            <div className="form-group">
                                <label className="form-label-flat">Categories</label>
                                <div className="relative custom-select-wrapper">
                                    <select
                                        value={category}
                                        onChange={e => setCategory(e.target.value)}
                                        className="form-select-flat"
                                    >
                                        <option value="">Select category</option>
                                        {categories.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                    <ChevronDown className="select-arrow" size={16} />
                                </div>
                                <div className="inline-create-row">
                                    <input
                                        type="text"
                                        value={newCategoryName}
                                        onChange={(event) => setNewCategoryName(event.target.value)}
                                        onKeyDown={(event) => void handleCategoryInputKeyDown(event)}
                                        className="form-input-flat compact-input"
                                        placeholder="Type a new category"
                                    />
                                    <button
                                        type="button"
                                        className="inline-add-btn"
                                        onClick={() => void handleCreateCategory()}
                                        disabled={!newCategoryName.trim()}
                                    >
                                        <Plus size={14} />
                                        Add
                                    </button>
                                </div>
                            </div>
                            <div className="form-group">
                                <label className="form-label-flat">Tags</label>
                                <div className="relative custom-select-wrapper">
                                    <select
                                        className="form-select-flat"
                                        value={selectedTagOption}
                                        onChange={handleTagSelect}
                                    >
                                        <option value="">Select existing tags</option>
                                        {availableTags.map((tag) => (
                                            <option key={tag} value={tag}>{tag}</option>
                                        ))}
                                    </select>
                                    <ChevronDown className="select-arrow" size={16} />
                                </div>
                                <div className="inline-create-row">
                                    <input
                                        type="text"
                                        value={newTagName}
                                        onChange={(event) => setNewTagName(event.target.value)}
                                        onKeyDown={handleTagInputKeyDown}
                                        className="form-input-flat compact-input"
                                        placeholder="Type a new tag"
                                    />
                                    <button
                                        type="button"
                                        className="inline-add-btn"
                                        onClick={handleAddTag}
                                        disabled={!newTagName.trim()}
                                    >
                                        <Plus size={14} />
                                        Add
                                    </button>
                                </div>
                                {tags.length > 0 && (
                                    <div className="selected-tags-wrap">
                                        {tags.map((tag) => (
                                            <button
                                                key={tag}
                                                type="button"
                                                className="selected-tag-chip"
                                                onClick={() => removeTagFromSelection(tag)}
                                                title="Remove tag"
                                            >
                                                {tag}
                                                <X size={12} />
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {isAdmin && (
                            <div className="mb-8">
                                <label className="form-label-flat">Status</label>
                                <div className="relative custom-select-wrapper">
                                    <select
                                        value={status || defaultStatus}
                                        onChange={e => setStatus(e.target.value as Story['status'])}
                                        className="form-select-flat"
                                    >
                                        <option value="published">{'\u09aa\u09be\u09ac\u09b2\u09bf\u0995'}</option>
                                        <option value="draft">{'\u09aa\u09cd\u09b0\u09be\u0987\u09ad\u09c7\u099f'}</option>
                                        <option value="pending">{'\u09aa\u09c7\u09a8\u09cd\u09a1\u09bf\u0982'}</option>
                                        <option value="rejected">{'\u09b0\u09bf\u099c\u09c7\u0995\u09cd\u099f\u09c7\u09a1'}</option>
                                    </select>
                                    <ChevronDown className="select-arrow" size={16} />
                                </div>
                            </div>
                        )}

                        {/* Row 3: Description */}
                        <div className="mb-8">
                            <div className="flex justify-between items-center mb-2">
                                <label className="form-label-flat !mb-0">Description ({description.length}/500)</label>
                            </div>
                            <textarea
                                value={description}
                                onChange={e => setDescription(e.target.value)}
                                maxLength={500}
                                rows={4}
                                className="form-textarea-flat resize-none"
                                placeholder="Write a short description about this story..."
                            />
                        </div>

                        {/* Row 4: Thumbnail */}
                        <div className="mb-8">
                            <label className="form-label-flat">Thumbnail (16:9)</label>
                            <ImageUploader
                                value={coverImage}
                                onChange={setCoverImage}
                                placeholder="Click to upload an image"
                                helperText="Recommended ratio: 16:9"
                                variant="classic"
                                containerClass="thumbnail-uploader-container w-full aspect-video"
                                folder="stories/covers"
                            />
                            <div className="ai-divider">
                                <span>or</span>
                            </div>
                            <div className="ai-generate-stack">
                                <button
                                    type="button"
                                    className="ai-generate-btn"
                                    onClick={() => void handleGenerateCover()}
                                    disabled={isGeneratingCover}
                                >
                                    <Sparkles size={16} />
                                    {isGeneratingCover ? 'Generating...' : 'Generate Thumbnail'}
                                </button>
                            </div>
                        </div>

                        {/* Parts Section */}
                        <div className="parts-manager">
                            <div className="flex items-center mb-4">
                                <h3 className="text-lg font-semibold text-white">Parts</h3>
                            </div>

                            {parts.map((part, index) => {
                                const partEditorLabel = part.title?.trim() || buildDefaultPartTitle(index);
                                const partUrlPreview = buildPartSlugFromTitle(part.title || '', index);
                                return (
                                <div key={part.id || `part-${index}`} className="part-editor">
                                    <div className="part-header">
                                        <div className="part-header-main">
                                            <div className="part-title-wrap" title="Edit part title">
                                                <Edit size={14} className="part-title-icon" />
                                                <input
                                                    type="text"
                                                    value={part.title}
                                                    onChange={e => updatePart(part.id, index, 'title', e.target.value)}
                                                    className="part-title-input"
                                                    placeholder={buildDefaultPartTitle(index)}
                                                />
                                            </div>
                                            <div className="part-url-wrap" title="Part URL auto sync with title">
                                                <span className="part-url-prefix">/</span>
                                                <input
                                                    type="text"
                                                    value={partUrlPreview}
                                                    readOnly
                                                    className="part-url-input"
                                                />
                                            </div>
                                        </div>

                                        <div className="part-actions">
                                            {part.title?.trim() && part.title.trim() !== buildDefaultPartTitle(index) ? (
                                                <button
                                                    type="button"
                                                    className="part-title-reset-btn"
                                                    onClick={() => resetPartTitle(part.id, index)}
                                                    title={'\u09a1\u09bf\u09ab\u09b2\u09cd\u099f \u09a8\u09be\u09ae\u09c7 \u09ab\u09bf\u09b0\u09c7 \u09af\u09be\u09a8'}
                                                >
                                                    {'\u09a1\u09bf\u09ab\u09b2\u09cd\u099f'}
                                                </button>
                                            ) : null}
                                            <button
                                                type="button"
                                                className="remove-part-btn"
                                                onClick={() => removePart(part.id, index)}
                                                disabled={parts.length === 1}
                                                title={parts.length === 1 ? 'At least 1 Part is required' : 'Remove Part'}
                                            >
                                                {'\u09ae\u09c1\u099b\u09c1\u09a8'}
                                            </button>
                                        </div>
                                    </div>
                                    <textarea
                                        value={part.content}
                                        onChange={e => updatePart(part.id, index, 'content', e.target.value)}
                                        rows={6}
                                        className="form-textarea-flat resize-none"
                                        placeholder={`${partEditorLabel} \u098f\u0996\u09be\u09a8\u09c7 \u09b2\u09bf\u0996\u09c1\u09a8....`}
                                    />
                                </div>
                            )})}
                            <div className="flex justify-end mt-3">
                                <button type="button" className="btn-secondary" onClick={addPart}>
                                    Add New Part
                                </button>
                            </div>
                        </div>

                        <div className="form-actions text-center justify-center pt-4">
                            <button type="button" onClick={() => navigate('/admin/dashboard/golpo')} className="btn-cancel">
                                Cancel
                            </button>
                            <button type="submit" className="btn-submit">
                                {viewMode === 'create' ? 'Create Story' : 'Update Story'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        );
    }

    return (
        <div className="admin-stories-container">
            {/* Action Bar */}
            <div className="stories-actions-bar">
                <div className="search-filter-group">
                    <div className="search-wrapper">
                        <Search size={16} className="search-icon" />
                        <input
                            type="text"
                            placeholder="গল্প খুঁজুন..."
                            className="search-input"
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <select
                        className="status-dropdown"
                        value={statusFilter}
                        onChange={e => setStatusFilter(e.target.value as 'all' | 'public' | 'pending' | 'rejected' | 'private')}
                    >
                        <option value="all">{'\u09b8\u09ac \u09b8\u09cd\u099f\u09cd\u09af\u09be\u099f\u09be\u09b8'}</option>
                        <option value="public">{'\u09aa\u09be\u09ac\u09b2\u09bf\u0995'}</option>
                        <option value="pending">{'\u09aa\u09c7\u09a8\u09cd\u09a1\u09bf\u0982'}</option>
                        <option value="rejected">{'\u09b0\u09bf\u099c\u09c7\u0995\u09cd\u099f\u09c7\u09a1'}</option>
                        <option value="private">{'\u09aa\u09cd\u09b0\u09be\u0987\u09ad\u09c7\u099f'}</option>
                    </select>
                </div>

                <button className="create-btn" onClick={handleCreateNew}>
                    <Plus size={18} />
                    নতুন গল্প যোগ করুন
                </button>
            </div>

            {/* Data Table */}
            <div className="data-table-container">
                <div className="data-table-header">
                    <div className="col-header col-title">{'\u099f\u09be\u0987\u099f\u09c7\u09b2'} <ArrowUpDown size={12} /></div>
                    <div className="col-header col-author">{'\u09b2\u09c7\u0996\u0995'}</div>
                    <div className="col-header col-status">{'\u09b8\u09cd\u099f\u09cd\u09af\u09be\u099f\u09be\u09b8'} <ArrowUpDown size={12} /></div>
                    <div className="col-header col-parts">Part</div>
                    <div className="col-header col-created">{'\u09a4\u09be\u09b0\u09bf\u0996'} <ArrowUpDown size={12} /></div>
                    <div className="col-header col-actions">{'\u0985\u09cd\u09af\u09be\u0995\u09b6\u09a8\u09b8\u09ae\u09c2\u09b9'}</div>
                </div>

                {filteredStories.length > 0 ? (
                    <div className="table-body">
                        {filteredStories.map(story => (
                            <div key={story.id} className="data-row">
                                <div className="col-title cell-text">{story.title}</div>
                                <div className="col-author cell-text text-gray-400">{story.author || '-'}</div>
                                <div className="col-status">
                                    <span className={`status-badge status-${getStatusClass(story.status)}`}>
                                        {getStatusLabel(story.status)}
                                    </span>
                                </div>
                                <div className="col-parts cell-text">{story.parts?.length || 0}</div>
                                <div className="col-created cell-text text-gray-400">{new Date(story.date).toLocaleDateString()}</div>
                                <div className="col-actions flex gap-2 justify-end">
                                     <button
                                         className="action-btn"
                                         title="View"
                                         onClick={() => window.open(`/stories/${story.slug || story.id}`, '_blank')}
                                     >
                                         <Eye size={16} />
                                     </button>
                                    <button className="action-btn" onClick={() => handleEdit(story)} title="Edit"><Edit size={16} /></button>
                                    <button
                                        className="action-btn"
                                        onClick={() => handleToggleVisibility(story)}
                                        title={getVisibilityTitle(story)}
                                    >
                                        {isPublicStatus(story.status) ? <Lock size={16} /> : <Globe size={16} />}
                                    </button>
                                    <button className="action-btn text-red-500 hover:bg-red-900/20" onClick={() => handleDelete(story.id)} title="Delete"><Trash size={16} /></button>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="empty-state-table">
                        <p>{'\u0995\u09cb\u09a8\u09cb \u09ab\u09b2\u09be\u09ab\u09b2 \u09a8\u09c7\u0987'}</p>
                        <span className="empty-sub-text">{'\u0995\u09cb\u09a8\u09cb \u0997\u09b2\u09cd\u09aa \u09a8\u09c7\u0987'}</span>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminStories;
