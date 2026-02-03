import Hero from '../components/Hero';
import Skills from '../components/Skills';
import Contact from '../components/Contact';
import SEO from '../components/SEO';
import AdComponent from '../components/AdComponent';

const HomePage = () => {
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
        <div className="home-page">
            <SEO
                title="Mahean Ahmed - ভয়েস আর্টিস্ট ও অডিওবুক ক্রিয়েটর"
                description="Mahean Ahmed-এর অফিশিয়াল পোর্টফোলিও। বাংলা অডিওবুক, রোমাঞ্চকর গল্প এবং ভয়েস ওভার সার্ভিসের জন্য যোগাযোগ করুন। শুনুন সেরা বাংলা থ্রিলার ও সাসপেন্স গল্প।"
                keywords="Mahean Ahmed, বাংলা অডিওবুক, ভয়েস আর্টিস্ট, বাংলা গল্প, অডিও স্টোরিটেলার, Bangla Audio Story, Thriller Story, Horror Story"
                jsonLd={schemaData}
                ogType="profile"
            />

            <Hero />

            <div className="container py-8">
                <AdComponent slot="homepage-middle-ad" />
            </div>

            <Skills />
            <Contact />
        </div>
    );
};

export default HomePage;
