import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import SEO from '../components/SEO';
import SmartImage from '../components/SmartImage';
import { getStories, type Story } from '../utils/storyManager';
import { toBanglaNumber } from '../utils/numberFormatter';
import { SITE_URL } from '../utils/siteMeta';
import './CategoriesPage.css';

const CategoriesPage = () => {
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
        if (!story.category) return;
        const name = story.category.trim();
        if (!name) return;

        const cover = story.cover_image || story.image;
        const existing = categoryMap.get(name);
        if (existing) {
            existing.count += 1;
            existing.views += story.views || 0;
            if (!existing.cover && cover) existing.cover = cover;
        } else {
            categoryMap.set(name, {
                name,
                count: 1,
                views: story.views || 0,
                cover,
                sampleTitle: story.title
            });
        }
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
                "url": `${SITE_URL}/stories?category=${encodeURIComponent(category.name)}`
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
                    <span className="categories-kicker">গল্পের ক্যাটাগরি</span>
                    <h1 className="categories-title">সব ধরনের গল্প এক জায়গায়</h1>
                    <p className="categories-subtitle">
                        আপনার পছন্দের ক্যাটাগরি বেছে নিয়ে সেরা বাংলা গল্পগুলো পড়ুন এবং নতুন লেখকদের সাথে পরিচিত হন।
                    </p>
                </div>

                <div className="categories-grid">
                    {categories.map((category) => (
                        <Link
                            key={category.name}
                            to={`/stories?category=${encodeURIComponent(category.name)}`}
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
                    ))}
                </div>
            </div>
        </div>
    );
};

export default CategoriesPage;
