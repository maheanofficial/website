import SEO from '../components/SEO';
import './LegalPage.css';

const TermsPage = () => {
    return (
        <>
            <SEO
                title="ব্যবহারের শর্তাবলী - মাহিয়ান আহমেদ"
                description="মাহিয়ান আহমেদের ওয়েবসাইট ব্যবহারের শর্তাবলী এবং নিয়মাবলী।"
                canonicalUrl="/terms"
            />

            <div className="legal-container">
                <h1 className="legal-title gradient-text">ব্যবহারের শর্তাবলী</h1>
                <p className="legal-updated">সর্বশেষ আপডেট: ফেব্রুয়ারি ২০২৬</p>

                <section className="legal-section">
                    <h2>১. শর্তাবলীর স্বীকৃতি</h2>
                    <p>
                        mahean.com ওয়েবসাইট ব্যবহার করে আপনি এই শর্তাবলীতে সম্মত হচ্ছেন।
                        যদি আপনি এই শর্তাবলীতে সম্মত না হন, তাহলে দয়া করে এই ওয়েবসাইট ব্যবহার করবেন না।
                    </p>
                </section>

                <section className="legal-section">
                    <h2>২. কপিরাইট এবং মেধাস্বত্ব</h2>
                    <p>
                        এই ওয়েবসাইটের সমস্ত কন্টেন্ট, গল্প, অডিওবুক এবং অন্যান্য উপাদান কপিরাইট দ্বারা সুরক্ষিত।
                        লেখকদের লিখিত অনুমতি ছাড়া কোনো কন্টেন্ট পুনরুৎপাদন, বিতরণ বা বাণিজ্যিক ব্যবহার নিষিদ্ধ।
                    </p>
                </section>

                <section className="legal-section">
                    <h2>৩. ব্যবহারকারীর দায়িত্ব</h2>
                    <p>আপনি সম্মত হচ্ছেন যে আপনি:</p>
                    <ul>
                        <li>শুধুমাত্র বৈধ উদ্দেশ্যে ওয়েবসাইট ব্যবহার করবেন</li>
                        <li>অন্যদের অধিকার লঙ্ঘন করবেন না</li>
                        <li>কোনো ক্ষতিকারক সফটওয়্যার আপলোড বা প্রেরণ করবেন না</li>
                        <li>ওয়েবসাইটের নিরাপত্তা বা কার্যকারিতা ব্যাহত করবেন না</li>
                    </ul>
                </section>

                <section className="legal-section">
                    <h2>৪. কন্টেন্ট দাবিত্যাগ</h2>
                    <p>
                        এই ওয়েবসাইটের কন্টেন্ট শুধুমাত্র তথ্যমূলক এবং বিনোদনমূলক উদ্দেশ্যে প্রদান করা হয়।
                        আমরা কন্টেন্টের নির্ভুলতা, সম্পূর্ণতা বা উপযোগিতার কোনো গ্যারান্টি দিই না।
                    </p>
                </section>

                <section className="legal-section">
                    <h2>৫. বিজ্ঞাপন</h2>
                    <p>
                        এই ওয়েবসাইটে তৃতীয় পক্ষের বিজ্ঞাপন প্রদর্শিত হতে পারে। আমরা বিজ্ঞাপনদাতাদের পণ্য বা সেবার জন্য দায়ী নই।
                    </p>
                </section>

                <section className="legal-section">
                    <h2>৬. দায়বদ্ধতার সীমাবদ্ধতা</h2>
                    <p>
                        আইন দ্বারা অনুমোদিত সর্বোচ্চ পরিমাণে, mahean.com এবং এর মালিক কোনো প্রত্যক্ষ, পরোক্ষ,
                        আনুষঙ্গিক বা পরিণামী ক্ষতির জন্য দায়ী থাকবে না।
                    </p>
                </section>

                <section className="legal-section">
                    <h2>৭. শর্তাবলী পরিবর্তন</h2>
                    <p>
                        আমরা যে কোনো সময় এই শর্তাবলী পরিবর্তন করার অধিকার সংরক্ষণ করি।
                        পরিবর্তনগুলি এই পেজে পোস্ট করা হবে এবং অবিলম্বে কার্যকর হবে।
                    </p>
                </section>

                <section className="legal-section">
                    <h2>৮. প্রযোজ্য আইন</h2>
                    <p>
                        এই শর্তাবলী বাংলাদেশের আইন দ্বারা নিয়ন্ত্রিত এবং ব্যাখ্যা করা হবে।
                    </p>
                </section>

                <section className="legal-section">
                    <h2>৯. যোগাযোগ</h2>
                    <p>
                        শর্তাবলী সম্পর্কে কোনো প্রশ্ন থাকলে আমাদের সাথে যোগাযোগ করুন:
                    </p>
                    <p>
                        <strong>ইমেইল:</strong> <a href="mailto:maheanofficial@gmail.com">maheanofficial@gmail.com</a><br />
                        <strong>ওয়েবসাইট:</strong> <a href="https://mahean.com">mahean.com</a>
                    </p>
                </section>
            </div>
        </>
    );
};

export default TermsPage;
