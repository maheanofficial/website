import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, Clock3, Eye, Layers3 } from 'lucide-react';

import { getAllAuthors, type Author } from '../utils/authorManager';
import { formatDate } from '../utils/dateFormatter';
import { toBanglaNumber } from '../utils/numberFormatter';
import type { Story } from '../utils/storyManager';
import { buildTagFilterPath, formatTagLabel } from '../utils/storyFilters';
import SmartImage from './SmartImage';
import './StoryCard.css';

interface StoryCardProps {
    story: Story;
    index?: number;
}

const normalizeAuthorKey = (value?: string) => String(value || '').trim().toLowerCase();

let authorDirectoryPromise: Promise<Author[]> | null = null;
const authorAvatarCache = new Map<string, string>();

const resolveAuthorAvatar = async (authorName: string) => {
    const authorKey = normalizeAuthorKey(authorName);
    if (!authorKey) return '';

    if (authorAvatarCache.has(authorKey)) {
        return authorAvatarCache.get(authorKey) || '';
    }

    if (!authorDirectoryPromise) {
        authorDirectoryPromise = getAllAuthors().catch((error) => {
            console.warn('Failed to load authors for story cards.', error);
            authorDirectoryPromise = null;
            return [];
        });
    }

    const authors = await authorDirectoryPromise;
    const matchedAuthor = authors.find((author) => {
        const nameKey = normalizeAuthorKey(author.name);
        const usernameKey = normalizeAuthorKey(author.username);
        return nameKey === authorKey || usernameKey === authorKey;
    });

    const avatar = matchedAuthor?.avatar?.trim() || '';
    authorAvatarCache.set(authorKey, avatar);
    return avatar;
};

const estimateStoryReadMinutes = (story: Story) => {
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

export default function StoryCard({ story, index = 0 }: StoryCardProps) {
    const [authorAvatar, setAuthorAvatar] = useState('');
    const displayTags = (story.tags || []).filter(Boolean).slice(0, 2);
    const coverSource = story.cover_image || story.image || '';
    const displayExcerpt = (story.excerpt || 'গল্পের সারাংশ এখানে দেখা যাবে...').trim();
    const totalParts = Math.max(1, story.parts?.length || 1);
    const storySeason = Number.isFinite(story.season)
        ? Math.max(1, Math.floor(story.season as number))
        : 1;
    const readMinutes = estimateStoryReadMinutes(story);

    useEffect(() => {
        let isMounted = true;

        const loadAuthorAvatar = async () => {
            const avatar = await resolveAuthorAvatar(story.author || '');
            if (!isMounted) return;
            setAuthorAvatar(avatar);
        };

        void loadAuthorAvatar();

        return () => {
            isMounted = false;
        };
    }, [story.author]);

    return (
        <article
            className="story-card story-card-premium fade-in-up"
            style={{ animationDelay: `${index * 0.1}s` }}
        >
            <Link to={`/stories/${story.slug || story.id}`} className="story-card-cover-link">
                <div className="story-card-poster">
                    {coverSource ? (
                        <SmartImage
                            src={coverSource}
                            alt={story.title}
                            className="story-card-poster-image"
                            showFullText={false}
                        />
                    ) : (
                        <div className="story-card-poster-fallback">
                            <SmartImage
                                alt={story.title}
                                className="story-card-poster-fallback-art"
                                showFullText={true}
                            />
                        </div>
                    )}

                    <div className="story-card-poster-top">
                        <span className="story-card-floating-badge">
                            {story.category || 'গল্প'}
                        </span>
                    </div>
                </div>
            </Link>

            <div className="story-card-content">
                <div className="story-card-meta-strip">
                    <span className="story-card-date">{formatDate(story.date)}</span>
                    {storySeason > 1 ? (
                        <span className="story-card-season-pill">
                            {`সিজন ${toBanglaNumber(storySeason)}`}
                        </span>
                    ) : null}
                </div>

                <Link to={`/stories/${story.slug || story.id}`} className="story-card-title-link">
                    <h3 className="card-title-small">{story.title}</h3>
                </Link>

                <div className="story-card-quick-stats">
                    <span className="story-stat-pill">
                        <Clock3 size={14} />
                        {toBanglaNumber(readMinutes)} মিনিট
                    </span>
                    <span className="story-stat-pill">
                        <Layers3 size={14} />
                        {toBanglaNumber(totalParts)} পর্ব
                    </span>
                    <span className="story-stat-pill">
                        <Eye size={14} />
                        {toBanglaNumber(story.views || 0)}
                    </span>
                </div>

                <p className="story-excerpt line-clamp-3">
                    {displayExcerpt}
                </p>

                {displayTags.length > 0 ? (
                    <div className="story-tags">
                        {displayTags.map((tag) => (
                            <Link key={`${story.id}-${tag}`} to={buildTagFilterPath(tag)} className="tag">
                                {formatTagLabel(tag)}
                            </Link>
                        ))}
                    </div>
                ) : null}

                <div className="story-card-author-row">
                    <div className="author-avatar-small">
                        <SmartImage
                            src={authorAvatar}
                            alt={story.author || 'Author'}
                            className="author-avatar-small-image"
                            isRound={true}
                        />
                    </div>
                    <div className="story-card-author-copy">
                        <span className="author-name-small">{story.author || 'লেখক'}</span>
                        <span className="author-role-small">{totalParts > 1 ? 'ধারাবাহিক লেখক' : 'গল্পকার'}</span>
                    </div>
                </div>

                <div className="card-divider"></div>

                <Link to={`/stories/${story.slug || story.id}`} className="story-card-read-link">
                    <span>এখনই পড়ুন</span>
                    <ArrowUpRight size={16} />
                </Link>
            </div>
        </article>
    );
}
