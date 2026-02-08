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
    DEFAULT_OG_IMAGE
} from '../utils/siteMeta';

interface SEOProps {
    title: string;
    description?: string;
    keywords?: string;
    ogImage?: string;
    ogUrl?: string;
    ogType?: string;
    author?: string;
    jsonLd?: Record<string, any>;
    canonicalUrl?: string;
    noIndex?: boolean;
    noFollow?: boolean;
    locale?: string;
    siteName?: string;
    twitterHandle?: string;
    imageAlt?: string;
    publishedTime?: string;
    modifiedTime?: string;
}

const SEO = ({
    title,
    description = DEFAULT_DESCRIPTION,
    keywords = DEFAULT_KEYWORDS,
    ogImage = DEFAULT_OG_IMAGE,
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
    modifiedTime
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
    const finalImageAlt = imageAlt || `${SITE_NAME} cover image`;
    const robotsContent = [
        noIndex ? 'noindex' : 'index',
        noFollow ? 'nofollow' : 'follow',
        'max-image-preview:large'
    ].join(', ');

    useEffect(() => {
        const titleSuffix = SITE_TAGLINE ? `${SITE_NAME} - ${SITE_TAGLINE}` : SITE_NAME;
        document.title = title.includes(SITE_NAME) ? title : `${title} | ${titleSuffix}`;

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

        const setLinkTag = (rel: string, href: string) => {
            let element = document.querySelector(`link[rel="${rel}"]`);
            if (!element) {
                element = document.createElement('link');
                element.setAttribute('rel', rel);
                document.head.appendChild(element);
            }
            element.setAttribute('href', href);
        };

        setMetaTag('description', description);
        setMetaTag('keywords', keywords);
        setMetaTag('author', author);
        setMetaTag('robots', robotsContent);
        setMetaTag('googlebot', robotsContent);
        setMetaTag('language', SITE_LANGUAGE);
        setMetaTag('theme-color', '#0f172a');

        setMetaTag('og:title', title, true);
        setMetaTag('og:description', description, true);
        if (finalImage) {
            setMetaTag('og:image', finalImage, true);
            setMetaTag('og:image:alt', finalImageAlt, true);
        }
        setMetaTag('og:url', finalUrl, true);
        setMetaTag('og:type', ogType, true);
        setMetaTag('og:locale', locale, true);
        setMetaTag('og:site_name', siteName, true);

        if (ogType === 'article') {
            if (author) {
                setMetaTag('article:author', author, true);
            }
            if (publishedTime) {
                setMetaTag('article:published_time', publishedTime, true);
            }
            if (modifiedTime) {
                setMetaTag('article:modified_time', modifiedTime, true);
            }
        }

        setMetaTag('twitter:card', 'summary_large_image');
        setMetaTag('twitter:title', title);
        setMetaTag('twitter:description', description);
        if (twitterHandle) {
            setMetaTag('twitter:site', twitterHandle);
            setMetaTag('twitter:creator', twitterHandle);
        }
        if (finalImage) {
            setMetaTag('twitter:image', finalImage);
            setMetaTag('twitter:image:alt', finalImageAlt);
        }

        if (finalUrl) {
            setLinkTag('canonical', finalUrl);
        }

        if (jsonLd) {
            let script = document.querySelector('script[type="application/ld+json"]');
            if (!script) {
                script = document.createElement('script');
                script.setAttribute('type', 'application/ld+json');
                document.head.appendChild(script);
            }
            script.textContent = JSON.stringify(jsonLd);
        }
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
        robotsContent,
        locale,
        siteName,
        twitterHandle,
        publishedTime,
        modifiedTime
    ]);

    return null;
};

export default SEO;
