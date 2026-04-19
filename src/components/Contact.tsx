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
            icon: (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" fill="currentColor" />
                </svg>
            ),
            url: 'https://www.youtube.com/@maheanstoryvoice',
            color: '#ff0000'
        },
        {
            name: 'LinkedIn',
            icon: (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.32 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.79M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z" fill="currentColor" />
                </svg>
            ),
            url: 'https://linkedin.com/in/maheanahmed',
            color: '#0077b5'
        },
        {
            name: 'Email',
            icon: (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" fill="currentColor" />
                </svg>
            ),
            url: 'mailto:maheanofficial@gmail.com',
            color: '#ea4335'
        },
        {
            name: 'Twitter',
            icon: (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <path d="M22.46 6c-.85.38-1.75.64-2.7.76a4.7 4.7 0 0 0 2.07-2.6c-.9.54-1.9.93-2.98 1.14a4.7 4.7 0 0 0-8 4.28A13.3 13.3 0 0 1 3.2 4.74a4.7 4.7 0 0 0 1.45 6.27 4.65 4.65 0 0 1-2.13-.59v.06a4.7 4.7 0 0 0 3.77 4.6 4.7 4.7 0 0 1-2.12.08 4.7 4.7 0 0 0 4.39 3.26A9.42 9.42 0 0 1 2 19.54a13.27 13.27 0 0 0 7.18 2.1c8.62 0 13.33-7.14 13.33-13.33 0-.2 0-.4-.02-.6A9.5 9.5 0 0 0 22.46 6z" fill="currentColor" />
                </svg>
            ),
            url: 'https://x.com/mahean_ahmed',
            color: '#1da1f2'
        }
    ];

    return (
        <section id="contact" className="section contact-section">
            <div className="container">
                <div className="section-header fade-in-up">
                    <h2 className="section-title">
                        যোগাযোগ করুন
                    </h2>
                    <p className="section-subtitle">
                        আপনার পরবর্তী অডিওবুক বা ভয়েস প্রজেক্টের জন্য একসাথে কাজ করি
                    </p>
                </div>

                <div className="contact-content">
                    <div className="contact-info">
                        <div className="contact-info-card glass">
                            <h3 className="contact-info-title">চলুন একসাথে কাজ করি</h3>
                            <p className="contact-info-text">
                                আমি সবসময় নতুন অডিওবুক প্রজেক্ট, ভয়েসওভার কাজ, বা YouTube সহযোগিতার জন্য প্রস্তুত। চলুন একসাথে অসাধারণ কিছু তৈরি করি।
                            </p>

                            <div className="contact-details">
                                <div className="contact-detail-item">
                                    <div className="contact-detail-icon">📧</div>
                                    <div>
                                        <div className="contact-detail-label">ইমেইল</div>
                                        <div className="contact-detail-value">maheanofficial@gmail.com</div>
                                    </div>
                                </div>

                                <div className="contact-detail-item">
                                    <div className="contact-detail-icon">📍</div>
                                    <div>
                                        <div className="contact-detail-label">অবস্থান</div>
                                        <div className="contact-detail-value">ঢাকা, বাংলাদেশ</div>
                                    </div>
                                </div>

                                <div className="contact-detail-item">
                                    <div className="contact-detail-icon">💼</div>
                                    <div>
                                        <div className="contact-detail-label">কাজের ধরন</div>
                                        <div className="contact-detail-value">ভয়েস অ্যাক্টিং ও অডিওবুক</div>
                                    </div>
                                </div>
                            </div>

                            <div className="social-links">
                                {socialLinks.map((social, index) => (
                                    <a
                                        key={index}
                                        href={social.url}
                                        className="social-link"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        style={{ '--social-color': social.color } as React.CSSProperties}
                                        title={social.name}
                                    >
                                        {social.icon}
                                    </a>
                                ))}
                            </div>
                        </div>
                    </div>

                    <form className="contact-form glass" onSubmit={handleSubmit}>
                        <div className="form-group">
                            <label htmlFor="name" className="form-label">নাম</label>
                            <input
                                type="text"
                                id="name"
                                name="name"
                                value={formData.name}
                                onChange={handleChange}
                                className="form-input"
                                placeholder="আপনার নাম"
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="email" className="form-label">ইমেইল</label>
                            <input
                                type="email"
                                id="email"
                                name="email"
                                value={formData.email}
                                onChange={handleChange}
                                className="form-input"
                                placeholder="your.email@example.com"
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="message" className="form-label">মেসেজ</label>
                            <textarea
                                id="message"
                                name="message"
                                value={formData.message}
                                onChange={handleChange}
                                className="form-textarea"
                                placeholder="আপনার প্রজেক্ট সম্পর্কে বলুন..."
                                rows={5}
                                required
                            />
                        </div>

                        <button type="submit" className="btn btn-primary btn-block" disabled={status === 'sending'}>
                            <span>{status === 'sending' ? 'পাঠানো হচ্ছে...' : 'মেসেজ পাঠান'}</span>
                            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                                <path d="M2.5 2.5L17.5 10L2.5 17.5L5.83333 10L2.5 2.5Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        </button>

                        {status === 'success' && (
                            <div className="form-status form-status--success">✓ মেসেজ পাঠানো হয়েছে! যোগাযোগ করার জন্য ধন্যবাদ।</div>
                        )}
                        {status === 'error' && (
                            <div className="form-status form-status--error">মেসেজ পাঠানো যায়নি। সরাসরি maheanofficial@gmail.com-এ ইমেইল করুন।</div>
                        )}
                    </form>
                </div>
            </div>
        </section>
    );
};

export default Contact;
