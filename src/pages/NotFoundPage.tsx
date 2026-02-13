import { Link } from 'react-router-dom';
import SEO from '../components/SEO';

const NotFoundPage = () => {
    return (
        <section className="container py-20 text-center">
            <SEO
                title="পৃষ্ঠা পাওয়া যায়নি - Mahean Ahmed"
                description="আপনি যে পৃষ্ঠাটি খুঁজছেন সেটি পাওয়া যায়নি।"
                canonicalUrl="/404"
                noIndex
                noFollow
            />
            <h1 className="text-4xl font-bold text-white mb-4">404</h1>
            <p className="text-gray-400 mb-8">
                এই পেজটি পাওয়া যায়নি।
            </p>
            <div className="flex items-center justify-center gap-4">
                <Link to="/" className="btn btn-primary">
                    হোমে ফিরুন
                </Link>
                <Link to="/stories" className="btn btn-secondary">
                    গল্প দেখুন
                </Link>
            </div>
        </section>
    );
};

export default NotFoundPage;
