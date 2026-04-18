import SEO from '../components/SEO';
import './LinksPage.css';
import { Youtube, Facebook, Instagram, User } from 'lucide-react';

const LinksPage = () => {
    // আপনার links এখানে যোগ করবেন
    const socialLinks = [
        {
            name: 'YouTube - Main Channel',
            username: '@banglaaudiobooks.mahean',
            url: 'https://www.youtube.com/@banglaaudiobooks.mahean',
            icon: <Youtube size={40} />,
            description: 'অনলাইন লেখকদের গল্পের অডিওবুক',
            color: '#FF0000'
        },
        {
            name: 'YouTube - Bangladeshi Books',
            username: '@maheanstoryvoice',
            url: 'https://www.youtube.com/@maheanstoryvoice',
            icon: <Youtube size={40} />,
            description: 'বাংলাদেশি লেখকদের বই ও গল্প',
            color: '#FF0000'
        },
        {
            name: 'YouTube - Translated Books',
            username: '@audiobookswithmahean',
            url: 'https://www.youtube.com/@audiobookswithmahean',
            icon: <Youtube size={40} />,
            description: 'বিদেশি বইয়ের বাংলা অনুবাদ',
            color: '#FF0000'
        },
        {
            name: 'YouTube - Archive Channel',
            username: '@MaheanAhmedTheLostStories',
            url: 'https://www.youtube.com/@MaheanAhmedTheLostStories',
            icon: <Youtube size={40} />,
            description: 'পুরানো অডিওবুক সংগ্রহ (নতুন আপডেট নেই)',
            color: '#FF0000'
        },
    ];

    const otherSocial = [
        {
            name: 'Facebook Page',
            url: 'https://www.facebook.com/maheanahmedofficial',
            icon: <Facebook size={32} />,
            color: '#1877F2'
        },
        {
            name: 'Facebook Profile',
            url: 'https://www.facebook.com/maheanahmedofficial',
            icon: <User size={32} />,
            color: '#1877F2'
        },
        {
            name: 'Instagram',
            url: 'https://www.instagram.com/mahean_ahmed',
            icon: <Instagram size={32} />,
            color: '#E4405F'
        },
        // আরও social media links যোগ হবে
    ];

    return (
        <>
            <SEO
                title="All Links - Mahean Ahmed"
                description="Find all my social media links, YouTube channels and online presence in one place."
                keywords="Mahean Ahmed, Social Media, YouTube Channels, Links"
                canonicalUrl="/links"
            />

            <div className="links-page">
                <div className="links-container">
                    {/* Profile Section */}
                    <div className="links-profile">
                        <img
                            src="/mahean-3.jpg"
                            alt="Mahean Ahmed"
                            className="links-profile-image"
                        />
                        <h1 className="links-title gradient-text">Mahean Ahmed</h1>
                        <p className="links-subtitle">ভয়েস আর্টিস্ট ও বাংলা গল্পকার</p>
                        <p className="links-description">
                            আমার সব social media এবং YouTube channels এক জায়গায়
                        </p>
                    </div>

                    {/* YouTube Channels Section */}
                    <div className="links-section">
                        <h2 className="links-section-title">
                            <span className="links-section-icon">🎬</span>
                            ইউটিউব চ্যানেল
                        </h2>
                        <div className="links-grid">
                            {socialLinks.map((link, index) => (
                                <a
                                    key={index}
                                    href={link.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="link-card"
                                    style={{ '--card-color': link.color } as React.CSSProperties}
                                >
                                    <div className="link-card-icon" style={{ color: link.color }}>{link.icon}</div>
                                    <div className="link-card-content">
                                        <h3 className="link-card-title">{link.name}</h3>
                                        <p className="link-card-username">{link.username}</p>
                                        <p className="link-card-description">{link.description}</p>
                                    </div>
                                    <div className="link-card-arrow">→</div>
                                </a>
                            ))}
                        </div>
                    </div>

                    {/* Other Social Media Section */}
                    <div className="links-section">
                        <h2 className="links-section-title">
                            <span className="links-section-icon">🌐</span>
                            সোশ্যাল মিডিয়া
                        </h2>
                        <div className="links-grid-small">
                            {otherSocial.map((link, index) => (
                                <a
                                    key={index}
                                    href={link.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="link-card-small"
                                    style={{ '--card-color': link.color } as React.CSSProperties}
                                >
                                    <span className="link-card-small-icon" style={{ color: link.color }}>{link.icon}</span>
                                    <span className="link-card-small-name">{link.name}</span>
                                </a>
                            ))}
                        </div>
                    </div>

                    {/* Contact Section */}
                    <div className="links-footer">
                        <p>যোগাযোগ: <a href="mailto:maheanofficial@gmail.com">maheanofficial@gmail.com</a></p>
                    </div>
                </div>
            </div>
        </>
    );
};

export default LinksPage;
