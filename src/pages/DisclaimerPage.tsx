import SEO from '../components/SEO';
import './LegalPage.css';

const DisclaimerPage = () => {
    return (
        <>
            <SEO
                title="দাবিত্যাগ - মাহিয়ান আহমেদ"
                description="mahean.com ওয়েবসাইটের বিজ্ঞাপন, ব্যবহারকারী-জমাকৃত কনটেন্ট, কপিরাইট ও দায়-সীমাবদ্ধতা সম্পর্কিত গুরুত্বপূর্ণ ঘোষণা।"
                canonicalUrl="/disclaimer"
            />

            <div className="legal-container">
                <h1 className="legal-title gradient-text">দাবিত্যাগ</h1>
                <p className="legal-updated">সর্বশেষ আপডেট: ফেব্রুয়ারি ২০২৬</p>

                <section className="legal-section">
                    <h2>১. সাধারণ তথ্য</h2>
                    <p>
                        mahean.com-এ প্রকাশিত কনটেন্ট তথ্য ও বিনোদনমূলক উদ্দেশ্যে প্রদান করা হয়। আমরা তথ্য সঠিক
                        ও আপডেট রাখার চেষ্টা করি, তবে সবসময় সম্পূর্ণতা, নির্ভরযোগ্যতা বা শতভাগ নির্ভুলতার
                        নিশ্চয়তা দিতে পারি না।
                    </p>
                </section>

                <section className="legal-section">
                    <h2>২. বিজ্ঞাপন ঘোষণা (Google AdSense)</h2>
                    <p>
                        এই ওয়েবসাইটে Google AdSense-এর মাধ্যমে বিজ্ঞাপন দেখানো হয়। আপনার ব্রাউজিং আচরণ ও ডিভাইস
                        সিগন্যালের ভিত্তিতে বিজ্ঞাপন ব্যক্তিকৃত হতে পারে। Google-সহ তৃতীয় পক্ষ কুকিজ ও অনুরূপ
                        প্রযুক্তি ব্যবহার করে বিজ্ঞাপন পরিবেশন ও পরিমাপ করতে পারে।
                    </p>
                    <p>
                        Google Ads Settings থেকে আপনি বিজ্ঞাপন ব্যক্তিকরণ নিয়ন্ত্রণ করতে পারেন:
                        {' '}
                        <a href="https://www.google.com/settings/ads" target="_blank" rel="noopener noreferrer">
                            https://www.google.com/settings/ads
                        </a>
                    </p>
                </section>

                <section className="legal-section">
                    <h2>৩. ব্যবহারকারী-জমাকৃত কনটেন্ট</h2>
                    <p>
                        কিছু গল্প নিবন্ধিত ব্যবহারকারী/লেখকদের মাধ্যমে জমা হতে পারে। আমরা এসব কনটেন্ট রিভিউ ও
                        মডারেট করি, তবে সব নীতিভঙ্গকারী কনটেন্ট তাৎক্ষণিকভাবে শনাক্ত করার নিশ্চয়তা দিতে পারি না।
                        প্ল্যাটফর্ম নীতি, AdSense নীতি, কপিরাইট নীতি বা প্রযোজ্য আইন ভঙ্গ করলে আমরা কনটেন্ট
                        সম্পাদনা, অনপাবলিশ, প্রত্যাখ্যান বা অপসারণ করতে পারি।
                    </p>
                    <p>নিষিদ্ধ কনটেন্টের উদাহরণ:</p>
                    <ul>
                        <li>যৌনভাবে স্পষ্ট বা শোষণমূলক কনটেন্ট</li>
                        <li>বিদ্বেষমূলক বক্তব্য, হয়রানি বা সহিংসতায় উসকানি</li>
                        <li>প্রতারণামূলক, ক্ষতিকর বা স্প্যাম কনটেন্ট</li>
                        <li>কপিরাইট লঙ্ঘনকারী বা অনুমতিহীন কপি করা কনটেন্ট</li>
                    </ul>
                </section>

                <section className="legal-section">
                    <h2>৪. বাহ্যিক লিংক</h2>
                    <p>
                        এই সাইটে তৃতীয় পক্ষের ওয়েবসাইটের লিংক থাকতে পারে। সেসব ওয়েবসাইটের কনটেন্ট, প্রাইভেসি
                        নীতি বা নিরাপত্তার জন্য আমরা দায়ী নই।
                    </p>
                </section>

                <section className="legal-section">
                    <h2>৫. কপিরাইট ও টেকডাউন</h2>
                    <p>
                        আপনি যদি কপিরাইট মালিক হয়ে থাকেন এবং মনে করেন এই সাইটের কোনো কনটেন্ট আপনার অধিকার লঙ্ঘন
                        করছে, তবে সংশ্লিষ্ট URL ও মালিকানার প্রমাণসহ আমাদের সাথে যোগাযোগ করুন। আমরা দ্রুত
                        যাচাই করে প্রয়োজনীয় ব্যবস্থা নেব।
                    </p>
                </section>

                <section className="legal-section">
                    <h2>৬. যোগাযোগ</h2>
                    <p>
                        ইমেইল:
                        {' '}
                        <a href="mailto:maheanofficial@gmail.com">maheanofficial@gmail.com</a>
                        <br />
                        ওয়েবসাইট:
                        {' '}
                        <a href="https://mahean.com">https://mahean.com</a>
                    </p>
                </section>
            </div>
        </>
    );
};

export default DisclaimerPage;
