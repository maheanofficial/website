import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, Eye, Heart, BookMarked } from 'lucide-react';
import { getReaderSession, type ReaderSession } from '../utils/readerExperience';
import { ChevronRight } from 'lucide-react';
import Hero from '../components/Hero';
import Skills from '../components/Skills';
import Contact from '../components/Contact';
import SEO from '../components/SEO';
import AdComponent from '../components/AdComponent';
import SkeletonCard from '../components/SkeletonCard';
import StoryCard from '../components/StoryCard';
import StoryCarousel from '../components/StoryCarousel';
import SmartImage from '../components/SmartImage';
import { withCacheBust } from '../utils/imageCache';
import { getCachedStories, getStories, type Story } from '../utils/storyManager';
import { getAllAuthors, type Author } from '../utils/authorManager';
import { toBanglaNumber } from '../utils/numberFormatter';
import { SITE_URL } from '../utils/siteMeta';
import './HomePage.css';

const normalizeAuthorKey = (v?: string) => String(v || '').trim().toLowerCase();

const HomePage = () => {
    const [stories, setStories] = useState<Story[]>(() => getCachedStories());
    const [authors, setAuthors] = useState<Author[]>([]);
    const [continueSession] = useState<ReaderSession | null>(() => getReaderSession());

    useEffect(() => {
        let isMounted = true;
        const loadData = async () => {
            const [storyData, authorData] = await Promise.all([getStories(), getAllAuthors()]);
            if (isMounted) {
                setStories(storyData);
                setAuthors(authorData);
            }
        };
        void loadData();
        return () => { isMounted = false; };
    }, []);

    const topAuthors = authors
        .map((author) => {
            const authorKeys = new Set([author.id, author.name, author.username].map(normalizeAuthorKey).filter(Boolean));
            const authorStories = stories.filter((s) => [s.authorId, s.author].map(normalizeAuthorKey).some((k) => authorKeys.has(k)));
            return { ...author, storyCount: authorStories.length, totalViews: authorStories.reduce((sum, s) => sum + (s.views || 0), 0) };
        })
        .filter((a) => a.storyCount > 0)
        .sort((a, b) => b.totalViews - a.totalViews)
        .slice(0, 6);
    const socialProfiles = [
        'https://www.youtube.com/@maheanahmed',
        'https://www.facebook.com/maheanahmedofficial',
        'https://www.instagram.com/maheanahmed',
        'https://twitter.com/mahean_ahmed',
        'https://www.linkedin.com/in/maheanahmed'
    ];
    const schemaData = [
        {
            '@context': 'https://schema.org',
            '@type': 'Person',
            name: 'Mahean Ahmed',
            url: SITE_URL,
            image: `${SITE_URL}/mahean-3.jpg`,
            sameAs: socialProfiles,
            jobTitle: 'Voice Artist & Audio Storyteller',
            worksFor: {
                '@type': 'Organization',
                name: "Mahean's Audio Stories"
            },
            description: 'Professional Voice Artist and Audio Storyteller creating immersive Bengali audiobooks and thrillers.'
        },
        {
            '@context': 'https://schema.org',
            '@type': 'Organization',
            name: 'Mahean Ahmed',
            url: SITE_URL,
            logo: `${SITE_URL}/assets/logo-solid.png`,
            sameAs: socialProfiles
        },
        {
            '@context': 'https://schema.org',
            '@type': 'WebSite',
            name: 'Mahean Ahmed',
            url: SITE_URL,
            inLanguage: 'bn-BD',
            potentialAction: {
                '@type': 'SearchAction',
                target: {
                    '@type': 'EntryPoint',
                    urlTemplate: `${SITE_URL}/stories?q={search_term_string}`
                },
                'query-input': 'required name=search_term_string'
            }
        }
    ];

    return (
        <div className="home-page fade-in-up">
            <SEO
                title="Mahean Ahmed - ভয়েস আর্টিস্ট ও অডিওবুক ক্রিয়েটর"
                description="Mahean Ahmed-এর অফিশিয়াল পোর্টফোলিও। বাংলা অডিওবুক, রোমাঞ্চকর গল্প এবং ভয়েস ওভার সার্ভিসের জন্য যোগাযোগ করুন। শুনুন সেরা বাংলা থ্রিলার ও সাসপেন্স গল্প।"
                keywords="Mahean Ahmed, বাংলা অডিওবুক, ভয়েস আর্টিস্ট, বাংলা গল্প, অডিও স্টোরিটেলার, Bangla Audio Story, Thriller Story, Horror Story"
                jsonLd={schemaData}
                ogType="profile"
                canonicalUrl="/"
            />

            <Hero />

            {/* Continue Reading Section */}
            {continueSession && (
                <div className="container">
                    <div className="continue-reading-card">
                        {continueSession.coverImage && (
                            <img src={withCacheBust(continueSession.coverImage)} alt="" className="continue-reading-cover" />
                        )}
                        <div className="continue-reading-info">
                            <span className="continue-reading-kicker">
                                <BookOpen size={14} /> যেখানে ছেড়েছিলেন
                            </span>
                            <p className="continue-reading-title">{continueSession.storyTitle}</p>
                            <p className="continue-reading-part">{continueSession.partLabel}</p>
                            <div className="continue-reading-progress-bar">
                                <div className="continue-reading-progress-fill" style={{ width: `${continueSession.progress}%` }} />
                            </div>
                            <span className="continue-reading-pct">{continueSession.progress}% পড়া হয়েছে</span>
                        </div>
                        <Link to={continueSession.path} className="btn btn-primary continue-reading-btn">
                            পড়তে থাকুন →
                        </Link>
                    </div>
                </div>
            )}

            {/* Featured Stories Section */}
            <div className="container py-12">
                <div className="section-header text-center mb-12">
                    <h2 className="section-title text-4xl font-bold mb-4 gradient-text">জনপ্রিয় গল্পসমূহ</h2>
                    <p className="section-subtitle text-gray-400">যে গল্পগুলো পাঠকদের হৃদয়ে জায়গা করে নিয়েছে</p>
                </div>
                <StoryCarousel stories={stories.filter(s => s.views > 50).slice(0, 5)} />
            </div>

            {/* Most Viewed Stories Section */}
            <div className="container py-8">
                <div className="home-stories-header">
                    <Link to="/stories" className="home-stories-more">
                        আরও দেখুন <ChevronRight size={16} />
                    </Link>
                </div>

                <div className="home-stories-grid">
                    {stories.length === 0 ? (
                        <SkeletonCard count={6} />
                    ) : (
                        stories
                            .slice()
                            .sort((a, b) => {
                                const viewsDiff = (b.views || 0) - (a.views || 0);
                                if (viewsDiff !== 0) return viewsDiff;
                                return new Date(b.date).getTime() - new Date(a.date).getTime();
                            })
                            .slice(0, 12)
                            .map((story, index) => (
                                <StoryCard key={story.id} story={story} index={index} />
                            ))
                    )}
                </div>
            </div>

            {/* Most Read Stories */}
            <div className="container py-12">
                <div className="home-section-header">
                    <div>
                        <h2 className="home-section-title">সর্বাধিক পঠিত গল্প</h2>
                        <p className="home-section-subtitle">পাঠকদের পছন্দের শীর্ষ গল্পগুলো</p>
                    </div>
                    <Link to="/stories?sort=popular" className="home-stories-more">
                        আরও দেখুন <ChevronRight size={16} />
                    </Link>
                </div>
                <div className="home-popular-stories">
                    {stories
                        .slice()
                        .sort((a, b) => (b.views || 0) - (a.views || 0))
                        .slice(0, 5)
                        .map((story, i) => (
                            <Link key={story.id} to={`/stories/${story.slug || story.id}`} className="home-popular-story-item">
                                <span className="home-popular-rank">{toBanglaNumber(i + 1)}</span>
                                <div className="home-popular-cover">
                                    <SmartImage src={story.cover_image || story.image} alt={story.title} showFullText={false} />
                                </div>
                                <div className="home-popular-info">
                                    <h3 className="home-popular-title">{story.title}</h3>
                                    <span className="home-popular-author">{story.author}</span>
                                    <div className="home-popular-meta">
                                        <Eye size={13} />
                                        <span>{toBanglaNumber(story.views || 0)} বার পড়া</span>
                                        {(story as unknown as Record<string, number>)['rating'] > 0 ? (
                                            <>
                                                <Heart size={13} />
                                                <span>{toBanglaNumber((story as unknown as Record<string, number>)['rating'])} হা.</span>
                                            </>
                                        ) : null}
                                        {story.parts?.length ? <><BookMarked size={13} /><span>{toBanglaNumber(story.parts.length)} পর্ব</span></> : null}
                                    </div>
                                </div>
                            </Link>
                        ))
                    }
                </div>
            </div>

            {/* Most Read Authors */}
            {topAuthors.length > 0 && (
                <div className="container py-12">
                    <div className="home-section-header">
                        <div>
                            <h2 className="home-section-title">সর্বাধিক পঠিত লেখক</h2>
                            <p className="home-section-subtitle">সেরা লেখকদের গল্পের জগতে স্বাগতম</p>
                        </div>
                        <Link to="/authors" className="home-stories-more">
                            সকল লেখক <ChevronRight size={16} />
                        </Link>
                    </div>
                    <div className="home-authors-grid">
                        {topAuthors.map((author) => (
                            <Link key={author.id} to={`/stories?author=${encodeURIComponent(author.name || '')}`} className="home-author-card">
                                <div className="home-author-avatar">
                                    <SmartImage src={author.avatar} alt={author.name} isRound showFullText={false} />
                                </div>
                                <h3 className="home-author-name">{author.name}</h3>
                                {author.username ? <span className="home-author-username">@{author.username}</span> : null}
                                <div className="home-author-stats">
                                    <span><BookOpen size={13} /> {toBanglaNumber(author.storyCount)} গল্প</span>
                                    <span><Eye size={13} /> {toBanglaNumber(author.totalViews)}</span>
                                </div>
                            </Link>
                        ))}
                    </div>
                </div>
            )}

            <div className="container py-8">
                <AdComponent slot="homepage-middle-ad" />
            </div>

            <Skills />
            <Contact />
        </div>
    );
};

export default HomePage;
