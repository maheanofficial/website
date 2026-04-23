import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Instagram, Facebook } from 'lucide-react';

import { getAllAuthors, type Author } from '../utils/authorManager';
import { getStories, type Story } from '../utils/storyManager';
import SmartImage from './SmartImage';
import BrandLogo from './BrandLogo';
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

const AuthorDefaultAvatar = () => (
    <div className="author-default-avatar">
        <BrandLogo size="sm" />
    </div>
);

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
        return () => { isMounted = false; };
    }, []);

    const authorsWithStats = authors
        .map((author) => {
            const authorStories = allStories.filter((story) => isStoryOwnedByAuthor(story, author));
            const storyCount = authorStories.length;
            const totalViews = authorStories.reduce((sum, story) => sum + (story.views || 0), 0);
            return { ...author, storyCount, totalViews };
        })
        .filter((author) => author.storyCount > 0)
        .sort((a, b) => b.totalViews - a.totalViews);

    if (!authorsWithStats.length) {
        return (
            <section className="authors-grid-section">
                <div className="authors-empty-state">
                    <h2>এখনও কোনো লেখক প্রোফাইল পাওয়া যায়নি</h2>
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
                        const authorLink = `/authors/${encodeURIComponent(author.username || author.name)}`;
                        const bioText = author.bio?.trim() || '';
                        const hasAvatar = Boolean(author.avatar?.trim());
                        const links = author.links || [];
                        const hasInstagram = links.some((l) => l.name?.toLowerCase().includes('instagram'));
                        const hasFacebook = links.some((l) => l.name?.toLowerCase().includes('facebook'));

                        return (
                            <article
                                key={author.id || author.username || author.name}
                                className="author-card fade-in-up"
                                style={{ animationDelay: `${index * 0.07}s` }}
                            >
                                <Link to={authorLink} className="author-card-inner">
                                    <div className="author-card-avatar-wrap">
                                        {hasAvatar ? (
                                            <SmartImage
                                                src={author.avatar}
                                                alt={author.name}
                                                className="author-card-avatar-img"
                                                isRound={true}
                                            />
                                        ) : (
                                            <AuthorDefaultAvatar />
                                        )}
                                    </div>

                                    {(hasInstagram || hasFacebook) && (
                                        <div className="author-card-socials">
                                            {hasInstagram && (
                                                <span className="author-card-social-icon" aria-label="Instagram">
                                                    <Instagram size={15} />
                                                </span>
                                            )}
                                            {hasFacebook && (
                                                <span className="author-card-social-icon" aria-label="Facebook">
                                                    <Facebook size={15} />
                                                </span>
                                            )}
                                        </div>
                                    )}

                                    <h3 className="author-card-name">{author.name}</h3>

                                    {bioText && (
                                        <p className="author-card-bio">{bioText}</p>
                                    )}
                                </Link>
                            </article>
                        );
                    })}
                </div>
            </div>
        </section>
    );
};

export default AuthorsGrid;
