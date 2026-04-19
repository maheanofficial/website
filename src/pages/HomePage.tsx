import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen } from 'lucide-react';
import { getReaderSession, type ReaderSession } from '../utils/readerExperience';
import { ChevronRight } from 'lucide-react';
import Hero from '../components/Hero';
import Skills from '../components/Skills';
import Contact from '../components/Contact';
import SEO from '../components/SEO';
import AdComponent from '../components/AdComponent';
import SkeletonCard from '../components/SkeletonCard';
import StoryCard from '../components/StoryCard';
import StoryCarousel from '../components/StoryCarousel';
import { getCachedStories, getStories, type Story } from '../utils/storyManager';
import { SITE_URL } from '../utils/siteMeta';
import './HomePage.css';

const HomePage = () => {
    const [stories, setStories] = useState<Story[]>(() => getCachedStories());
    const [continueSession] = useState<ReaderSession | null>(() => getReaderSession());

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
    const socialProfiles = [
        'https://www.youtube.com/@maheanahmed',
        'https://www.facebook.com/maheanahmedofficial',
        'https://www.instagram.com/maheanahmed',
        'https://twitter.com/mahean_ahmed',
        'https://www.linkedin.com/in/maheanahmed'
    ];
    const schemaData = [
        {
            '@context': 'https://schema.org',
            '@type': 'Person',
            name: 'Mahean Ahmed',
            url: SITE_URL,
            image: `${SITE_URL}/mahean-3.jpg`,
            sameAs: socialProfiles,
            jobTitle: 'Voice Artist & Audio Storyteller',
            worksFor: {
                '@type': 'Organization',
                name: "Mahean's Audio Stories"
            },
            description: 'Professional Voice Artist and Audio Storyteller creating immersive Bengali audiobooks and thrillers.'
        },
        {
            '@context': 'https://schema.org',
            '@type': 'Organization',
            name: 'Mahean Ahmed',
            url: SITE_URL,
            logo: `${SITE_URL}/assets/logo-solid.png`,
            sameAs: socialProfiles
        },
        {
            '@context': 'https://schema.org',
            '@type': 'WebSite',
            name: 'Mahean Ahmed',
            url: SITE_URL,
            inLanguage: 'bn-BD',
            potentialAction: {
                '@type': 'SearchAction',
                target: {
                    '@type': 'EntryPoint',
                    urlTemplate: `${SITE_URL}/stories?q={search_term_string}`
                },
                'query-input': 'required name=search_term_string'
            }
        }
    ];

    return (
        <div className="home-page fade-in-up">
            <SEO
                title="Mahean Ahmed - ভয়েস আর্টিস্ট ও অডিওবুক ক্রিয়েটর"
                description="Mahean Ahmed-এর অফিশিয়াল পোর্টফোলিও। বাংলা অডিওবুক, রোমাঞ্চকর গল্প এবং ভয়েস ওভার সার্ভিসের জন্য যোগাযোগ করুন। শুনুন সেরা বাংলা থ্রিলার ও সাসপেন্স গল্প।"
                keywords="Mahean Ahmed, বাংলা অডিওবুক, ভয়েস আর্টিস্ট, বাংলা গল্প, অডিও স্টোরিটেলার, Bangla Audio Story, Thriller Story, Horror Story"
                jsonLd={schemaData}
                ogType="profile"
                canonicalUrl="/"
            />

            <Hero />

            {/* Continue Reading Section */}
            {continueSession && (
                <div className="container">
                    <div className="continue-reading-card">
                        {continueSession.coverImage && (
                            <img src={continueSession.coverImage} alt="" className="continue-reading-cover" />
                        )}
                        <div className="continue-reading-info">
                            <span className="continue-reading-kicker">
                                <BookOpen size={14} /> যেখানে ছেড়েছিলেন
                            </span>
                            <p className="continue-reading-title">{continueSession.storyTitle}</p>
                            <p className="continue-reading-part">{continueSession.partLabel}</p>
                            <div className="continue-reading-progress-bar">
                                <div className="continue-reading-progress-fill" style={{ width: `${continueSession.progress}%` }} />
                            </div>
                            <span className="continue-reading-pct">{continueSession.progress}% পড়া হয়েছে</span>
                        </div>
                        <Link to={continueSession.path} className="btn btn-primary continue-reading-btn">
                            পড়তে থাকুন →
                        </Link>
                    </div>
                </div>
            )}

            {/* Featured Stories Section */}
            <div className="container py-12">
                <div className="section-header text-center mb-12">
                    <h2 className="section-title text-4xl font-bold mb-4 gradient-text">জনপ্রিয় গল্পসমূহ</h2>
                    <p className="section-subtitle text-gray-400">যে গল্পগুলো পাঠকদের হৃদয়ে জায়গা করে নিয়েছে</p>
                </div>
                <StoryCarousel stories={stories.filter(s => s.views > 50).slice(0, 5)} />
            </div>

            {/* Most Viewed Stories Section */}
            <div className="container py-8">
                <div className="home-stories-header">
                    <Link to="/stories" className="home-stories-more">
                        আরও দেখুন <ChevronRight size={16} />
                    </Link>
                </div>

                <div className="home-stories-grid">
                    {stories.length === 0 ? (
                        <SkeletonCard count={6} />
                    ) : (
                        stories
                            .slice()
                            .sort((a, b) => {
                                const viewsDiff = (b.views || 0) - (a.views || 0);
                                if (viewsDiff !== 0) return viewsDiff;
                                return new Date(b.date).getTime() - new Date(a.date).getTime();
                            })
                            .slice(0, 12)
                            .map((story, index) => (
                                <StoryCard key={story.id} story={story} index={index} />
                            ))
                    )}
                </div>
            </div>

            <div className="container py-8">
                <AdComponent slot="homepage-middle-ad" />
            </div>

            <Skills />
            <Contact />
        </div>
    );
};

export default HomePage;
