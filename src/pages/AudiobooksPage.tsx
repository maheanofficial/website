import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import {
    ArrowUpRight,
    BookOpenText,
    ExternalLink,
    Headphones,
    Mic2,
    PlayCircle,
    Sparkles
} from 'lucide-react';

import SEO from '../components/SEO';
import SmartImage from '../components/SmartImage';
import { toBanglaNumber } from '../utils/numberFormatter';
import { buildCategoryFilterPath } from '../utils/storyFilters';
import { getCachedStories, getStories, type Story } from '../utils/storyManager';
import './AudiobooksPage.css';

type ListeningDestination = {
    title: string;
    handle: string;
    description: string;
    href: string;
    accentClass: string;
};

type ListenerStep = {
    title: string;
    description: string;
    icon: ReactNode;
};

type StoryInsight = {
    story: Story;
    path: string;
    timestamp: number;
    minutes: number;
    parts: number;
    views: number;
    score: number;
};

type CategoryInsight = {
    name: string;
    count: number;
    minutes: number;
    samplePath: string;
};

const LISTENING_DESTINATIONS: ListeningDestination[] = [
    {
        title: 'মূল অডিওবুক চ্যানেল',
        handle: '@banglaaudiobooks.mahean',
        description: 'নিয়মিত নতুন অডিওবুক আর ধারাবাহিক গল্প শুনতে এই চ্যানেলটা দিয়ে শুরু করলেই সবচেয়ে সুবিধা হবে।',
        href: 'https://www.youtube.com/@banglaaudiobooks.mahean',
        accentClass: 'is-crimson'
    },
    {
        title: 'বাংলাদেশি বই ও গল্প',
        handle: '@maheanstoryvoice',
        description: 'দেশি গল্প-উপন্যাস, সম্পর্কের গল্প আর মন ছুঁয়ে যাওয়া সিরিজগুলো এক জায়গায় পাবেন।',
        href: 'https://www.youtube.com/@maheanstoryvoice',
        accentClass: 'is-amber'
    },
    {
        title: 'অনুবাদ ও বিশ্বসাহিত্য',
        handle: '@audiobookswithmahean',
        description: 'বাছাই করা অনুবাদ আর বিশ্বসাহিত্যের গল্প শান্তভাবে শুনতে চাইলে এই চ্যানেলটা ভালো।',
        href: 'https://www.youtube.com/@audiobookswithmahean',
        accentClass: 'is-cyan'
    },
    {
        title: 'আর্কাইভ সংগ্রহ',
        handle: '@MaheanAhmedTheLostStories',
        description: 'পুরোনো আপলোড, হারিয়ে যাওয়া পর্ব আর আর্কাইভের বিশেষ কনটেন্টের জন্য এই কর্নার।',
        href: 'https://www.youtube.com/@MaheanAhmedTheLostStories',
        accentClass: 'is-violet'
    }
];

const LISTENER_STEPS: ListenerStep[] = [
    {
        title: 'আজকের পছন্দ দিয়ে শুরু',
        description: 'প্রথমেই কিছু ভালো ও বেশি শোনা গল্প দেখানো আছে, তাই কী শুনবেন সেটা দ্রুত ঠিক করা যায়।',
        icon: <Sparkles size={18} />
    },
    {
        title: 'সময় মিলিয়ে শুনুন',
        description: 'আপনার হাতে যতটা সময় আছে, সেই অনুযায়ী ছোট বা বড় গল্প বেছে নিতে পারবেন।',
        icon: <Headphones size={18} />
    },
    {
        title: 'এক ক্লিকে শোনা শুরু',
        description: 'পছন্দের চ্যানেলে সঙ্গে সঙ্গে গিয়ে পর্ব চালু করা যায়, মাঝপথে ঝামেলা হয় না।',
        icon: <Mic2 size={18} />
    }
];

const getStoryPath = (story: Story) => `/stories/${story.slug || story.id}`;

