import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, BookOpen, ChevronRight, Play } from 'lucide-react';
import { getStories, type Story, type StoryPart } from '../utils/storyManager';
import { formatLongDate } from '../utils/dateFormatter';
import { toBanglaNumber } from '../utils/numberFormatter';
import { slugify } from '../utils/slugify';
import { SITE_URL, DEFAULT_OG_IMAGE } from '../utils/siteMeta';
import SmartImage from '../components/SmartImage';
import SEO from '../components/SEO';
import './StoryPartsPage.css';

const StoryPartsPage = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [story, setStory] = useState<Story | null>(null);
    const [isLoading, setIsLoading] = useState(true);
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
    const buildFallbackPartLabel = (partIndex: number) => `Part ${String(partIndex + 1).padStart(2, '0')}`;
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
        return `Part ${String(parsedPartNumber).padStart(2, '0')}`;
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
        if (!compact) return 'Open this Part to read the content.';
        if (compact.length <= 140) return compact;
        return `${compact.slice(0, 140)}...`;
    };
    const toPartSegment = (part: StoryPart | undefined, partIndex: number) => {
        const normalizedTitleSlug = slugify(normalizePartTitleForDisplay(part?.title, partIndex));
        const normalizedCustomSlug = slugify(normalizeDisplayText(part?.slug));
        return normalizedCustomSlug || normalizedTitleSlug || String(partIndex + 1);
    };

    useEffect(() => {
        let isMounted = true;
        const loadStory = async () => {
            if (isMounted) setIsLoading(true);
            const stories = await getStories();
            const foundStory = stories.find((entry) => entry.id.toString() === id || entry.slug === id);
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
        const canonicalSegment = (story.slug || String(story.id || '')).trim();
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
                <h2 className="text-2xl text-white mb-4">Story parts are loading...</h2>
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
    const baseSegment = toUrlSegment(story.slug || story.id);
    const canonicalUrl = `${SITE_URL}/stories/${baseSegment}`;
    const coverImage = story.cover_image || story.image || DEFAULT_OG_IMAGE;
    const listSchema = {
        '@context': 'https://schema.org',
        '@type': 'ItemList',
        name: `${displayStoryTitle} - All Parts`,
        itemListElement: parts.map((part, index) => ({
            '@type': 'ListItem',
            position: index + 1,
            name: getPartLabel(part, index),
            url: `${SITE_URL}/stories/${baseSegment}/${toUrlSegment(toPartSegment(part, index))}`
        }))
    };

    const seoTitle = `${displayStoryTitle} - All Parts`;
    const seoDescription = `${displayStoryTitle} story: browse all parts and start reading from any part.`;

    return (
        <article className="story-parts-page fade-in-up">
            <SEO
                title={seoTitle}
                description={seoDescription}
                keywords={`${story.title}, Bangla Story, Story Parts, ${story.author || ''}`}
                canonicalUrl={canonicalUrl}
                ogType="article"
                ogImage={coverImage}
                jsonLd={listSchema}
            />

            <div className="container">
                <button onClick={() => navigate(-1)} className="story-parts-back">
                    <ArrowLeft className="icon" />
                    <span>ফিরে যান</span>
                </button>

                <section className="story-parts-hero">
                    <div className="story-parts-cover">
                        <SmartImage src={story.cover_image || story.image} alt={story.title} showFullText={true} />
                    </div>
                    <div className="story-parts-meta">
                        <div className="story-parts-badge">
                            <BookOpen size={16} />
                            <span>{toBanglaNumber(totalParts)} Parts</span>
                        </div>
                        <h1 className="story-parts-title">{displayStoryTitle}</h1>
                        <p className="story-parts-subtitle">
                            {displayStoryAuthor} | {formatLongDate(story.date)}
                        </p>
                        <p className="story-parts-excerpt">{displayStoryExcerpt || getPartPreview(parts[0])}</p>
                        <Link to={`/stories/${baseSegment}/${toUrlSegment(toPartSegment(parts[0], 0))}`} className="story-parts-start-btn">
                            <Play size={16} />
                            <span>Start from Part 1</span>
                        </Link>
                    </div>
                </section>

                <section className="story-parts-list-section">
                    <div className="story-parts-list-header">
                        <h2>Choose Part</h2>
                        <span>{toBanglaNumber(totalParts)} Parts available</span>
                    </div>

                    <div className="story-parts-list-grid">
                        {parts.map((part, index) => {
                            const label = getPartLabel(part, index);
                            return (
                                <Link
                                    key={part.id || `${story.id}-part-picker-${index + 1}`}
                                    to={`/stories/${baseSegment}/${toUrlSegment(toPartSegment(part, index))}`}
                                    className="story-part-list-item"
                                >
                                    <div className="story-part-list-left">
                                        <div className="story-part-number">{toBanglaNumber(index + 1)}</div>
                                        <div className="story-part-copy">
                                            <h3>{label}</h3>
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
