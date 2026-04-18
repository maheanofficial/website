import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, BookOpen, ChevronRight, Play } from 'lucide-react';
import {
    getCachedStoryByIdOrSlug,
    getPublishedStoryByIdOrSlug,
    type Story,
    type StoryPart
} from '../utils/storyManager';
import { formatLongDate } from '../utils/dateFormatter';
import { toBanglaNumber } from '../utils/numberFormatter';
import { getReaderSession } from '../utils/readerExperience';
import { slugify } from '../utils/slugify';
import { SITE_URL, DEFAULT_OG_IMAGE } from '../utils/siteMeta';
import SmartImage from '../components/SmartImage';
import SEO from '../components/SEO';
import './StoryPartsPage.css';

const decodeBanglaUnicodeEscapes = (value: string) =>
    value.replace(/\\u09([0-9a-fA-F]{2})/g, (_, code: string) =>
        String.fromCharCode(Number.parseInt(`09${code}`, 16))
    );

const normalizeDisplayText = (value: string | undefined) => decodeBanglaUnicodeEscapes(value || '').trim();

const toUrlSegment = (value: string | number | undefined) =>
    String(value ?? '').trim().replace(/^\/+|\/+$/g, '');

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

const buildFallbackPartLabel = (partIndex: number) =>
    `পর্ব ${toBanglaNumber(String(partIndex + 1).padStart(2, '0'))}`;

const buildFallbackPartSlug = (partIndex: number) => `part-${String(partIndex + 1).padStart(2, '0')}`;

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

