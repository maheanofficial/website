import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import SEO from '../components/SEO';
import { getCachedStories, getStories, type Story } from '../utils/storyManager';
import { toBanglaNumber } from '../utils/numberFormatter';
import { SITE_URL } from '../utils/siteMeta';
import { buildTagFilterPath, formatTagLabel, normalizeTagFilterKey, normalizeTagFilterValue } from '../utils/storyFilters';
import './TagsPage.css';

const TagsPage = () => {
    const [stories, setStories] = useState<Story[]>(() => getCachedStories());

    useEffect(() => {
        let isMounted = true;
        const loadStories = async () => {
            const data = await getStories();
            if (isMounted) {
                setStories(data);
            }
        };
        loadStories();
        return () => {
            isMounted = false;
        };
    }, []);
    const tagMap = new Map<string, { name: string; count: number; views: number }>();

    stories.forEach((story) => {
        (story.tags || []).forEach((tag) => {
            const normalized = normalizeTagFilterValue(tag);
            const tagKey = normalizeTagFilterKey(tag);
            if (!tagKey) return;

            const existing = tagMap.get(tagKey);
            if (existing) {
                existing.count += 1;
                existing.views += story.views || 0;
            } else {
                tagMap.set(tagKey, {
                    name: normalized,
                    count: 1,
                    views: story.views || 0
                });
            }
        });
    });

    const tags = Array.from(tagMap.values()).sort((a, b) => {
        if (b.count !== a.count) return b.count - a.count;
        return b.views - a.views;
    });

    const tagsSchema = {
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        "name": "Bangla Story Tags",
        "description": "Browse stories by popular tags and topics.",
        "url": `${SITE_URL}/tags`,
        "mainEntity": {
            "@type": "ItemList",
            "itemListElement": tags.map((tag, index) => ({
                "@type": "ListItem",
                "position": index + 1,
                "name": tag.name,
                "url": `${SITE_URL}${buildTagFilterPath(tag.name)}`
            }))
        }
    };

    return (
        <div className="tags-page page-offset">
            <SEO
                title="Tags - Story Topics | Mahean Ahmed"
                description="Browse popular tags to quickly find stories by topic."
                keywords="Bangla Story Tags, Bengali Topics, Thriller Tags, Romance Tags"
                canonicalUrl="/tags"
                jsonLd={tagsSchema}
            />

            <div className="container">
                <div className="tags-hero">
                    <span className="tags-kicker">Story tags</span>
                    <h1 className="tags-title">Find Stories By Topic</h1>
                    <p className="tags-subtitle">
                        From romance to mystery, every tag opens a focused story list.
                    </p>
                </div>

                <div className="tags-grid">
                    {tags.map((tag) => (
                        <Link
                            key={tag.name}
                            to={buildTagFilterPath(tag.name)}
                            className="tag-card"
                        >
                            <div className="tag-pill">{formatTagLabel(tag.name)}</div>
                            <div className="tag-meta">
                                <span>{toBanglaNumber(tag.count)} stories</span>
                                <span>{toBanglaNumber(tag.views)} reads</span>
                            </div>
                        </Link>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default TagsPage;
