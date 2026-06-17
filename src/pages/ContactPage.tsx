import SEO from '../components/SEO';
import Contact from '../components/Contact';
import { SITE_URL } from '../utils/siteMeta';
import { buildWebPageSchema, buildBreadcrumbSchema } from '../utils/seoSchema';

const ContactPage = () => {
    const contactSchema = [
        buildWebPageSchema(
            'যোগাযোগ - Mahean Ahmed',
            'কাজের ব্যাপারে কথা বলতে বা যেকোনো প্রয়োজনে যোগাযোগ করুন। ইমেইল বা সোশ্যাল মিডিয়ার মাধ্যমে কানেক্টেড থাকুন।',
            `${SITE_URL}/contact`,
            'ContactPage',
        ),
        buildBreadcrumbSchema([
            { name: 'হোম', url: '/' },
            { name: 'যোগাযোগ', url: '/contact' },
        ]),
    ];

    return (
        <>
            <SEO
                title="যোগাযোগ - Mahean Ahmed"
                description="কাজের ব্যাপারে কথা বলতে বা যেকোনো প্রয়োজনে যোগাযোগ করুন। ইমেইল বা সোশ্যাল মিডিয়ার মাধ্যমে Mahean Ahmed-এর সাথে কানেক্টেড থাকুন।"
                keywords="Contact Mahean Ahmed, Mahean Ahmed Email, Voice Over Service, Audio Story Request, যোগাযোগ, ভয়েস ওভার সেবা"
                canonicalUrl="/contact"
                ogImage="/mahean-3.jpg"
                imageAlt="Mahean Ahmed - যোগাযোগ করুন"
                jsonLd={contactSchema}
            />
            <div className="page-offset">
                <Contact />
            </div>
        </>
    );
};

export default ContactPage;
