import { useEffect } from 'react';
import {
    SITE_URL,
    SITE_NAME,
    SITE_TAGLINE,
    SITE_LOCALE,
    SITE_LANGUAGE,
    TWITTER_HANDLE,
    DEFAULT_DESCRIPTION,
    DEFAULT_KEYWORDS,
    DEFAULT_OG_IMAGE,
    DEFAULT_OG_IMAGE_WIDTH,
    DEFAULT_OG_IMAGE_HEIGHT,
} from '../utils/siteMeta';

interface SEOProps {
    title: string;
    description?: string;
    keywords?: string;
    ogImage?: string;
    ogImageWidth?: number;
    ogImageHeight?: number;
    ogUrl?: string;
    ogType?: string;
    author?: string;
    jsonLd?: Record<string, unknown> | Array<Record<string, unknown>>;
    canonicalUrl?: string;
    noIndex?: boolean;
    noFollow?: boolean;
    locale?: string;
    siteName?: string;
    twitterHandle?: string;
    imageAlt?: string;
    publishedTime?: string;
    modifiedTime?: string;
    articleSection?: string;
    articleTag?: string;
}

const SEO = ({
    title,
    description = DEFAULT_DESCRIPTION,
    keywords = DEFAULT_KEYWORDS,
    ogImage = DEFAULT_OG_IMAGE,
    ogImageWidth = DEFAULT_OG_IMAGE_WIDTH,
    ogImageHeight = DEFAULT_OG_IMAGE_HEIGHT,
    ogUrl,
    ogType = 'website',
    author = SITE_NAME,
    jsonLd,
    canonicalUrl,
    noIndex = false,
    noFollow = false,
    locale = SITE_LOCALE,
    siteName = SITE_NAME,
    twitterHandle = TWITTER_HANDLE,
    imageAlt,
    publishedTime,
    modifiedTime,
    articleSection,
    articleTag,
}: SEOProps) => {
    const toAbsoluteUrl = (url?: string) => {
        if (!url) return undefined;
        if (url.startsWith('http://') || url.startsWith('https://')) return url;
        if (url.startsWith('/')) return `${SITE_URL}${url}`;
        return `${SITE_URL}/${url}`;
    };

    const resolvedCanonical = toAbsoluteUrl(canonicalUrl);
    const resolvedOgUrl = toAbsoluteUrl(ogUrl);
    const finalUrl = resolvedOgUrl || resolvedCanonical || (typeof window !== 'undefined' ? window.location.href : SITE_URL);
    const finalImage = toAbsoluteUrl(ogImage);
    const finalImageAlt = imageAlt || `${title} - ${SITE_NAME}`;
    const robotsContent = [
        noIndex ? 'noindex' : 'index',
        noFollow ? 'nofollow' : 'follow',
        'max-image-preview:large',
        'max-snippet:-1',
        'max-video-preview:-1',
    ].join(', ');

    // Build full title: "Page Title | Site Name - Tagline" (or just "Page Title | Site Name")
    const buildFullTitle = () => {
        if (title.includes(SITE_NAME)) return title;
        const suffix = SITE_TAGLINE ? `${SITE_NAME} - ${SITE_TAGLINE}` : SITE_NAME;
        return `${title} | ${suffix}`;
    };

    useEffect(() => {
        document.title = buildFullTitle();

        const setMetaTag = (name: string, content: string, isProperty = false) => {
            if (!content) return;
            const attribute = isProperty ? 'property' : 'name';
            let element = document.querySelector(`meta[${attribute}="${name}"]`);

            if (!element) {
                element = document.createElement('meta');
                element.setAttribute(attribute, name);
                document.head.appendChild(element);
            }

            element.setAttribute('content', content);
        };

        const removeMetaTag = (name: string, isProperty = false) => {
            const attribute = isProperty ? 'property' : 'name';
            document.querySelector(`meta[${attribute}="${name}"]`)?.remove();
        };

        const setCanonicalLink = (href: string) => {
            let element = document.querySelector('link[rel="canonical"]');
            if (!element) {
                element = document.createElement('link');
                element.setAttribute('rel', 'canonical');
                document.head.appendChild(element);
            }
            element.setAttribute('href', href);
        };

        const setAlternateLink = (hrefLang: string, href: string) => {
            let element = document.querySelector(`link[rel="alternate"][hreflang="${hrefLang}"]`);
            if (!element) {
                element = document.createElement('link');
                element.setAttribute('rel', 'alternate');
                document.head.appendChild(element);
            }
            element.setAttribute('data-seo-managed', 'true');
            element.setAttribute('hreflang', hrefLang);
            element.setAttribute('href', href);
        };

        // ── Standard Meta ──────────────────────────────────────────
        setMetaTag('description', description);
        setMetaTag('keywords', keywords);
        setMetaTag('author', author);
        setMetaTag('robots', robotsContent);
        setMetaTag('googlebot', robotsContent);
        setMetaTag('language', SITE_LANGUAGE);
        setMetaTag('theme-color', '#0D0D14');
        setMetaTag('rating', 'general');
        setMetaTag('revisit-after', '3 days');
        setMetaTag('generator', 'Mahean Ahmed Platform');

        // ── Open Graph ─────────────────────────────────────────────
        setMetaTag('og:title', title, true);
        setMetaTag('og:description', description, true);
        setMetaTag('og:url', finalUrl, true);
        setMetaTag('og:type', ogType, true);
        setMetaTag('og:locale', locale, true);
        setMetaTag('og:site_name', siteName, true);
        if (finalImage) {
            setMetaTag('og:image', finalImage, true);
            setMetaTag('og:image:secure_url', finalImage, true);
            setMetaTag('og:image:alt', finalImageAlt, true);
            setMetaTag('og:image:width', String(ogImageWidth), true);
            setMetaTag('og:image:height', String(ogImageHeight), true);
            setMetaTag('og:image:type', 'image/jpeg', true);
        }

        // ── Article-Specific OG ────────────────────────────────────
        if (ogType === 'article') {
            if (author) setMetaTag('article:author', author, true);
            if (publishedTime) setMetaTag('article:published_time', publishedTime, true);
            if (modifiedTime) setMetaTag('article:modified_time', modifiedTime, true);
            if (articleSection) setMetaTag('article:section', articleSection, true);
            if (articleTag) setMetaTag('article:tag', articleTag, true);
        } else {
            // Remove article-specific tags when not an article
            removeMetaTag('article:author', true);
            removeMetaTag('article:published_time', true);
            removeMetaTag('article:modified_time', true);
        }

        // ── Twitter Card ───────────────────────────────────────────
        setMetaTag('twitter:card', 'summary_large_image');
        setMetaTag('twitter:title', title);
        setMetaTag('twitter:description', description);
        setMetaTag('twitter:domain', SITE_URL.replace(/^https?:\/\//, ''));
        setMetaTag('twitter:url', finalUrl);
        if (twitterHandle) {
            setMetaTag('twitter:site', twitterHandle);
            setMetaTag('twitter:creator', twitterHandle);
        }
        if (finalImage) {
            setMetaTag('twitter:image', finalImage);
            setMetaTag('twitter:image:alt', finalImageAlt);
        }

        // ── Canonical & Alternate ──────────────────────────────────
        if (finalUrl) {
            setCanonicalLink(finalUrl);
            setAlternateLink('bn-BD', finalUrl);
            setAlternateLink('x-default', finalUrl);
        }

        // ── JSON-LD ────────────────────────────────────────────────
        document.querySelectorAll('script[type="application/ld+json"][data-seo-managed="true"]').forEach((node) => node.remove());
        const jsonLdEntries = Array.isArray(jsonLd)
            ? jsonLd
            : jsonLd
                ? [jsonLd]
                : [];

        jsonLdEntries
            .filter((entry) => entry && typeof entry === 'object')
            .forEach((entry) => {
                const script = document.createElement('script');
                script.setAttribute('type', 'application/ld+json');
                script.setAttribute('data-seo-managed', 'true');
                document.head.appendChild(script);
                script.textContent = JSON.stringify(entry);
            });
    }, [
        title,
        description,
        keywords,
        author,
        ogType,
        jsonLd,
        finalUrl,
        finalImage,
        finalImageAlt,
        ogImageWidth,
        ogImageHeight,
        robotsContent,
        locale,
        siteName,
        twitterHandle,
        publishedTime,
        modifiedTime,
        articleSection,
        articleTag,
    ]);

    return null;
};

export default SEO;
