import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, BookOpen, Eye, Award } from 'lucide-react';
import { getAllAuthors, type Author } from '../utils/authorManager';
import { getStories, type Story } from '../utils/storyManager';
import { toBanglaNumber } from '../utils/numberFormatter';
import { slugify } from '../utils/slugify';
import SEO from '../components/SEO';
import SmartImage from '../components/SmartImage';
import StoryCard from '../components/StoryCard';
import './AuthorProfilePage.css';

const normalizeValue = (value?: string | null) => (value ?? '').trim().toLowerCase();

const isStoryOwnedByAuthor = (story: Story, author: Author) => {
    const authorKeys = new Set(
        [author.id, author.name, author.username]
            .map((value) => normalizeValue(value))
            .filter(Boolean)
    );
    if (!authorKeys.size) return false;

    const storyKeys = [story.authorId, story.author]
        .map((value) => normalizeValue(value))
        .filter(Boolean);

    return storyKeys.some((key) => authorKeys.has(key));
};

const AuthorProfilePage = () => {
    const { slug } = useParams<{ slug: string }>();
    const [author, setAuthor] = useState<Author | null>(null);
    const [authorStories, setAuthorStories] = useState<Story[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [stats, setStats] = useState({ storyCount: 0, totalViews: 0 });

    useEffect(() => {
        let isMounted = true;
        const loadAuthorData = async () => {
            setIsLoading(true);
            try {
                const [authorData, storyData] = await Promise.all([getAllAuthors(), getStories()]);
                if (!isMounted) return;

                // Find the author matching username or slugified name
                const matchedAuthor = authorData.find(
                    (a) =>
                        normalizeValue(a.username) === normalizeValue(slug) ||
                        slugify(a.name) === slug
                );

                if (matchedAuthor) {
                    setAuthor(matchedAuthor);
                    const filteredStories = storyData.filter((story) =>
                        isStoryOwnedByAuthor(story, matchedAuthor)
                    );
                    setAuthorStories(filteredStories);

                    const storyCount = filteredStories.length;
                    const totalViews = filteredStories.reduce((sum, story) => sum + (story.views || 0), 0);
                    setStats({ storyCount, totalViews });
                }
            } catch (err) {
                console.error('Failed to load author profile', err);
            } finally {
                if (isMounted) setIsLoading(false);
            }
        };

        void loadAuthorData();
        return () => {
            isMounted = false;
        };
    }, [slug]);

    if (isLoading) {
        return (
            <div className="author-profile-page page-offset loading-state">
                <div className="container">
                    <div className="loading-spinner-container">
                        <div className="loading-spinner"></div>
                        <p>লোড হচ্ছে...</p>
                    </div>
                </div>
            </div>
        );
    }

    if (!author) {
        return (
            <div className="author-profile-page page-offset error-state">
                <div className="container">
                    <div className="error-message-card">
                        <h2>লেখক খুঁজে পাওয়া যায়নি</h2>
                        <p>দুঃখিত, এই লেখকের কোনো প্রোফাইল খুঁজে পাওয়া যায়নি।</p>
                        <Link to="/authors" className="back-link">
                            <ArrowLeft size={16} />
                            <span>সব লেখক</span>
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    const titleText = `${author.name} - এর প্রোফাইল ও গল্পসমূহ | Mahean Ahmed`;
    const descriptionText = `${author.name} এর প্রোফাইল। Mahean Ahmed প্লাটফর্মে তার প্রকাশিত গল্পসমূহ ও পাঠক প্রতিক্রিয়া দেখুন।`;

    return (
        <div className="author-profile-page page-offset">
            <SEO
                title={titleText}
                description={descriptionText}
                keywords={`${author.name}, বাংলা লেখক, Mahean Ahmed Authors`}
                canonicalUrl={`/authors/${slug}`}
            />

            <div className="author-profile-hero">
                <div className="hero-banner-overlay"></div>
                <div className="container">
                    <Link to="/authors" className="profile-back-btn">
                        <ArrowLeft size={18} />
                        <span>সব লেখক</span>
                    </Link>

                    <div className="author-profile-header">
                        <div className="author-profile-avatar-wrapper">
                            <SmartImage
                                src={author.avatar}
                                alt={author.name}
                                className="author-profile-avatar"
                                isRound={true}
                            />
                            <div className="verified-badge-large" title="Verified Author">
                                <Award size={16} />
                            </div>
                        </div>

                        <div className="author-profile-info">
                            <h1 className="author-profile-name">{author.name}</h1>
                            {author.username && (
                                <span className="author-profile-handle">@{author.username}</span>
                            )}
                            <p className="author-profile-bio">
                                {author.bio || 'নিয়ামিত লেখালেখির মাধ্যমে নতুন গল্পের ভুবন তৈরি করছেন।'}
                            </p>

                            <div className="author-profile-stats">
                                <div className="profile-stat-item">
                                    <BookOpen size={18} />
                                    <div>
                                        <strong>{toBanglaNumber(stats.storyCount)}</strong>
                                        <span>টি গল্প</span>
                                    </div>
                                </div>
                                <div className="profile-stat-item">
                                    <Eye size={18} />
                                    <div>
                                        <strong>{toBanglaNumber(stats.totalViews)}</strong>
                                        <span>বার পঠিত</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <main className="author-stories-section">
                <div className="container">
                    <h2 className="section-title">
                        <span>প্রকাশিত গল্পসমূহ</span>
                        <span className="badge">{toBanglaNumber(authorStories.length)}</span>
                    </h2>

                    {authorStories.length === 0 ? (
                        <div className="no-stories-card">
                            <p>এই লেখকের এখনও কোনো গল্প প্রকাশিত হয়নি।</p>
                        </div>
                    ) : (
                        <div className="stories-grid">
                            {authorStories.map((story) => (
                                <StoryCard key={story.id} story={story} />
                            ))}
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

export default AuthorProfilePage;
