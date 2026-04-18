import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, BookOpen, Check, Eye } from 'lucide-react';

import { getAllAuthors, type Author } from '../utils/authorManager';
import { getStories, type Story } from '../utils/storyManager';
import { toBanglaNumber } from '../utils/numberFormatter';
import SmartImage from './SmartImage';
import './AuthorsGrid.css';

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

const AuthorsGrid = () => {
    const [authors, setAuthors] = useState<Author[]>([]);
    const [allStories, setAllStories] = useState<Story[]>([]);

    useEffect(() => {
        let isMounted = true;

        const loadData = async () => {
            const [authorData, storyData] = await Promise.all([getAllAuthors(), getStories()]);
            if (!isMounted) return;
            setAuthors(authorData);
            setAllStories(storyData);
        };

        void loadData();

        return () => {
            isMounted = false;
        };
    }, []);

    const authorsWithStats = authors
        .map((author) => {
            const authorStories = allStories.filter((story) => isStoryOwnedByAuthor(story, author));
            const storyCount = authorStories.length;
            const totalViews = authorStories.reduce((sum, story) => sum + (story.views || 0), 0);

            return {
                ...author,
                storyCount,
                totalViews
            };
        })
        .filter((author) => author.storyCount > 0)
        .sort((left, right) => right.totalViews - left.totalViews);

    if (!authorsWithStats.length) {
        return (
            <section className="authors-grid-section">
                <div className="authors-empty-state">
                    <h2>এখনও কোনো লেখক প্রোফাইল পাওয়া যায়নি</h2>
                    <p>নতুন লেখকদের প্রোফাইল শিগগিরই এখানে দেখা যাবে।</p>
                </div>
            </section>
        );
    }

    return (
        <section className="authors-grid-section">
            <div className="authors-grid-shell">
                <div className="authors-grid">
                    {authorsWithStats.map((author, index) => {
                        const authorLink = `/stories?author=${encodeURIComponent(author.name)}`;
                        const profileMeta = author.username ? `@${author.username}` : 'গল্পকার';
                        const bioText = author.bio?.trim() || 'নিয়মিত লেখালেখির মাধ্যমে নতুন গল্পের ভুবন তৈরি করছেন।';

                        return (
                            <article
                                key={author.id || author.username || author.name}
                                className="author-card fade-in-up"
                                style={{ animationDelay: `${index * 0.08}s` }}
                            >
                                <Link to={authorLink} className="author-card-media">
                                    <SmartImage
                                        src={author.avatar}
                                        alt={author.name}
                                        className="author-card-cover-image"
                                        showFullText={true}
                                    />
                                    <div className="author-card-media-overlay"></div>
                                    {index < 3 && (
                                        <div className="author-card-rank">
                                            <span>#{toBanglaNumber(index + 1)} জনপ্রিয়</span>
                                        </div>
                                    )}
                                </Link>

                                <div className="author-card-body">
                                    <Link to={authorLink} className="author-card-identity">
                                        <div className="author-card-avatar">
                                            <SmartImage
                                                src={author.avatar}
                                                alt={author.name}
                                                className="author-card-avatar-image"
                                                isRound={true}
                                            />
                                        </div>
                                        <div className="author-card-identity-copy">
                                            <div className="author-card-meta-row">
                                                <span className="author-card-handle">{profileMeta}</span>
                                                <span
                                                    className="author-card-verified-badge"
                                                    aria-label="Verified profile"
                                                    title="Verified profile"
                                                >
                                                    <Check size={10} strokeWidth={3} />
                                                </span>
                                            </div>
                                        </div>
                                    </Link>

                                    <Link to={authorLink} className="author-card-name-link">
                                        <h3 className="author-card-name">{author.name}</h3>
                                    </Link>

                                    <div className="author-card-stats">
                                        <div className="author-card-stat">
                                            <BookOpen size={14} />
                                            <div>
                                                <strong>{toBanglaNumber(author.storyCount)}</strong>
                                                <span>টি গল্প</span>
                                            </div>
                                        </div>
                                        <div className="author-card-stat">
                                            <Eye size={14} />
                                            <div>
                                                <strong>{toBanglaNumber(author.totalViews)}</strong>
                                                <span>বার পঠিত</span>
                                            </div>
                                        </div>
                                    </div>

                                    <p className="author-card-bio">{bioText}</p>

                                    <Link to={authorLink} className="author-card-cta">
                                        <span>প্রোফাইল দেখুন</span>
                                        <ArrowUpRight size={16} />
                                    </Link>
                                </div>
                            </article>
                        );
                    })}
                </div>
            </div>
        </section>
    );
};

export default AuthorsGrid;
