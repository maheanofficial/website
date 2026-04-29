import SEO from '../components/SEO';
import './LegalPage.css';

const PrivacyPage = () => {
    return (
        <>
            <SEO
                title="গোপনীয়তা নীতি - মাহিয়ান আহমেদ"
                description="মাহিয়ান আহমেদের ওয়েবসাইটের গোপনীয়তা নীতি, কুকিজ নীতি এবং Google AdSense বিজ্ঞাপন সম্পর্কিত বিস্তারিত তথ্য।"
                canonicalUrl="/privacy"
            />

            <div className="legal-container">
                <h1 className="legal-title gradient-text">গোপনীয়তা নীতি</h1>
                <p className="legal-updated">সর্বশেষ আপডেট: এপ্রিল ২০২৬</p>

                <section className="legal-section">
                    <h2>১. ভূমিকা</h2>
                    <p>
                        mahean.com ওয়েবসাইটে আপনাকে স্বাগতম। আপনার গোপনীয়তা আমাদের কাছে অত্যন্ত গুরুত্বপূর্ণ।
                        এই গোপনীয়তা নীতি ব্যাখ্যা করে যে আমরা কীভাবে আপনার তথ্য সংগ্রহ, ব্যবহার এবং সুরক্ষিত রাখি।
                        এই সাইট ব্যবহার করে আপনি এই নীতিতে সম্মতি দিচ্ছেন।
                    </p>
                </section>

                <section className="legal-section">
                    <h2>২. তথ্য সংগ্রহ</h2>
                    <p>আমরা নিম্নলিখিত ধরনের তথ্য সংগ্রহ করতে পারি:</p>
                    <ul>
                        <li><strong>ব্যক্তিগত তথ্য:</strong> নাম, ইমেইল ঠিকানা (যদি আপনি যোগাযোগ ফর্ম বা অ্যাকাউন্ট তৈরিতে দেন)</li>
                        <li><strong>ব্যবহারের তথ্য:</strong> আপনি কোন পেজ ভিজিট করেছেন, কতক্ষণ থেকেছেন, কোন ডিভাইস ব্যবহার করেছেন</li>
                        <li><strong>কুকিজ ও ট্র্যাকিং ডেটা:</strong> বিজ্ঞাপন পরিষেবা ও সাইট উন্নয়নের জন্য</li>
                        <li><strong>লগ ডেটা:</strong> IP address, browser type, referring pages</li>
                    </ul>
                </section>

                <section className="legal-section">
                    <h2>৩. তথ্যের ব্যবহার</h2>
                    <p>আমরা আপনার তথ্য নিম্নলিখিত উদ্দেশ্যে ব্যবহার করি:</p>
                    <ul>
                        <li>ওয়েবসাইটের কন্টেন্ট এবং সেবা উন্নত করতে</li>
                        <li>আপনার প্রশ্ন এবং অনুরোধের উত্তর দিতে</li>
                        <li>ওয়েবসাইট ট্রাফিক বিশ্লেষণ করতে</li>
                        <li>আগ্রহভিত্তিক বিজ্ঞাপন দেখাতে (Google AdSense-এর মাধ্যমে)</li>
                        <li>আইনি বাধ্যবাধকতা পূরণ করতে</li>
                    </ul>
                </section>

                <section className="legal-section">
                    <h2>৪. Google AdSense ও বিজ্ঞাপন</h2>
                    <p>
                        এই ওয়েবসাইটে <strong>Google AdSense</strong>-এর বিজ্ঞাপন দেখানো হয়। Google এবং তার advertising partners
                        আপনার ব্রাউজার/ডিভাইসে cookies ব্যবহার করে আগ্রহভিত্তিক বিজ্ঞাপন দেখায়।
                    </p>
                    <p>Google AdSense নিম্নলিখিত কাজ করে:</p>
                    <ul>
                        <li>আপনার পূর্ববর্তী ভিজিটের উপর ভিত্তি করে প্রাসঙ্গিক বিজ্ঞাপন দেখায়</li>
                        <li>DoubleClick cookie ব্যবহার করে conversion tracking করে</li>
                        <li>তৃতীয়-পক্ষ ওয়েবসাইটে আপনার ভিজিটের তথ্য ব্যবহার করতে পারে</li>
                    </ul>
                    <p>
                        <strong>আপনার অধিকার:</strong> আপনি চাইলে Google-এর Ads Settings থেকে personalized ads বন্ধ করতে পারেন
                        অথবা <a href="https://www.aboutads.info/choices/" target="_blank" rel="noopener noreferrer">aboutads.info/choices</a> থেকে opt-out করতে পারেন।
                    </p>
                    <ul>
                        <li>Google বিজ্ঞাপন সেটিংস: <a href="https://adsettings.google.com/" target="_blank" rel="noopener noreferrer">adsettings.google.com</a></li>
                        <li>Google Privacy Policy: <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer">policies.google.com/privacy</a></li>
                        <li>আমাদের Publisher ID: <a href="/ads.txt" target="_blank" rel="noopener noreferrer">ca-pub-6313362498664713</a></li>
                    </ul>
                </section>

                <section className="legal-section">
                    <h2>৫. কুকিজ নীতি</h2>
                    <p>
                        আমরা এবং আমাদের বিজ্ঞাপন অংশীদাররা কুকিজ ব্যবহার করি। কুকিজ তিন ধরনের:
                    </p>
                    <ul>
                        <li><strong>প্রয়োজনীয় কুকিজ:</strong> সাইটের মৌলিক কার্যকারিতার জন্য (লগইন সেশন ইত্যাদি)</li>
                        <li><strong>বিজ্ঞাপন কুকিজ:</strong> Google AdSense আগ্রহভিত্তিক বিজ্ঞাপনের জন্য ব্যবহার করে</li>
                        <li><strong>বিশ্লেষণ কুকিজ:</strong> সাইটের ট্রাফিক ও ব্যবহার বোঝার জন্য</li>
                    </ul>
                    <p>
                        আপনি ব্রাউজার সেটিংস থেকে কুকিজ নিষ্ক্রিয় করতে পারেন, তবে এতে সাইটের কিছু সুবিধা কাজ নাও করতে পারে।
                    </p>
                </section>

                <section className="legal-section">
                    <h2>৬. তৃতীয় পক্ষের সেবা</h2>
                    <p>আমাদের সাইটে নিম্নলিখিত তৃতীয়-পক্ষ সেবা ব্যবহৃত হয়:</p>
                    <ul>
                        <li><strong>Google AdSense</strong> — বিজ্ঞাপন দেখানোর জন্য</li>
                        <li><strong>Google Fonts</strong> — ওয়েবসাইটের টাইপোগ্রাফির জন্য</li>
                        <li><strong>YouTube</strong> — ভিডিও কন্টেন্টের জন্য (প্রযোজ্য ক্ষেত্রে)</li>
                    </ul>
                    <p>
                        এই তৃতীয়-পক্ষ সেবাগুলোর নিজস্ব গোপনীয়তা নীতি রয়েছে। আমরা তাদের নীতির জন্য দায়ী নই।
                    </p>
                </section>

                <section className="legal-section">
                    <h2>৭. শিশুদের গোপনীয়তা</h2>
                    <p>
                        আমাদের ওয়েবসাইট ১৩ বছরের কম বয়সী শিশুদের জন্য নয়। আমরা জেনেশুনে শিশুদের কাছ থেকে ব্যক্তিগত তথ্য সংগ্রহ করি না।
                        যদি কোনো অভিভাবক মনে করেন যে তাদের শিশু আমাদের সাইটে ব্যক্তিগত তথ্য দিয়েছে, তবে আমাদের সাথে যোগাযোগ করুন।
                    </p>
                </section>

                <section className="legal-section">
                    <h2>৮. ডেটা সুরক্ষা</h2>
                    <p>
                        আমরা আপনার তথ্য সুরক্ষিত রাখতে যথাযথ প্রযুক্তিগত ব্যবস্থা গ্রহণ করি। তবে ইন্টারনেটে কোনো পদ্ধতিই ১০০% নিরাপদ নয়।
                        আমরা আপনার তথ্য তৃতীয় পক্ষের কাছে বিক্রি করি না।
                    </p>
                </section>

                <section className="legal-section">
                    <h2>৯. নীতি পরিবর্তন</h2>
                    <p>
                        আমরা যে কোনো সময় এই গোপনীয়তা নীতি আপডেট করতে পারি। পরিবর্তনগুলি এই পেজে পোস্ট করা হবে এবং তারিখ আপডেট করা হবে।
                        নিয়মিত এই পেজ চেক করার পরামর্শ দিই।
                    </p>
                </section>

                <section className="legal-section">
                    <h2>১০. যোগাযোগ</h2>
                    <p>
                        গোপনীয়তা নীতি সম্পর্কে কোনো প্রশ্ন থাকলে আমাদের সাথে যোগাযোগ করুন:
                    </p>
                    <p>
                        <strong>ইমেইল:</strong> <a href="mailto:maheanofficial@gmail.com">maheanofficial@gmail.com</a><br />
                        <strong>ওয়েবসাইট:</strong> <a href="https://mahean.com">mahean.com</a><br />
                        <strong>ঠিকানা:</strong> বাংলাদেশ
                    </p>
                </section>
            </div>
        </>
    );
};

export default PrivacyPage;
