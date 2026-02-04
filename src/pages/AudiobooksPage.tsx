import SEO from '../components/SEO';
import Projects from '../components/Projects';

const AudiobooksPage = () => {
    return (
        <>
            <SEO
                title="অডিওবুক - মাহিয়ান আহমেদ"
                description="শুনুন মাহিয়ান আহমেদের কণ্ঠে সেরা বাংলা অডিওবুক এবং থ্রিলার গল্প। ইউটিউব এবং অন্যান্য প্ল্যাটফর্মে প্রকাশিত সকল কাজ।"
                keywords="Bangla Audiobook, Audio Story, Mahean Ahmed, Thriller, Suspense, Horror Audiobook"
                jsonLd={{
                    "@context": "https://schema.org",
                    "@type": "CollectionPage",
                    "name": "Mahean Ahmed Audiobooks",
                    "description": "Collection of Bengali Audiobooks and Audio Stories by Mahean Ahmed.",
                    "url": "https://mahean.com/audiobooks"
                }}
            />
            <div style={{ marginTop: '100px' }}></div>
            <Projects />
        </>
    );
};

export default AudiobooksPage;
