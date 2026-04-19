import { useState, useEffect, useMemo } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { Search, Filter, Calendar, PenTool, ChevronRight, Sparkles, TrendingUp } from 'lucide-react';
import SkeletonCard from '../components/SkeletonCard';
import StoryCard from '../components/StoryCard';
import StoryCarousel from '../components/StoryCarousel';
import AuthorsGrid from '../components/AuthorsGrid';
import Pagination from '../components/Pagination';
import SmartImage from '../components/SmartImage';
import { getCachedStories, getStories, type Story } from '../utils/storyManager';
import { getAllAuthors, type Author } from '../utils/authorManager';
import { buildAuthPageLink } from '../utils/authRedirect';
import { toBanglaNumber } from '../utils/numberFormatter';
import { getReaderSession } from '../utils/readerExperience';
import SEO from '../components/SEO';
import AdComponent from '../components/AdComponent';
import { SITE_URL } from '../utils/siteMeta';
import {
    matchesCategoryFilter,
    matchesTagFilter,
    normalizeCategoryFilterList,
    normalizeCategoryFilterValue,
    normalizeTagFilterKey,
    normalizeTagFilterValue
} from '../utils/storyFilters';
import './StoriesPage.css';

const STORIES_PER_PAGE = 12;

const getStoryPath = (story: Story) => `/stories/${story.slug || story.id}`;

const estimateStoryReadMinutes = (story: Story) => {
    const configuredReadTime = Number.parseInt(String(story.readTime || '').replace(/[^\d]/g, ''), 10);
    if (Number.isFinite(configuredReadTime) && configuredReadTime > 0) {
        return configuredReadTime;
    }

    const content = Array.isArray(story.parts) && story.parts.length > 0
        ? story.parts.map((part) => part.content || '').join(' ')
        : `${story.content || ''} ${story.excerpt || ''}`;

    const wordCount = content.split(/\s+/).filter(Boolean).length;
    return Math.max(1, Math.ceil(wordCount / 220));
};

