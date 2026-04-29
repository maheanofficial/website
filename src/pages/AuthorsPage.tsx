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

            {/* Static content for SEO / AdSense crawlers */}
            <section style={{ background: 'rgba(255,255,255,0.02)', borderTop: '1px solid rgba(255,255,255,0.06)', padding: '48px 0' }}>
                <div className="container">
                    <div style={{ maxWidth: '800px', margin: '0 auto', textAlign: 'center' }}>
                        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#fff', marginBottom: '16px', fontFamily: "'Hind Siliguri', sans-serif" }}>
                            GolpoHub-এর লেখকরা কারা?
                        </h2>
                        <p style={{ color: 'rgba(255,255,255,0.6)', lineHeight: '1.8', fontSize: '1rem', marginBottom: '24px', fontFamily: "'Hind Siliguri', sans-serif" }}>
                            GolpoHub বাংলাদেশের নতুন ও প্রতিভাবান লেখকদের জন্য একটি উন্মুক্ত মঞ্চ। এখানে প্রতিটি লেখক তার নিজস্ব কণ্ঠস্বরে গল্প বলেন — থ্রিলার, হরর, রোমান্স, সায়েন্স ফিকশন থেকে শুরু করে জীবনমুখী গল্প পর্যন্ত।
                        </p>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', textAlign: 'left', marginTop: '32px' }}>
                            <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '10px', padding: '20px', border: '1px solid rgba(255,255,255,0.07)' }}>
                                <h3 style={{ color: '#fff', fontSize: '1rem', fontWeight: 700, marginBottom: '8px', fontFamily: "'Hind Siliguri', sans-serif" }}>✍️ মৌলিক বাংলা গল্প</h3>
                                <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.875rem', lineHeight: '1.7', margin: 0, fontFamily: "'Hind Siliguri', sans-serif" }}>
                                    প্রতিটি লেখক তার নিজস্ব অভিজ্ঞতা ও কল্পনাকে মৌলিক বাংলা গল্পে রূপ দেন। নতুন কণ্ঠস্বর, নতুন জগৎ।
                                </p>
                            </div>
                            <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '10px', padding: '20px', border: '1px solid rgba(255,255,255,0.07)' }}>
                                <h3 style={{ color: '#fff', fontSize: '1rem', fontWeight: 700, marginBottom: '8px', fontFamily: "'Hind Siliguri', sans-serif" }}>📖 ধারাবাহিক সিরিজ</h3>
                                <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.875rem', lineHeight: '1.7', margin: 0, fontFamily: "'Hind Siliguri', sans-serif" }}>
                                    অনেক লেখক দীর্ঘ ধারাবাহিক সিরিজ রচনা করেন যেখানে পাঠক প্রতিটি পর্বের জন্য অপেক্ষা করেন।
                                </p>
                            </div>
                            <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '10px', padding: '20px', border: '1px solid rgba(255,255,255,0.07)' }}>
                                <h3 style={{ color: '#fff', fontSize: '1rem', fontWeight: 700, marginBottom: '8px', fontFamily: "'Hind Siliguri', sans-serif" }}>🌟 লেখক পোর্টাল</h3>
                                <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.875rem', lineHeight: '1.7', margin: 0, fontFamily: "'Hind Siliguri', sans-serif" }}>
                                    আমাদের লেখক পোর্টালের মাধ্যমে আপনিও নিজের গল্প জমা দিতে পারবেন এবং হাজারো পাঠকের কাছে পৌঁছাতে পারবেন।
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <AuthorsGrid />
        </div>
    );
};

export default AuthorsPage;
