import { useParams, Link, useNavigate } from 'react-router-dom';
import { useEffect, useState, useRef } from 'react';
import { ChevronDown, ChevronRight, ArrowLeft, Calendar, Eye, MessageCircle, BookOpen, Bookmark, BookmarkCheck, ThumbsUp } from 'lucide-react';
import {
    getCachedStories,
    getCachedStoryByIdOrSlug,
    getPublishedStoryByIdOrSlug,
    getStories,
    incrementViews,
    type Story,
    type StoryPart,
    type StorySeason
} from '../utils/storyManager';
import { getAuthorByName, type Author } from '../utils/authorManager';
import { formatLongDate } from '../utils/dateFormatter';
import { toBanglaNumber } from '../utils/numberFormatter';
import {
    getReaderPreferences,
    isReaderStoryBookmarked,
    rememberReaderStory,
    saveReaderPreferences,
    saveReaderSession,
    toggleReaderBookmark,
    type ReaderFontScale,
    type ReaderTheme,
    type ReaderWidth
} from '../utils/readerExperience';
import { slugify } from '../utils/slugify';
import { SITE_URL, DEFAULT_OG_IMAGE } from '../utils/siteMeta';
import {
    buildCategoryFilterPath,
    buildTagFilterPath,
    formatTagLabel,
    normalizeCategoryFilterList
} from '../utils/storyFilters';
import { buildAuthPageLink } from '../utils/authRedirect';
import {
    createStoryComment,
    deleteStoryComment,
    getStoryComments,
    toggleCommentLike,
    updateStoryComment,
    type StoryComment
} from '../utils/commentManager';
import { getCurrentUser as getCurrentAuthUser, onAuthStateChange } from '../utils/auth';
import {
    queueReaderStateSync
} from '../utils/readerStateManager';
import SmartImage from '../components/SmartImage';
import SEO from '../components/SEO';
import AdComponent from '../components/AdComponent';
import ShareButtons from '../components/ShareButtons';
import StoryRating from '../components/StoryRating';
import type { User } from '../utils/userManager';
import './StoryDetailsPage.css';

const decodeBanglaUnicodeEscapes = (value: string) =>
    value.replace(/\\u09([0-9a-fA-F]{2})/g, (_, code: string) =>
        String.fromCharCode(Number.parseInt(`09${code}`, 16))
    );

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

const normalizeDisplayText = (value: string | undefined) => decodeBanglaUnicodeEscapes(value || '').trim();
const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const parseRequestedPartNumber = (value?: string) => {
    if (!/^\d+$/.test((value || '').trim())) return null;
    const parsed = Number.parseInt(value || '', 10);
    if (!Number.isFinite(parsed) || parsed <= 0) return null;
    return parsed;
};