export default function StoriesPage() {
    const location = useLocation();
    const readerSession = getReaderSession();
    const canonicalUrl = useMemo(() => {
        const params = new URLSearchParams(location.search);
        const canonicalParams = new URLSearchParams();
        const author = params.get('author')?.trim();
        const tag = normalizeTagFilterValue(params.get('tag'));
        const category = normalizeCategoryFilterValue(params.get('category'));

        // Keep canonical focused on content-defining filters only.
        if (author) {
            canonicalParams.set('author', author);
        } else if (tag) {
            canonicalParams.set('tag', tag);
        } else if (category && category !== 'all') {
            canonicalParams.set('category', category);
        }

        const query = canonicalParams.toString();
        return `${SITE_URL}/stories${query ? `?${query}` : ''}`;
    }, [location.search]);
    const [stories, setStories] = useState<Story[]>(() => getCachedStories());
    const [authors, setAuthors] = useState<Author[]>([]);

    // Search and Filter State
    const [searchQuery, setSearchQuery] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    // sortBy is now declared below with urlParams logic

    // Get category and sort from URL params
    const urlParams = new URLSearchParams(location.search);
    const categoryFromUrl = normalizeCategoryFilterValue(urlParams.get('category')) || 'all';
    const sortFromUrl = urlParams.get('sort') || 'latest';
    const tabFromUrl = urlParams.get('tab');
    const tagFromUrl = normalizeTagFilterValue(urlParams.get('tag')) || null;
    const authorFromUrl = urlParams.get('author')?.trim() || null;
    const defaultCategoryForPage = authorFromUrl || tagFromUrl ? 'all' : categoryFromUrl;

    const [authorFilter, setAuthorFilter] = useState<string | null>(authorFromUrl);
    const [selectedCategory, setSelectedCategory] = useState(defaultCategoryForPage);
    const [sortBy, setSortBy] = useState(sortFromUrl);
    const [activeTab, setActiveTab] = useState(tabFromUrl || 'all');
    const [tagFilter, setTagFilter] = useState<string | null>(tagFromUrl);
    const hasActiveFilters = Boolean(
        searchQuery ||
        selectedCategory !== defaultCategoryForPage ||
        authorFilter !== authorFromUrl ||
        tagFilter !== tagFromUrl
    );

    useEffect(() => {
        let isMounted = true;
        const loadData = async () => {
            const [storyData, authorData] = await Promise.all([getStories(), getAllAuthors()]);
            if (isMounted) {
                setStories(storyData);
                setAuthors(authorData);
            }
        };
        loadData();
        return () => {
            isMounted = false;
        };
    }, []);

    useEffect(() => {
        const syncFiltersId = window.setTimeout(() => {
            const params = new URLSearchParams(location.search);
            const author = params.get('author')?.trim() || null;
            const sort = params.get('sort');
            const tab = params.get('tab');
            const tag = normalizeTagFilterValue(params.get('tag')) || null;
            const category = normalizeCategoryFilterValue(params.get('category')) || 'all';

            setAuthorFilter(author);
            setActiveTab(tab || 'all');
            setTagFilter(tag);

            setSortBy(sort || 'latest');

            if (author || tag) {
                setSelectedCategory('all');
            } else {
                setSelectedCategory(category);
            }
            setCurrentPage(1);
            window.scrollTo(0, 0);
        }, 0);

        return () => {
            window.clearTimeout(syncFiltersId);
        };
    }, [location.search]);

    // Derived Data
    const categories = useMemo(() => {
        const uniqueCategories = new Map<string, string>();

        stories.forEach((story) => {
            normalizeCategoryFilterList(story.categories, story.category).forEach((category) => {
                const categoryKey = category.toLocaleLowerCase();
                if (!categoryKey || uniqueCategories.has(categoryKey)) return;
                uniqueCategories.set(categoryKey, category);
            });
        });

        return ['all', ...Array.from(uniqueCategories.values())];
    }, [stories]);

    const tags = useMemo(() => {
        const uniqueTags = new Map<string, string>();

        stories.forEach((story) => {
            (story.tags || []).forEach((tag) => {
                const normalizedTag = normalizeTagFilterValue(tag);
                const tagKey = normalizeTagFilterKey(tag);
                if (!tagKey || uniqueTags.has(tagKey)) return;
                uniqueTags.set(tagKey, normalizedTag);
            });
        });

        return Array.from(uniqueTags.values()).sort((left, right) =>
            left.localeCompare(right, undefined, { sensitivity: 'base' })
        );
    }, [stories]);

    // Filter and sort logic
    const normalizedTag = normalizeTagFilterKey(tagFilter);

    const filteredStories = stories.filter(story => {
        const matchesSearch =
            story.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            story.author?.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCategory = selectedCategory === 'all' ||
            (selectedCategory === 'series' ? (story.parts?.length || 0) > 1 :
                selectedCategory === 'featured' ? true : // Include all for featured (we'll sort by popular)
                    matchesCategoryFilter(story.category, selectedCategory, story.categories));
        const matchesAuthor = !authorFilter || story.author === authorFilter;
        const matchesTag = !normalizedTag || matchesTagFilter(story.tags, tagFilter);
        return matchesSearch && matchesCategory && matchesAuthor && matchesTag;
    });

    // Sort
    const sortedStories = [...filteredStories].sort((a, b) => {
        // If sorting specifically by popular OR if we are in the 'featured' category (default to popular)
        if (sortBy === 'popular' || (selectedCategory === 'featured' && sortBy === 'latest')) { // Override latest default for featured
            return (b.views || 0) - (a.views || 0);
        }
        if (sortBy === 'alphabetical') return a.title.localeCompare(b.title);
        return new Date(b.date).getTime() - new Date(a.date).getTime(); // latest by date
    });

    // Pagination
    const totalPages = Math.ceil(sortedStories.length / STORIES_PER_PAGE);
    const paginatedStories = sortedStories.slice(
        (currentPage - 1) * STORIES_PER_PAGE,
        currentPage * STORIES_PER_PAGE
    );
    const matchedResumeStory = readerSession
        ? stories.find((story) =>
            String(story.id) === readerSession.storyId ||
            (readerSession.storySlug ? story.slug === readerSession.storySlug : false)
        ) || null
        : null;
    const readerShelf = useMemo(() => {
        const seenStoryIds = new Set<string>();
        return [...stories]
            .sort((left, right) => {
                const featuredDelta = Number(Boolean(right.is_featured)) - Number(Boolean(left.is_featured));
                if (featuredDelta !== 0) return featuredDelta;
                return (right.views || 0) - (left.views || 0);
            })
            .filter((story) => {
                const storyId = String(story.id);
                if (matchedResumeStory && storyId === String(matchedResumeStory.id)) return false;
                if (seenStoryIds.has(storyId)) return false;
                seenStoryIds.add(storyId);
                return true;
            })
            .slice(0, 3);
    }, [stories, matchedResumeStory]);

    // Author Details
    const authorDetails = authorFilter
        ? authors.find(author => author.name === authorFilter || author.username === authorFilter) || null
        : null;
    const authorStats = authorFilter ? {
        totalStories: stories.filter(s => s.author === authorFilter).length,
        totalViews: stories.filter(s => s.author === authorFilter).reduce((sum, s) => sum + (s.views || 0), 0),
        totalComments: stories.filter(s => s.author === authorFilter).reduce((sum, s) => sum + (s.comments || 0), 0)
    } : null;

    const handleFilterChange = (setter: () => void) => {
        setter();
        setCurrentPage(1);
    };

    const resetFiltersForCurrentPage = () => {
        setSearchQuery('');
        setSelectedCategory(defaultCategoryForPage);
        setAuthorFilter(authorFromUrl);
        setTagFilter(tagFromUrl);
        setSortBy(sortFromUrl);
        setCurrentPage(1);
    };

    const isMainPage = !authorFilter && !tagFilter && !searchQuery && selectedCategory === 'all';

    // Top Stories Calculation
    const topStories = [...stories].sort((a, b) => (b.views || 0) - (a.views || 0)).slice(0, 9);
    const readerResumePath = readerSession?.path || '/stories?tab=latest';
    const readerResumeMinutes = matchedResumeStory ? estimateStoryReadMinutes(matchedResumeStory) : null;
    const adminWriterPath = buildAuthPageLink('/admin/login', '/admin/dashboard', '/admin/dashboard');

    // SEO Schemas
    const collectionSchema = {
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        "name": "Bangla Stories Collection",
        "description": "Read the best collection of Bangla Audiobooks, Thrillers, and Short Stories.",
        "url": canonicalUrl,
        "mainEntity": {
            "@type": "ItemList",
            "itemListElement": sortedStories.slice(0, 10).map((story, index) => ({
                "@type": "ListItem",
                "position": index + 1,
                "url": `${SITE_URL}/stories/${story.slug || story.id}`,
                "name": story.title
            }))
        }
    };

    const profileSchema = authorFilter ? {
        "@context": "https://schema.org",
        "@type": "ProfilePage",
        "url": canonicalUrl,
        "mainEntity": {
            "@type": "Person",
            "name": authorDetails?.name || authorFilter,
            "description": authorDetails?.bio,
            "image": authorDetails?.avatar
        }
    } : undefined;

    const seoTitle = authorFilter
        ? `${authorFilter} - বাংলা গল্প সংগ্রহ`
        : tagFilter
            ? `${tagFilter} ট্যাগের গল্প - Mahean Ahmed`
            : "বাংলা গল্প ও অডিওবুক কালেকশন - Mahean Ahmed";

    const seoDescription = authorDetails?.bio
        || (tagFilter ? `${tagFilter} ট্যাগের সেরা গল্প পড়ুন এবং নতুন গল্প আবিষ্কার করুন।` : "সেরা বাংলা গল্পের কালেকশন। থ্রিলার, হরর, রোমান্টিক এবং সাসপেন্স সব ধরনের গল্প পড়ুন এখানে।");

    return (
        <div className="stories-page-container fade-in-up">
            <SEO
                title={seoTitle}
                description={seoDescription}
                keywords="Bangla Story, Bangla Audio Book, Mahean Ahmed, Thriller Story, Horror Story, Detective Story"
                ogType={authorFilter ? "profile" : "website"}
                canonicalUrl={canonicalUrl}
                jsonLd={authorFilter ? profileSchema! : collectionSchema}
            />

            {/* Legacy Style Sub-Navigation */}
            <div className="stories-nav-wrapper">
                <div className="container">
                    <nav className="stories-sub-nav">
                        <Link to="/stories" className={`sub-nav-item ${activeTab === 'all' && !selectedCategory.includes('series') && !selectedCategory.includes('featured') ? 'active' : ''}`}>হোম</Link>
                        <Link to="/stories?tab=latest" className={`sub-nav-item ${activeTab === 'latest' ? 'active' : ''}`}>সর্বশেষ প্রকাশিত গল্প</Link>
                        <Link to="/stories?category=featured" className={`sub-nav-item ${selectedCategory === 'featured' ? 'active' : ''}`}>আলোচিত গল্প</Link>
                        <Link to="/stories?tab=authors" className={`sub-nav-item ${activeTab === 'authors' ? 'active' : ''}`}>সব লেখক</Link>
                        <Link to={adminWriterPath} className="sub-nav-item">গল্প লিখুন</Link>
                    </nav>
                </div>
            </div>

            {/* Legacy Style Hero Section - Show only on All Stories */}
            {isMainPage && activeTab === 'all' && (
                <section className="stories-main-hero">
                    <div className="container">
                        <div className="hero-grid">
                            <div className="hero-text-content">
                                <div className="hero-badge gap-2">
                                    <Sparkles size={16} />
                                    <span className="pb-0.5">মাহিয়ানের গল্পকথা গল্পের নতুন ঠিকানা</span>
                                </div>
                                <h1 className="hero-title-large">
                                    গল্প লিখুন ও পড়ুন
                                </h1>
                                <p className="hero-description-text">
                                    বাঙালির প্রাণের মেলা, যেখানে শব্দরা কথা বলে। হাজারো গল্প আর লেখকের ভিড়ে হারিয়ে যান অসীম কল্পনার রাজ্যে। নিজের গল্প শেয়ার করুন লক্ষ লক্ষ পাঠকের সাথে।
                                </p>
                                <div className="hero-actions">
                                    <Link to={adminWriterPath} className="btn btn-primary">গল্প লেখা শুরু করুন</Link>
                                    <Link to="/stories?tab=latest" className="btn btn-outline">গল্পগুলো পড়ুন</Link>
                                </div>
                            </div>
                            <div className="hero-visual-content">
                                <StoryCarousel stories={stories} />
                            </div>
                        </div>
                    </div>
                </section>
            )}

            {isMainPage && activeTab === 'all' && (
                <section className="reader-hub-strip">
                    <div className="container">
                        <div className="reader-hub-panel">
                            <div className="reader-hub-primary">
                                <span className="reader-hub-kicker">
                                    {readerSession ? 'যেখান থেকে পড়া থেমেছিল' : 'পাঠকের জন্য দ্রুত শুরু'}
                                </span>
                                <h2>
                                    {matchedResumeStory
                                        ? matchedResumeStory.title
                                        : 'পছন্দের গল্প খুঁজে নিয়ে নিরবচ্ছিন্নভাবে পড়ুন'}
                                </h2>
                                <p>
                                    {matchedResumeStory
                                        ? 'আপনার শেষ পড়া অংশটা সংরক্ষিত আছে। এক ট্যাপে আবার একই জায়গা থেকে পড়া শুরু করতে পারবেন।'
                                        : 'নতুন পাঠকদের জন্য জনপ্রিয়, ফিচারড আর দ্রুত পড়ে ফেলা যায় এমন গল্পগুলো একসাথে সাজানো আছে।'}
                                </p>
                                <div className="reader-hub-meta">
                                    <span>{toBanglaNumber(stories.length)}টি গল্প</span>
                                    {readerSession ? <span>{toBanglaNumber(readerSession.progress)}% পড়া হয়েছে</span> : null}
                                    {readerResumeMinutes ? <span>আনুমানিক {toBanglaNumber(readerResumeMinutes)} মিনিট</span> : null}
                                </div>
                                <div className="reader-hub-actions">
                                    <Link to={readerResumePath} className="reader-hub-primary-btn">
                                        {readerSession ? 'পড়া চালিয়ে যান' : 'এখনই পড়া শুরু করুন'}
                                    </Link>
                                    <Link to="/stories?tab=latest" className="reader-hub-secondary-btn">
                                        নতুন গল্প দেখুন
                                    </Link>
                                </div>
                            </div>
                            <div className="reader-hub-shelf">
                                {readerShelf.map((story) => (
                                    <Link key={story.id} to={getStoryPath(story)} className="reader-hub-story-card">
                                        <span className="reader-hub-story-kicker">{story.author || 'জনপ্রিয় নির্বাচন'}</span>
                                        <strong>{story.title}</strong>
                                        <span className="reader-hub-story-meta">
                                            {toBanglaNumber(story.parts?.length || 1)} পর্ব • {toBanglaNumber(estimateStoryReadMinutes(story))} মিনিট
                                        </span>
                                    </Link>
                                ))}
                            </div>
                        </div>
                    </div>
                </section>
            )}

            {/* AUTHORS TAB CONTENT */}
            {activeTab === 'authors' && (
                <div className="container py-16">
                    <div className="section-header text-center mb-16 fade-in-up">
                        <div className="inline-flex items-center gap-2 bg-purple-500/10 text-purple-400 px-4 py-2 rounded-full border border-purple-500/20 mb-4">
                            <PenTool className="w-4 h-4" />
                            <span className="text-sm font-medium pb-0.5">আমাদের লেখকবৃন্দ</span>
                        </div>
                        <h2 className="section-title">জনপ্রিয় লেখকগণ</h2>
                        <p className="section-subtitle">যাদের কলমে উঠে আসে অসাধারণ সব গল্প ও চরিত্র।</p>
                    </div>
                    <AuthorsGrid />
                </div>
            )}


            {/* LATEST STORIES TAB CONTENT */}
            {activeTab === 'latest' && (
                <div className="container py-12">
                    <div className="section-header text-center mb-12 fade-in-up">
                        <div className="inline-flex items-center gap-2 bg-emerald-500/10 text-emerald-400 px-4 py-2 rounded-full border border-emerald-500/20 mb-4">
                            <Sparkles className="w-4 h-4" />
                            <span className="text-sm font-medium pb-0.5">আসা মাত্রই পড়ুন</span>
                        </div>
                        <h2 className="section-title">সর্বশেষ প্রকাশিত গল্প</h2>
                        <p className="section-subtitle">আমাদের প্ল্যাটফর্মে যুক্ত হওয়া একদম নতুন সব গল্প।</p>
                    </div>

                    {/* Filter Bar */}
                    <div className="filter-bar-wrapper mb-8">
                        <div className="search-box">
                            <Search className="search-icon" size={20} />
                            <input
                                type="text"
                                placeholder="গল্প বা লেখকের নাম খুঁজুন..."
                                value={searchQuery}
                                onChange={(e) => handleFilterChange(() => setSearchQuery(e.target.value))}
                            />
                        </div>

                        <div className="filter-controls">
                            <div className="select-wrapper">
                                <Filter className="filter-icon" size={16} />
                                <select
                                    value={selectedCategory}
                                    onChange={(e) => handleFilterChange(() => setSelectedCategory(e.target.value))}
                                >
                                    <option value="all">সব ক্যাটাগরি</option>
                                    <option value="featured">আলোচিত গল্প</option>
                                    {categories.filter(c => c !== 'all').map(cat => (
                                        <option key={cat} value={cat}>{cat}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="select-wrapper">
                                <Filter className="filter-icon" size={16} />
                                <select
                                    value={tagFilter || ''}
                                    onChange={(e) => handleFilterChange(() => {
                                        const nextTag = e.target.value || null;
                                        setTagFilter(nextTag);
                                        if (nextTag) setSelectedCategory('all');
                                    })}
                                >
                                    <option value="">সব ট্যাগ</option>
                                    {tags.map(tag => (
                                        <option key={tag} value={tag}>{tag}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="select-wrapper">
                                <select
                                    value={sortBy}
                                    onChange={(e) => setSortBy(e.target.value)}
                                >
                                    <option value="latest">সর্বশেষ</option>
                                    <option value="popular">জনপ্রিয়</option>
                                    <option value="alphabetical">বর্ণানুক্রমিক</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <div className="stories-grid-top mb-12">
                        {sortedStories.map((story, index) => (
                            <StoryCard key={story.id} story={story} index={index} />
                        ))}
                    </div>
                </div>
            )}

            {/* FEATURED STORIES TAB CONTENT */}
            {selectedCategory === 'featured' && (
                <div className="container py-12">
                    <div className="section-intro mb-12">
                        <div className="inline-flex items-center gap-2 bg-amber-500/10 text-amber-500 px-4 py-2 rounded-full border border-amber-500/20 mb-4">
                            <TrendingUp size={16} />
                            <span className="text-sm font-medium pb-0.5">জনপ্রিয় গল্প</span>
                        </div>
                        <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">আলোচিত গল্পগুলো</h2>
                        <p className="text-gray-400 max-w-3xl mx-auto mb-10 text-lg">
                            আমাদের সেরা এবং সবচেয়ে জনপ্রিয় গল্পগুলো আবিষ্কার করুন যা সারা পৃথিবীর পাঠকদের মন জয় করেছে।
                        </p>

                        {/* Top 9 Grid (3 columns x 3 rows) */}
                        <div className="stories-grid-top mb-12">
                            {topStories.map(story => (
                                <StoryCard key={story.id} story={story} />
                            ))}
                        </div>

                        <Link to="/stories?tab=latest" className="btn-legacy-orange" style={{ border: 'none', cursor: 'pointer', outline: 'none' }}>
                            সব গল্প দেখুন <ChevronRight size={18} />
                        </Link>
                    </div>
                </div>
            )}

            {/* Standard Listing Section */}

            {/* Standard Listing Section */}
            {/* Show if:
                1. Not in 'latest' tab
                2. AND Not in 'featured' category (unless filtered by search/author) 
                3. OR if user is searching/filtering (then we show results regardless of tab/category context)
            */}
            {
                (activeTab !== 'latest' && activeTab !== 'authors' && (selectedCategory !== 'featured' || searchQuery || authorFilter)) && (
                    <section id="listing" className="section py-16">
                        <div className="container">
                            {/* Author Spotlights or Header */}
                            {authorFilter && authorDetails ? (
                                <div className="author-profile-box fade-in-up">
                                    <div className="author-profile-content">
                                        <SmartImage src={authorDetails.avatar} alt={authorDetails.name} className="author-profile-avatar" isRound={true} showFullText={true} />
                                        <div className="author-profile-info">
                                            <h1 className="author-profile-name">{authorDetails.name}</h1>
                                            <p className="author-profile-username">@{authorDetails.username}</p>
                                            <p className="author-profile-bio">{authorDetails.bio}</p>

                                            <div className="author-stats-row">
                                                <div className="author-stat">
                                                    <span className="stat-value">{authorStats?.totalStories}</span>
                                                    <span className="stat-label">গল্প</span>
                                                </div>
                                                <div className="author-stat">
                                                    <span className="stat-value">{authorStats?.totalViews.toLocaleString('bn-BD')}</span>
                                                    <span className="stat-label">পড়া হয়েছে</span>
                                                </div>
                                                <div className="author-stat">
                                                    <span className="stat-value">{authorStats?.totalComments.toLocaleString('bn-BD')}</span>
                                                    <span className="stat-label">মন্তব্য</span>
                                                </div>
                                            </div>

                                            <div className="author-social-links">
                                                {authorDetails.links && authorDetails.links.map((link, idx) => {
                                                    const lowerName = link.name.toLowerCase();
                                                    let btnClass = "social-btn";
                                                    if (lowerName.includes('facebook')) btnClass += " facebook";
                                                    else if (lowerName.includes('youtube')) btnClass += " youtube";
                                                    else btnClass += " website";

                                                    return (
                                                        <a key={idx} href={link.url} className={btnClass} target="_blank" rel="noreferrer">
                                                            {link.name}
                                                        </a>
                                                    );
                                                })}
                                            </div>

                                            <p className="author-joined-date">
                                                <Calendar size={14} /> সদস্যপদ: জুন ২০২৩ থেকে
                                            </p>
                                        </div>
                                        <Link to="/stories" className="close-author-filter">✕ সব গল্প দেখুন</Link>
                                    </div>
                                </div>
                            ) : (
                                isMainPage && (
                                    <div className="section-intro mb-12">
                                        <div className="inline-flex items-center gap-2 bg-amber-500/10 text-amber-500 px-4 py-2 rounded-full border border-amber-500/20 mb-4">
                                            <TrendingUp size={16} />
                                            <span className="text-sm font-medium pb-0.5">জনপ্রিয় গল্প</span>
                                        </div>
                                        <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">আলোচিত গল্পগুলো</h2>
                                        <p className="text-gray-400 max-w-3xl mx-auto mb-10 text-lg">
                                            আমাদের সেরা এবং সবচেয়ে জনপ্রিয় গল্পগুলো আবিষ্কার করুন যা সারা পৃথিবীর পাঠকদের মন জয় করেছে।
                                        </p>

                                        {/* Top 9 Grid (3 columns x 3 rows) */}
                                        <div className="stories-grid-top mb-12">
                                            {topStories.map(story => (
                                                <StoryCard key={story.id} story={story} />
                                            ))}
                                        </div>

                                        <Link to="/stories?tab=latest" className="btn-legacy-orange" style={{ border: 'none', cursor: 'pointer', outline: 'none', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                                            সব গল্প দেখুন <ChevronRight size={18} />
                                        </Link>
                                    </div>
                                )
                            )}

                            {/* Filter Bar */}
                            <div className="filter-bar-wrapper">
                                <div className="search-box">
                                    <Search className="search-icon" size={20} />
                                    <input
                                        type="text"
                                        placeholder="গল্প বা লেখকের নাম খুঁজুন..."
                                        value={searchQuery}
                                        onChange={(e) => handleFilterChange(() => setSearchQuery(e.target.value))}
                                    />
                                </div>

                                <div className="filter-controls">
                                    <div className="select-wrapper">
                                        <Filter className="filter-icon" size={16} />
                                        <select
                                            value={selectedCategory}
                                            onChange={(e) => handleFilterChange(() => setSelectedCategory(e.target.value))}
                                        >
                                            <option value="all">সব ক্যাটাগরি</option>
                                            <option value="featured">আলোচিত গল্প</option>
                                            {categories.filter(c => c !== 'all').map(cat => (
                                                <option key={cat} value={cat}>{cat}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="select-wrapper">
                                        <Filter className="filter-icon" size={16} />
                                        <select
                                            value={tagFilter || ''}
                                            onChange={(e) => handleFilterChange(() => {
                                                const nextTag = e.target.value || null;
                                                setTagFilter(nextTag);
                                                if (nextTag) setSelectedCategory('all');
                                            })}
                                        >
                                            <option value="">সব ট্যাগ</option>
                                            {tags.map(tag => (
                                                <option key={tag} value={tag}>{tag}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="select-wrapper">
                                        <select
                                            value={sortBy}
                                            onChange={(e) => setSortBy(e.target.value)}
                                        >
                                            <option value="latest">সর্বশেষ</option>
                                            <option value="popular">জনপ্রিয়</option>
                                            <option value="alphabetical">অক্ষরানুসারে</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            {/* Results Summary */}
                            {hasActiveFilters && (
                                <div className="results-summary mb-8">
                                    <div className="results-summary-main">
                                        <div className="results-summary-copy">
                                            <span className="results-summary-kicker">ফিল্টার করা ফলাফল</span>
                                            <p className="results-summary-text">
                                                <span className="results-summary-count">{sortedStories.length} টি গল্প</span> পাওয়া গেছে
                                            </p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={resetFiltersForCurrentPage}
                                            className="results-summary-action"
                                        >
                                            সব ফিল্টার রিসেট করুন
                                        </button>
                                    </div>
                                    <div className="results-summary-tags">
                                        {selectedCategory !== 'all' && (
                                            <span className="results-summary-tag">ক্যাটাগরি: {selectedCategory}</span>
                                        )}
                                        {authorFilter && (
                                            <span className="results-summary-tag">লেখক: {authorFilter}</span>
                                        )}
                                        {tagFilter && (
                                            <span className="results-summary-tag">ট্যাগ: {tagFilter}</span>
                                        )}
                                        {searchQuery && (
                                            <span className="results-summary-tag">খোঁজ: {searchQuery}</span>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Results Grid */}
                            <div className="stories-grid">
                                {stories.length === 0 ? (
                                    <SkeletonCard count={6} />
                                ) : paginatedStories.length > 0 ? (
                                    paginatedStories.map((story) => (
                                        <StoryCard key={story.id} story={story} />
                                    ))
                                ) : (
                                    <div className="no-stories-found py-20 text-center">
                                        <div className="text-6xl mb-4">📚</div>
                                        <h3 className="text-xl font-bold text-white mb-2">কোনো গল্প পাওয়া যায়নি</h3>
                                        <p className="text-gray-500">অন্য কোনো কি-ওয়ার্ড বা ক্যাটাগরি দিয়ে চেষ্টা করুন।</p>
                                    </div>
                                )}
                            </div>

                            {/* Pagination */}
                            {totalPages > 1 && (
                                <Pagination
                                    currentPage={currentPage}
                                    totalPages={totalPages}
                                    onPageChange={setCurrentPage}
                                    totalItems={sortedStories.length}
                                    itemsPerPage={STORIES_PER_PAGE}
                                    itemName="গল্প"
                                />
                            )}
                        </div>
                    </section>
                )
            }

            {isMainPage && (
                <div className="container pb-20">
                    <AdComponent slot="stories-footer-ad" />
                </div>
            )}
        </div >
    );
}
