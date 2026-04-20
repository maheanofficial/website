import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, BookOpen, Eye, Play, ChevronRight } from 'lucide-react';
import {
    getCachedStoryByIdOrSlug,
    getPublishedStoryByIdOrSlug,
    type Story,
    type StoryPart,
    type StorySeason
} from '../utils/storyManager';
import { toBanglaNumber } from '../utils/numberFormatter';
import { formatLongDate } from '../utils/dateFormatter';
import { slugify } from '../utils/slugify';
import { SITE_URL, DEFAULT_OG_IMAGE } from '../utils/siteMeta';
import SmartImage from '../components/SmartImage';
import SEO from '../components/SEO';
import './SeriesDetailPage.css';

const normalizeText = (v?: string | null) => (v ?? '').trim();

const toPartSegment = (part: StoryPart | undefined, idx: number) => {
    const titleSlug = slugify(normalizeText(part?.title));
    const customSlug = slugify(normalizeText(part?.slug));
    return customSlug || titleSlug || `part-${String(idx + 1).padStart(2, '0')}`;
};

const getPartPreview = (part: StoryPart | undefined) => {
    const text = normalizeText(part?.content).replace(/\s+/g, ' ');
    if (!text) return 'এই পর্বটি পড়তে ক্লিক করুন।';
    return text.length > 120 ? `${text.slice(0, 120)}...` : text;
};

const estimateReadMinutes = (parts: StoryPart[]) => {
    const wordCount = parts
        .map((p) => normalizeText(p?.content).split(/\s+/).filter(Boolean).length)
        .reduce((a, b) => a + b, 0);
    return Math.max(1, Math.ceil(wordCount / 220));
};

const getSeasonLabel = (season: StorySeason | undefined, idx: number) =>
    normalizeText(season?.title) || `সিজন ${toBanglaNumber(idx + 1)}`;

