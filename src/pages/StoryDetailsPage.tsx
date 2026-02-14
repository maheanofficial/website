import { useParams, Link, useNavigate, useLocation } from 'react-router-dom';
import { useEffect, useState, useRef } from 'react';
import { ChevronDown, ChevronRight, ArrowLeft, Calendar, Eye, MessageCircle, BookOpen } from 'lucide-react';
import { getStories, incrementViews, type Story } from '../utils/storyManager';
import { getAuthorByName, type Author } from '../utils/authorManager';
import { formatLongDate } from '../utils/dateFormatter';
import { toBanglaNumber } from '../utils/numberFormatter';
import { SITE_URL, DEFAULT_OG_IMAGE } from '../utils/siteMeta';
import SmartImage from '../components/SmartImage';
import SEO from '../components/SEO';
import AdComponent from '../components/AdComponent';
import AudioPlayer from '../components/AudioPlayer';
import './StoryDetailsPage.css';

const StoryDetailsPage = () => {
    // Routes can be /stories/:id or /stories/:slug
    // We also might want /stories/:slug/part/:partNumber in future, 
    // but for now let's handle basic view and internal state for parts
    const navigate = useNavigate();
    const location = useLocation();
    const { id, partNumber } = useParams<{ id: string; partNumber?: string }>();
    const [story, setStory] = useState<Story | null>(null);
    const [authorDetails, setAuthorDetails] = useState<Author | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [currentPartNumber, setCurrentPartNumber] = useState(() => {
        const parsed = Number.parseInt(partNumber || '', 10);
        if (!Number.isFinite(parsed) || parsed <= 0) return 1;
        return parsed;
    });
    const [showPartsList, setShowPartsList] = useState(false);
    const [readingProgress, setReadingProgress] = useState(0);
    const contentRef = useRef<HTMLDivElement>(null);

    const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);
    const parseRequestedPartNumber = (value?: string) => {
        const parsed = Number.parseInt(value || '', 10);
        if (!Number.isFinite(parsed) || parsed <= 0) return null;
        return parsed;
    };
    const normalizeStory = (entry: Story): Story => {
        if (entry.parts && entry.parts.length > 0) return entry;
        return {
            ...entry,
            parts: [{ id: '1', title: 'পর্ব ১', content: entry.content }]
        };
    };

    useEffect(() => {
        let isMounted = true;
        const loadStory = async () => {
            if (isMounted) setIsLoading(true);
            const stories = await getStories();
            // Try to find by ID or Slug
            const foundStory = stories.find(s => s.id.toString() === id || s.slug === id);
            if (!foundStory) {
                if (isMounted) {
                    setStory(null);
                    setIsLoading(false);
                }
                return;
            }

            const normalized = normalizeStory(foundStory);
            // Session guard to prevent double counting on refresh/StrictMode
            const viewKey = `viewed_story_${normalized.id}`;
            const hasViewedInSession = sessionStorage.getItem(viewKey);

            if (!hasViewedInSession) {
                await incrementViews(normalized.id);
                sessionStorage.setItem(viewKey, 'true');
                // Re-fetch to get the updated count in UI
                const updatedStories = await getStories();
                const refreshedStory = updatedStories.find(s => s.id === normalized.id);
                if (isMounted) {
                    setStory(normalizeStory(refreshedStory || normalized));
                    setIsLoading(false);
                }
            } else if (isMounted) {
                setStory(normalized);
                setIsLoading(false);
            }
        };

        loadStory();
        return () => {
            isMounted = false;
        };
    }, [id]);

    useEffect(() => {
        if (!story) return;
        const storyId = String(story.id || '').trim();
        const storySlug = (story.slug || '').trim();
        const baseSegment = storySlug || storyId || id;
        if (!baseSegment) return;

        const totalParts = Math.max(1, story.parts?.length || 0);
        const requestedPart = parseRequestedPartNumber(partNumber) ?? 1;
        const safePart = clamp(requestedPart, 1, totalParts);

        if (currentPartNumber !== safePart) {
            setCurrentPartNumber(safePart);
        }

        const desiredPath = `/stories/${encodeURIComponent(baseSegment)}/part/${safePart}`;
        if (decodeURI(location.pathname) !== decodeURI(desiredPath)) {
            navigate(desiredPath, { replace: true });
        }
    }, [story, id, partNumber, location.pathname, navigate, currentPartNumber]);

    const goToPart = (nextPartNumber: number) => {
        if (!story) return;
        const totalParts = Math.max(1, story.parts?.length || 0);
        const safePart = clamp(nextPartNumber, 1, totalParts);
        const baseSegment = (story.slug || String(story.id || '')).trim() || id;
        if (!baseSegment) return;
        navigate(`/stories/${encodeURIComponent(baseSegment)}/part/${safePart}`);
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
        window.scrollTo(0, 0);
    }, [id, currentPartNumber]);

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
    }, [currentPartNumber]);

    if (isLoading) {
        return (
            <div className="container py-20 text-center">
                <h2 className="text-2xl text-white mb-4">à¦—à¦²à§à¦ªà¦Ÿà¦¿ à¦²à§‹à¦¡ à¦¹à¦šà§à¦›à§‡...</h2>
                <p className="text-gray-400">à¦…à¦¨à§à¦—à§à¦°à¦¹ à¦•à¦°à§‡ à¦•à¦¿à¦›à§ à¦•à§à¦·à¦£ à¦…à¦ªà§‡à¦•à§à¦·à¦¾ à¦•à¦°à§à¦¨à¥¤</p>
            </div>
        );
    }

    if (!story) {
        return (
            <div className="container py-20 text-center">
                <h2 className="text-2xl text-white mb-4">গল্পটি লোড করতে সমস্যা হচ্ছে!</h2>
                <p className="text-gray-400 mb-6">গল্পের ডেটা খুঁজে পাওয়া যায়নি।</p>
                <button
                    onClick={() => {
                        localStorage.clear();
                        window.location.reload();
                    }}
                    className="btn btn-primary bg-red-600 hover:bg-red-700"
                >
                    Reset & Reload
                </button>
                <br /><br />
                <Link to="/stories" className="text-blue-400 hover:underline">তালিকায় ফিরে যান</Link>
            </div>
        );
    }

    const parts = story.parts ?? [];
    const totalParts = Math.max(1, parts.length);
    const activePartNumber = clamp(currentPartNumber, 1, totalParts);
    const currentPart = parts[activePartNumber - 1] || parts[0];

    if (!currentPart) {
        return null;
    }

    const nextPartNumber = activePartNumber < totalParts ? activePartNumber + 1 : null;
    const prevPartNumber = activePartNumber > 1 ? activePartNumber - 1 : null;
    // Author Details
    const baseSegment = story.slug || story.id;
    const storyPath = `/stories/${encodeURIComponent(baseSegment)}/part/${activePartNumber}`;
    const canonicalUrl = `${SITE_URL}${storyPath}`;
    const ogImage = story.cover_image || story.image || DEFAULT_OG_IMAGE;
    const articleImage = ogImage.startsWith('http') ? ogImage : `${SITE_URL}${ogImage}`;

    // Format content with simplistic formatter matching demo
    const escapeHtml = (raw: string) => raw
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');

    const renderFormattedText = (text: string) => {
        // Escape user content first, then apply limited formatting markers.
        const safeText = escapeHtml(text);
        const formattedText = safeText
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/~(.*?)~/g, '<span style="opacity: 0.7;">$1</span>')
            .replace(/^> (.*$)/gm, '<blockquote>$1</blockquote>')
            .replace(/^# (.*$)/gm, '<h3>$1</h3>')
            .replace(/\n/g, '<br>');

        return { __html: formattedText };
    };

    const partLabel = currentPart.title?.trim()
        ? currentPart.title.trim()
        : `পর্ব ${toBanglaNumber(activePartNumber)}`;
    const seoTitle = `${story.title} - ${partLabel}`;

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
                "url": `${SITE_URL}/logo.png`
            }
        },
        "description": currentPart.content.substring(0, 160) + '...',
        "articleBody": currentPart.content.substring(0, 1000),
        "inLanguage": "bn"
    };
    const storyTags = (story.tags || []).filter(Boolean);
    const seoKeywords = [
        story.category,
        ...storyTags,
        'বাংলা গল্প',
        story.author,
        'Bangla Story',
        'Thriller',
        'Suspense'
    ].filter(Boolean).join(', ');
    const toTagLabel = (tag: string) => (tag.startsWith('#') ? tag : `#${tag}`);
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
                description={currentPart.content.substring(0, 160) + '...'}
                keywords={seoKeywords}
                ogType="article"
                author={story.author}
                ogImage={ogImage}
                imageAlt={story.title}
                canonicalUrl={canonicalUrl}
                publishedTime={story.date}
                modifiedTime={story.date}
                jsonLd={articleSchema}
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
                    />
                </div>

                {/* Story Info Box */}
                <div className="story-info-box">
                    <div className="story-categories">
                        <span className="category-badge">{story.category}</span>
                        {storyTags.length > 0 && (
                            <div className="story-tags-inline">
                                {storyTags.map((tag) => {
                                    const normalized = tag.startsWith('#') ? tag.slice(1) : tag;
                                    return (
                                        <Link key={`${story.id}-${tag}`} to={`/stories?tag=${encodeURIComponent(normalized)}`} className="tag">
                                            {toTagLabel(tag)}
                                        </Link>
                                    );
                                })}
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
                                    <div className="author-role">লেখক (সকল গল্প পড়ুন)</div>
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
                                <span className="stat-value">{toBanglaNumber(story.comments || 0)}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Parts Navigation Controls */}
                <div className="parts-navigation-box">
                    <div className="parts-header">
                        <h2 className="current-part-title">
                            {currentPart.title || `পর্ব ${toBanglaNumber(activePartNumber)}`}
                            <span className="part-counter">({toBanglaNumber(activePartNumber)}/{toBanglaNumber(totalParts)})</span>
                        </h2>

                        <button
                            className="parts-toggle-btn"
                            onClick={() => setShowPartsList(!showPartsList)}
                        >
                            <BookOpen className="icon-sm" />
                            <span>সব পর্ব</span>
                            <ChevronDown className={`icon-sm transition-transform ${showPartsList ? 'rotate-180' : ''}`} />
                        </button>
                    </div>

                    {showPartsList && (
                        <div className="parts-dropdown-grid">
                            {parts.map((_, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => {
                                        goToPart(idx + 1);
                                        setShowPartsList(false);
                                    }}
                                    className={`part-grid-item ${idx + 1 === activePartNumber ? 'active' : ''}`}
                                >
                                    {idx + 1}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Top Ad */}
                <AdComponent slot="story-top-ad" format="horizontal" />

                {/* Audio Player (If available) - For now showing placeholder if no audio prop */}
                {/* Audio Player (If available) - For now showing placeholder if no audio prop */}
                <div className="mb-8">
                    <AudioPlayer
                        src="" // Empty src triggers TTS mode if text is provided
                        text={currentPart.content}
                        title={`${story.title} - পর্ব ${toBanglaNumber(activePartNumber)}`}
                        cover={story.cover_image || story.image}
                    />
                </div>

                {/* Story Content */}
                <div className="story-content-container" ref={contentRef}>
                    <div
                        className="story-prose"
                        dangerouslySetInnerHTML={renderFormattedText(currentPart.content)}
                    />
                </div>

                <div className="story-report-box">
                    <p className="story-report-text">
                        Found policy-violating or copyright-problematic content?
                    </p>
                    <a href={reportIssueMailto} className="story-report-link">
                        Report this story
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
                            <span>পূর্ববর্তী পর্ব</span>
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
                            <span>পরবর্তী পর্ব</span>
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
