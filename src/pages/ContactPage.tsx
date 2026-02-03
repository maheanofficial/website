import SEO from '../components/SEO';
import Contact from '../components/Contact';

const ContactPage = () => {
    return (
        <>
            <SEO
                title="যোগাযোগ - মাহিয়ান আহমেদ"
                description="কাজের ব্যাপারে কথা বলতে বা যেকোনো প্রয়োজনে যোগাযোগ করুন। ইমেইল বা সোশ্যাল মিডিয়ার মাধ্যমে কানেক্টেড থাকুন।"
                keywords="Contact Mahean Ahmed, Mahean Ahmed Email, Voice Over Service, Audio Story Request"
                jsonLd={{
                    "@context": "https://schema.org",
                    "@type": "ContactPage",
                    "url": "https://mahean.com/contact",
                    "mainEntity": {
                        "@type": "Person",
                        "name": "Mahean Ahmed",
                        "email": "contact@mahean.com",
                        "url": "https://mahean.com"
                    }
                }}
            />
            <div style={{ marginTop: '100px' }}></div>
            <Contact />
        </>
    );
};

export default ContactPage;
