import {
    SITE_URL,
    SITE_NAME,
    PUBLISHER,
    SOCIAL_PROFILES,
    CONTACT_EMAIL,
} from './siteMeta';

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────
export interface StorySchemaInput {
    title: string;
    slug: string;
    id: string | number;
    description: string;
    author?: string;
    datePublished?: string;
    dateModified?: string;
    image?: string;
    wordCount?: number;
    keywords?: string;
    partNumber?: number;
    partLabel?: string;
    canonicalUrl?: string;
}

export interface BreadcrumbItem {
    name: string;
    url: string;
}

// ─────────────────────────────────────────────────────────────
// Organization Schema
// ─────────────────────────────────────────────────────────────
export const buildOrganizationSchema = () => ({
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': `${SITE_URL}/#organization`,
    name: SITE_NAME,
    url: SITE_URL,
    logo: {
        '@type': 'ImageObject',
        url: PUBLISHER.logo,
        width: 512,
        height: 512,
    },
    sameAs: SOCIAL_PROFILES,
    contactPoint: {
        '@type': 'ContactPoint',
        email: CONTACT_EMAIL,
        contactType: 'customer support',
        availableLanguage: 'Bengali',
    },
});

// ─────────────────────────────────────────────────────────────
// Person Schema (for Mahean Ahmed)
// ─────────────────────────────────────────────────────────────
export const buildPersonSchema = () => ({
    '@context': 'https://schema.org',
    '@type': 'Person',
    '@id': `${SITE_URL}/#person`,
    name: SITE_NAME,
    url: SITE_URL,
    image: {
        '@type': 'ImageObject',
        url: `${SITE_URL}/mahean-3.jpg`,
        width: 800,
        height: 800,
    },
    sameAs: SOCIAL_PROFILES,
    jobTitle: 'Voice Artist & Audio Storyteller',
    description: 'Professional Bengali Voice Artist creating immersive Bangla audiobooks, thrillers, and audio stories.',
    knowsLanguage: ['Bengali', 'English'],
    nationality: 'Bangladeshi',
    worksFor: {
        '@type': 'Organization',
        name: SITE_NAME,
        url: SITE_URL,
    },
});

// ─────────────────────────────────────────────────────────────
// WebSite Schema
// ─────────────────────────────────────────────────────────────
export const buildWebSiteSchema = () => ({
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${SITE_URL}/#website`,
    url: SITE_URL,
    name: SITE_NAME,
    inLanguage: 'bn-BD',
    publisher: { '@id': `${SITE_URL}/#organization` },
    potentialAction: {
        '@type': 'SearchAction',
        target: {
            '@type': 'EntryPoint',
            urlTemplate: `${SITE_URL}/stories?q={search_term_string}`,
        },
        'query-input': 'required name=search_term_string',
    },
});

// ─────────────────────────────────────────────────────────────
// Article / Story Schema
// ─────────────────────────────────────────────────────────────
export const buildArticleSchema = (input: StorySchemaInput) => {
    const storyUrl = input.canonicalUrl || `${SITE_URL}/stories/${input.slug || input.id}`;
    const image = input.image
        ? (input.image.startsWith('http') ? input.image : `${SITE_URL}${input.image}`)
        : `${SITE_URL}/mahean-3.jpg`;

    return {
        '@context': 'https://schema.org',
        '@type': 'Article',
        '@id': `${storyUrl}#article`,
        headline: input.title,
        url: storyUrl,
        mainEntityOfPage: {
            '@type': 'WebPage',
            '@id': storyUrl,
        },
        image: {
            '@type': 'ImageObject',
            url: image,
            width: 1200,
            height: 630,
        },
        datePublished: input.datePublished,
        dateModified: input.dateModified || input.datePublished,
        author: {
            '@type': 'Person',
            name: input.author || SITE_NAME,
        },
        publisher: {
            '@type': 'Organization',
            '@id': `${SITE_URL}/#organization`,
            name: SITE_NAME,
            logo: {
                '@type': 'ImageObject',
                url: PUBLISHER.logo,
            },
        },
        description: input.description,
        ...(input.wordCount ? { wordCount: input.wordCount } : {}),
        ...(input.keywords ? { keywords: input.keywords } : {}),
        inLanguage: 'bn-BD',
        isAccessibleForFree: true,
    };
};

// ─────────────────────────────────────────────────────────────
// BreadcrumbList Schema
// ─────────────────────────────────────────────────────────────
export const buildBreadcrumbSchema = (items: BreadcrumbItem[]) => ({
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: item.name,
        item: item.url.startsWith('http') ? item.url : `${SITE_URL}${item.url}`,
    })),
});

// ─────────────────────────────────────────────────────────────
// CollectionPage Schema (for listings like Stories, Categories, Tags)
// ─────────────────────────────────────────────────────────────
export const buildCollectionPageSchema = (
    name: string,
    description: string,
    url: string,
    items: { name: string; url: string }[] = [],
) => ({
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name,
    description,
    url: url.startsWith('http') ? url : `${SITE_URL}${url}`,
    inLanguage: 'bn-BD',
    ...(items.length > 0
        ? {
            mainEntity: {
                '@type': 'ItemList',
                itemListElement: items.map((item, index) => ({
                    '@type': 'ListItem',
                    position: index + 1,
                    name: item.name,
                    url: item.url.startsWith('http') ? item.url : `${SITE_URL}${item.url}`,
                })),
            },
        }
        : {}),
});

// ─────────────────────────────────────────────────────────────
// WebPage Schema (for static pages like Privacy, Terms, etc.)
// ─────────────────────────────────────────────────────────────
export const buildWebPageSchema = (
    name: string,
    description: string,
    url: string,
    type: string = 'WebPage',
) => ({
    '@context': 'https://schema.org',
    '@type': type,
    name,
    description,
    url: url.startsWith('http') ? url : `${SITE_URL}${url}`,
    inLanguage: 'bn-BD',
    isPartOf: { '@id': `${SITE_URL}/#website` },
    publisher: { '@id': `${SITE_URL}/#organization` },
});

// ─────────────────────────────────────────────────────────────
// FAQ Schema (useful for help pages / story FAQ)
// ─────────────────────────────────────────────────────────────
export const buildFAQSchema = (faqs: { question: string; answer: string }[]) => ({
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
        '@type': 'Question',
        name: faq.question,
        acceptedAnswer: {
            '@type': 'Answer',
            text: faq.answer,
        },
    })),
});
