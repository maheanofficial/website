import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import SEO from '../components/SEO';
import { getStories, type Story } from '../utils/storyManager';
import { toBanglaNumber } from '../utils/numberFormatter';
import { SITE_URL } from '../utils/siteMeta';
import './TagsPage.css';

const TagsPage = () => {
    const [stories, setStories] = useState<Story[]>([]);

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
            const normalized = tag.trim();
            if (!normalized) return;
            const existing = tagMap.get(normalized);
            if (existing) {
                existing.count += 1;
                existing.views += story.views || 0;
            } else {
                tagMap.set(normalized, {
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
        "name": "বাংলা গল্পের ট্যাগ",
        "description": "জনপ্রিয় গল্পের ট্যাগ অনুযায়ী গল্প খুঁজে নিন।",
        "url": `${SITE_URL}/tags`,
        "mainEntity": {
            "@type": "ItemList",
            "itemListElement": tags.map((tag, index) => ({
                "@type": "ListItem",
                "position": index + 1,
                "name": tag.name,
                "url": `${SITE_URL}/stories?tag=${encodeURIComponent(tag.name)}`
            }))
        }
    };

    return (
        <div className="tags-page page-offset">
            <SEO
                title="ট্যাগ - গল্পের টপিকসমূহ | Mahean Ahmed"
                description="জনপ্রিয় ট্যাগ দেখে সহজে আপনার পছন্দের গল্প খুঁজে নিন।"
                keywords="Bangla Story Tags, Bengali Topics, Thriller Tags, Romance Tags"
                canonicalUrl="/tags"
                jsonLd={tagsSchema}
            />

            <div className="container">
                <div className="tags-hero">
                    <span className="tags-kicker">গল্পের ট্যাগ</span>
                    <h1 className="tags-title">টপিক ধরে গল্প খুঁজুন</h1>
                    <p className="tags-subtitle">
                        রোমান্স থেকে রহস্য—প্রতিটি ট্যাগে লুকিয়ে আছে আপনার পছন্দের গল্প।
                    </p>
                </div>

                <div className="tags-grid">
                    {tags.map((tag) => (
                        <Link
                            key={tag.name}
                            to={`/stories?tag=${encodeURIComponent(tag.name)}`}
                            className="tag-card"
                        >
                            <div className="tag-pill">#{tag.name}</div>
                            <div className="tag-meta">
                                <span>{toBanglaNumber(tag.count)} টি গল্প</span>
                                <span>{toBanglaNumber(tag.views)} বার পড়া</span>
                            </div>
                        </Link>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default TagsPage;
