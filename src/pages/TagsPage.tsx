import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import SEO from '../components/SEO';
import { getCachedStories, getStories, type Story } from '../utils/storyManager';
import { toBanglaNumber } from '../utils/numberFormatter';
import { SITE_URL } from '../utils/siteMeta';
import { buildTagFilterPath, normalizeTagFilterKey, normalizeTagFilterValue } from '../utils/storyFilters';
import './TagsPage.css';

const TagsPage = () => {
    const [stories, setStories] = useState<Story[]>(() => getCachedStories());

    useEffect(() => {
        let isMounted = true;
        const loadStories = async () => {
            const data = await getStories();
            if (isMounted) setStories(data);
        };
        loadStories();
        return () => { isMounted = false; };
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
                tagMap.set(tagKey, { name: normalized, count: 1, views: story.views || 0 });
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
        "description": "বিষয় অনুযায়ী বাংলা গল্প খুঁজুন।",
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
                title="ট্যাগ - GolpoHub"
                description="বিষয় অনুযায়ী বাংলা গল্প খুঁজুন।"
                keywords="Bangla Story Tags, Bengali Topics"
                canonicalUrl="/tags"
                jsonLd={tagsSchema}
            />

            <div className="container">
                <div className="tags-hero">
                    <h1 className="tags-title">ট্যাগ</h1>
                    <p className="tags-subtitle">
                        বিষয় অনুযায়ী আপনার পছন্দের বাংলা গল্প খুঁজুন।
                    </p>
                    <p style={{ maxWidth: '640px', margin: '14px auto 0', color: 'rgba(255,255,255,0.45)', fontSize: '0.9rem', lineHeight: '1.75', fontFamily: "'Hind Siliguri', sans-serif" }}>
                        GolpoHub-এ গল্পগুলো বিভিন্ন ট্যাগে সাজানো আছে — যেমন ভূত, রহস্য, ভালোবাসা, পুলিশ, হত্যাকাণ্ড, বন্ধুত্ব, পরিবার, মুক্তিযুদ্ধ এবং আরও অনেক কিছু। ট্যাগে ক্লিক করলেই সেই বিষয়ের সব গল্প এক জায়গায় পাবেন।
                    </p>
                </div>

                <div className="tags-grid">
                    {tags.map((tag) => (
                        <Link
                            key={tag.name}
                            to={buildTagFilterPath(tag.name)}
                            className="tag-card"
                        >
                            <div className="tag-card__name">
                                <span className="tag-card__hash">#</span>{tag.name}
                            </div>
                            <div className="tag-card__meta">
                                <span>{toBanglaNumber(tag.count)}টি গল্প</span>
                                <span>{toBanglaNumber(tag.views)} ভিউ</span>
                            </div>
                        </Link>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default TagsPage;
