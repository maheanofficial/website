import { useEffect, useRef, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, BookOpen, Eye, Play, ChevronRight, MessageSquare, X } from 'lucide-react';
import {
    getCachedStoryByIdOrSlug,
    getPublishedStoryByIdOrSlug,
    type Story,
    type StoryPart,
    type StorySeason
} from '../utils/storyManager';
import { toBanglaNumber } from '../utils/numberFormatter';
import { slugify } from '../utils/slugify';
import { SITE_URL, DEFAULT_OG_IMAGE } from '../utils/siteMeta';
import { buildTagFilterPath } from '../utils/storyFilters';
import BrandLogo from '../components/BrandLogo';
import SEO from '../components/SEO';
import { withCacheBust } from '../utils/imageCache';
import './SeriesDetailPage.css';

const normalizeText = (v?: string | null) => (v ?? '').trim();

const toPartSegment = (part: StoryPart | undefined, idx: number) => {
    const titleSlug = slugify(normalizeText(part?.title));
    const customSlug = slugify(normalizeText(part?.slug));
    return customSlug || titleSlug || `part-${String(idx + 1).padStart(2, '0')}`;
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
    const [showFeedback, setShowFeedback] = useState(false);
    const [fbName, setFbName] = useState('');
    const [fbEmail, setFbEmail] = useState('');
    const [fbMessage, setFbMessage] = useState('');
    const [fbSent, setFbSent] = useState(false);
    const [fbLoading, setFbLoading] = useState(false);
    const fbRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!showFeedback) return;
        const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setShowFeedback(false); };
        document.addEventListener('keydown', handleKey);
        document.body.style.overflow = 'hidden';
        return () => { document.removeEventListener('keydown', handleKey); document.body.style.overflow = ''; };
    }, [showFeedback]);

    const handleFeedbackSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!fbName.trim() || !fbMessage.trim()) return;
        setFbLoading(true);
        try {
            await fetch('/api/contact', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: fbName, email: fbEmail, message: `[মতামত: ${story?.title || slug}] ${fbMessage}` })
            });
            setFbSent(true);
        } catch (_) {
            setFbSent(true);
        } finally {
            setFbLoading(false);
        }
    };

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
    const hasRealCover = Boolean(story.cover_image || story.image);

    const statusRaw = String(story.status || '');
    const statusLabel = statusRaw === 'completed' || statusRaw === 'সমাপ্ত' ? 'সমাপ্ত'
        : statusRaw === 'ongoing' || statusRaw === 'চলমান' ? 'চলমান'
        : null;

    const displayCategories = (story.categories || (story.category ? [story.category] : [])).filter(Boolean).slice(0, 5);
    const displayTags = (story.tags || []).filter(Boolean).slice(0, 8);
    const storySeason = Number.isFinite(story.season) ? Math.max(1, Math.floor(story.season as number)) : 1;

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

                <div className="series-detail-layout">
                    {/* Left: Parts list */}
                    <div className="series-detail-main">
                        {/* Season heading */}
                        <div className="series-main-header">
                            <div className="series-main-title-row">
                                <h1 className="series-main-title">
                                    {hasSeasons ? getSeasonLabel(currentSeason, activeSeason) : story.title}
                                </h1>
                                <span className="series-main-count">
                                    {toBanglaNumber(currentParts.length)} পর্ব
                                </span>
                            </div>
                            {story.excerpt && (
                                <p className="series-main-excerpt">{story.excerpt}</p>
                            )}
                        </div>

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
                                        </div>
                                        <span className="series-part-read">পড়ুন</span>
                                        <ChevronRight className="series-part-arrow" size={16} />
                                    </Link>
                                );
                            })}
                        </div>
                    </div>

                    {/* Right: Sticky sidebar */}
                    <aside className="series-detail-sidebar">
                        {/* Text-only cover card */}
                        <div className="series-sidebar-cover">
                            {hasRealCover ? (
                                <img src={withCacheBust(story.cover_image || story.image)} alt={story.title} className="series-sidebar-cover__img" />
                            ) : (
                                <div className="series-sidebar-cover__text">
                                    <BrandLogo size="sm" className="series-sidebar-cover__watermark" />
                                    <span className="series-sidebar-cover__title">{story.title}</span>
                                    <span className="series-sidebar-cover__author">{story.author || 'লেখক'}</span>
                                </div>
                            )}
                        </div>

                        {/* Title + Author */}
                        <h2 className="series-sidebar-title">{story.title}</h2>
                        <p className="series-sidebar-author">{story.author || 'লেখক'}</p>

                        {/* Status badge */}
                        {statusLabel && (
                            <span className={`series-sidebar-status ${statusLabel === 'সমাপ্ত' ? 'completed' : 'ongoing'}`}>
                                {statusLabel}
                            </span>
                        )}

                        {/* Stats grid */}
                        <div className="series-sidebar-stats">
                            <div className="series-sidebar-stat">
                                <span className="series-sidebar-stat__label">সিজন</span>
                                <span className="series-sidebar-stat__value">{toBanglaNumber(storySeason)}</span>
                            </div>
                            <div className="series-sidebar-stat">
                                <span className="series-sidebar-stat__label">পর্ব</span>
                                <span className="series-sidebar-stat__value">{toBanglaNumber(totalParts)}</span>
                            </div>
                            <div className="series-sidebar-stat">
                                <Eye size={13} className="series-sidebar-stat__icon" />
                                <span className="series-sidebar-stat__value">{toBanglaNumber(story.views || 0)}</span>
                            </div>
                            <div className="series-sidebar-stat">
                                <BookOpen size={13} className="series-sidebar-stat__icon" />
                                <span className="series-sidebar-stat__value">{toBanglaNumber(totalMinutes)} মিনিট</span>
                            </div>
                        </div>

                        {/* Start reading button */}
                        <Link to={firstPartPath} className="series-sidebar-start-btn">
                            <Play size={14} />
                            <span>পড়া শুরু করুন</span>
                        </Link>

                        {/* Categories */}
                        {displayCategories.length > 0 && (
                            <div className="series-sidebar-pills">
                                {displayCategories.map((cat) => (
                                    <Link key={cat} to={`/categories/${encodeURIComponent(cat)}`} className="series-sidebar-pill series-sidebar-pill--cat">
                                        {cat}
                                    </Link>
                                ))}
                            </div>
                        )}

                        {/* Tags */}
                        {displayTags.length > 0 && (
                            <div className="series-sidebar-pills">
                                {displayTags.map((tag) => (
                                    <Link key={tag} to={buildTagFilterPath(tag)} className="series-sidebar-pill series-sidebar-pill--tag">
                                        #{tag}
                                    </Link>
                                ))}
                            </div>
                        )}

                        {/* Feedback button */}
                        <button className="series-sidebar-feedback-btn" onClick={() => { setShowFeedback(true); setFbSent(false); }}>
                            <MessageSquare size={15} />
                            <span>মতামত জমা দিন</span>
                        </button>
                    </aside>
                </div>
            </div>

            {/* Feedback Modal */}
            {showFeedback && (
                <div className="series-feedback-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowFeedback(false); }}>
                    <div className="series-feedback-modal" ref={fbRef}>
                        <div className="series-feedback-header">
                            <h3>মতামত জমা দিন</h3>
                            <button className="series-feedback-close" onClick={() => setShowFeedback(false)} aria-label="Close">
                                <X size={18} />
                            </button>
                        </div>

                        {fbSent ? (
                            <div className="series-feedback-success">
                                <p>আপনার মতামত পাঠানো হয়েছে। ধন্যবাদ! 🙏</p>
                                <button className="series-feedback-done-btn" onClick={() => setShowFeedback(false)}>বন্ধ করুন</button>
                            </div>
                        ) : (
                            <form onSubmit={(e) => void handleFeedbackSubmit(e)} className="series-feedback-form">
                                <div className="series-feedback-field">
                                    <label>আপনার নাম <span>*</span></label>
                                    <input type="text" value={fbName} onChange={(e) => setFbName(e.target.value)} placeholder="নাম লিখুন" required />
                                </div>
                                <div className="series-feedback-field">
                                    <label>ইমেইল</label>
                                    <input type="email" value={fbEmail} onChange={(e) => setFbEmail(e.target.value)} placeholder="email@example.com" />
                                </div>
                                <div className="series-feedback-field">
                                    <label>মতামত <span>*</span></label>
                                    <textarea value={fbMessage} onChange={(e) => setFbMessage(e.target.value)} placeholder="আপনার মতামত লিখুন..." rows={4} required />
                                </div>
                                <button type="submit" className="series-feedback-submit-btn" disabled={fbLoading}>
                                    {fbLoading ? 'পাঠানো হচ্ছে...' : 'জমা দিন'}
                                </button>
                            </form>
                        )}
                    </div>
                </div>
            )}
        </article>
    );
};

export default SeriesDetailPage;
