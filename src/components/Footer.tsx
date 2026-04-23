import { Link } from 'react-router-dom';
import BrandLogo from './BrandLogo';
import './Footer.css';

const FacebookIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
        <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
    </svg>
);

const MessengerIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2C6.477 2 2 6.145 2 11.243c0 2.885 1.428 5.457 3.666 7.166V22l3.338-1.836A10.88 10.88 0 0 0 12 20.486c5.523 0 10-4.145 10-9.243C22 6.145 17.523 2 12 2zm1.103 12.448l-2.55-2.718-4.977 2.718 5.472-5.807 2.612 2.718 4.915-2.718-5.472 5.807z" />
    </svg>
);

const ThreadsIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12.186 24h-.007c-3.581-.024-6.334-1.205-8.184-3.509C2.35 18.44 1.5 15.586 1.473 12.01v-.017c.027-3.579.875-6.43 2.525-8.482C5.845 1.205 8.6.024 12.18 0h.014c2.746.02 5.043.725 6.826 2.098 1.677 1.29 2.858 3.13 3.509 5.485l-2.066.56c-1.14-4.056-4.02-6.09-8.277-6.12-2.963.022-5.142.906-6.477 2.624-1.208 1.55-1.848 3.906-1.88 7.014.032 3.052.667 5.393 1.887 6.957 1.34 1.73 3.524 2.617 6.495 2.641 2.783-.02 4.671-.756 5.786-2.247.771-1.025 1.159-2.4 1.17-4.175-.01-.688-.097-1.334-.263-1.945-.154.073-.31.14-.468.2-.27.093-.545.171-.824.233.132.501.2 1.035.2 1.593.002 1.386-.274 2.476-.816 3.24-.713 1.01-1.876 1.534-3.46 1.56-2.063-.021-3.512-.618-4.302-1.775-.629-.917-.94-2.2-.923-3.812.018-1.637.355-2.953 1.002-3.916.764-1.138 1.93-1.724 3.47-1.742.998.013 1.87.303 2.59.864.244.186.466.4.662.64.022-.232.018-.465-.011-.69C16.673 7.3 15.27 6.667 13.367 6.6c-2.233.088-3.836 1.147-4.767 3.148-.55 1.192-.829 2.742-.85 4.605-.016 1.432.188 2.594.607 3.454.754 1.552 2.13 2.364 4.094 2.41z" />
    </svg>
);

const InstagramIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="2" width="20" height="20" rx="5" ry="5" /><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" /><line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
    </svg>
);

const XIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.736l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
);

const YouTubeIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
        <path d="M22.54 6.42a2.78 2.78 0 0 0-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46a2.78 2.78 0 0 0-1.95 1.96A29 29 0 0 0 1 12a29 29 0 0 0 .46 5.58A2.78 2.78 0 0 0 3.41 19.54C5.12 20 12 20 12 20s6.88 0 8.59-.46a2.78 2.78 0 0 0 1.95-1.96A29 29 0 0 0 23 12a29 29 0 0 0-.46-5.58z" /><polygon points="9.75 15.02 15.5 12 9.75 8.98 9.75 15.02" fill="#000" />
    </svg>
);

export default function Footer() {
    const year = new Date().getFullYear();

    return (
        <footer className="footer">
            <div className="container footer-inner">
                <div className="footer-grid">
                    <div className="footer-col footer-col--brand">
                        <Link to="/" className="footer-brand-link">
                            <BrandLogo size="md" />
                        </Link>
                        <p className="footer-description">
                            বাংলা গল্প বলার এই জায়গায় আমরা এক কি পাঠক ও লেখকের পথচলা। নতুন নতুন উপন্যাস আর চরিত্রের ভেতর হারিয়ে যান, অথবা নিজের গল্প শেয়ার করুন সবার সঙ্গে। পাঠক হলে পাবেন মন ছুঁয়ে যাওয়া লেখা, আর লেখক হলে গড়ে তুলুন নিজের পাঠকগোষ্ঠী। প্রতিটি শব্দ শুক হোক নতুন এক গল্প।
                        </p>
                    </div>

                    <div className="footer-col">
                        <h3 className="footer-heading">প্ল্যাটফর্ম</h3>
                        <div className="footer-links">
                            <Link to="/series" className="footer-link">সিরিজ</Link>
                            <Link to="/authors" className="footer-link">লেখক</Link>
                            <Link to="/tags" className="footer-link">ট্যাগ</Link>
                            <Link to="/categories" className="footer-link">ক্যাটাগরি</Link>
                            <a href="/sitemap.xml" className="footer-link">সাইটম্যাপ</a>
                        </div>
                    </div>

                    <div className="footer-col">
                        <h3 className="footer-heading">কোম্পানি</h3>
                        <div className="footer-links">
                            <Link to="/about" className="footer-link">আমাদের সম্পর্কে</Link>
                            <Link to="/contact" className="footer-link">যোগাযোগ</Link>
                        </div>
                    </div>

                    <div className="footer-col">
                        <h3 className="footer-heading">আইন</h3>
                        <div className="footer-links">
                            <Link to="/privacy" className="footer-link">গোপনীয়তা নীতি</Link>
                            <Link to="/terms" className="footer-link">পরিষেবার শর্তাবলী</Link>
                        </div>
                    </div>
                </div>

                <div className="footer-bottom">
                    <p className="footer-copyright">
                        &copy; {year} GolpoHub . সর্বস্ব সংরক্ষিত।
                    </p>
                    <div className="footer-socials">
                        <a href="https://www.facebook.com/maheanahmedofficial" className="footer-social-icon" aria-label="Facebook" target="_blank" rel="noopener noreferrer">
                            <FacebookIcon />
                        </a>
                        <a href="https://m.me/maheanahmedofficial" className="footer-social-icon" aria-label="Messenger" target="_blank" rel="noopener noreferrer">
                            <MessengerIcon />
                        </a>
                        <a href="#" className="footer-social-icon" aria-label="Threads">
                            <ThreadsIcon />
                        </a>
                        <a href="#" className="footer-social-icon" aria-label="Instagram">
                            <InstagramIcon />
                        </a>
                        <a href="#" className="footer-social-icon" aria-label="X (Twitter)">
                            <XIcon />
                        </a>
                        <a href="https://youtube.com/@maheanstoryvoice" className="footer-social-icon" aria-label="YouTube" target="_blank" rel="noopener noreferrer">
                            <YouTubeIcon />
                        </a>
                    </div>
                </div>
            </div>
        </footer>
    );
}
