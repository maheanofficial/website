import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, BookOpen, ChevronRight, Play } from 'lucide-react';
import { getStories, type Story, type StoryPart } from '../utils/storyManager';
import { formatLongDate } from '../utils/dateFormatter';
import { toBanglaNumber } from '../utils/numberFormatter';
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

    const normalizeStory = (entry: Story): Story => {
        if (entry.parts && entry.parts.length > 0) return entry;
        return {
            ...entry,
            parts: [{ id: '1', title: 'পর্ব 01', content: entry.content }]
        };
    };

    const buildFallbackPartLabel = (partIndex: number) => `পর্ব ${toBanglaNumber(partIndex + 1)}`;
    const getPartLabel = (part: StoryPart | undefined, partIndex: number) => {
        const trimmedTitle = normalizeDisplayText(part?.title);
        if (trimmedTitle) return trimmedTitle;
        return buildFallbackPartLabel(partIndex);
    };
    const getPartPreview = (part: StoryPart | undefined) => {
        const compact = normalizeDisplayText(part?.content).replace(/\s+/g, ' ').trim();
        if (!compact) return 'এই পর্বের কনটেন্ট পড়তে ক্লিক করুন।';
        if (compact.length <= 140) return compact;
        return `${compact.slice(0, 140)}...`;
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
        navigate(`/stories/${encodeURIComponent(canonicalSegment)}`, { replace: true });
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
    const baseSegment = (story.slug || story.id).trim();
    const canonicalUrl = `${SITE_URL}/stories/${encodeURIComponent(baseSegment)}`;
    const coverImage = story.cover_image || story.image || DEFAULT_OG_IMAGE;
    const listSchema = {
        '@context': 'https://schema.org',
        '@type': 'ItemList',
        name: `${displayStoryTitle} - সব পর্ব`,
        itemListElement: parts.map((part, index) => ({
            '@type': 'ListItem',
            position: index + 1,
            name: getPartLabel(part, index),
            url: `${SITE_URL}/stories/${encodeURIComponent(baseSegment)}/part/${index + 1}`
        }))
    };

    const seoTitle = `${displayStoryTitle} - সব পর্ব`;
    const seoDescription = `${displayStoryTitle} গল্পের সব পর্ব একসাথে দেখুন এবং যে পর্ব থেকে চান, সেখান থেকে পড়া শুরু করুন।`;

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
                            <span>{toBanglaNumber(totalParts)} টি পর্ব</span>
                        </div>
                        <h1 className="story-parts-title">{displayStoryTitle}</h1>
                        <p className="story-parts-subtitle">
                            {displayStoryAuthor} | {formatLongDate(story.date)}
                        </p>
                        <p className="story-parts-excerpt">{displayStoryExcerpt || getPartPreview(parts[0])}</p>
                        <Link to={`/stories/${encodeURIComponent(baseSegment)}/part/1`} className="story-parts-start-btn">
                            <Play size={16} />
                            <span>প্রথম পর্ব থেকে শুরু করুন</span>
                        </Link>
                    </div>
                </section>

                <section className="story-parts-list-section">
                    <div className="story-parts-list-header">
                        <h2>পর্ব বাছাই করুন</h2>
                        <span>{toBanglaNumber(totalParts)} টি পর্ব উপলব্ধ</span>
                    </div>

                    <div className="story-parts-list-grid">
                        {parts.map((part, index) => {
                            const label = getPartLabel(part, index);
                            return (
                                <Link
                                    key={part.id || `${story.id}-part-picker-${index + 1}`}
                                    to={`/stories/${encodeURIComponent(baseSegment)}/part/${index + 1}`}
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
