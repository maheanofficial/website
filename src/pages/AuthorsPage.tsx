import SEO from '../components/SEO';
import AuthorsGrid from '../components/AuthorsGrid';
import { SITE_URL } from '../utils/siteMeta';
import './AuthorsPage.css';

const AuthorsPage = () => {
    const authorsSchema = {
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        "name": "বাংলা লেখক তালিকা",
        "description": "আমাদের সবচেয়ে মনোমুগ্ধকর গল্পের পিছনের সৃজনশীল মনদের সাথে পরিচিত হন।",
        "url": `${SITE_URL}/authors`
    };

    return (
        <div className="authors-page page-offset">
            <SEO
                title="লেখকগণ - GolpoHub"
                description="আমাদের সবচেয়ে মনোমুগ্ধকর গল্পের পিছনের সৃজনশীল মনদের সাথে পরিচিত হন।"
                keywords="Bangla Authors, Bengali Writers, Story Authors"
                canonicalUrl="/authors"
                jsonLd={authorsSchema}
            />

            <section className="authors-hero">
                <div className="container">
                    <div className="authors-hero-content">
                        <h1 className="authors-title">লেখকগণ</h1>
                        <p className="authors-subtitle">
                            আমাদের সবচেয়ে মনোমুগ্ধকর গল্পের পিছনের সৃজনশীল মনদের সাথে পরিচিত হন।
                        </p>
                    </div>
                </div>
            </section>

            <AuthorsGrid />
        </div>
    );
};

export default AuthorsPage;