const parsePartNumberFromTitle = (value?: string) => {
    const trimmed = normalizeDisplayText(value);
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

const normalizePartKey = (value?: string) => slugify((value || '').trim());
const normalizeMatchToken = (value?: string) => normalizeDisplayText(value).toLowerCase();
const normalizeTagToken = (value?: string) => normalizeMatchToken((value || '').replace(/^#/, ''));

const toUrlSegment = (value: string | number | undefined) =>
    String(value ?? '').trim().replace(/^\/+|\/+$/g, '');

const resolveStoryRouteSegment = (story: Story, currentSegment?: string) => {
    const storyIdSegment = toUrlSegment(String(story.id || ''));
    const storySlugSegment = toUrlSegment(story.slug || '');
    const normalizedCurrentSegment = toUrlSegment(currentSegment || '');

    if (
        normalizedCurrentSegment
        && (normalizedCurrentSegment === storyIdSegment || normalizedCurrentSegment === storySlugSegment)
    ) {
        return normalizedCurrentSegment;
    }

    return storySlugSegment || storyIdSegment;
};

const buildFallbackPartLabel = (partIndex: number) =>
    `পর্ব ${toBanglaNumber(String(partIndex + 1).padStart(2, '0'))}`;

const buildFallbackPartSlug = (partIndex: number) => `part-${String(partIndex + 1).padStart(2, '0')}`;

const normalizePartTitleForDisplay = (value: string | undefined, partIndex: number) => {
    const fallback = buildFallbackPartLabel(partIndex);
    const trimmedTitle = normalizeDisplayText(value);
    if (!trimmedTitle) return fallback;
    const parsedPartNumber = parsePartNumberFromTitle(trimmedTitle);
    if (parsedPartNumber === null) return trimmedTitle;
    return `পর্ব ${toBanglaNumber(String(parsedPartNumber).padStart(2, '0'))}`;
};

const getPartSegment = (part: StoryPart | undefined, partIndex: number) => {
    const parsedPartNumber = parsePartNumberFromTitle(part?.title);
    const titleBased = parsedPartNumber !== null
        ? `part-${String(parsedPartNumber).padStart(2, '0')}`
        : normalizePartKey(normalizeDisplayText(part?.title));
    const custom = normalizePartKey(part?.slug);
    return custom || titleBased || buildFallbackPartSlug(partIndex);
};

const resolvePartIndexFromParam = (parts: StoryPart[], value?: string) => {
    if (!parts.length) return 0;

    const rawValue = (value || '').trim();
    const normalizedKey = normalizePartKey(rawValue);
    if (normalizedKey) {
        const matchedIndex = parts.findIndex((part, index) => getPartSegment(part, index) === normalizedKey);
        if (matchedIndex >= 0) return matchedIndex;
    }

    const requestedPartNumber = parseRequestedPartNumber(rawValue);
    if (requestedPartNumber !== null) {
        return clamp(requestedPartNumber - 1, 0, parts.length - 1);
    }

    return 0;
};

const getReadableParts = (entry: Story): StoryPart[] => {
    const sourceParts = Array.isArray(entry.parts) ? entry.parts : [];
    const meaningfulParts = sourceParts.filter((part) => normalizeDisplayText(part?.content).length > 0);
    if (meaningfulParts.length > 0) return meaningfulParts;
    return [{
        id: sourceParts[0]?.id || '1',
        title: sourceParts[0]?.title || '01',
        content: entry.content || ''
    }];
};

const getSeasonParts = (story: Story, seasonNum: number): StoryPart[] => {
    if (Array.isArray(story.seasons) && story.seasons.length > 0) {
        const idx = Math.max(0, seasonNum - 1);
        const season = story.seasons[Math.min(idx, story.seasons.length - 1)];
        if (season?.parts?.length) return season.parts;
    }
    return getReadableParts(story);
};

const getSeasonLabel = (season: StorySeason | undefined, idx: number) =>
    normalizeDisplayText(season?.title) || `সিজন ${toBanglaNumber(idx + 1)}`;

const getPartLabel = (part: StoryPart | undefined, partIndex: number) => {
    return normalizePartTitleForDisplay(part?.title, partIndex);
};

const normalizeStory = (entry: Story): Story => {
    return {
        ...entry,
        parts: getReadableParts(entry)
    };
};

const toStoryTimestamp = (entry: Story) => {
    const updatedAtValue = Date.parse(entry.updatedAt || '');
    if (Number.isFinite(updatedAtValue)) return updatedAtValue;
    const dateValue = Date.parse(entry.date || '');
    if (Number.isFinite(dateValue)) return dateValue;
    return 0;
};

const toStoryReaderPath = (entry: Story, options?: { preferId?: boolean }) => {
    const normalizedEntry = normalizeStory(entry);
    const storyIdSegment = toUrlSegment(String(normalizedEntry.id || ''));
    const storySlugSegment = toUrlSegment(normalizedEntry.slug || '');
    const storySegment = options?.preferId
        ? (storyIdSegment || storySlugSegment)
        : (storySlugSegment || storyIdSegment);
    if (!storySegment) return '/stories';
    const firstPartSegment = toUrlSegment(getPartSegment(normalizedEntry.parts?.[0], 0));
    return `/stories/${storySegment}/${firstPartSegment}`;
};

const toStoryPreview = (entry: Story) => {
    const rawPreview = normalizeDisplayText(entry.excerpt)
        || normalizeDisplayText(entry.parts?.[0]?.content)
        || normalizeDisplayText(entry.content)
        || 'Tap to start reading this story.';
    if (rawPreview.length <= 140) return rawPreview;
    return `${rawPreview.slice(0, 140)}...`;
};

const estimateReadMinutes = (value: string) => {
    const compact = normalizeDisplayText(value).replace(/\s+/g, ' ').trim();
    if (!compact) return 1;
    return Math.max(1, Math.ceil(compact.length / 850));
};

const formatCommentTimestamp = (value?: string) => {
    const parsed = new Date(String(value || ''));
    if (Number.isNaN(parsed.getTime())) {
        return 'Recently';
    }

    try {
        return new Intl.DateTimeFormat('bn-BD', {
            dateStyle: 'medium',
            timeStyle: 'short'
        }).format(parsed);
    } catch {
        return parsed.toLocaleString();
    }
};

const READER_FONT_SCALE_LABELS: Record<ReaderFontScale, string> = {
    compact: 'ছোট',
    comfortable: 'স্বাভাবিক',
    large: 'বড়'
};

const getRelatedStoriesForStory = (stories: Story[], story: Story) => {
    const storyCategoryKeys = new Set(
        normalizeCategoryFilterList(story.categories, story.category)
            .map((category) => normalizeMatchToken(category))
            .filter(Boolean)
    );
    const storyTags = new Set(
        (story.tags || [])
            .map((tag) => normalizeTagToken(tag))
            .filter(Boolean)
    );

    const relatedByRelevance = stories
        .filter((entry) => String(entry.id || '') !== String(story.id || ''))
        .map((entry) => normalizeStory(entry))
        .map((entry) => {
            const candidateCategoryKeys = normalizeCategoryFilterList(entry.categories, entry.category)
                .map((category) => normalizeMatchToken(category))
                .filter(Boolean);
            const candidateTags = (entry.tags || []).map((tag) => normalizeTagToken(tag)).filter(Boolean);
            const sharedTagCount = candidateTags.reduce((count, tag) => count + (storyTags.has(tag) ? 1 : 0), 0);
            const categoryScore = candidateCategoryKeys.some((category) => storyCategoryKeys.has(category)) ? 3 : 0;
            return {
                entry,
                score: categoryScore + (sharedTagCount * 2),
                timestamp: toStoryTimestamp(entry)
            };
        })
        .filter((item) => item.score > 0)
        .sort((left, right) => {
            if (right.score !== left.score) return right.score - left.score;
            return right.timestamp - left.timestamp;
        });

    const relatedFallback = stories
        .filter((entry) => String(entry.id || '') !== String(story.id || ''))
        .map((entry) => normalizeStory(entry))
        .sort((left, right) => toStoryTimestamp(right) - toStoryTimestamp(left));

    return (relatedByRelevance.length
        ? relatedByRelevance.map((item) => item.entry)
        : relatedFallback
    ).slice(0, 6);
};

const buildStoryForDisplay = (story: Story) => {
    if (typeof window === 'undefined') return story;

    const viewKey = `viewed_story_${story.id}`;
    const hasViewedInSession = sessionStorage.getItem(viewKey);
    const currentViews = Number(story.views);
    const optimisticViews = Number.isFinite(currentViews) && currentViews >= 0
        ? Math.floor(currentViews) + 1
        : 1;

    if (hasViewedInSession) {
        return story;
    }

    return normalizeStory({
        ...story,
        views: optimisticViews
    });
};

const getCachedStoryPageState = (storyId?: string) => {
    const foundStory = getCachedStoryByIdOrSlug(storyId, { requireContent: true });
    if (!foundStory) {
        return {
            story: null as Story | null,
            relatedStories: [] as Story[]
        };
    }

    const normalized = normalizeStory(foundStory);
    const cachedStories = getCachedStories();
    return {
        story: buildStoryForDisplay(normalized),
        relatedStories: getRelatedStoriesForStory(cachedStories, normalized)
    };
};

const StoryDetailsPage = () => {
    // Routes: /stories/:id/s/:seasonNum/part/:partNumber OR /stories/:id/part/:partNumber OR /stories/:id/:partNumber
    const navigate = useNavigate();
    const { id, partNumber, seasonNum } = useParams<{ id: string; partNumber?: string; seasonNum?: string }>();
    const activeSeasonNum = parseRequestedPartNumber(seasonNum) ?? 1;
    const [initialCachedState] = useState(() => getCachedStoryPageState(id));
    const [story, setStory] = useState<Story | null>(initialCachedState.story);
    const [authorDetails, setAuthorDetails] = useState<Author | null>(null);
    const [isLoading, setIsLoading] = useState(() => !initialCachedState.story);
    const [showPartsList, setShowPartsList] = useState(true);
    const [readingProgress, setReadingProgress] = useState(0);
    const [relatedStories, setRelatedStories] = useState<Story[]>(initialCachedState.relatedStories);
    const [readerFontScale, setReaderFontScale] = useState<ReaderFontScale>(() => getReaderPreferences().fontScale);
    const [readerTheme, setReaderTheme] = useState<ReaderTheme>(() => getReaderPreferences().theme);
    const [readerWidth, setReaderWidth] = useState<ReaderWidth>(() => getReaderPreferences().width);
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [isBookmarked, setIsBookmarked] = useState(false);
    const [storyComments, setStoryComments] = useState<StoryComment[]>([]);
    const [isCommentsLoading, setIsCommentsLoading] = useState(false);
    const [commentDraft, setCommentDraft] = useState('');
    const [editingCommentId, setEditingCommentId] = useState('');
    const [commentEditDraft, setCommentEditDraft] = useState('');
    const [commentError, setCommentError] = useState('');
    const [isCommentSubmitting, setIsCommentSubmitting] = useState(false);
    const [showCompletionBanner, setShowCompletionBanner] = useState(false);
    const completionShownRef = useRef('');
    const contentRef = useRef<HTMLDivElement>(null);
    const resetStoryCacheAndReload = () => {
        localStorage.removeItem('mahean_stories');
        localStorage.removeItem('mahean_public_stories');
        localStorage.removeItem('mahean_public_story_details');
        localStorage.removeItem('mahean_public_stories_remote_ready');
        localStorage.removeItem('mahean_stories_remote_ready');
        Object.keys(sessionStorage)
            .filter((key) => key.startsWith('viewed_story_'))
            .forEach((key) => sessionStorage.removeItem(key));
        window.location.reload();
    };
    const trackedReadingProgress = Math.max(0, Math.min(100, Math.round(readingProgress / 5) * 5));

    useEffect(() => {
        let isMounted = true;

        const loadCurrentUser = async () => {
            const user = await getCurrentAuthUser();
            if (isMounted) {
                setCurrentUser(user);
            }
        };

        void loadCurrentUser();

        const subscription = onAuthStateChange((_event, session) => {
            if (!isMounted) {
                return;
            }
            setCurrentUser(session?.user ?? null);
        });

        return () => {
            isMounted = false;
            subscription?.unsubscribe?.();
        };
    }, []);

    useEffect(() => {
        let isMounted = true;
        const loadStory = async () => {
            const cachedState = getCachedStoryPageState(id);
            if (isMounted) {
                setStory(cachedState.story);
                setRelatedStories(cachedState.relatedStories);
                setIsLoading(!cachedState.story);
            }

            const relatedStoriesPromise = getStories().catch(() => getCachedStories());
            const foundStory = await getPublishedStoryByIdOrSlug(id);
            if (!foundStory) {
                if (isMounted) {
                    setStory(null);
                    setRelatedStories([]);
                    setIsLoading(false);
                }
                return;
            }

            const normalized = normalizeStory(foundStory);
            const storyForDisplay = buildStoryForDisplay(normalized);

            if (isMounted) {
                setStory(storyForDisplay);
                setIsLoading(false);
            }

            if (typeof window !== 'undefined' && !sessionStorage.getItem(`viewed_story_${normalized.id}`)) {
                // Lock immediately to avoid duplicate increments in StrictMode/dev re-renders.
                sessionStorage.setItem(`viewed_story_${normalized.id}`, 'true');
                void incrementViews(normalized.id);
            }

            const stories = await relatedStoriesPromise;
            if (!isMounted) {
                return;
            }

            setRelatedStories(getRelatedStoriesForStory(stories, normalized));
        };

        void loadStory();
        return () => {
            isMounted = false;
        };
    }, [id]);

    useEffect(() => {
        if (!story) return;
        const baseSegment = toUrlSegment(story.slug || String(story.id || '') || id);
        if (!baseSegment) return;

        const parts = story.parts || [];
        const safePartIndex = resolvePartIndexFromParam(parts, partNumber);
        const desiredPartSegment = toUrlSegment(getPartSegment(parts[safePartIndex], safePartIndex));
        const desiredPath = `/stories/${toUrlSegment(baseSegment)}/${desiredPartSegment}`;
        const currentSegment = toUrlSegment(id || '');
        const storyIdSegment = toUrlSegment(String(story.id || ''));
        // Keep ID-based route stable so duplicate/legacy slugs cannot jump to another story.
        const shouldReplaceSegment = currentSegment !== baseSegment && currentSegment !== storyIdSegment;
        const requestedPartSegment = normalizePartKey(partNumber);
        const shouldReplacePart = !requestedPartSegment || requestedPartSegment !== desiredPartSegment;
        if (shouldReplaceSegment || shouldReplacePart) {
            navigate(desiredPath, { replace: true });
        }
    }, [story, id, partNumber, navigate]);

    const goToPart = (nextPartNumber: number, targetSeasonNum?: number) => {
        if (!story) return;
        const seasonToUse = targetSeasonNum ?? activeSeasonNum;
        const currentParts = hasSeasons ? getSeasonParts(story, seasonToUse) : (story.parts || []);
        const totalPts = Math.max(1, currentParts.length || 0);
        const safePartIndex = clamp(nextPartNumber, 1, totalPts) - 1;
        const partSegment = toUrlSegment(getPartSegment(currentParts[safePartIndex], safePartIndex));
        const baseSegment = resolveStoryRouteSegment(story, id);
        if (!baseSegment) return;
        if (hasSeasons) {
            navigate(`/stories/${toUrlSegment(baseSegment)}/s/${seasonToUse}/part/${partSegment}`);
        } else {
            navigate(`/stories/${toUrlSegment(baseSegment)}/${partSegment}`);
        }
    };

    useEffect(() => {
        let isMounted = true;
        const loadAuthor = async () => {
            if (!story?.author) {
                if (isMounted) setAuthorDetails(null);
                return;
            }
            const author = await getAuthorByName(story.author);
            if (isMounted) {
                setAuthorDetails(author);
            }
        };

        loadAuthor();
        return () => {
            isMounted = false;
        };
    }, [story?.author]);

    useEffect(() => {
        let isMounted = true;

        const loadComments = async () => {
            if (!story?.id) {
                if (isMounted) {
                    setStoryComments([]);
                    setCommentError('');
                }
                return;
            }

            setIsCommentsLoading(true);
            setCommentError('');

            try {
                const comments = await getStoryComments(String(story.id));
                if (!isMounted) {
                    return;
                }
                setStoryComments(comments);
                setStory((prev) => (
                    prev
                        ? { ...prev, comments: Math.max(Number(prev.comments || 0), comments.length) }
                        : prev
                ));
            } catch (error) {
                if (!isMounted) {
                    return;
                }
                setStoryComments([]);
                setCommentError(error instanceof Error ? error.message : 'Failed to load comments.');
            } finally {
                if (isMounted) {
                    setIsCommentsLoading(false);
                }
            }
        };

        void loadComments();

        return () => {
            isMounted = false;
        };
    }, [story?.id]);

    useEffect(() => {
        window.scrollTo(0, 0);
    }, [id, partNumber]);

    useEffect(() => {
        saveReaderPreferences({ fontScale: readerFontScale, theme: readerTheme, width: readerWidth });
    }, [readerFontScale, readerTheme, readerWidth]);

    // Reading progress tracking
    useEffect(() => {
        const handleScroll = () => {
            if (!contentRef.current) return;

            const element = contentRef.current;
            const rect = element.getBoundingClientRect();
            const elementHeight = rect.height;
            const windowHeight = window.innerHeight;
            // Distance from top of document to top of element
            const scrollTop = window.scrollY || document.documentElement.scrollTop;
            const elementOffsetTop = element.offsetTop;

            // How far we have scrolled into the element
            const scrolledInto = scrollTop + windowHeight - elementOffsetTop;

            // Calculate percentage
            if (scrolledInto > 0) {
                const progress = Math.min(100, Math.max(0, (scrolledInto / (elementHeight + windowHeight)) * 100));
                setReadingProgress(progress);
            } else {
                setReadingProgress(0);
            }
        };

        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, [partNumber]);

    useEffect(() => {
        if (!story) return;
        const parts = story.parts ?? [];
        const total = Math.max(1, parts.length);
        const safeIndex = resolvePartIndexFromParam(parts, partNumber);
        if (safeIndex !== total - 1) return;
        const key = `${story.id}-${safeIndex}`;
        if (readingProgress >= 88 && completionShownRef.current !== key) {
            completionShownRef.current = key;
            setShowCompletionBanner(true);
        }
    }, [readingProgress, story, partNumber]);

    useEffect(() => {
        if (!story) return;

        const parts = story.parts ?? [];
        if (!parts.length) return;

        const safePartIndex = resolvePartIndexFromParam(parts, partNumber);
        const activePart = parts[safePartIndex] || parts[0];
        if (!activePart) return;

        const baseSegment = resolveStoryRouteSegment(story, id);
        const activePartSegment = toUrlSegment(getPartSegment(activePart, safePartIndex));
        if (!baseSegment || !activePartSegment) return;

        saveReaderSession({
            storyId: String(story.id || ''),
            storySlug: story.slug || undefined,
            storyTitle: story.title,
            partIndex: safePartIndex,
            partLabel: getPartLabel(activePart, safePartIndex),
            partSegment: activePartSegment,
            path: `/stories/${baseSegment}/${activePartSegment}`,
            progress: readingProgress,
            totalParts: Math.max(1, parts.length),
            coverImage: story.cover_image || story.image || undefined,
            updatedAt: new Date().toISOString()
        });
    }, [story, id, partNumber, readingProgress]);

    useEffect(() => {
        if (!currentUser?.id || !story?.id) {
            setIsBookmarked(false);
            return;
        }

        setIsBookmarked(isReaderStoryBookmarked(currentUser.id, String(story.id)));
    }, [currentUser?.id, story?.id]);

    useEffect(() => {
        if (!currentUser?.id || !story) return;

        const parts = story.parts ?? [];
        if (!parts.length) return;

        const safePartIndex = resolvePartIndexFromParam(parts, partNumber);
        const activePart = parts[safePartIndex] || parts[0];
        if (!activePart) return;

        const baseSegment = resolveStoryRouteSegment(story, id);
        const activePartSegment = toUrlSegment(getPartSegment(activePart, safePartIndex));
        if (!baseSegment || !activePartSegment) return;

        rememberReaderStory(currentUser.id, {
            storyId: String(story.id || ''),
            storySlug: story.slug || undefined,
            storyTitle: story.title,
            path: `/stories/${baseSegment}/${activePartSegment}`,
            partLabel: getPartLabel(activePart, safePartIndex),
            progress: trackedReadingProgress,
            totalParts: Math.max(1, parts.length),
            coverImage: story.cover_image || story.image || undefined,
            updatedAt: new Date().toISOString()
        });
        queueReaderStateSync(currentUser.id);
    }, [currentUser?.id, story, id, partNumber, trackedReadingProgress]);

    if (isLoading) {
        return (
            <div className="container py-20 text-center">
                <h2 className="text-2xl text-white mb-4">গল্পটি লোড হচ্ছে...</h2>
                <p className="text-gray-400">অনুগ্রহ করে কিছুক্ষণ অপেক্ষা করুন।</p>
            </div>
        );
    }

    if (!story) {
        return (
            <div className="container py-20 text-center">
                <h2 className="text-2xl text-white mb-4">গল্পটি লোড করতে সমস্যা হচ্ছে!</h2>
                <p className="text-gray-400 mb-6">গল্পের ডেটা খুঁজে পাওয়া যায়নি।</p>
                <button
                    onClick={resetStoryCacheAndReload}
                    className="btn btn-primary bg-red-600 hover:bg-red-700"
                >
                    Reset & Reload
                </button>
                <br /><br />
                <Link to="/stories" className="text-blue-400 hover:underline">তালিকায় ফিরে যান</Link>
            </div>
        );
    }

    const hasSeasons = Array.isArray(story.seasons) && story.seasons.length > 1;
    const parts = hasSeasons ? getSeasonParts(story, activeSeasonNum) : (story.parts ?? []);
    const totalSeasons = hasSeasons ? story.seasons!.length : 1;
    const totalParts = Math.max(1, parts.length);
    const activePartIndex = resolvePartIndexFromParam(parts, partNumber);
    const activePartNumber = activePartIndex + 1;
    const currentPart = parts[activePartIndex] || parts[0];

    if (!currentPart) {
        return null;
    }

    const nextPartNumber = activePartNumber < totalParts ? activePartNumber + 1 : null;
    const prevPartNumber = activePartNumber > 1 ? activePartNumber - 1 : null;
    // Author Details
    const baseSegment = resolveStoryRouteSegment(story, id);
    const activePartSegment = toUrlSegment(getPartSegment(currentPart, activePartIndex));
    const storyPath = `/stories/${baseSegment}/${activePartSegment}`;
    const canonicalUrl = `${SITE_URL}${storyPath}`;
    const ogImage = story.cover_image || story.image || DEFAULT_OG_IMAGE;
    const articleImage = ogImage.startsWith('http') ? ogImage : `${SITE_URL}${ogImage}`;
    const estimatedReadMinutes = estimateReadMinutes(currentPart.content);
    const remainingReadMinutes = Math.max(1, Math.ceil(estimatedReadMinutes * ((100 - readingProgress) / 100)));
    const currentReaderFontLabel = READER_FONT_SCALE_LABELS[readerFontScale];
    const nextPartLabel = nextPartNumber ? getPartLabel(parts[nextPartNumber - 1], nextPartNumber - 1) : null;
    const readerFontClass = `reader-font-${readerFontScale}`;
    const commentCount = Math.max(Number(story.comments || 0), storyComments.length);
    const loginToCommentPath = buildAuthPageLink('/login', storyPath, storyPath);
    const signupToCommentPath = buildAuthPageLink('/signup', storyPath, storyPath);

    const handleBookmarkToggle = () => {
        if (!currentUser) {
            navigate(loginToCommentPath);
            return;
        }

        const result = toggleReaderBookmark(currentUser.id, {
            storyId: String(story.id || ''),
            storySlug: story.slug || undefined,
            storyTitle: story.title,
            path: storyPath,
            partLabel: getPartLabel(currentPart, activePartIndex),
            progress: readingProgress,
            totalParts,
            coverImage: story.cover_image || story.image || undefined,
            updatedAt: new Date().toISOString()
        });

        setIsBookmarked(result.bookmarked);
        queueReaderStateSync(currentUser.id);
    };

    const handleCommentSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        if (!currentUser) {
            setCommentError('লগ ইন করলে মন্তব্য করতে পারবেন।');
            return;
        }

        const nextContent = commentDraft.trim();
        if (!nextContent) {
            setCommentError('মন্তব্য খালি রাখা যাবে না।');
            return;
        }

        setIsCommentSubmitting(true);
        setCommentError('');

        try {
            const result = await createStoryComment({
                storyId: String(story.id),
                storySlug: story.slug || undefined,
                partNumber: activePartNumber,
                content: nextContent
            });

            setStoryComments((prev) => [result.comment, ...prev]);
            setCommentDraft('');
            setStory((prev) => (
                prev
                    ? { ...prev, comments: Math.max(Number(prev.comments || 0), result.totalComments || (prev.comments || 0)) }
                    : prev
            ));
        } catch (error) {
            setCommentError(error instanceof Error ? error.message : 'মন্তব্য পাঠানো যায়নি।');
        } finally {
            setIsCommentSubmitting(false);
        }
    };

    const handleStartCommentEdit = (comment: StoryComment) => {
        setEditingCommentId(comment.id);
        setCommentEditDraft(comment.content);
        setCommentError('');
    };

    const handleCancelCommentEdit = () => {
        setEditingCommentId('');
        setCommentEditDraft('');
        setCommentError('');
    };

    const handleCommentUpdate = async (comment: StoryComment) => {
        const nextContent = commentEditDraft.trim();
        if (!nextContent) {
            setCommentError('মন্তব্য খালি রাখা যাবে না।');
            return;
        }

        setIsCommentSubmitting(true);
        setCommentError('');

        try {
            const result = await updateStoryComment({
                commentId: comment.id,
                storyId: String(story.id),
                content: nextContent
            });

            setStoryComments((prev) => prev.map((entry) => (
                entry.id === comment.id ? result.comment : entry
            )));
            handleCancelCommentEdit();
        } catch (error) {
            setCommentError(error instanceof Error ? error.message : 'মন্তব্য আপডেট করা যায়নি।');
        } finally {
            setIsCommentSubmitting(false);
        }
    };

    const handleCommentDelete = async (comment: StoryComment) => {
        const confirmed = window.confirm('মন্তব্যটি মুছে দেবেন?');
        if (!confirmed) {
            return;
        }

        setIsCommentSubmitting(true);
        setCommentError('');

        try {
            const result = await deleteStoryComment({
                commentId: comment.id,
                storyId: String(story.id)
            });

            setStoryComments((prev) => prev.filter((entry) => entry.id !== result.deletedCommentId));
            setStory((prev) => (
                prev
                    ? { ...prev, comments: Math.max(0, result.totalComments || 0) }
                    : prev
            ));
            if (editingCommentId === comment.id) {
                handleCancelCommentEdit();
            }
        } catch (error) {
            setCommentError(error instanceof Error ? error.message : 'মন্তব্য মুছতে পারা যায়নি।');
        } finally {
            setIsCommentSubmitting(false);
        }
    };

    const handleCommentLike = async (comment: StoryComment) => {
        if (!currentUser?.id || !story) return;
        try {
            const { likes } = await toggleCommentLike({ storyId: String(story.id), commentId: comment.id });
            setStoryComments((prev) =>
                prev.map((c) => (c.id === comment.id ? { ...c, likes } : c))
            );
        } catch {
            // silently ignore like errors
        }
    };

    // Format content with simplistic formatter matching demo
    const escapeHtml = (raw: string) => raw
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');

    const renderFormattedText = (text: string) => {
        // Escape user content first, then apply limited formatting markers.
        const safeText = escapeHtml(text).replace(/\r\n?/g, '\n');
        const blocks = safeText
            .split(/\n{2,}/)
            .map((entry) => entry.trim())
            .filter(Boolean);

        const html = blocks.map((block) => {
            const formattedBlock = block
                .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                .replace(/\*(.*?)\*/g, '<em>$1</em>')
                .replace(/~(.*?)~/g, '<span style="opacity: 0.7;">$1</span>')
                .replace(/^> (.*$)/gm, '<blockquote>$1</blockquote>')
                .replace(/^# (.*$)/gm, '<h3>$1</h3>')
                .replace(/\n/g, '<br>');

            if (formattedBlock.startsWith('<h3>') || formattedBlock.startsWith('<blockquote>')) {
                return formattedBlock;
            }

            return `<p>${formattedBlock}</p>`;
        }).join('');

        return { __html: html };
    };

    const partLabel = getPartLabel(currentPart, activePartNumber - 1);
    const seoTitle = `${story.title} - ${partLabel}`;
    const seoDescriptionSource = normalizeDisplayText(currentPart.content)
        || normalizeDisplayText(story.excerpt)
        || normalizeDisplayText(story.content);
    const seoDescription = (() => {
        const base = seoDescriptionSource.length > 140
            ? `${seoDescriptionSource.slice(0, 137)}...`
            : seoDescriptionSource;
        const readMin = estimateReadMinutes(currentPart.content);
        return `${base} | পড়তে সময় লাগবে ${readMin} মিনিট`;
    })();
    const canonicalStoryUrl = `${SITE_URL}/stories/${baseSegment}`;
    const articleWordCount = normalizeDisplayText(currentPart.content).split(/\s+/).filter(Boolean).length;
    const storyCategories = normalizeCategoryFilterList(story.categories, story.category);
    const storyTags = (story.tags || []).filter(Boolean);
    const seoKeywords = [
        ...storyCategories,
        ...storyTags,
        'Bangla Golpo',
        story.author,
        'Bangla Story',
        'Thriller',
        'Suspense'
    ].filter(Boolean).join(', ');

    // SEO Schema
    const articleSchema = {
        "@context": "https://schema.org",
        "@type": "BlogPosting",
        "headline": seoTitle,
        "url": canonicalUrl,
        "mainEntityOfPage": {
            "@type": "WebPage",
            "@id": canonicalUrl
        },
        "isPartOf": {
            "@type": "CreativeWork",
            "url": canonicalStoryUrl,
            "name": story.title
        },
        "image": [articleImage],
        "datePublished": story.date,
        "dateModified": story.date,
        "author": {
            "@type": "Person",
            "name": story.author || "Mahean Ahmed"
        },
        "publisher": {
            "@type": "Organization",
            "name": "Mahean Ahmed",
            "logo": {
                "@type": "ImageObject",
                "url": `${SITE_URL}/assets/logo-solid.png`
            }
        },
        "description": seoDescription,
        "articleBody": currentPart.content.substring(0, 1000),
        "wordCount": articleWordCount,
        "keywords": seoKeywords,
        "inLanguage": "bn"
    };

    const breadcrumbSchema = {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": [
            {
                "@type": "ListItem",
                "position": 1,
                "name": "Home",
                "item": `${SITE_URL}/`
            },
            {
                "@type": "ListItem",
                "position": 2,
                "name": "Stories",
                "item": `${SITE_URL}/stories`
            },
            {
                "@type": "ListItem",
                "position": 3,
                "name": story.title,
                "item": canonicalStoryUrl
            },
            {
                "@type": "ListItem",
                "position": 4,
                "name": partLabel,
                "item": canonicalUrl
            }
        ]
    };

    const reportIssueMailto = `mailto:maheanofficial@gmail.com?subject=${encodeURIComponent(
        `Content report: ${story.title}`
    )}&body=${encodeURIComponent(
        `Please review this story for policy/copyright issue.\n\nURL: ${canonicalUrl}\nStory ID: ${story.id}\nReason:`
    )}`;

    return (
        <article className="story-details-page fade-in-up">
            {/* Reading Progress Bar */}
            <div className="reading-progress-bar">
                <div
                    className="reading-progress-fill"
                    style={{ width: `${readingProgress}% ` }}
                ></div>
            </div>

            <SEO
                title={seoTitle}
                description={seoDescription}
                keywords={seoKeywords}
                ogType="article"
                author={story.author}
                ogImage={ogImage}
                imageAlt={story.title}
                canonicalUrl={canonicalUrl}
                publishedTime={story.date}
                modifiedTime={story.date}
                jsonLd={[articleSchema, breadcrumbSchema]}
            />

            <div className="container">
                {/* Back Button */}
                <button onClick={() => navigate(-1)} className="back-link" style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                    <ArrowLeft className="icon" />
                    <span>ফিরে যান</span>
                </button>

                {/* Cover Image Banner */}
                <div className="story-banner">
                    <SmartImage
                        src={story.cover_image || story.image}
                        alt={story.title}
                        showFullText={true}
                        loading="eager"
                        fetchPriority="high"
                    />
                </div>

                {/* Story Info Box */}
                <div className="story-info-box">
                    <div className="story-categories">
                        {storyCategories.map((category) => (
                            <Link
                                key={`${story.id}-category-${category}`}
                                to={buildCategoryFilterPath(category)}
                                className="category-badge"
                                style={{ textDecoration: 'none' }}
                            >
                                {category}
                            </Link>
                        ))}
                        {storyTags.length > 0 && (
                            <div className="story-tags-inline">
                                {storyTags.map((tag) => (
                                    <Link key={`${story.id}-${tag}`} to={buildTagFilterPath(tag)} className="tag">
                                        {formatTagLabel(tag)}
                                    </Link>
                                ))}
                            </div>
                        )}
                    </div>

                    <h1 className="story-title">{story.title}</h1>

                    <div className="story-meta-row">
                        <div className="story-author-info">
                            <Link to={`/stories?author=${encodeURIComponent(story.author || '')}`} className="author-link-wrapper" style={{ display: 'flex', alignItems: 'center', gap: '15px', textDecoration: 'none' }}>
                                <div className="author-avatar-lg">
                                    <SmartImage
                                        src={authorDetails?.avatar}
                                        alt={story.author || 'Author'}
                                        isRound={true}
                                        showFullText={true}
                                    />
                                </div>
                                <div className="author-text-group">
                                    <div className="author-name-lg" style={{ cursor: 'pointer', transition: 'color 0.3s' }}>{story.author}</div>
                                    <div className="author-role">লেখক (সকল গল্প পড়ুন)</div>
                                </div>
                            </Link>
                        </div>

                        <div className="story-stats-grid">
                            <div className="stat-box">
                                <Calendar className="stat-icon" />
                                <span className="stat-label">প্রকাশিত</span>
                                <span className="stat-value">{formatLongDate(story.date)}</span>
                            </div>
                            <div className="stat-box">
                                <Eye className="stat-icon" />
                                <span className="stat-label">পড়া হয়েছে</span>
                                <span className="stat-value">{toBanglaNumber(story.views || 0)}</span>
                            </div>
                            <div className="stat-box">
                                <MessageCircle className="stat-icon" />
                                <span className="stat-label">মন্তব্য</span>
                                <span className="stat-value">{toBanglaNumber(commentCount)}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Parts Navigation Controls */}
                <div className="parts-navigation-box">
                    {hasSeasons && (
                        <div className="seasons-selector-row">
                            {story.seasons!.map((season, idx) => (
                                <button
                                    key={season.id || `season-${idx}`}
                                    className={`season-tab ${idx + 1 === activeSeasonNum ? 'active' : ''}`}
                                    onClick={() => goToPart(1, idx + 1)}
                                >
                                    {getSeasonLabel(season, idx)}
                                </button>
                            ))}
                        </div>
                    )}
                    <div className="parts-header">
                        <h2 className="current-part-title">
                            {partLabel}
                            <span className="part-counter">({toBanglaNumber(activePartNumber)}/{toBanglaNumber(totalParts)}{hasSeasons ? ` · সিজন ${toBanglaNumber(activeSeasonNum)}/${toBanglaNumber(totalSeasons)}` : ''})</span>
                        </h2>

                        <button
                            className="parts-toggle-btn"
                            onClick={() => setShowPartsList(!showPartsList)}
                        >
                            <BookOpen className="icon-sm" />
                            <span>{showPartsList ? 'পর্ব তালিকা লুকান' : 'সব পর্ব'}</span>
                            <ChevronDown className={`icon-sm transition-transform ${showPartsList ? 'rotate-180' : ''}`} />
                        </button>
                    </div>

                    {showPartsList && (
                        <div className="parts-dropdown-grid">
                            {parts.map((part, idx) => {
                                const label = getPartLabel(part, idx);
                                return (
                                    <button
                                        key={part.id || `${story.id}-part-${idx + 1}`}
                                        onClick={() => {
                                            goToPart(idx + 1);
                                        }}
                                        className={`part-grid-item ${idx + 1 === activePartNumber ? 'active' : ''}`}
                                        title={label}
                                    >
                                        {label}
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>

                <section className="reader-utility-box" aria-label="Reader controls">
                    <div className="reader-utility-copy">
                        <span className="reader-utility-kicker">পাঠক মোড</span>
                        <h2>{currentReaderFontLabel} আকারে পড়া</h2>
                        <p>
                            এই পর্ব পড়তে আনুমানিক {toBanglaNumber(estimatedReadMinutes)} মিনিট লাগতে পারে।
                            {readingProgress > 5 && ` শেষ করতে আরও প্রায় ${toBanglaNumber(remainingReadMinutes)} মিনিট।`}
                        </p>
                    </div>
                    <div className="reader-utility-actions">
                        <span className="reader-chip-label">আকার</span>
                        <button type="button" className={`reader-chip ${readerFontScale === 'compact' ? 'active' : ''}`} onClick={() => setReaderFontScale('compact')}>ছোট</button>
                        <button type="button" className={`reader-chip ${readerFontScale === 'comfortable' ? 'active' : ''}`} onClick={() => setReaderFontScale('comfortable')}>স্বাভাবিক</button>
                        <button type="button" className={`reader-chip ${readerFontScale === 'large' ? 'active' : ''}`} onClick={() => setReaderFontScale('large')}>বড়</button>
                        <span className="reader-chip-separator" />
                        <span className="reader-chip-label">থিম</span>
                        <button type="button" className={`reader-chip reader-chip-theme theme-dark ${readerTheme === 'dark' ? 'active' : ''}`} onClick={() => setReaderTheme('dark')}>রাত</button>
                        <button type="button" className={`reader-chip reader-chip-theme theme-sepia ${readerTheme === 'sepia' ? 'active' : ''}`} onClick={() => setReaderTheme('sepia')}>সেপিয়া</button>
                        <button type="button" className={`reader-chip reader-chip-theme theme-paper ${readerTheme === 'paper' ? 'active' : ''}`} onClick={() => setReaderTheme('paper')}>কাগজ</button>
                        <button type="button" className={`reader-chip reader-chip-theme theme-night ${readerTheme === 'night' ? 'active' : ''}`} onClick={() => setReaderTheme('night')}>নাইট</button>
                        <span className="reader-chip-separator" />
                        <span className="reader-chip-label">প্রস্থ</span>
                        <button type="button" className={`reader-chip ${readerWidth === 'narrow' ? 'active' : ''}`} onClick={() => setReaderWidth('narrow')}>সরু</button>
                        <button type="button" className={`reader-chip ${readerWidth === 'standard' ? 'active' : ''}`} onClick={() => setReaderWidth('standard')}>স্বাভাবিক</button>
                        <button type="button" className={`reader-chip ${readerWidth === 'wide' ? 'active' : ''}`} onClick={() => setReaderWidth('wide')}>চওড়া</button>
                        <span className="reader-chip-separator" />
                        <button
                            type="button"
                            className={`reader-chip ${isBookmarked ? 'active' : ''}`}
                            onClick={handleBookmarkToggle}
                        >
                            {isBookmarked ? <BookmarkCheck size={14} /> : <Bookmark size={14} />}
                            <span>{isBookmarked ? 'সংরক্ষিত' : 'সংরক্ষণ করুন'}</span>
                        </button>
                        <button
                            type="button"
                            className="reader-chip"
                            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                        >
                            উপরে যান
                        </button>
                    </div>
                </section>

                {/* Top Ad */}
                <AdComponent slot="story-top-ad" format="horizontal" />

                {/* Story Content */}
                <div
                    className={`story-content-container ${readerFontClass}`}
                    data-reader-theme={readerTheme}
                    data-reader-width={readerWidth}
                    ref={contentRef}
                >
                    <div
                        className="story-prose"
                        dangerouslySetInnerHTML={renderFormattedText(currentPart.content)}
                    />
                </div>

                {showCompletionBanner && (
                    <div className="completion-celebration" role="status">
                        <button
                            type="button"
                            className="completion-close"
                            onClick={() => setShowCompletionBanner(false)}
                            aria-label="বন্ধ করুন"
                        >
                            ✕
                        </button>
                        <div className="completion-emoji">🎉</div>
                        <h3>গল্পটি শেষ হলো!</h3>
                        <p>এই পর্বটি পুরোপুরি পড়ার জন্য ধন্যবাদ।</p>
                    </div>
                )}

                <ShareButtons url={canonicalUrl} title={story.title} />
                <StoryRating key={String(story.id)} storyId={String(story.id)} />

                <section className="story-comments-box" aria-label="Story comments">
                    <div className="story-comments-head">
                        <div>
                            <span className="story-comments-kicker">পাঠকের মন্তব্য</span>
                            <h2>{toBanglaNumber(commentCount)}টি মন্তব্য</h2>
                            <p>পাঠকেরা গল্প পড়ে এখানে মতামত জানাতে পারবে।</p>
                        </div>
                    </div>

                    {currentUser ? (
                        <form className="story-comment-form" onSubmit={handleCommentSubmit}>
                            <textarea
                                value={commentDraft}
                                onChange={(event) => setCommentDraft(event.target.value)}
                                placeholder="এই গল্প সম্পর্কে আপনার মতামত লিখুন..."
                                maxLength={1200}
                                rows={4}
                            />
                            <div className="story-comment-form-footer">
                                <span>{toBanglaNumber(commentDraft.trim().length)}/১২০০</span>
                                <button type="submit" className="story-comment-submit" disabled={isCommentSubmitting}>
                                    {isCommentSubmitting ? 'পাঠানো হচ্ছে...' : 'মন্তব্য পাঠান'}
                                </button>
                            </div>
                        </form>
                    ) : (
                        <div className="story-comment-auth-prompt">
                            <p>মন্তব্য করতে চাইলে আগে লগ ইন বা সাইন আপ করুন।</p>
                            <div className="story-comment-auth-actions">
                                <Link to={loginToCommentPath} className="story-comment-auth-link primary">লগ ইন</Link>
                                <Link to={signupToCommentPath} className="story-comment-auth-link">সাইন আপ</Link>
                            </div>
                        </div>
                    )}

                    {commentError ? (
                        <p className="story-comments-feedback error">{commentError}</p>
                    ) : null}

                    {isCommentsLoading ? (
                        <div className="story-comments-empty">মন্তব্য লোড হচ্ছে...</div>
                    ) : storyComments.length > 0 ? (
                        <div className="story-comments-list">
                            {storyComments.map((comment) => {
                                const isCommentOwner = currentUser?.id === comment.userId;
                                const isEditingThisComment = editingCommentId === comment.id;
                                const hasBeenEdited = Boolean(comment.updatedAt && comment.updatedAt !== comment.createdAt);

                                return (
                                <article key={comment.id} className="story-comment-card">
                                    <div className="story-comment-avatar">
                                        <SmartImage
                                            src={comment.authorAvatar}
                                            alt={comment.authorName}
                                            isRound={true}
                                            showFullText={true}
                                        />
                                    </div>
                                    <div className="story-comment-body">
                                        <div className="story-comment-meta">
                                            <strong>{comment.authorName}</strong>
                                            {comment.partNumber ? (
                                                <span>পর্ব {toBanglaNumber(comment.partNumber)}</span>
                                            ) : null}
                                            <span>{formatCommentTimestamp(comment.updatedAt || comment.createdAt)}</span>
                                            {hasBeenEdited ? (
                                                <span className="story-comment-edited-badge">Edited</span>
                                            ) : null}
                                        </div>
                                        {isEditingThisComment ? (
                                            <div className="story-comment-edit-box">
                                                <textarea
                                                    value={commentEditDraft}
                                                    onChange={(event) => setCommentEditDraft(event.target.value)}
                                                    maxLength={1200}
                                                    rows={4}
                                                />
                                                <div className="story-comment-edit-actions">
                                                    <button
                                                        type="button"
                                                        className="story-comment-submit"
                                                        onClick={() => void handleCommentUpdate(comment)}
                                                        disabled={isCommentSubmitting}
                                                    >
                                                        {isCommentSubmitting ? 'সংরক্ষণ হচ্ছে...' : 'সংরক্ষণ'}
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className="story-comment-inline-btn"
                                                        onClick={handleCancelCommentEdit}
                                                        disabled={isCommentSubmitting}
                                                    >
                                                        বাতিল
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <p>{comment.content}</p>
                                        )}
                                        <div className="story-comment-footer">
                                            {currentUser && !isEditingThisComment && (
                                                <button
                                                    type="button"
                                                    className={`story-comment-like-btn ${comment.likes?.includes(currentUser.id) ? 'liked' : ''}`}
                                                    onClick={() => void handleCommentLike(comment)}
                                                >
                                                    <ThumbsUp size={13} />
                                                    <span>{comment.likes?.length || 0}</span>
                                                </button>
                                            )}
                                            {isCommentOwner && !isEditingThisComment ? (
                                                <div className="story-comment-owner-actions">
                                                    <button
                                                        type="button"
                                                        className="story-comment-inline-btn"
                                                        onClick={() => handleStartCommentEdit(comment)}
                                                        disabled={isCommentSubmitting}
                                                    >
                                                        সম্পাদনা
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className="story-comment-inline-btn danger"
                                                        onClick={() => void handleCommentDelete(comment)}
                                                        disabled={isCommentSubmitting}
                                                    >
                                                        মুছুন
                                                    </button>
                                                </div>
                                            ) : null}
                                        </div>
                                    </div>
                                </article>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="story-comments-empty">এখনও কোনো মন্তব্য আসেনি। প্রথম মন্তব্যটি আপনিই করুন।</div>
                    )}
                </section>

                {nextPartNumber && nextPartLabel && (
                    <section className="up-next-panel" aria-label="Up next">
                        <div className="up-next-copy">
                            <span className="up-next-kicker">পরের পর্ব</span>
                            <h2>{nextPartLabel}</h2>
                            <p>
                                এক বসায় পড়ছেন? পরের পর্বে চলে যান, flow break হবে না.
                            </p>
                        </div>
                        <button
                            type="button"
                            className="up-next-btn"
                            onClick={() => goToPart(nextPartNumber)}
                        >
                            <span>পরের পর্বে যান</span>
                            <ChevronRight className="icon-sm" />
                        </button>
                    </section>
                )}

                {relatedStories.length > 0 && (
                    <section className="related-stories-box" aria-label="Related stories">
                        <div className="related-stories-head">
                            <h2>আরও পড়ুন</h2>
                            <Link to="/stories" className="related-stories-all-link">সব গল্প দেখুন</Link>
                        </div>
                        <div className="related-stories-grid">
                            {relatedStories.map((relatedStory) => (
                                <Link
                                    key={`related-${story.id}-${relatedStory.id}`}
                                    to={toStoryReaderPath(relatedStory, { preferId: true })}
                                    className="related-story-item"
                                >
                                    <h3>{normalizeDisplayText(relatedStory.title) || relatedStory.title}</h3>
                                    <span className="related-story-meta">
                                        {(normalizeDisplayText(relatedStory.category) || 'Story')} | {toBanglaNumber(relatedStory.parts?.length || 1)} পর্ব
                                    </span>
                                    <p>{toStoryPreview(relatedStory)}</p>
                                </Link>
                            ))}
                        </div>
                    </section>
                )}

                <div className="story-report-box">
                    <p className="story-report-text">
                        গল্পে কোনো সমস্যা বা কপিরাইট লঙ্ঘন দেখলে জানান।
                    </p>
                    <a href={reportIssueMailto} className="story-report-link">
                        অভিযোগ করুন
                    </a>
                </div>

                {/* Bottom Ad */}
                <AdComponent slot="story-bottom-ad" />

                {/* Bottom Navigation */}
                <div className="story-footer-nav">
                    {prevPartNumber ? (
                        <button
                            onClick={() => goToPart(prevPartNumber)}
                            className="nav-btn prev-btn"
                        >
                            <ArrowLeft className="icon-sm" />
                            <span>আগের পর্ব</span>
                        </button>
                    ) : (
                        <div className="spacer"></div>
                    )}

                    {nextPartNumber ? (
                        <button
                            onClick={() => {
                                goToPart(nextPartNumber);
                                setTimeout(() => {
                                    window.scrollTo({ top: 400, behavior: 'smooth' });
                                }, 100);
                            }}
                            className="nav-btn next-btn"
                        >
                            <span>পরের পর্ব</span>
                            <ChevronRight className="icon-sm" />
                        </button>
                    ) : (
                        <div className="completion-msg">শেষ পর্ব</div>
                    )}
                </div>
            </div>
        </article>
    );
};

export default StoryDetailsPage;
