import { Link } from 'react-router-dom';
import './Hero.css';

const Hero = () => {
    return (
        <section className="hero-section">
            <div className="container hero-container">
                <div className="hero-content">
                    <h1 className="hero-title">যেখানে গল্পগুলো জীবন্ত হয়ে ওঠে</h1>
                    <p className="hero-description">
                        চলুন, মনের কথা তুলে ধরি গল্পে! পড়ুন দারুণ সব লেখকের লেখা আর শেয়ার করুন নিজের গল্প—এক কমিউনিটিতে, যেখানে কল্পনা ছড়ায় ডানা!
                    </p>
                    <div className="hero-cta">
                        <Link to="/series" className="hero-btn hero-btn--primary">গল্প পড়ুন</Link>
                        <Link to="/signup" className="hero-btn hero-btn--secondary">গল্প লিখুন</Link>
                    </div>
                </div>
            </div>

            {/* Feature highlights — static content for crawlers */}
            <div className="container hero-features">
                <div className="hero-feature-card">
                    <span className="hero-feature-icon">📖</span>
                    <h2 className="hero-feature-title">মৌলিক বাংলা গল্প</h2>
                    <p className="hero-feature-desc">
                        থ্রিলার, হরর, রোমান্স, অ্যাডভেঞ্চার, সিরিজ — বিভিন্ন ধরনের মৌলিক বাংলা গল্প পড়ুন একটি প্ল্যাটফর্মে। প্রতিদিন নতুন গল্প যোগ হচ্ছে।
                    </p>
                </div>
                <div className="hero-feature-card">
                    <span className="hero-feature-icon">🎙️</span>
                    <h2 className="hero-feature-title">বাংলা অডিওবুক</h2>
                    <p className="hero-feature-desc">
                        মাহিয়ান আহমেদের কণ্ঠে শুনুন অসাধারণ সব বাংলা অডিওবুক ও গল্প। চলতে চলতে, ঘুমানোর আগে — যখন খুশি গল্পের জগতে হারিয়ে যান।
                    </p>
                </div>
                <div className="hero-feature-card">
                    <span className="hero-feature-icon">✍️</span>
                    <h2 className="hero-feature-title">গল্প লিখুন ও প্রকাশ করুন</h2>
                    <p className="hero-feature-desc">
                        আপনিও লেখক হতে পারেন। আমাদের লেখক পোর্টালে নিজের মৌলিক গল্প জমা দিন এবং হাজারো পাঠকের কাছে পৌঁছে দিন আপনার সৃষ্টিকর্ম।
                    </p>
                </div>
                <div className="hero-feature-card">
                    <span className="hero-feature-icon">🌟</span>
                    <h2 className="hero-feature-title">সেরা বাংলা লেখকরা</h2>
                    <p className="hero-feature-desc">
                        বাংলাদেশের প্রতিভাবান নতুন ও অভিজ্ঞ লেখকদের মৌলিক সৃষ্টিকর্ম পাবেন এখানে। আবিষ্কার করুন নতুন কণ্ঠস্বর, নতুন গল্পের জগৎ।
                    </p>
                </div>
            </div>
        </section>
    );
};

export default Hero;
