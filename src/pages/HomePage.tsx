import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import Hero from '../components/Hero';
import Skills from '../components/Skills';
import Contact from '../components/Contact';
import SEO from '../components/SEO';
import AdComponent from '../components/AdComponent';
import StoryCard from '../components/StoryCard';
import StoryCarousel from '../components/StoryCarousel';
import { getStories, type Story } from '../utils/storyManager';
import './HomePage.css';

const HomePage = () => {
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
    const schemaData = {
        "@context": "https://schema.org",
        "@type": "Person",
        "name": "Mahean Ahmed",
        "url": "https://mahean.com",
        "image": "https://mahean.com/mahean-3.jpg",
        "sameAs": [
            "https://www.youtube.com/@maheanahmed",
            "https://www.facebook.com/maheanahmed",
            "https://www.instagram.com/maheanahmed",
            "https://twitter.com/mahean_ahmed",
            "https://www.linkedin.com/in/maheanahmed"
        ],
        "jobTitle": "Voice Artist & Audio Storyteller",
        "worksFor": {
            "@type": "Organization",
            "name": "Mahean's Audio Stories"
        },
        "description": "Professional Voice Artist and Audio Storyteller creating immersive Bengali audiobooks and thrillers."
    };

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
                    {stories
                        .sort((a, b) => {
                            const viewsDiff = (b.views || 0) - (a.views || 0);
                            if (viewsDiff !== 0) return viewsDiff;
                            return new Date(b.date).getTime() - new Date(a.date).getTime();
                        })
                        .slice(0, 12)
                        .map((story, index) => (
                            <StoryCard key={story.id} story={story} index={index} />
                        ))}
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
