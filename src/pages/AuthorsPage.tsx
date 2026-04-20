import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Star, CheckCircle } from 'lucide-react';
import SEO from '../components/SEO';
import AuthorsGrid from '../components/AuthorsGrid';
import { getAllAuthors, type Author } from '../utils/authorManager';
import { getStories, type Story } from '../utils/storyManager';
import { SITE_URL } from '../utils/siteMeta';
import './AuthorsPage.css';

const normalizeValue = (value?: string | null) => (value ?? '').trim().toLowerCase();

const hasPublishedStoryForAuthor = (author: Author, stories: Story[]) => {
    const authorKeys = new Set(
        [author.id, author.name, author.username]
            .map((value) => normalizeValue(value))
            .filter(Boolean)
    );
    if (!authorKeys.size) return false;

    return stories.some((story) => {
        const storyKeys = [story.authorId, story.author]
            .map((value) => normalizeValue(value))
            .filter(Boolean);
        return storyKeys.some((key) => authorKeys.has(key));
    });
};

const AuthorCard = ({ author }: { author: Author }) => (
    <Link
        to={`/author/${encodeURIComponent(author.username || author.name)}`}
        className="author-card-featured"
    >
        {author.avatar ? (
            <img src={author.avatar} alt={author.name} className="author-card-avatar" />
        ) : (
            <div className="author-card-avatar-fallback">
                {(author.name || '?').charAt(0).toUpperCase()}
            </div>
        )}
        <div className="author-card-info">
            <div className="author-card-name-row">
                <span className="author-card-name">{author.name}</span>
                {author.verified && (
                    <CheckCircle size={14} className="author-card-verified" />
                )}
                {author.is_featured && (
                    <Star size={13} className="author-card-star" />
                )}
            </div>
            {author.username && (
                <span className="author-card-username">@{author.username}</span>
            )}
            {author.bio && (
                <p className="author-card-bio">{author.bio}</p>
            )}
        </div>
    </Link>
);

const AuthorsPage = () => {
    const [authors, setAuthors] = useState<Author[]>([]);
    const [activeTab, setActiveTab] = useState<'featured' | 'all'>('featured');
    const canonicalUrl = `${SITE_URL}/authors`;

    useEffect(() => {
        let isMounted = true;
        const loadAuthors = async () => {
            const [authorData, storyData] = await Promise.all([getAllAuthors(), getStories()]);
            const visibleAuthors = authorData.filter((author) => hasPublishedStoryForAuthor(author, storyData));
            if (isMounted) {
                setAuthors(visibleAuthors);
            }
        };
        loadAuthors();
        return () => {
            isMounted = false;
        };
    }, []);

    const featuredAuthors = authors.filter((a) => a.is_featured);
    const allAuthors = authors;
    const displayAuthors = activeTab === 'featured' && featuredAuthors.length > 0
        ? featuredAuthors
        : allAuthors;

    const authorsSchema = {
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        "name": "বাংলা লেখক তালিকা",
        "description": "জনপ্রিয় বাংলা লেখকদের প্রোফাইল, গল্প সংখ্যা এবং পাঠকের রেটিং দেখুন।",
        "url": canonicalUrl,
        "mainEntity": {
            "@type": "ItemList",
            "itemListElement": authors.map((author, index) => ({
                "@type": "ListItem",
                "position": index + 1,
                "name": author.name,
                "url": `${SITE_URL}/author/${encodeURIComponent(author.username || author.name)}`
            }))
        }
    };

    return (
        <div className="authors-page page-offset">
            <SEO
                title="লেখক তালিকা - Mahean Ahmed"
                description="জনপ্রিয় বাংলা লেখকদের প্রোফাইল, গল্প সংখ্যা, এবং পাঠকের প্রতিক্রিয়া দেখুন।"
                keywords="Bangla Authors, Bengali Writers, Story Authors, Mahean Ahmed"
                canonicalUrl="/authors"
                jsonLd={authorsSchema}
            />

            <section className="authors-hero">
                <div className="container">
                    <div className="authors-hero-content">
                        <span className="authors-kicker">লেখকদের তালিকা</span>
                        <h1 className="authors-title">গল্পের লেখকরা</h1>
                        <p className="authors-subtitle">
                            গল্পের জগতে যাদের কলমে উঠে আসে অসাধারণ চরিত্র ও কাহিনি, তাদের গল্পগুলো এক জায়গায় আবিষ্কার করুন।
                        </p>
                    </div>

                    {/* Two-tier tabs */}
                    {featuredAuthors.length > 0 && (
                        <div className="authors-tier-tabs">
                            <button
                                className={`authors-tier-tab ${activeTab === 'featured' ? 'active' : ''}`}
                                onClick={() => setActiveTab('featured')}
                            >
                                <Star size={15} />
                                বিশিষ্ট লেখক
                            </button>
                            <button
                                className={`authors-tier-tab ${activeTab === 'all' ? 'active' : ''}`}
                                onClick={() => setActiveTab('all')}
                            >
                                সব লেখক
                            </button>
                        </div>
                    )}

                    {/* Featured authors cards */}
                    {activeTab === 'featured' && featuredAuthors.length > 0 ? (
                        <div className="authors-featured-grid">
                            {displayAuthors.map((author) => (
                                <AuthorCard key={author.id} author={author} />
                            ))}
                        </div>
                    ) : (
                        <AuthorsGrid />
                    )}
                </div>
            </section>
        </div>
    );
};

export default AuthorsPage;
