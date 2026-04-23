import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { BookOpen, Eye, ExternalLink, ArrowLeft, CheckCircle, UserPlus, UserCheck } from 'lucide-react';
import { getAllAuthors, type Author } from '../utils/authorManager';
import { getStories, type Story } from '../utils/storyManager';
import { toBanglaNumber } from '../utils/numberFormatter';
import { SITE_URL, DEFAULT_OG_IMAGE } from '../utils/siteMeta';
import { getCurrentUser } from '../utils/auth';
import { isReaderFollowingAuthor, toggleReaderAuthorFollow } from '../utils/readerStateManager';
import SmartImage from '../components/SmartImage';
import StoryCard from '../components/StoryCard';
import SEO from '../components/SEO';
import './AuthorProfilePage.css';

const normalizeKey = (v?: string | null) => (v ?? '').trim().toLowerCase();

const getAuthorStories = (author: Author, stories: Story[]): Story[] => {
    const keys = new Set(
        [author.id, author.name, author.username]
            .map(normalizeKey)
            .filter(Boolean)
    );
    return stories.filter((s) =>
        [s.authorId, s.author].map(normalizeKey).some((k) => k && keys.has(k))
    );
};

const getTotalViews = (stories: Story[]) =>
    stories.reduce((sum, s) => sum + (Number(s.views) || 0), 0);

const AuthorProfilePage = () => {
    const { username } = useParams<{ username: string }>();
    const navigate = useNavigate();
    const [author, setAuthor] = useState<Author | null>(null);
    const [authorStories, setAuthorStories] = useState<Story[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [userId, setUserId] = useState<string | null>(null);
    const [isFollowing, setIsFollowing] = useState(false);

    useEffect(() => {
        getCurrentUser().then((u) => {
            if (u?.id) setUserId(u.id);
        });
    }, []);

    useEffect(() => {
        let isMounted = true;
        const load = async () => {
            const [authors, stories] = await Promise.all([getAllAuthors(), getStories()]);
            const found = authors.find(
                (a) =>
                    normalizeKey(a.username) === normalizeKey(username) ||
                    normalizeKey(a.name) === normalizeKey(username)
            );
            if (!isMounted) return;
            if (!found) {
                setIsLoading(false);
                return;
            }
            const ownStories = getAuthorStories(found, stories)
                .sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());
            setAuthor(found);
            setAuthorStories(ownStories);
            setIsLoading(false);
        };
        void load();
        return () => { isMounted = false; };
    }, [username]);

    useEffect(() => {
        if (userId && author?.name) {
            setIsFollowing(isReaderFollowingAuthor(userId, author.name));
        }
    }, [userId, author]);

    const handleFollowToggle = () => {
        if (!userId || !author?.name) return;
        toggleReaderAuthorFollow(userId, author.name);
        setIsFollowing(isReaderFollowingAuthor(userId, author.name));
    };

    if (isLoading) {
        return (
            <div className="container py-20 text-center">
                <p className="text-gray-400">লোড হচ্ছে...</p>
            </div>
        );
    }

    if (!author) {
        return (
            <div className="container py-20 text-center">
                <h2 className="text-2xl text-white mb-4">লেখক পাওয়া যায়নি</h2>
                <Link to="/authors" className="text-blue-400 hover:underline">সব লেখক দেখুন</Link>
            </div>
        );
    }

    const totalViews = getTotalViews(authorStories);
    const publishedCount = authorStories.filter((s) => s.status === 'published' || !s.status).length;
    const isVerified = (author as Author & { verified?: boolean }).verified;
    const links = author.links || [];

    const canonicalUrl = `${SITE_URL}/authors/${username}`;
    const authorImage = author.avatar || DEFAULT_OG_IMAGE;

    const personSchema = {
        '@context': 'https://schema.org',
        '@type': 'Person',
        name: author.name,
        description: author.bio || '',
        url: canonicalUrl,
        image: author.avatar || '',
        sameAs: links.map((l) => l.url).filter(Boolean)
    };

    return (
        <div className="author-profile-page page-offset fade-in-up">
            <SEO
                title={`${author.name} - লেখক প্রোফাইল`}
                description={author.bio || `${author.name} এর সব গল্প ও লেখা পড়ুন।`}
                canonicalUrl={canonicalUrl}
                ogImage={authorImage}
                jsonLd={personSchema}
            />

            <div className="container">
                <button className="author-profile-back" onClick={() => navigate(-1)}>
                    <ArrowLeft size={16} />
                    <span>ফিরে যান</span>
                </button>

                {/* Horizontal profile hero */}
                <section className="author-profile-hero">
                    <div className="author-profile-avatar-wrap">
                        {author.avatar ? (
                            <SmartImage
                                src={author.avatar}
                                alt={author.name}
                                className="author-profile-avatar"
                                isRound={true}
                            />
                        ) : (
                            <div className="author-profile-avatar-fallback">
                                {(author.name || '?').charAt(0).toUpperCase()}
                            </div>
                        )}
                    </div>

                    <div className="author-profile-info">
                        <div className="author-profile-name-row">
                            <h1 className="author-profile-name">{author.name}</h1>
                            {isVerified && (
                                <span className="author-verified-badge">
                                    <CheckCircle size={14} />
                                </span>
                            )}
                        </div>
                        {author.username && (
                            <p className="author-profile-username">@{author.username}</p>
                        )}
                        {author.bio && (
                            <p className="author-profile-bio">{author.bio}</p>
                        )}

                        <div className="author-profile-stats">
                            <div className="author-stat">
                                <BookOpen size={14} />
                                <span>{toBanglaNumber(publishedCount)}টি গল্প</span>
                            </div>
                            <div className="author-stat">
                                <Eye size={14} />
                                <span>{toBanglaNumber(totalViews)} ভিউ</span>
                            </div>
                        </div>

                        <div className="author-profile-actions">
                            {userId && (
                                <button
                                    className={`author-follow-btn ${isFollowing ? 'following' : ''}`}
                                    onClick={handleFollowToggle}
                                >
                                    {isFollowing ? (
                                        <><UserCheck size={14} /><span>অনুসরণ করছেন</span></>
                                    ) : (
                                        <><UserPlus size={14} /><span>অনুসরণ করুন</span></>
                                    )}
                                </button>
                            )}
                            {links.map((link, i) => (
                                <a
                                    key={i}
                                    href={link.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="author-profile-link"
                                >
                                    <ExternalLink size={13} />
                                    <span>{link.name || link.url}</span>
                                </a>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Stories grid */}
                <section className="author-stories-section">
                    <h2 className="author-stories-heading">সিরিজ</h2>

                    {authorStories.length === 0 ? (
                        <p className="author-stories-empty">কোনো গল্প পাওয়া যায়নি।</p>
                    ) : (
                        <div className="author-stories-grid">
                            {authorStories.map((story, index) => (
                                <StoryCard key={story.id} story={story} index={index} />
                            ))}
                        </div>
                    )}
                </section>
            </div>
        </div>
    );
};

export default AuthorProfilePage;
