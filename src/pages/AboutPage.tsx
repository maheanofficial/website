import SEO from '../components/SEO';
import './LegalPage.css';

const AboutPage = () => {
    return (
        <>
            <SEO
                title="আমার সম্পর্কে - মাহিয়ান আহমেদ"
                description="আমি মাহিয়ান আহমেদ, একজন বাংলা ভয়েস আর্টিস্ট এবং গল্পকার। জানুন আমার কাজ, মিশন এবং ভিশন সম্পর্কে।"
                keywords="About Mahean Ahmed, Voice Artist Biography, Bangla Storyteller, Mahean's Story"
                ogType="profile"
                jsonLd={{
                    "@context": "https://schema.org",
                    "@type": "AboutPage",
                    "mainEntity": {
                        "@type": "Person",
                        "name": "Mahean Ahmed",
                        "description": "Voice Artist and Content Creator",
                        "image": "https://mahean.com/mahean-3.jpg",
                        "sameAs": [
                            "https://www.youtube.com/@maheanstoryvoice"
                        ]
                    }
                }}
            />

            <div className="legal-container">
                <h1 className="legal-title gradient-text">আমার সম্পর্কে</h1>

                {/* Photo Gallery */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                    gap: '1rem',
                    marginBottom: '2rem'
                }}>
                    <img
                        src="/mahean-1.jpg"
                        alt="Mahean Ahmed"
                        style={{
                            width: '100%',
                            borderRadius: '12px',
                            border: '2px solid rgba(124, 58, 237, 0.3)',
                            boxShadow: '0 4px 20px rgba(0,0,0,0.3)'
                        }}
                    />
                    <img
                        src="/mahean-2.jpg"
                        alt="Mahean Ahmed"
                        style={{
                            width: '100%',
                            borderRadius: '12px',
                            border: '2px solid rgba(124, 58, 237, 0.3)',
                            boxShadow: '0 4px 20px rgba(0,0,0,0.3)'
                        }}
                    />
                    <img
                        src="/mahean-3.jpg"
                        alt="Mahean Ahmed"
                        style={{
                            width: '100%',
                            borderRadius: '12px',
                            border: '2px solid rgba(124, 58, 237, 0.3)',
                            boxShadow: '0 4px 20px rgba(0,0,0,0.3)'
                        }}
                    />
                </div>

                <section className="legal-section">
                    <h2>Mahean Ahmed</h2>
                    <p>
                        আসসালামু আলাইকুম! আমি Mahean Ahmed, একজন বাংলা ভয়েস আর্টিস্ট এবং গল্পকার।
                        আমার লক্ষ্য হলো বাংলা ভাষায় মানসম্পন্ন অডিওবুক এবং গল্প তৈরি করা, যা শ্রোতাদের
                        একটি নতুন জগতে নিয়ে যায়।
                    </p>
                </section>

                <section className="legal-section">
                    <h2>আমার কাজ</h2>
                    <p>আমি বিভিন্ন ধরনের কন্টেন্ট তৈরি করি:</p>
                    <ul>
                        <li><strong>বাংলা অডিওবুক:</strong> বিভিন্ন লেখকদের গল্প এবং উপন্যাসের অডিও সংস্করণ</li>
                        <li><strong>মৌলিক গল্প:</strong> নিজস্ব লেখা এবং অন্যান্য লেখকদের গল্প</li>
                        <li><strong>ভয়েস ওভার:</strong> বিভিন্ন প্রজেক্টের জন্য পেশাদার ভয়েস ওভার সেবা</li>
                    </ul>
                </section>

                <section className="legal-section">
                    <h2>আমার মিশন</h2>
                    <p>
                        আমি বিশ্বাস করি যে গল্প বলার শক্তি অসীম। আমার মিশন হলো বাংলা ভাষায় গুণমানসম্পন্ন
                        অডিও কন্টেন্ট তৈরি করা যা মানুষকে অনুপ্রাণিত করে, বিনোদন দেয় এবং শেখায়।
                        আমি চাই প্রতিটি শ্রোতা আমার কণ্ঠে একটি অনন্য অভিজ্ঞতা পাক।
                    </p>
                </section>

                <section className="legal-section">
                    <h2>YouTube চ্যানেল</h2>
                    <p>
                        আমার YouTube চ্যানেলে আমি নিয়মিত বাংলা অডিওবুক এবং গল্প আপলোড করি।
                        চ্যানেলটি সাবস্ক্রাইব করে আমার সাথে থাকুন এবং নতুন কন্টেন্টের আপডেট পান।
                    </p>
                    <p>
                        <a href="https://www.youtube.com/@maheanstoryvoice" target="_blank" rel="noopener noreferrer" className="btn btn-primary">
                            YouTube চ্যানেল ভিজিট করুন
                        </a>
                    </p>
                </section>

                <section className="legal-section">
                    <h2>যোগাযোগ</h2>
                    <p>
                        আপনার কোনো প্রশ্ন, পরামর্শ বা সহযোগিতার প্রস্তাব থাকলে আমার সাথে যোগাযোগ করতে পারেন:
                    </p>
                    <p>
                        <strong>ইমেইল:</strong> <a href="mailto:maheanofficial@gmail.com">maheanofficial@gmail.com</a><br />
                        <strong>YouTube:</strong> <a href="https://www.youtube.com/@maheanstoryvoice" target="_blank" rel="noopener noreferrer">@maheanstoryvoice</a>
                    </p>
                </section>

                <section className="legal-section">
                    <h2>ধন্যবাদ</h2>
                    <p>
                        আমার ওয়েবসাইট ভিজিট করার জন্য আপনাকে ধন্যবাদ। আপনার সমর্থন এবং ভালোবাসা
                        আমাকে আরও ভালো কন্টেন্ট তৈরি করতে অনুপ্রাণিত করে। আশা করি আপনি আমার কাজ উপভোগ করবেন!
                    </p>
                </section>
            </div>
        </>
    );
};

export default AboutPage;
