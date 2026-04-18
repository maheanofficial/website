import { useState } from 'react';
import { Check, Copy, Share2 } from 'lucide-react';
import './ShareButtons.css';

interface ShareButtonsProps {
    url: string;
    title: string;
}

export default function ShareButtons({ url, title }: ShareButtonsProps) {
    const [copied, setCopied] = useState(false);

    const encodedUrl = encodeURIComponent(url);
    const encodedTitle = encodeURIComponent(title);

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(url);
        } catch {
            const el = document.createElement('input');
            el.value = url;
            document.body.appendChild(el);
            el.select();
            try { document.execCommand('copy'); } catch { /* ignore */ }
            document.body.removeChild(el);
        }
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
    };

    const handleNativeShare = async () => {
        try {
            await navigator.share({ title, url });
        } catch { /* user cancelled or unsupported */ }
    };

    const canNativeShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';

    return (
        <div className="share-buttons-box">
            <div className="share-buttons-head">
                <Share2 size={15} />
                <span>গল্পটি শেয়ার করুন</span>
            </div>
            <div className="share-buttons-row">
                <a
                    href={`https://wa.me/?text=${encodedTitle}%20${encodedUrl}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="share-btn share-whatsapp"
                    aria-label="WhatsApp-এ শেয়ার করুন"
                >
                    WhatsApp
                </a>
                <a
                    href={`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="share-btn share-facebook"
                    aria-label="Facebook-এ শেয়ার করুন"
                >
                    Facebook
                </a>
                <a
                    href={`https://twitter.com/intent/tweet?text=${encodedTitle}&url=${encodedUrl}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="share-btn share-twitter"
                    aria-label="X (Twitter)-এ শেয়ার করুন"
                >
                    X / Twitter
                </a>
                <button
                    type="button"
                    className={`share-btn share-copy ${copied ? 'is-copied' : ''}`}
                    onClick={() => void handleCopy()}
                    aria-label="লিংক কপি করুন"
                >
                    {copied ? <Check size={13} /> : <Copy size={13} />}
                    <span>{copied ? 'কপি হয়েছে!' : 'লিংক কপি'}</span>
                </button>
                {canNativeShare && (
                    <button
                        type="button"
                        className="share-btn share-native"
                        onClick={() => void handleNativeShare()}
                        aria-label="শেয়ার করুন"
                    >
                        <Share2 size={13} />
                        <span>শেয়ার</span>
                    </button>
                )}
            </div>
        </div>
    );
}
