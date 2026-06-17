import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import SEO from '../components/SEO';
import { getCachedStories, getStories, type Story } from '../utils/storyManager';
import { toBanglaNumber } from '../utils/numberFormatter';
import { SITE_URL } from '../utils/siteMeta';
import { buildTagFilterPath, formatTagLabel, normalizeTagFilterKey, normalizeTagFilterValue } from '../utils/storyFilters';
import { buildCollectionPageSchema, buildBreadcrumbSchema } from '../utils/seoSchema';
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

    const tagsSchema = [
        buildCollectionPageSchema(
            'বাংলা গল্পের ট্যাগ - Mahean Ahmed',
            'ট্যাগ দিয়ে পছন্দের বাংলা গল্প সহজে খুঁজে নিন। থ্রিলার, হরর, রোমান্টিক, সাসপেন্সসহ নানা বিষয়ের গল্প।',
            `${SITE_URL}/tags`,
            tags.map(tag => ({
                name: tag.name,
                url: `${SITE_URL}${buildTagFilterPath(tag.name)}`,
            })),
        ),
        buildBreadcrumbSchema([
            { name: 'হোম', url: '/' },
            { name: 'ট্যাগ', url: '/tags' },
        ]),
    ];

    return (
        <div className="tags-page page-offset">
            <SEO
                title="ট্যাগ - বাংলা গল্পের বিষয়ভিত্তিক তালিকা | Mahean Ahmed"
                description="ট্যাগ দিয়ে পছন্দের বাংলা গল্প সহজে খুঁজে নিন। থ্রিলার, হরর, রোমান্টিক, সাসপেন্সসহ নানা বিষয়ের গল্প এক জায়গায়।"
                keywords="Bangla Story Tags, Bengali Topics, Thriller Tags, Romance Tags, Horror Tags, বাংলা গল্পের ট্যাগ, বাংলা থ্রিলার, বাংলা হরর"
                canonicalUrl="/tags"
                jsonLd={tagsSchema}
            />

            <div className="container">
                <div className="tags-hero">
                    <span className="tags-kicker">গল্পের বিষয় / ট্যাগ</span>
                    <h1 className="tags-title">ট্যাগ দিয়ে গল্প খুঁজুন</h1>
                    <p className="tags-subtitle">
                        থ্রিলার থেকে রোমান্স, প্রতিটি ট্যাগ আপনাকে পছন্দের গল্পের কাছে নিয়ে যাবে।
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
                                <span>{toBanglaNumber(tag.count)} টি গল্প</span>
                                <span>{toBanglaNumber(tag.views)} পাঠ</span>
                            </div>
                        </Link>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default TagsPage;
