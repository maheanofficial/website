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

    const normalizeStory = (entry: Story): Story => {
        if (entry.parts && entry.parts.length > 0) return entry;
        return {
            ...entry,
            parts: [{ id: '1', title: '\u09aa\u09b0\u09cd\u09ac 01', content: entry.content }]
        };
    };

    const buildFallbackPartLabel = (partIndex: number) => `\u09aa\u09b0\u09cd\u09ac ${toBanglaNumber(partIndex + 1)}`;
    const getPartLabel = (part: StoryPart | undefined, partIndex: number) => {
        const trimmedTitle = part?.title?.trim();
        if (trimmedTitle) return trimmedTitle;
        return buildFallbackPartLabel(partIndex);
    };
    const getPartPreview = (part: StoryPart | undefined) => {
        const compact = (part?.content || '').replace(/\s+/g, ' ').trim();
        if (!compact) return '\u098f\u0987 \u09aa\u09b0\u09cd\u09ac\u09c7\u09b0 \u0995\u09a8\u09cd\u099f\u09c7\u09a8\u09cd\u099f \u09aa\u09a1\u09bc\u09a4\u09c7 \u0995\u09cd\u09b2\u09bf\u0995 \u0995\u09b0\u09c1\u09a8\u0964';
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

    if (isLoading) {
        return (
            <div className="container py-20 text-center">
                <h2 className="text-2xl text-white mb-4">\u0997\u09b2\u09cd\u09aa\u09c7\u09b0 \u09aa\u09b0\u09cd\u09ac\u0997\u09c1\u09b2\u09cb \u09b2\u09cb\u09a1 \u09b9\u099a\u09cd\u099b\u09c7...</h2>
                <p className="text-gray-400">\u0985\u09a8\u09c1\u0997\u09cd\u09b0\u09b9 \u0995\u09b0\u09c7 \u0985\u09aa\u09c7\u0995\u09cd\u09b7\u09be \u0995\u09b0\u09c1\u09a8\u0964</p>
            </div>
        );
    }

    if (!story) {
        return (
            <div className="container py-20 text-center">
                <h2 className="text-2xl text-white mb-4">\u0997\u09b2\u09cd\u09aa\u099f\u09bf \u0996\u09c1\u0981\u099c\u09c7 \u09aa\u09be\u0993\u09df\u09be \u09af\u09be\u09df\u09a8\u09bf</h2>
                <p className="text-gray-400 mb-6">\u09a6\u09df\u09be \u0995\u09b0\u09c7 \u0985\u09a8\u09cd\u09af \u0997\u09b2\u09cd\u09aa \u09a5\u09c7\u0995\u09c7 \u099a\u09c7\u09b7\u09cd\u099f\u09be \u0995\u09b0\u09c1\u09a8\u0964</p>
                <Link to="/stories" className="text-blue-400 hover:underline">
                    \u09b8\u09ac \u0997\u09b2\u09cd\u09aa\u09c7 \u09ab\u09bf\u09b0\u09c7 \u09af\u09be\u09a8
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
        name: `${story.title} - \u09b8\u09ac \u09aa\u09b0\u09cd\u09ac`,
        itemListElement: parts.map((part, index) => ({
            '@type': 'ListItem',
            position: index + 1,
            name: getPartLabel(part, index),
            url: `${SITE_URL}/stories/${encodeURIComponent(baseSegment)}/part/${index + 1}`
        }))
    };

    const seoTitle = `${story.title} - \u09b8\u09ac \u09aa\u09b0\u09cd\u09ac`;
    const seoDescription = `${story.title} \u0997\u09b2\u09cd\u09aa\u09c7\u09b0 \u09b8\u09ac \u09aa\u09b0\u09cd\u09ac \u098f\u0995\u09b8\u09be\u09a5\u09c7 \u09a6\u09c7\u0996\u09c1\u09a8 \u098f\u09ac\u0982 \u09af\u09c7 \u09aa\u09b0\u09cd\u09ac \u09a5\u09c7\u0995\u09c7 \u099a\u09be\u09a8, \u09b8\u09c7\u0996\u09be\u09a8 \u09a5\u09c7\u0995\u09c7 \u09aa\u09a1\u09bc\u09be \u09b6\u09c1\u09b0\u09c1 \u0995\u09b0\u09c1\u09a8\u0964`;

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
                    <span>\u09ab\u09bf\u09b0\u09c7 \u09af\u09be\u09a8</span>
                </button>

                <section className="story-parts-hero">
                    <div className="story-parts-cover">
                        <SmartImage src={story.cover_image || story.image} alt={story.title} showFullText={true} />
                    </div>
                    <div className="story-parts-meta">
                        <div className="story-parts-badge">
                            <BookOpen size={16} />
                            <span>{toBanglaNumber(totalParts)} \u099f\u09bf \u09aa\u09b0\u09cd\u09ac</span>
                        </div>
                        <h1 className="story-parts-title">{story.title}</h1>
                        <p className="story-parts-subtitle">
                            {story.author || '\u0985\u099c\u09be\u09a8\u09be \u09b2\u09c7\u0996\u0995'} | {formatLongDate(story.date)}
                        </p>
                        <p className="story-parts-excerpt">{story.excerpt || getPartPreview(parts[0])}</p>
                        <Link to={`/stories/${encodeURIComponent(baseSegment)}/part/1`} className="story-parts-start-btn">
                            <Play size={16} />
                            <span>\u09aa\u09cd\u09b0\u09a5\u09ae \u09aa\u09b0\u09cd\u09ac \u09a5\u09c7\u0995\u09c7 \u09b6\u09c1\u09b0\u09c1 \u0995\u09b0\u09c1\u09a8</span>
                        </Link>
                    </div>
                </section>

                <section className="story-parts-list-section">
                    <div className="story-parts-list-header">
                        <h2>\u09aa\u09b0\u09cd\u09ac \u09ac\u09be\u099b\u09be\u0987 \u0995\u09b0\u09c1\u09a8</h2>
                        <span>{toBanglaNumber(totalParts)} \u099f\u09bf \u09aa\u09b0\u09cd\u09ac \u0989\u09aa\u09b2\u09ac\u09cd\u09a7</span>
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
