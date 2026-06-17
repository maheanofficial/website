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
import { buildPersonSchema, buildOrganizationSchema, buildWebSiteSchema } from '../utils/seoSchema';
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
    const schemaData = [
        buildPersonSchema(),
        buildOrganizationSchema(),
        buildWebSiteSchema(),
    ];

    return (
        <div className="home-page fade-in-up">
            <SEO
                title="Mahean Ahmed - ভয়েস আর্টিস্ট ও বাংলা অডিওবুক ক্রিয়েটর"
                description="Mahean Ahmed-এর অফিশিয়াল পোর্টফোলিও। বাংলা অডিওবুক, থ্রিলার, হরর ও সাসপেন্স গল্পের বিশাল সংগ্রহ। পেশাদার ভয়েস আর্টিস্ট Mahean Ahmed-এর সাথে সেরা বাংলা অডিও গল্পের জগতে প্রবেশ করুন।"
                keywords="Mahean Ahmed, বাংলা অডিওবুক, ভয়েস আর্টিস্ট, বাংলা গল্প, অডিও স্টোরিটেলার, Bangla Audio Story, Thriller Story, Horror Story, বাংলা থ্রিলার, বাংলা হরর, বাংলা সাসপেন্স, Bangla Audiobook Free"
                jsonLd={schemaData}
                ogType="website"
                canonicalUrl="/"
                ogImage="/mahean-3.jpg"
                imageAlt="Mahean Ahmed - বাংলা ভয়েস আর্টিস্ট"
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
