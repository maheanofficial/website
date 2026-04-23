import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell, BellOff } from 'lucide-react';
import SEO from '../components/SEO';
import SmartImage from '../components/SmartImage';
import { getCachedStories, getStories, type Story } from '../utils/storyManager';
import { toBanglaNumber } from '../utils/numberFormatter';
import { SITE_URL } from '../utils/siteMeta';
import { getCurrentUser } from '../utils/auth';
import { isReaderFollowingCategory, toggleReaderCategoryFollow } from '../utils/readerStateManager';
import {
    buildCategoryFilterPath,
    normalizeCategoryFilterKey,
    normalizeCategoryFilterList
} from '../utils/storyFilters';
import './CategoriesPage.css';

const CategoriesPage = () => {
    const [stories, setStories] = useState<Story[]>(() => getCachedStories());
    const [userId, setUserId] = useState<string | null>(null);
    const [followedCategories, setFollowedCategories] = useState<Set<string>>(new Set());

    useEffect(() => {
        getCurrentUser().then((u) => { if (u?.id) setUserId(u.id); });
    }, []);

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
    const categoryDescriptions: Record<string, string> = {
        'ক্লাসিক': 'চিরকালীন বাংলা সাহিত্যের অনন্য সব গল্প ও উপন্যাসের সংগ্রহ।',
        'রোমান্টিক': 'ভালোবাসা, অনুভূতি আর সম্পর্কের গল্প একসাথে।',
        'গোয়েন্দা': 'রহস্যের জট খুলতে তৈরি বুদ্ধিদীপ্ত গল্প।',
        'থ্রিলার': 'অপ্রত্যাশিত টুইস্ট আর টান টান উত্তেজনার গল্প।',
        'হরর': 'ভৌতিক অভিজ্ঞতা আর শিহরণ জাগানো কাহিনি।',
        'উপন্যাস': 'বড় গল্পের বিস্তৃত জগৎ, চরিত্র আর আবেগের মেলবন্ধন।',
        'অ্যাডভেঞ্চার': 'দুঃসাহসিক অভিযান আর রোমাঞ্চকর যাত্রা।'
    };

    const categoryMap = new Map<string, { name: string; count: number; views: number; cover?: string; sampleTitle?: string }>();

    stories.forEach((story) => {
        const cover = story.cover_image || story.image;
        normalizeCategoryFilterList(story.categories, story.category).forEach((name) => {
            const categoryKey = normalizeCategoryFilterKey(name);
            if (!categoryKey) return;

            const existing = categoryMap.get(categoryKey);
            if (existing) {
                existing.count += 1;
                existing.views += story.views || 0;
                if (!existing.cover && cover) existing.cover = cover;
            } else {
                categoryMap.set(categoryKey, {
                    name,
                    count: 1,
                    views: story.views || 0,
                    cover,
                    sampleTitle: story.title
                });
            }
        });
    });

    const categories = Array.from(categoryMap.values()).sort((a, b) => {
        if (b.count !== a.count) return b.count - a.count;
        return b.views - a.views;
    });

    const categoriesSchema = {
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        "name": "বাংলা গল্পের ক্যাটাগরি",
        "description": "বাংলা গল্পের জনপ্রিয় ক্যাটাগরি, গল্প সংখ্যা এবং পাঠকপ্রিয়তা দেখুন।",
        "url": `${SITE_URL}/categories`,
        "mainEntity": {
            "@type": "ItemList",
            "itemListElement": categories.map((category, index) => ({
                "@type": "ListItem",
                "position": index + 1,
                "name": category.name,
                "url": `${SITE_URL}${buildCategoryFilterPath(category.name)}`
            }))
        }
    };

    return (
        <div className="categories-page page-offset">
            <SEO
                title="ক্যাটাগরি - বাংলা গল্পের ধরনসমূহ | Mahean Ahmed"
                description="বাংলা গল্পের জনপ্রিয় ক্যাটাগরি, গল্প সংখ্যা, এবং পাঠকপ্রিয়তা দেখুন।"
                keywords="Bangla Story Categories, Bengali Genres, Thriller, Horror, Romance"
                canonicalUrl="/categories"
                jsonLd={categoriesSchema}
            />

            <div className="container">
                <div className="categories-hero">
                    <h1 className="categories-title">ক্যাটাগরি</h1>
                    <p className="categories-subtitle">
                        ক্যাটাগরি অনুযায়ী সিরিজসমূহ।
                    </p>
                </div>

                <div className="categories-grid">
                    {categories.map((category) => {
                        const isFollowed = userId
                            ? (followedCategories.has(category.name) || isReaderFollowingCategory(userId, category.name))
                            : false;
                        return (
                        <div key={category.name} className="category-card-wrap">
                        <Link
                            to={buildCategoryFilterPath(category.name)}
                            className="category-card"
                        >
                            <div className="category-cover">
                                <SmartImage
                                    src={category.cover}
                                    alt={category.name}
                                    className="category-cover-image"
                                    showFullText={true}
                                />
                                <div className="category-cover-overlay"></div>
                                <div className="category-cover-text">
                                    <span className="category-name">{category.name}</span>
                                    <span className="category-count">{toBanglaNumber(category.count)} টি গল্প</span>
                                </div>
                            </div>

                            <div className="category-body">
                                <p className="category-description">
                                    {categoryDescriptions[category.name] || `${category.name} ঘরানার আরও নতুন গল্প খুঁজে নিন।`}
                                </p>
                                <div className="category-meta">
                                    <span>পড়া হয়েছে {toBanglaNumber(category.views)} বার</span>
                                    {category.sampleTitle && <span>সাম্প্রতিক: {category.sampleTitle}</span>}
                                </div>
                            </div>
                        </Link>
                        {userId && (
                            <button
                                className={`category-follow-btn ${isFollowed ? 'followed' : ''}`}
                                onClick={(e) => {
                                    e.preventDefault();
                                    toggleReaderCategoryFollow(userId, category.name);
                                    setFollowedCategories((prev) => {
                                        const next = new Set(prev);
                                        if (isFollowed) next.delete(category.name);
                                        else next.add(category.name);
                                        return next;
                                    });
                                }}
                            >
                                {isFollowed ? <><BellOff size={13} /> অনুসরণ বন্ধ</> : <><Bell size={13} /> অনুসরণ করুন</>}
                            </button>
                        )}
                        </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default CategoriesPage;