const getStoryTimestamp = (story: Story) => {
    const updatedAt = Date.parse(story.updatedAt || '');
    if (Number.isFinite(updatedAt)) return updatedAt;
    const date = Date.parse(story.date || '');
    if (Number.isFinite(date)) return date;
    return 0;
};

const estimateStoryMinutes = (story: Story) => {
    const configuredReadTime = Number.parseInt(String(story.readTime || '').replace(/[^\d]/g, ''), 10);
    if (Number.isFinite(configuredReadTime) && configuredReadTime > 0) {
        return configuredReadTime;
    }

    const sourceText = Array.isArray(story.parts) && story.parts.length > 0
        ? story.parts.map((part) => part.content || '').join(' ')
        : `${story.content || ''} ${story.excerpt || ''}`;
    const wordCount = sourceText.split(/\s+/).filter(Boolean).length;
    return Math.max(1, Math.ceil(wordCount / 220));
};

const truncateText = (value?: string, limit = 150) => {
    const normalized = String(value || '').trim();
    if (!normalized) return '';
    if (normalized.length <= limit) return normalized;
    return `${normalized.slice(0, Math.max(0, limit - 1)).trim()}...`;
};

const formatListeningHours = (totalMinutes: number) => {
    const hours = totalMinutes / 60;
    const rounded = hours >= 10 ? Math.round(hours) : Math.round(hours * 10) / 10;
    return toBanglaNumber(String(rounded));
};

const formatMinuteBadge = (minutes: number) => {
    if (minutes >= 60) {
        return `${formatListeningHours(minutes)} ঘণ্টা`;
    }
    return `${toBanglaNumber(minutes)} মিনিট`;
};

