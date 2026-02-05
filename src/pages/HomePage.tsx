import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import Hero from '../components/Hero';
import Skills from '../components/Skills';
import Contact from '../components/Contact';
import SEO from '../components/SEO';
import AdComponent from '../components/AdComponent';
import StoryCard from '../components/StoryCard';
import StoryCarousel from '../components/StoryCarousel';
import { getStories } from '../utils/storyManager';

const HomePage = () => {
    const [activeTab, setActiveTab] = useState<'all' | 'completed' | 'ongoing'>('all');
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
            />

            <Hero />

            {/* Featured Stories Section */}
            <div className="container py-12">
                <div className="section-header text-center mb-12">
                    <h2 className="section-title text-4xl font-bold mb-4 gradient-text">জনপ্রিয় গল্পসমূহ</h2>
                    <p className="section-subtitle text-gray-400">যে গল্পগুলো পাঠকদের হৃদয়ে জায়গা করে নিয়েছে</p>
                </div>
                <StoryCarousel stories={getStories().filter(s => s.views > 50).slice(0, 5)} />
            </div>

            {/* Stories Section with Tabs */}
            <div className="container py-8">
                {/* Tab Menu Header */}
                <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
                    <div className="flex items-center gap-2 bg-[#1f2937]/50 p-1 rounded-full border border-[#374151]">
                        <button
                            onClick={() => setActiveTab('all')}
                            className={`px-6 py-2 rounded-full text-sm font-bold transition-all ${activeTab === 'all'
                                ? 'bg-amber-500 text-white shadow-lg'
                                : 'text-gray-400 hover:text-white hover:bg-white/5'
                                }`}
                        >
                            সব
                        </button>
                        <button
                            onClick={() => setActiveTab('completed')}
                            className={`px-6 py-2 rounded-full text-sm font-bold transition-all ${activeTab === 'completed'
                                ? 'bg-[#22c55e] text-white shadow-lg'
                                : 'text-gray-400 hover:text-white hover:bg-white/5'
                                }`}
                        >
                            সমাপ্ত
                        </button>
                        <button
                            onClick={() => setActiveTab('ongoing')}
                            className={`px-6 py-2 rounded-full text-sm font-bold transition-all ${activeTab === 'ongoing'
                                ? 'bg-amber-500 text-white shadow-lg'
                                : 'text-gray-400 hover:text-white hover:bg-white/5'
                                }`}
                        >
                            চলমান
                        </button>
                    </div>

                    <Link to="/stories" className="text-amber-500 hover:text-amber-400 font-medium text-sm flex items-center gap-1">
                        আরও দেখুন <ChevronRight size={16} />
                    </Link>
                </div>

                {/* Filtered Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {getStories()
                        .filter(story => {
                            if (activeTab === 'all') return true;
                            // Check status or default to demo logic if status missing
                            const isCompleted = story.status === 'completed' || (story.parts && story.parts.length > 10);
                            return activeTab === 'completed' ? isCompleted : !isCompleted;
                        })
                        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                        .slice(0, 8)
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