const normalizePartTitleForDisplay = (value: string | undefined, partIndex: number) => {
    const fallback = buildFallbackPartLabel(partIndex);
    const trimmedTitle = normalizeDisplayText(value);
    if (!trimmedTitle) return fallback;
    const parsedPartNumber = parsePartNumberFromTitle(trimmedTitle);
    if (parsedPartNumber === null) return trimmedTitle;
    return `পর্ব ${toBanglaNumber(String(parsedPartNumber).padStart(2, '0'))}`;
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

const normalizeStory = (entry: Story): Story => {
    return {
        ...entry,
        parts: getReadableParts(entry)
    };
};

const getPartLabel = (part: StoryPart | undefined, partIndex: number) => {
    return normalizePartTitleForDisplay(part?.title, partIndex);
};

const getPartPreview = (part: StoryPart | undefined) => {
    const compact = normalizeDisplayText(part?.content).replace(/\s+/g, ' ').trim();
    if (!compact) return 'এই পর্বটি খুলে পড়ুন।';
    if (compact.length <= 140) return compact;
    return `${compact.slice(0, 140)}...`;
};

const estimateTotalReadMinutes = (parts: StoryPart[]) => {
    const content = parts
        .map((part) => normalizeDisplayText(part?.content))
        .filter(Boolean)
        .join(' ');
    const wordCount = content.split(/\s+/).filter(Boolean).length;
    return Math.max(1, Math.ceil(wordCount / 220));
};

const toPartSegment = (part: StoryPart | undefined, partIndex: number) => {
    const parsedPartNumber = parsePartNumberFromTitle(part?.title);
    const normalizedTitleSlug = parsedPartNumber !== null
        ? `part-${String(parsedPartNumber).padStart(2, '0')}`
        : slugify(normalizeDisplayText(part?.title));
    const normalizedCustomSlug = slugify(normalizeDisplayText(part?.slug));
    return normalizedCustomSlug || normalizedTitleSlug || buildFallbackPartSlug(partIndex);
};

const StoryPartsPage = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const readerSession = getReaderSession();
    const initialCachedStory = getCachedStoryByIdOrSlug(id, { requireContent: true });
    const [story, setStory] = useState<Story | null>(initialCachedStory);
    const [isLoading, setIsLoading] = useState(() => !initialCachedStory);

    useEffect(() => {
        let isMounted = true;
        const loadStory = async () => {
            const cachedStory = getCachedStoryByIdOrSlug(id, { requireContent: true });
            if (isMounted) {
                setStory(cachedStory);
                setIsLoading(!cachedStory);
            }

            const foundStory = await getPublishedStoryByIdOrSlug(id);
            if (!foundStory) {
                if (isMounted) {
                    setStory(null);
                    setIsLoading(false);
                }
                return;
            }
            if (isMounted) {
                setStory(normalizeStory(foundStory));
                setIsLoading(false);
            }
        };

        void loadStory();
        return () => {
            isMounted = false;
        };
    }, [id]);

    useEffect(() => {
        if (!story) return;
        const canonicalSegment = toUrlSegment(story.slug || String(story.id || ''));
        if (!canonicalSegment || !id) return;
        if (id === canonicalSegment) return;
        navigate(`/stories/${toUrlSegment(canonicalSegment)}`, { replace: true });
    }, [story, id, navigate]);

    const displayStoryTitle = normalizeDisplayText(story?.title);
    const displayStoryAuthor = normalizeDisplayText(story?.author) || 'অজানা লেখক';
    const displayStoryExcerpt = normalizeDisplayText(story?.excerpt);

    if (isLoading) {
        return (
            <div className="container py-20 text-center">
                <h2 className="text-2xl text-white mb-4">গল্পের পর্বগুলো লোড হচ্ছে...</h2>
                <p className="text-gray-400">অনুগ্রহ করে অপেক্ষা করুন।</p>
            </div>
        );
    }

    if (!story) {
        return (
            <div className="container py-20 text-center">
                <h2 className="text-2xl text-white mb-4">গল্পটি খুঁজে পাওয়া যায়নি</h2>
                <p className="text-gray-400 mb-6">দয়া করে অন্য গল্প থেকে চেষ্টা করুন।</p>
                <Link to="/stories" className="text-blue-400 hover:underline">
                    সব গল্পে ফিরে যান
                </Link>
            </div>
        );
    }

    const parts = story.parts || [];
    const totalParts = Math.max(1, parts.length);
    const totalReadMinutes = estimateTotalReadMinutes(parts);
    const baseSegment = toUrlSegment(story.slug || story.id);
    const firstPartPath = `/stories/${baseSegment}/${toUrlSegment(toPartSegment(parts[0], 0))}`;
    const matchedReaderSession = readerSession && (
        readerSession.storyId === String(story.id || '') ||
        (readerSession.storySlug && readerSession.storySlug === story.slug)
    )
        ? readerSession
        : null;
    const canonicalUrl = `${SITE_URL}/stories/${baseSegment}`;
    const coverImage = story.cover_image || story.image || DEFAULT_OG_IMAGE;
    const listSchema = {
        '@context': 'https://schema.org',
        '@type': 'ItemList',
        name: `${displayStoryTitle} - সব পর্ব`,
        itemListElement: parts.map((part, index) => ({
            '@type': 'ListItem',
            position: index + 1,
            name: getPartLabel(part, index),
            url: `${SITE_URL}/stories/${baseSegment}/${toUrlSegment(toPartSegment(part, index))}`
        }))
    };

    const breadcrumbSchema = {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
            {
                '@type': 'ListItem',
                position: 1,
                name: 'Home',
                item: `${SITE_URL}/`
            },
            {
                '@type': 'ListItem',
                position: 2,
                name: 'Stories',
                item: `${SITE_URL}/stories`
            },
            {
                '@type': 'ListItem',
                position: 3,
                name: displayStoryTitle || story.title,
                item: canonicalUrl
            }
        ]
    };

    const seoTitle = `${displayStoryTitle} - সব পর্ব`;
    const seoDescription = `${displayStoryTitle} গল্পের সব পর্ব দেখুন এবং যেকোনো পর্ব থেকে পড়া শুরু করুন।`;

    return (
        <article className="story-parts-page fade-in-up">
            <SEO
                title={seoTitle}
                description={seoDescription}
                keywords={`${story.title}, বাংলা গল্প, গল্পের পর্ব, ${story.author || ''}`}
                canonicalUrl={canonicalUrl}
                ogType="article"
                ogImage={coverImage}
                jsonLd={[listSchema, breadcrumbSchema]}
            />

            <div className="container">
                <button onClick={() => navigate(-1)} className="story-parts-back">
                    <ArrowLeft className="icon" />
                    <span>ফিরে যান</span>
                </button>

                <section className="story-parts-hero">
                    <div className="story-parts-cover">
                        <SmartImage
                            src={story.cover_image || story.image}
                            alt={story.title}
                            showFullText={true}
                            loading="eager"
                            fetchPriority="high"
                        />
                    </div>
                    <div className="story-parts-meta">
                        <div className="story-parts-badge">
                            <BookOpen size={16} />
                            <span>{toBanglaNumber(totalParts)} পর্ব</span>
                        </div>
                        <h1 className="story-parts-title">{displayStoryTitle}</h1>
                        <p className="story-parts-subtitle">
                            {displayStoryAuthor} | {formatLongDate(story.date)}
                        </p>
                        <div className="story-parts-stats-row">
                            <span>{toBanglaNumber(totalParts)}টি পর্ব</span>
                            <span>আনুমানিক {toBanglaNumber(totalReadMinutes)} মিনিটের পড়া</span>
                            {matchedReaderSession ? <span>{toBanglaNumber(matchedReaderSession.progress)}% পড়া হয়েছে</span> : null}
                        </div>
                        <p className="story-parts-excerpt">{displayStoryExcerpt || getPartPreview(parts[0])}</p>
                        {matchedReaderSession ? (
                            <Link to={matchedReaderSession.path} className="story-parts-resume-btn">
                                যেখানে শেষ করেছিলেন সেখান থেকে আবার শুরু করুন
                            </Link>
                        ) : null}
                        <Link to={firstPartPath} className="story-parts-start-btn">
                            <Play size={16} />
                            <span>প্রথম পর্ব থেকে শুরু করুন</span>
                        </Link>
                    </div>
                </section>

                <section className="story-parts-list-section">
                    <div className="story-parts-list-header">
                        <h2>পর্ব বাছুন</h2>
                        <span>{toBanglaNumber(totalParts)}টি পর্ব</span>
                    </div>

                    <div className="story-parts-list-grid">
                        {parts.map((part, index) => {
                            const label = getPartLabel(part, index);
                            const partPath = `/stories/${baseSegment}/${toUrlSegment(toPartSegment(part, index))}`;
                            const isResumeTarget = matchedReaderSession?.path === partPath;
                            return (
                                <Link
                                    key={part.id || `${story.id}-part-picker-${index + 1}`}
                                    to={partPath}
                                    className="story-part-list-item"
                                >
                                    <div className="story-part-list-left">
                                        <div className="story-part-number">{toBanglaNumber(index + 1)}</div>
                                        <div className="story-part-copy">
                                            <div className="story-part-copy-head">
                                                <h3>{label}</h3>
                                                {isResumeTarget ? <span className="story-part-resume-pill">এখানেই পড়ছিলেন</span> : null}
                                            </div>
                                            <p>{getPartPreview(part)}</p>
                                        </div>
                                    </div>
                                    <ChevronRight className="story-part-go-icon" />
                                </Link>
                            );
                        })}
                    </div>
                </section>
            </div>
        </article>
    );
};

export default StoryPartsPage;