const AudiobooksPage = () => {
    const [stories, setStories] = useState<Story[]>(() => getCachedStories());

    useEffect(() => {
        let isMounted = true;

        const loadStories = async () => {
            try {
                const data = await getStories();
                if (!isMounted) return;
                setStories(data);
            } catch (error) {
                if (!isMounted) return;
                console.warn('Failed to load audiobooks page stories.', error);
            }
        };

        void loadStories();

        return () => {
            isMounted = false;
        };
    }, []);

    const storyInsights = useMemo<StoryInsight[]>(() => stories.map((story) => {
        const timestamp = getStoryTimestamp(story);
        const minutes = estimateStoryMinutes(story);
        const parts = Math.max(1, story.parts?.length || 1);
        const views = story.views || 0;
        const featuredBoost = story.is_featured ? 10_000 : 0;
        const freshnessBoost = Math.min(4_000, Math.max(0, timestamp / 50_000_000));
        const score = featuredBoost + (views * 2.2) + (parts * 58) + (minutes * 7) + freshnessBoost;
        return {
            story,
            path: getStoryPath(story),
            timestamp,
            minutes,
            parts,
            views,
            score
        };
    }), [stories]);

    const rankedStories = useMemo(() => [...storyInsights]
        .sort((left, right) => right.score - left.score), [storyInsights]);

    const latestStories = useMemo(() => [...storyInsights]
        .sort((left, right) => right.timestamp - left.timestamp)
        .slice(0, 6), [storyInsights]);

    const marathonStories = useMemo(() => [...storyInsights]
        .sort((left, right) => {
            const partDelta = right.parts - left.parts;
            if (partDelta !== 0) return partDelta;
            const minuteDelta = right.minutes - left.minutes;
            if (minuteDelta !== 0) return minuteDelta;
            return right.timestamp - left.timestamp;
        })
        .slice(0, 5), [storyInsights]);

    const trendingStories = useMemo(() => [...storyInsights]
        .sort((left, right) => {
            const viewsDelta = right.views - left.views;
            if (viewsDelta !== 0) return viewsDelta;
            return right.timestamp - left.timestamp;
        })
        .slice(0, 5), [storyInsights]);

    const spotlightStory = rankedStories[0] || null;
    const quickStartStories = rankedStories
        .filter((item) => item.story.id !== spotlightStory?.story.id)
        .slice(0, 5);

    const categoryInsights = useMemo<CategoryInsight[]>(() => {
        const categoryMap = new Map<string, { count: number; minutes: number; sample?: StoryInsight }>();

        storyInsights.forEach((insight) => {
            const candidates = (insight.story.categories && insight.story.categories.length > 0
                ? insight.story.categories
                : [insight.story.category || 'অডিওগল্প'])
                .map((value) => String(value || '').trim())
                .filter(Boolean);

            const uniqueCategories = new Set(candidates.length > 0 ? candidates : ['অডিওগল্প']);
            uniqueCategories.forEach((category) => {
                const current = categoryMap.get(category) || { count: 0, minutes: 0, sample: undefined };
                current.count += 1;
                current.minutes += insight.minutes;
                if (!current.sample || insight.score > current.sample.score) {
                    current.sample = insight;
                }
                categoryMap.set(category, current);
            });
        });

        return [...categoryMap.entries()]
            .map(([name, value]) => ({
                name,
                count: value.count,
                minutes: value.minutes,
                samplePath: value.sample?.path || '/stories'
            }))
            .sort((left, right) => right.count - left.count || right.minutes - left.minutes)
            .slice(0, 8);
    }, [storyInsights]);

    const jsonLd = useMemo(() => ({
        '@context': 'https://schema.org',
        '@type': 'CollectionPage',
        name: 'Mahean Ahmed Audiobooks',
        description: 'মেহেদী আহমেদের বাংলা অডিওবুক, ধারাবাহিক গল্পপাঠ এবং বাছাই করা শোনার সংগ্রহ।',
        url: 'https://www.mahean.com/audiobooks',
        hasPart: rankedStories.slice(0, 8).map((item, index) => ({
            '@type': 'CreativeWork',
            position: index + 1,
            name: item.story.title,
            url: `https://www.mahean.com${item.path}`
        }))
    }), [rankedStories]);

    const renderStoryRow = (item: StoryInsight, railName: string) => (
        <Link key={`${railName}-${item.story.id}`} to={item.path} className="audiobooks-story-row">
            <div className="audiobooks-story-row-thumb">
                <SmartImage
                    src={item.story.cover_image || item.story.image}
                    alt={item.story.title}
                    className="audiobooks-story-row-thumb-image"
                    showFullText={false}
                />
            </div>

            <div className="audiobooks-story-row-copy">
                <strong>{item.story.title}</strong>
                <span>{item.story.author || 'Mahean Ahmed'}</span>
            </div>

            <div className="audiobooks-story-row-meta">
                <span>{toBanglaNumber(item.parts)} পর্ব</span>
                <span>{formatMinuteBadge(item.minutes)}</span>
            </div>
        </Link>
    );

    return (
        <>
            <SEO
                title="অডিওবুক লাইব্রেরি - Mahean Ahmed"
                description="বাংলা অডিওবুক শোনার জন্য গোছানো একটি পেজ। পছন্দের গল্প, ধারাবাহিক সিরিজ, নতুন সংযোজন আর দ্রুত শোনার লিংক একসাথে।"
                keywords="Bangla Audiobook, Bengali Audiobook, Audio Story, Mahean Ahmed, Listening Hub, Serialized Bangla Story"
                canonicalUrl="https://www.mahean.com/audiobooks"
                ogUrl="https://www.mahean.com/audiobooks"
                jsonLd={jsonLd}
            />

            <div className="audiobooks-page page-offset">
                <section className="section audiobooks-premium-hero">
                    <div className="container">
                        <div className="audiobooks-hero-shell">
                            <div className="audiobooks-hero-main">
                                <h1>বাংলা অডিওবুক শোনার জন্য গোছানো, আরামদায়ক একটা জায়গা</h1>
                                <p className="audiobooks-hero-text">
                                    নতুন কিছু শুনতে চাইলে, বা পুরোনো প্রিয় গল্পে ফিরতে চাইলে এখান থেকেই শুরু করতে পারেন।
                                    গল্প বাছাই, সময় ধরে তালিকা, আর চ্যানেলে যাওয়ার পথ সব এক জায়গায় রাখা হয়েছে।
                                </p>

                                <div className="audiobooks-hero-actions">
                                    <a
                                        href={LISTENING_DESTINATIONS[0].href}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="btn btn-primary"
                                    >
                                        <PlayCircle size={18} />
                                        <span>এখনই শোনা শুরু করুন</span>
                                    </a>

                                    <Link to="/stories" className="audiobooks-outline-button">
                                        <BookOpenText size={18} />
                                        <span>সব গল্পের লাইব্রেরি দেখুন</span>
                                    </Link>
                                </div>

                            </div>

                            <aside className="audiobooks-hero-aside">
                                <article className="audiobooks-spotlight-card">
                                    <div className="audiobooks-spotlight-header">
                                        <span className="audiobooks-spotlight-chip">
                                            <Sparkles size={13} />
                                            <span>আজকের গল্প</span>
                                        </span>
                                        <p className="audiobooks-spotlight-subtitle">
                                            আজকের শোনার জন্য পেজের সেরা পছন্দ
                                        </p>
                                    </div>
                                    {spotlightStory ? (
                                        <>
                                            <Link to={spotlightStory.path} className="audiobooks-spotlight-media">
                                                <SmartImage
                                                    src={spotlightStory.story.cover_image || spotlightStory.story.image}
                                                    alt={spotlightStory.story.title}
                                                    className="audiobooks-spotlight-image"
                                                    showFullText={true}
                                                />
                                            </Link>

                                            <div className="audiobooks-spotlight-copy">
                                                <Link to={spotlightStory.path} className="audiobooks-spotlight-title">
                                                    {spotlightStory.story.title}
                                                </Link>
                                                <p>
                                                    {truncateText(spotlightStory.story.excerpt || spotlightStory.story.content, 165)}
                                                </p>
                                                <div className="audiobooks-spotlight-meta">
                                                    <span>{spotlightStory.story.author || 'Mahean Ahmed'}</span>
                                                    <span>{toBanglaNumber(spotlightStory.parts)} পর্ব</span>
                                                    <span>{formatMinuteBadge(spotlightStory.minutes)}</span>
                                                </div>
                                                <Link to={spotlightStory.path} className="audiobooks-inline-link">
                                                    <span>এই গল্পে ঢুকুন</span>
                                                    <ArrowUpRight size={16} />
                                                </Link>
                                            </div>
                                        </>
                                    ) : (
                                        <div className="audiobooks-spotlight-empty">
                                            <Headphones size={28} />
                                            <p>নতুন গল্প প্রকাশ হলেই এই জায়গায় আজকের গল্প দেখাবে।</p>
                                        </div>
                                    )}
                                </article>

                                <div className="audiobooks-hero-mini-grid">
                                    <Link to="/links" className="audiobooks-mini-panel">
                                        <span className="audiobooks-mini-panel-icon">
                                            <Headphones size={16} />
                                        </span>
                                        <strong>{toBanglaNumber(LISTENING_DESTINATIONS.length)}</strong>
                                        <span className="audiobooks-mini-panel-title">শোনার চ্যানেল</span>
                                        <span className="audiobooks-mini-panel-copy">যে মুড, সে অনুযায়ী চ্যানেল বেছে শুনুন</span>
                                    </Link>
                                    <Link to="/categories" className="audiobooks-mini-panel is-secondary">
                                        <span className="audiobooks-mini-panel-icon">
                                            <BookOpenText size={16} />
                                        </span>
                                        <strong>{toBanglaNumber(categoryInsights.length)}</strong>
                                        <span className="audiobooks-mini-panel-title">গল্পের বিভাগ</span>
                                        <span className="audiobooks-mini-panel-copy">পছন্দের বিভাগ ধরে দ্রুত গল্পে ঢুকে পড়ুন</span>
                                    </Link>
                                </div>
                            </aside>
                        </div>
                    </div>
                </section>

                <section className="section audiobooks-command-section">
                    <div className="container audiobooks-command-grid">
                        <div className="audiobooks-channel-panel">
                            <div className="audiobooks-section-head">
                                <span className="audiobooks-section-chip">শুনবেন কোথায়</span>
                                <h2>যে চ্যানেল চাই, সেটাই দ্রুত খুঁজে নিন</h2>
                                <p>প্রতিটি চ্যানেলের কাজ আলাদা করে সাজানো, তাই গল্পের ধরন বুঝে সরাসরি চলে যেতে পারবেন।</p>
                            </div>

                            <div className="audiobooks-destination-grid">
                                {LISTENING_DESTINATIONS.map((destination) => (
                                    <a
                                        key={destination.title}
                                        href={destination.href}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className={`audiobooks-destination-card ${destination.accentClass}`}
                                    >
                                        <div className="audiobooks-destination-topline">
                                            <span>{destination.handle}</span>
                                            <ExternalLink size={16} />
                                        </div>
                                        <h3>{destination.title}</h3>
                                        <p>{destination.description}</p>
                                        <span className="audiobooks-inline-link">
                                            <span>চ্যানেল খুলুন</span>
                                            <ArrowUpRight size={16} />
                                        </span>
                                    </a>
                                ))}
                            </div>
                        </div>

                        <aside className="audiobooks-journey-panel">
                            <div className="audiobooks-section-head is-compact">
                                <span className="audiobooks-section-chip">শুরু করার ধাপ</span>
                                <h2>নতুন শ্রোতার জন্য সহজ শুরু</h2>
                                <p>প্রথমবার আসলেও যেন সহজে গল্প খুঁজে শুনতে পারেন, সেই ভাবনায় এই অংশগুলো সাজানো।</p>
                            </div>

                            <div className="audiobooks-journey-list">
                                {LISTENER_STEPS.map((step, index) => (
                                    <article key={step.title} className="audiobooks-journey-step">
                                        <span className="audiobooks-journey-index">{toBanglaNumber(index + 1)}</span>
                                        <span className="audiobooks-journey-icon">{step.icon}</span>
                                        <div>
                                            <h3>{step.title}</h3>
                                            <p>{step.description}</p>
                                        </div>
                                    </article>
                                ))}
                            </div>
                        </aside>
                    </div>
                </section>

                <section className="section audiobooks-library-section">
                    <div className="container">
                        <div className="audiobooks-section-head">
                            <span className="audiobooks-section-chip">পছন্দের তালিকা</span>
                            <h2>সেরা গল্প, দীর্ঘ সিরিজ আর নতুন সংযোজন একসাথে</h2>
                            <p>কম সময়, বেশি সময় বা শুধু নতুন গল্প, যা চাইবেন সেভাবেই বেছে নিতে পারবেন।</p>
                        </div>

                        <div className="audiobooks-library-grid">
                            <article className="audiobooks-rail-card">
                                <header>
                                    <h3>শুরু করুন এখান থেকে</h3>
                                    <span>যারা নতুন শুনবেন তাদের জন্য</span>
                                </header>
                                <div className="audiobooks-story-rail">
                                    {quickStartStories.length > 0
                                        ? quickStartStories.map((item) => renderStoryRow(item, 'quick'))
                                        : <p className="audiobooks-empty-copy">এই মুহূর্তে দেখানোর মতো গল্প পাওয়া যায়নি।</p>}
                                </div>
                            </article>

                            <article className="audiobooks-rail-card">
                                <header>
                                    <h3>দীর্ঘ ধারাবাহিক</h3>
                                    <span>একটানা শুনতে চাইলে</span>
                                </header>
                                <div className="audiobooks-story-rail">
                                    {marathonStories.length > 0
                                        ? marathonStories.map((item) => renderStoryRow(item, 'marathon'))
                                        : <p className="audiobooks-empty-copy">নতুন বহু-পর্বের সিরিজ এলে এখানে দেখাবে।</p>}
                                </div>
                            </article>

                            <article className="audiobooks-rail-card">
                                <header>
                                    <h3>নতুন ও আলোচিত</h3>
                                    <span>সাম্প্রতিক ও বেশি শোনা গল্প</span>
                                </header>
                                <div className="audiobooks-story-rail">
                                    {(latestStories.length > 0 ? latestStories : trendingStories)
                                        .slice(0, 5)
                                        .map((item) => renderStoryRow(item, 'fresh'))}
                                    {latestStories.length === 0 && trendingStories.length === 0 ? (
                                        <p className="audiobooks-empty-copy">নতুন গল্প যোগ হলে তালিকাটা আপডেট হবে।</p>
                                    ) : null}
                                </div>
                            </article>
                        </div>
                    </div>
                </section>

                <section className="section audiobooks-categories-section">
                    <div className="container">
                        <div className="audiobooks-categories-shell">
                            <div className="audiobooks-section-head is-compact">
                                <span className="audiobooks-section-chip">বিভাগ ধরে খুঁজুন</span>
                                <h2>মনের মতো গল্প বেছে নিন</h2>
                                <p>ভৌতিক, প্রেম, রহস্য বা অন্য যেকোনো বিভাগ থেকে এক ক্লিকেই ঢুকে পড়ুন।</p>
                            </div>

                            <div className="audiobooks-category-grid">
                                {categoryInsights.length > 0 ? (
                                    categoryInsights.map((category) => (
                                        <article key={category.name} className="audiobooks-category-card">
                                            <Link to={buildCategoryFilterPath(category.name)} className="audiobooks-category-main-link">
                                                <strong>{category.name}</strong>
                                                <span>{toBanglaNumber(category.count)}টি গল্প</span>
                                                <span>{formatMinuteBadge(category.minutes)} মোট শোনার সময়</span>
                                            </Link>
                                            <Link to={category.samplePath} className="audiobooks-inline-link audiobooks-category-story-link">
                                                <span>জনপ্রিয় গল্প খুলুন</span>
                                                <ArrowUpRight size={16} />
                                            </Link>
                                        </article>
                                    ))
                                ) : (
                                    <p className="audiobooks-empty-copy">বিভাগের তথ্য পাওয়া গেলে এখানে কার্ড দেখা যাবে।</p>
                                )}
                            </div>
                        </div>
                    </div>
                </section>

                <section className="section audiobooks-premium-cta">
                    <div className="container">
                        <div className="audiobooks-cta-shell">
                            <div>
                                <span className="audiobooks-section-chip">আরও পড়ুন</span>
                                <h2>শুনুন, তারপর চাইলে পড়ে দেখুন</h2>
                                <p>
                                    শোনার পর যদি গল্পটা পড়েও দেখতে চান, এখান থেকে সরাসরি গল্পের লাইব্রেরিতে যেতে পারবেন।
                                </p>
                            </div>

                            <div className="audiobooks-cta-actions">
                                <a
                                    href={LISTENING_DESTINATIONS[1].href}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="btn btn-primary"
                                >
                                    <PlayCircle size={18} />
                                    <span>বাংলাদেশি গল্প শুনুন</span>
                                </a>

                                <Link to="/stories" className="audiobooks-outline-button">
                                    <span>সব গল্প দেখুন</span>
                                    <ArrowUpRight size={16} />
                                </Link>
                            </div>
                        </div>
                    </div>
                </section>
            </div>
        </>
    );
};

export default AudiobooksPage;
