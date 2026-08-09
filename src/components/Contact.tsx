import { useState } from 'react';
import './Contact.css';

const Contact = () => {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        message: ''
    });

    const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setStatus('sending');
        try {
            const res = await fetch('https://formspree.io/f/xpwzgvoj', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                body: JSON.stringify({ name: formData.name, email: formData.email, message: formData.message })
            });
            if (res.ok) {
                setStatus('success');
                setFormData({ name: '', email: '', message: '' });
                setTimeout(() => setStatus('idle'), 5000);
            } else {
                setStatus('error');
                setTimeout(() => setStatus('idle'), 4000);
            }
        } catch {
            setStatus('error');
            setTimeout(() => setStatus('idle'), 4000);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const socialLinks = [
        {
            name: 'YouTube',
            label: 'YouTube চ্যানেল',
            description: 'অডিওবুক ও ভয়েস কনটেন্ট',
            icon: (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                </svg>
            ),
            url: 'https://www.youtube.com/@maheanstoryvoice',
            color: '#ff0000',
            bg: 'rgba(255,0,0,0.08)'
        },
        {
            name: 'Facebook Page',
            label: 'Facebook পেজ',
            description: 'অফিশিয়াল পেজ ফলো করুন',
            icon: (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                </svg>
            ),
            url: 'https://www.facebook.com/maheanofficial/',
            color: '#1877f2',
            bg: 'rgba(24,119,242,0.08)'
        },
        {
            name: 'Facebook Group',
            label: 'Facebook গ্রুপ',
            description: 'কমিউনিটিতে যোগ দিন',
            icon: (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" />
                </svg>
            ),
            url: 'https://www.facebook.com/groups/625486086686426',
            color: '#1877f2',
            bg: 'rgba(24,119,242,0.08)'
        },
        {
            name: 'Instagram',
            label: 'Instagram',
            description: 'ছবি ও রিলস দেখুন',
            icon: (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                </svg>
            ),
            url: 'https://www.instagram.com/mahean_ahmed/',
            color: '#e1306c',
            bg: 'rgba(225,48,108,0.08)'
        },
        {
            name: 'WhatsApp',
            label: 'WhatsApp',
            description: 'প্রমোশন ও সহযোগিতা',
            icon: (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z" />
                </svg>
            ),
            url: 'https://wa.me/8801321919129',
            color: '#25d366',
            bg: 'rgba(37,211,102,0.08)'
        },
        {
            name: 'Email',
            label: 'ইমেইল',
            description: 'contact@mahean.com',
            icon: (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" />
                </svg>
            ),
            url: 'mailto:contact@mahean.com',
            color: '#ea4335',
            bg: 'rgba(234,67,53,0.08)'
        },
        {
            name: 'Twitter',
            label: 'Twitter / X',
            description: 'আপডেট ও মতামত',
            icon: (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
            ),
            url: 'https://x.com/mahean_ahmed',
            color: '#000000',
            bg: 'rgba(255,255,255,0.06)'
        },
        {
            name: 'LinkedIn',
            label: 'LinkedIn',
            description: 'প্রফেশনাল নেটওয়ার্ক',
            icon: (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.32 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.79M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z" />
                </svg>
            ),
            url: 'https://linkedin.com/in/maheanahmed',
            color: '#0077b5',
            bg: 'rgba(0,119,181,0.08)'
        }
    ];

    const contactDetails = [
        {
            icon: '📧',
            label: 'অফিশিয়াল ইমেইল',
            value: 'contact@mahean.com',
            href: 'mailto:contact@mahean.com'
        },
        {
            icon: '💬',
            label: 'WhatsApp (প্রমোশন)',
            value: '+880 1321-919129',
            href: 'https://wa.me/8801321919129'
        },
        {
            icon: '📍',
            label: 'অবস্থান',
            value: 'ঢাকা, বাংলাদেশ',
            href: null
        },
        {
            icon: '💼',
            label: 'কাজের ধরন',
            value: 'ভয়েস অ্যাক্টিং ও অডিওবুক',
            href: null
        }
    ];

    return (
        <section id="contact" className="contact-section">
            {/* Hero Banner */}
            <div className="contact-hero">
                <div className="contact-hero-bg" aria-hidden="true">
                    <div className="contact-hero-orb contact-hero-orb--1" />
                    <div className="contact-hero-orb contact-hero-orb--2" />
                    <div className="contact-hero-orb contact-hero-orb--3" />
                </div>
                <div className="contact-hero-inner">
                    <div className="contact-hero-badge">
                        <span className="contact-hero-badge-dot" />
                        যোগাযোগ
                    </div>
                    <h1 className="contact-hero-title">
                        একসাথে কিছু <span className="contact-hero-highlight">অসাধারণ</span> তৈরি করি
                    </h1>
                    <p className="contact-hero-subtitle">
                        অডিওবুক, ভয়েসওভার, কমিউনিটি — যেকোনো বিষয়ে কথা বলতে আমরা প্রস্তুত।
                    </p>
                </div>
            </div>

            <div className="contact-body container">

                {/* Social + Details Grid */}
                <div className="contact-grid">

                    {/* Left — Contact Details */}
                    <div className="contact-panel">
                        <div className="contact-panel-header">
                            <h2 className="contact-panel-title">সরাসরি যোগাযোগ</h2>
                            <p className="contact-panel-sub">দ্রুত সাড়া পেতে WhatsApp বা Email ব্যবহার করুন।</p>
                        </div>

                        <div className="contact-detail-list">
                            {contactDetails.map((item, idx) => (
                                <div key={idx} className="contact-detail-row">
                                    <div className="contact-detail-emoji">{item.icon}</div>
                                    <div className="contact-detail-copy">
                                        <div className="contact-detail-label">{item.label}</div>
                                        {item.href ? (
                                            <a href={item.href} className="contact-detail-value contact-detail-link" target={item.href.startsWith('http') ? '_blank' : undefined} rel="noopener noreferrer">{item.value}</a>
                                        ) : (
                                            <div className="contact-detail-value">{item.value}</div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Social Grid */}
                        <div className="contact-social-section">
                            <div className="contact-social-heading">সোশ্যাল মিডিয়া</div>
                            <div className="contact-social-grid">
                                {socialLinks.map((social, idx) => (
                                    <a
                                        key={idx}
                                        href={social.url}
                                        className="contact-social-card"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        title={social.name}
                                        style={{
                                            '--s-color': social.color,
                                            '--s-bg': social.bg
                                        } as React.CSSProperties}
                                    >
                                        <div className="contact-social-icon">{social.icon}</div>
                                        <div className="contact-social-info">
                                            <div className="contact-social-name">{social.label}</div>
                                            <div className="contact-social-desc">{social.description}</div>
                                        </div>
                                        <svg className="contact-social-arrow" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M7 17L17 7M7 7h10v10" />
                                        </svg>
                                    </a>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Right — Form */}
                    <div className="contact-form-wrapper">
                        <div className="contact-form-header">
                            <h2 className="contact-panel-title">মেসেজ পাঠান</h2>
                            <p className="contact-panel-sub">আপনার প্রজেক্ট বা প্রশ্ন সম্পর্কে জানান।</p>
                        </div>
                        <form className="contact-form" onSubmit={handleSubmit} noValidate>
                            <div className="form-group">
                                <label htmlFor="contact-name" className="form-label">আপনার নাম</label>
                                <input
                                    type="text"
                                    id="contact-name"
                                    name="name"
                                    value={formData.name}
                                    onChange={handleChange}
                                    className="form-input"
                                    placeholder="আপনার নাম লিখুন"
                                    required
                                    autoComplete="name"
                                />
                            </div>

                            <div className="form-group">
                                <label htmlFor="contact-email" className="form-label">ইমেইল</label>
                                <input
                                    type="email"
                                    id="contact-email"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    className="form-input"
                                    placeholder="your@email.com"
                                    required
                                    autoComplete="email"
                                />
                            </div>

                            <div className="form-group">
                                <label htmlFor="contact-message" className="form-label">মেসেজ</label>
                                <textarea
                                    id="contact-message"
                                    name="message"
                                    value={formData.message}
                                    onChange={handleChange}
                                    className="form-textarea"
                                    placeholder="আপনার প্রজেক্ট বা বিষয়টি বিস্তারিত জানান..."
                                    rows={6}
                                    required
                                />
                            </div>

                            <button type="submit" className="contact-submit-btn" disabled={status === 'sending'} id="contact-submit">
                                {status === 'sending' ? (
                                    <>
                                        <span className="contact-submit-spinner" />
                                        পাঠানো হচ্ছে...
                                    </>
                                ) : (
                                    <>
                                        মেসেজ পাঠান
                                        <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
                                            <path d="M2.5 2.5L17.5 10L2.5 17.5L5.83333 10L2.5 2.5Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                        </svg>
                                    </>
                                )}
                            </button>

                            {status === 'success' && (
                                <div className="form-status form-status--success" role="alert">
                                    ✓ মেসেজ পাঠানো হয়েছে! যোগাযোগ করার জন্য ধন্যবাদ।
                                </div>
                            )}
                            {status === 'error' && (
                                <div className="form-status form-status--error" role="alert">
                                    ✗ মেসেজ পাঠানো যায়নি। সরাসরি contact@mahean.com-এ ইমেইল করুন।
                                </div>
                            )}
                        </form>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default Contact;