const SeriesDetailPage = () => {
    const { slug } = useParams<{ slug: string }>();
    const navigate = useNavigate();
    const cached = getCachedStoryByIdOrSlug(slug, { requireContent: true });
    const [story, setStory] = useState<Story | null>(cached);
    const [isLoading, setIsLoading] = useState(!cached);
    const [activeSeason, setActiveSeason] = useState(0);

    useEffect(() => {
        let isMounted = true;
        const load = async () => {
            const found = await getPublishedStoryByIdOrSlug(slug);
            if (!isMounted) return;
            setStory(found);
            setIsLoading(false);
        };
        if (!cached) void load();
        else {
            void getPublishedStoryByIdOrSlug(slug).then((found) => {
                if (isMounted && found) setStory(found);
            });
        }
        return () => { isMounted = false; };
    }, [slug, cached]);

    useEffect(() => {
        if (!story) return;
        const canonical = normalizeText(story.slug || String(story.id || ''));
        if (canonical && slug !== canonical) {
            navigate(`/series/${canonical}`, { replace: true });
        }
    }, [story, slug, navigate]);

    if (isLoading) {
        return (
            <div className="container py-20 text-center">
                <p className="text-gray-400">লোড হচ্ছে...</p>
            </div>
        );
    }

    if (!story) {
        return (
            <div className="container py-20 text-center">
                <h2 className="text-2xl text-white mb-4">সিরিজটি পাওয়া যায়নি</h2>
                <Link to="/series" className="text-blue-400 hover:underline">সব সিরিজ দেখুন</Link>
            </div>
        );
    }

    const hasSeasons = Array.isArray(story.seasons) && story.seasons.length > 1;
    const currentSeason: StorySeason | undefined = hasSeasons ? story.seasons![activeSeason] : undefined;
    const currentParts = hasSeasons ? (currentSeason?.parts || []) : (story.parts || []);
    const allParts = hasSeasons
        ? story.seasons!.flatMap((s) => s.parts || [])
        : (story.parts || []);
    const totalParts = allParts.length;
    const totalMinutes = estimateReadMinutes(allParts);
    const baseSegment = normalizeText(story.slug || String(story.id));
    const firstPartPath = hasSeasons
        ? `/stories/${baseSegment}/s/1/part/${toPartSegment(currentParts[0], 0)}`
        : `/stories/${baseSegment}/${toPartSegment(currentParts[0], 0)}`;

    const coverImage = story.cover_image || story.image || DEFAULT_OG_IMAGE;
    const canonicalUrl = `${SITE_URL}/series/${baseSegment}`;

    const breadcrumbSchema = {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE_URL}/` },
            { '@type': 'ListItem', position: 2, name: 'সিরিজ', item: `${SITE_URL}/series` },
            { '@type': 'ListItem', position: 3, name: story.title, item: canonicalUrl }
        ]
    };

    return (
        <article className="series-detail-page page-offset fade-in-up">
            <SEO
                title={`${story.title} - সিরিজ`}
                description={story.excerpt || `${story.title} সিরিজের সব পর্ব পড়ুন।`}
                canonicalUrl={canonicalUrl}
                ogType="article"
                ogImage={coverImage}
                jsonLd={breadcrumbSchema}
            />

            <div className="container">
                <button className="series-back-btn" onClick={() => navigate('/series')}>
                    <ArrowLeft size={16} />
                    <span>সব সিরিজ</span>
                </button>

                {/* Hero */}
                <section className="series-detail-hero">
                    <div className="series-detail-cover">
                        <SmartImage
                            src={story.cover_image || story.image}
                            alt={story.title}
                            showFullText={true}
                            loading="eager"
                            fetchPriority="high"
                        />
                    </div>

                    <div className="series-detail-meta">
                        <div className="series-detail-badge">
                            <BookOpen size={14} />
                            <span>ধারাবাহিক সিরিজ</span>
                        </div>

                        <h1 className="series-detail-title">{story.title}</h1>

                        <p className="series-detail-author">
                            {story.author || 'অজানা লেখক'} &middot; {formatLongDate(story.date)}
                        </p>

                        <div className="series-detail-stats">
                            <span>
                                <BookOpen size={13} />
                                {toBanglaNumber(totalParts)}টি পর্ব
                            </span>
                            <span>
                                <Eye size={13} />
                                {toBanglaNumber(story.views || 0)} পাঠক
                            </span>
                            <span>আনু. {toBanglaNumber(totalMinutes)} মিনিট</span>
                        </div>

                        {story.excerpt && (
                            <p className="series-detail-excerpt">{story.excerpt}</p>
                        )}

                        {story.tags && story.tags.length > 0 && (
                            <div className="series-detail-tags">
                                {story.tags.map((tag) => (
                                    <Link
                                        key={tag}
                                        to={`/tags/${encodeURIComponent(tag)}`}
                                        className="series-tag-pill"
                                    >
                                        {tag}
                                    </Link>
                                ))}
                            </div>
                        )}

                        <Link to={firstPartPath} className="series-detail-start-btn">
                            <Play size={15} />
                            <span>প্রথম পর্ব পড়া শুরু করুন</span>
                        </Link>
                    </div>
                </section>

                {/* Season tabs */}
                {hasSeasons && (
                    <div className="series-seasons-tabs">
                        {story.seasons!.map((season, sIdx) => (
                            <button
                                key={season.id || `s-${sIdx}`}
                                className={`series-season-tab ${sIdx === activeSeason ? 'active' : ''}`}
                                onClick={() => setActiveSeason(sIdx)}
                            >
                                {getSeasonLabel(season, sIdx)}
                                <span className="series-season-count">
                                    {toBanglaNumber(season.parts?.length || 0)}
                                </span>
                            </button>
                        ))}
                    </div>
                )}

                {/* Parts list */}
                <section className="series-parts-section">
                    <div className="series-parts-header">
                        <h2>
                            {hasSeasons ? getSeasonLabel(currentSeason, activeSeason) : 'পর্ব তালিকা'}
                        </h2>
                        <span>{toBanglaNumber(currentParts.length)}টি পর্ব</span>
                    </div>

                    <div className="series-parts-list">
                        {currentParts.map((part, idx) => {
                            const partPath = hasSeasons
                                ? `/stories/${baseSegment}/s/${activeSeason + 1}/part/${toPartSegment(part, idx)}`
                                : `/stories/${baseSegment}/${toPartSegment(part, idx)}`;
                            const label = normalizeText(part?.title) || `পর্ব ${toBanglaNumber(idx + 1)}`;
                            return (
                                <Link
                                    key={part.id || `part-${idx}`}
                                    to={partPath}
                                    className="series-part-item"
                                >
                                    <div className="series-part-num">{toBanglaNumber(idx + 1)}</div>
                                    <div className="series-part-body">
                                        <h3>{label}</h3>
                                        <p>{getPartPreview(part)}</p>
                                    </div>
                                    <ChevronRight className="series-part-arrow" size={18} />
                                </Link>
                            );
                        })}
                    </div>
                </section>
            </div>
        </article>
    );
};

export default SeriesDetailPage;
