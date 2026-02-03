import { useEffect } from 'react';

interface SEOProps {
    title: string;
    description: string;
    keywords?: string;
    ogImage?: string;
    ogUrl?: string;
    ogType?: string;
    author?: string;
    jsonLd?: Record<string, any>;
    canonicalUrl?: string;
}

const SEO = ({
    title,
    description,
    keywords = 'মাহিয়ান আহমেদ, মাহিয়ানের গল্পকথা, বাংলা গল্প, ভয়েস আর্টিস্ট, অডিওবুক, ইউটিউবার, Mahean Ahmed, Bangla Audio Story',
    ogImage = 'https://mahean.com/og-image.jpg',
    ogUrl,
    ogType = 'website',
    author = 'Mahean Ahmed',
    jsonLd,
    canonicalUrl
}: SEOProps) => {
    const siteUrl = 'https://mahean.com';
    // Use provided URL or fallback to current window location if available, otherwise siteUrl
    const finalUrl = ogUrl || canonicalUrl || (typeof window !== 'undefined' ? window.location.href : siteUrl);

    useEffect(() => {
        // Set document title
        document.title = title.includes('মাহিয়ানের গল্পকথা') || title.includes('Mahean Ahmed')
            ? title
            : `${title} | Mahean Ahmed - মাহিয়ানের গল্পকথা`;

        // Helper function to set or update meta tags
        const setMetaTag = (name: string, content: string, isProperty = false) => {
            const attribute = isProperty ? 'property' : 'name';
            let element = document.querySelector(`meta[${attribute}="${name}"]`);

            if (!element) {
                element = document.createElement('meta');
                element.setAttribute(attribute, name);
                document.head.appendChild(element);
            }

            element.setAttribute('content', content);
        };

        // Helper to set link tags (canonical)
        const setLinkTag = (rel: string, href: string) => {
            let element = document.querySelector(`link[rel="${rel}"]`);
            if (!element) {
                element = document.createElement('link');
                element.setAttribute('rel', rel);
                document.head.appendChild(element);
            }
            element.setAttribute('href', href);
        };

        // Basic meta tags
        setMetaTag('description', description);
        setMetaTag('keywords', keywords);
        setMetaTag('author', author);
        setMetaTag('robots', 'index, follow, max-image-preview:large');
        setMetaTag('language', 'Bengali');
        setMetaTag('theme-color', '#0f172a');

        // Open Graph tags
        setMetaTag('og:title', title, true);
        setMetaTag('og:description', description, true);
        setMetaTag('og:image', ogImage, true);
        setMetaTag('og:url', finalUrl, true);
        setMetaTag('og:type', ogType, true);
        setMetaTag('og:locale', 'bn_BD', true);
        setMetaTag('og:site_name', 'Mahean Ahmed', true);

        // Twitter Card tags
        setMetaTag('twitter:card', 'summary_large_image');
        setMetaTag('twitter:title', title);
        setMetaTag('twitter:description', description);
        setMetaTag('twitter:image', ogImage);

        // Canonical URL
        setLinkTag('canonical', finalUrl);

        // JSON-LD Structured Data
        if (jsonLd) {
            let script = document.querySelector('script[type="application/ld+json"]');
            if (!script) {
                script = document.createElement('script');
                script.setAttribute('type', 'application/ld+json');
                document.head.appendChild(script);
            }
            script.textContent = JSON.stringify(jsonLd);
        }

    }, [title, description, keywords, ogImage, finalUrl, ogType, author, jsonLd, canonicalUrl]);

    return null;
};

export default SEO;
