const fs = require('node:fs/promises');
const path = require('node:path');

const ROOT_DIR = path.resolve(__dirname, '..');
const DIST_DIR = path.join(ROOT_DIR, 'dist');
const DIST_INDEX = path.join(DIST_DIR, 'index.html');
const DEFAULT_SITE_URL = 'https://mahean.com';
const BUILD_MODE = process.env.NODE_ENV === 'development' ? 'development' : 'production';

const parseEnvLine = (line) => {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) return null;

  const normalized = trimmed.startsWith('export ') ? trimmed.slice(7).trim() : trimmed;
  const match = normalized.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
  if (!match) return null;

  const key = match[1];
  let value = match[2].trim();

  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1);
  } else {
    value = value.replace(/\s+#.*$/, '').trim();
  }

  value = value
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\r')
    .replace(/\\t/g, '\t');

  return { key, value };
};

const loadEnvFiles = async () => {
  const envFiles = [
    '.env',
    '.env.local',
    `.env.${BUILD_MODE}`,
    `.env.${BUILD_MODE}.local`
  ];

  const resolved = {};

  for (const envFile of envFiles) {
    const filePath = path.join(ROOT_DIR, envFile);
    try {
      const raw = await fs.readFile(filePath, 'utf8');
      const lines = raw.split(/\r?\n/);
      for (const line of lines) {
        const parsed = parseEnvLine(line);
        if (!parsed) continue;
        resolved[parsed.key] = parsed.value;
      }
    } catch (error) {
      if (!error || typeof error !== 'object' || !('code' in error) || error.code !== 'ENOENT') {
        throw error;
      }
    }
  }

  for (const [key, value] of Object.entries(resolved)) {
    if (typeof process.env[key] === 'undefined') {
      process.env[key] = value;
    }
  }
};

const staticRouteMeta = [
  {
    path: '/',
    title: 'মাহিয়ান আহমেদ - ভয়েস আর্টিস্ট ও বাংলা গল্প',
    description: 'বাংলা অডিওবুক, অডিও স্টোরি এবং ভয়েসওভার কনটেন্ট - মাহিয়ান আহমেদের অফিসিয়াল ওয়েবসাইট।',
    keywords: 'Mahean Ahmed, Bangla Audiobook, Bangla Story, Voice Artist, Audio Story'
  },
  {
    path: '/stories',
    title: 'বাংলা গল্পের সংগ্রহ - Mahean Ahmed',
    description: 'থ্রিলার, হরর, রোমান্টিকসহ সেরা বাংলা গল্প পড়ুন।',
    keywords: 'Bangla Story, Bengali Story, Thriller Story, Horror Story, Mahean Ahmed'
  },
  {
    path: '/series',
    title: 'গল্প সিরিজ - Mahean Ahmed',
    description: 'ধারাবাহিক গল্প ও মাল্টি-পার্ট সিরিজ পড়ুন।',
    keywords: 'Bangla Series, Story Series, Bengali Serialized Story'
  },
  {
    path: '/authors',
    title: 'লেখক তালিকা - Mahean Ahmed',
    description: 'আমাদের প্ল্যাটফর্মের সব লেখকের প্রোফাইল ও প্রকাশিত গল্প দেখুন।',
    keywords: 'Bangla Authors, Story Writers, Bengali Writers'
  },
  {
    path: '/categories',
    title: 'গল্প ক্যাটাগরি - Mahean Ahmed',
    description: 'ক্যাটাগরি অনুযায়ী গল্প খুঁজে পড়ুন।',
    keywords: 'Story Categories, Bangla Story Category, Bengali Story Genres'
  },
  {
    path: '/tags',
    title: 'গল্প ট্যাগ - Mahean Ahmed',
    description: 'ট্যাগ অনুযায়ী বাংলা গল্প ব্রাউজ করুন।',
    keywords: 'Story Tags, Bangla Tags, Bengali Story Topics'
  },
  {
    path: '/audiobooks',
    title: 'বাংলা অডিওবুক - Mahean Ahmed',
    description: 'বাংলা অডিওবুক ও ভয়েস কনটেন্ট শুনুন।',
    keywords: 'Bangla Audiobook, Bengali Audiobook, Voice Narration'
  },
  {
    path: '/skills',
    title: 'Skills - Mahean Ahmed',
    description: 'মাহিয়ান আহমেদের স্কিল ও কাজের ক্ষেত্র সম্পর্কে জানুন।',
    keywords: 'Voice Skills, Narration Skills, Mahean Ahmed'
  },
  {
    path: '/contact',
    title: 'Contact - Mahean Ahmed',
    description: 'ভয়েসওভার বা কন্টেন্ট কোলাবোরেশনের জন্য যোগাযোগ করুন।',
    keywords: 'Contact Mahean Ahmed, Voice Over Contact'
  },
  {
    path: '/privacy',
    title: 'Privacy Policy - Mahean Ahmed',
    description: 'প্রাইভেসি পলিসি পড়ুন।',
    keywords: 'Privacy Policy'
  },
  {
    path: '/terms',
    title: 'Terms and Conditions - Mahean Ahmed',
    description: 'ব্যবহারের শর্তাবলি পড়ুন।',
    keywords: 'Terms and Conditions'
  },
  {
    path: '/disclaimer',
    title: 'দাবিত্যাগ - Mahean Ahmed',
    description: 'বিজ্ঞাপন, কপিরাইট এবং ওয়েবসাইটের দায়-সীমাবদ্ধতা সম্পর্কিত গুরুত্বপূর্ণ ঘোষণা।',
    keywords: 'দাবিত্যাগ, AdSense নীতি, Legal Notice'
  },
  {
    path: '/about',
    title: 'About - Mahean Ahmed',
    description: 'মাহিয়ান আহমেদ সম্পর্কে বিস্তারিত জানুন।',
    keywords: 'About Mahean Ahmed, Voice Artist Bio'
  },
  {
    path: '/links',
    title: 'Important Links - Mahean Ahmed',
    description: 'মাহিয়ান আহমেদের গুরুত্বপূর্ণ লিংকসমূহ।',
    keywords: 'Mahean Links, Social Links'
  }
];

const pickFirstEnv = (...keys) => {
  for (const key of keys) {
    const value = process.env[key];
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }
  return '';
};

const normalizeBaseUrl = (value) => {
  if (!value) return '';
  const trimmed = value.trim();
  if (!trimmed) return '';
  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  return withProtocol.replace(/\/+$/, '');
};

const SITE_URL =
  normalizeBaseUrl(
    pickFirstEnv('SITE_URL', 'VITE_SITE_URL', 'VERCEL_PROJECT_PRODUCTION_URL', 'VERCEL_URL')
  ) || DEFAULT_SITE_URL;

const SUPABASE_URL =
  pickFirstEnv('SUPABASE_URL', 'VITE_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_URL') ||
  'https://gepywlhveafqosoyitcb.supabase.co';

const SUPABASE_ANON_KEY =
  pickFirstEnv('SUPABASE_ANON_KEY', 'VITE_SUPABASE_ANON_KEY', 'NEXT_PUBLIC_SUPABASE_ANON_KEY') ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdlcHl3bGh2ZWFmcW9zb3lpdGNiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAwODc2OTEsImV4cCI6MjA4NTY2MzY5MX0.Ibn6RPloHkN2VPYMlvYLssecy27DiP6CvXiPvoD_zPA';
const ADSENSE_SELLER_ID = 'f08c47fec0942fa0';
const ADSENSE_VERIFICATION_START = '<!-- ADSENSE_VERIFICATION_START -->';
const ADSENSE_VERIFICATION_END = '<!-- ADSENSE_VERIFICATION_END -->';

const normalizeAdsensePublisherId = (value) => {
  const cleaned = String(value || '').trim();
  if (!cleaned) return '';
  if (/^ca-pub-\d{6,}$/i.test(cleaned)) return cleaned.toLowerCase();
  if (/^pub-\d{6,}$/i.test(cleaned)) return `ca-${cleaned.toLowerCase()}`;
  if (/^\d{6,}$/.test(cleaned)) return `ca-pub-${cleaned}`;
  return '';
};

const buildAdsenseVerificationBlock = (publisherId) => {
  if (!publisherId) {
    return `${ADSENSE_VERIFICATION_START}\n  ${ADSENSE_VERIFICATION_END}`;
  }

  return [
    ADSENSE_VERIFICATION_START,
    `  <meta name="google-adsense-account" content="${publisherId}" />`,
    '  <script id="google-adsense-script" async',
    `    src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${publisherId}"`,
    '    crossorigin="anonymous"></script>',
    `  ${ADSENSE_VERIFICATION_END}`
  ].join('\n');
};

const applyAdsenseVerification = (html, publisherId) => {
  const blockPattern = new RegExp(
    `${escapeRegex(ADSENSE_VERIFICATION_START)}[\\s\\S]*?${escapeRegex(ADSENSE_VERIFICATION_END)}`,
    'i'
  );
  if (!blockPattern.test(html)) return html;
  return html.replace(blockPattern, buildAdsenseVerificationBlock(publisherId));
};

const writeAdsTxt = async (publisherId) => {
  const publisher = publisherId ? publisherId.replace(/^ca-/i, '') : '';

  const adsTxtContent = publisher
    ? `google.com, ${publisher}, DIRECT, ${ADSENSE_SELLER_ID}\n`
    : [
        '# Google AdSense ads.txt',
        '# Configure VITE_ADSENSE_PUBLISHER_ID to auto-generate this file during build.',
        '# Example:',
        '# google.com, pub-XXXXXXXXXXXXXXXX, DIRECT, f08c47fec0942fa0',
        ''
      ].join('\n');

  await fs.writeFile(path.join(DIST_DIR, 'ads.txt'), adsTxtContent, 'utf8');
  return Boolean(publisher);
};

const LEGACY_META_START = '__MAHEAN_META__:';
const LEGACY_META_END = ':__MAHEAN_META_END__';

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const escapeHtml = (value) =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const toAbsoluteUrl = (value) => {
  if (!value) return `${SITE_URL}/mahean-3.jpg`;
  if (/^https?:\/\//i.test(value)) return value;
  if (value.startsWith('/')) return `${SITE_URL}${value}`;
  return `${SITE_URL}/${value}`;
};

const normalizeDescription = (value) => {
  const plain = String(value || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!plain) return '';
  return plain.length > 180 ? `${plain.slice(0, 177)}...` : plain;
};

const normalizeExcerpt = (value) => {
  const raw = String(value || '');
  if (!raw.startsWith(LEGACY_META_START)) return raw;
  const markerEnd = raw.indexOf(LEGACY_META_END);
  if (markerEnd < 0) return raw;
  return raw.slice(markerEnd + LEGACY_META_END.length);
};

const parseLegacyMeta = (value) => {
  const raw = String(value || '');
  if (!raw.startsWith(LEGACY_META_START)) return null;
  const markerEnd = raw.indexOf(LEGACY_META_END);
  if (markerEnd < 0) return null;
  const payload = raw.slice(LEGACY_META_START.length, markerEnd);
  try {
    const parsed = JSON.parse(payload);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
    return parsed;
  } catch {
    return null;
  }
};

const slugify = (value) => {
  let text = String(value || '');
  try {
    text = text.normalize('NFKC');
  } catch {
    // ignore
  }

  const normalized = text
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-');

  let cleaned = normalized;
  try {
    cleaned = cleaned.replace(/[^\p{L}\p{N}\p{M}-]+/gu, '');
  } catch {
    cleaned = cleaned.replace(/[^\w-]+/g, '');
  }

  return cleaned
    .replace(/-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
};

const setTitle = (html, title) =>
  html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${escapeHtml(title)}</title>`);

const upsertTag = (html, pattern, replacement) => {
  if (pattern.test(html)) {
    return html.replace(pattern, replacement);
  }
  return html.replace('</head>', `  ${replacement}\n</head>`);
};

const setMetaName = (html, name, content) => {
  const tag = `<meta name="${name}" content="${escapeHtml(content)}" />`;
  const pattern = new RegExp(
    `<meta\\s+name=["']${escapeRegex(name)}["']\\s+content=["'][^"']*["']\\s*/?>`,
    'i'
  );
  return upsertTag(html, pattern, tag);
};

const setMetaProperty = (html, property, content) => {
  const tag = `<meta property="${property}" content="${escapeHtml(content)}" />`;
  const pattern = new RegExp(
    `<meta\\s+property=["']${escapeRegex(property)}["']\\s+content=["'][^"']*["']\\s*/?>`,
    'i'
  );
  return upsertTag(html, pattern, tag);
};

const setCanonical = (html, canonicalUrl) => {
  const tag = `<link rel="canonical" href="${escapeHtml(canonicalUrl)}" />`;
  const pattern = /<link\s+rel=["']canonical["']\s+href=["'][^"']*["']\s*\/?>/i;
  return upsertTag(html, pattern, tag);
};

const setJsonLd = (html, jsonLd) => {
  if (!jsonLd) return html;
  const json = JSON.stringify(jsonLd).replace(/<\/script/gi, '<\\/script');
  const clean = html.replace(
    /<script\s+type=["']application\/ld\+json["'][\s\S]*?<\/script>/i,
    ''
  );
  return clean.replace(
    '</head>',
    `  <script type="application/ld+json">${json}</script>\n</head>`
  );
};

const buildSeoHtml = (template, seo) => {
  const canonicalUrl = `${SITE_URL}${seo.path === '/' ? '/' : seo.path}`;
  const ogImage = toAbsoluteUrl(seo.ogImage || '/mahean-3.jpg');
  let html = template;
  html = setTitle(html, seo.title);
  html = setCanonical(html, canonicalUrl);
  html = setMetaName(html, 'description', seo.description);
  html = setMetaName(html, 'keywords', seo.keywords || '');
  html = setMetaName(html, 'robots', seo.robots || 'index, follow, max-image-preview:large');
  html = setMetaProperty(html, 'og:type', seo.ogType || 'website');
  html = setMetaProperty(html, 'og:title', seo.title);
  html = setMetaProperty(html, 'og:description', seo.description);
  html = setMetaProperty(html, 'og:url', canonicalUrl);
  html = setMetaProperty(html, 'og:site_name', 'Mahean Ahmed');
  html = setMetaProperty(html, 'og:image', ogImage);
  html = setMetaProperty(html, 'og:image:alt', seo.imageAlt || seo.title);
  html = setMetaName(html, 'twitter:card', 'summary_large_image');
  html = setMetaName(html, 'twitter:title', seo.title);
  html = setMetaName(html, 'twitter:description', seo.description);
  html = setMetaName(html, 'twitter:site', '@mahean_ahmed');
  html = setMetaName(html, 'twitter:image', ogImage);
  html = setMetaName(html, 'twitter:image:alt', seo.imageAlt || seo.title);
  html = setJsonLd(html, seo.jsonLd || null);
  return html;
};

const routeToOutputFile = (routePath) => {
  if (routePath === '/') {
    return path.join(DIST_DIR, 'index.html');
  }
  const cleanPath = routePath.replace(/^\/+/, '').replace(/\/+$/, '');
  return path.join(DIST_DIR, cleanPath, 'index.html');
};

const writeRouteHtml = async (routePath, html) => {
  const filePath = routeToOutputFile(routePath);
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, html, 'utf8');
};

const isPublicStory = (story) => {
  if (!Object.prototype.hasOwnProperty.call(story, 'status')) return true;
  const status = typeof story.status === 'string' ? story.status.trim().toLowerCase() : '';
  if (!status) return true;
  return ['published', 'completed', 'ongoing'].includes(status);
};

const toStoryPath = (story) => {
  const meta = parseLegacyMeta(story?.excerpt);
  const rawSlug = typeof story.slug === 'string' ? story.slug.trim() : '';
  const metaSlug = typeof meta?.slug === 'string' ? meta.slug.trim() : '';
  const generated = slugify(typeof story.title === 'string' ? story.title : '');
  const fallbackId = String(story.id || '').trim();
  const segment = rawSlug || metaSlug || generated || fallbackId;
  if (!segment) return null;
  return `/stories/${encodeURIComponent(segment)}`;
};

const fetchStoryRows = async () => {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return [];
  }

  const { createClient } = await import('@supabase/supabase-js');
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false }
  });

  const selects = [
    'id, slug, title, excerpt, content, author, tags, cover_image, image, status, date, updated_at',
    'id, slug, title, excerpt, content, author, tags, cover_image, image, date, updated_at',
    'id, title, excerpt, content, date, updated_at',
    'id, title, excerpt, content, author, status, date, updated_at',
    'id, title'
  ];

  let lastError = null;
  for (const selectClause of selects) {
    const { data, error } = await supabase.from('stories').select(selectClause).limit(5000);
    if (!error) {
      return Array.isArray(data) ? data : [];
    }
    lastError = error;
  }

  console.warn('Story prerender skipped: failed to query stories table.', lastError?.message || lastError);
  return [];
};

const toStorySeo = (story) => {
  const pathValue = toStoryPath(story);
  if (!pathValue) return null;
  const title = story.title ? `${story.title} - গল্প | Mahean Ahmed` : 'বাংলা গল্প | Mahean Ahmed';
  const description =
    normalizeDescription(normalizeExcerpt(story.excerpt)) ||
    normalizeDescription(story.content) ||
    'বাংলা গল্প পড়ুন - Mahean Ahmed';
  const rawTags = Array.isArray(story.tags)
    ? story.tags.filter((tag) => typeof tag === 'string')
    : [];
  const keywords = [
    ...rawTags,
    typeof story.author === 'string' ? story.author : '',
    'Bangla Story',
    'Bengali Story'
  ]
    .filter(Boolean)
    .join(', ');
  const articleUrl = `${SITE_URL}${pathValue}`;
  const image = story.cover_image || story.image || '/mahean-3.jpg';

  return {
    path: pathValue,
    title,
    description,
    keywords,
    ogType: 'article',
    ogImage: image,
    imageAlt: story.title || 'Story cover image',
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: story.title || 'Bangla Story',
      description,
      url: articleUrl,
      datePublished: story.date || undefined,
      dateModified: story.updated_at || story.date || undefined,
      author: {
        '@type': 'Person',
        name: typeof story.author === 'string' && story.author.trim() ? story.author.trim() : 'Mahean Ahmed'
      },
      image: [toAbsoluteUrl(image)]
    }
  };
};

const run = async () => {
  await loadEnvFiles();
  const ADSENSE_PUBLISHER_ID = normalizeAdsensePublisherId(
    pickFirstEnv(
      'VITE_ADSENSE_PUBLISHER_ID',
      'ADSENSE_PUBLISHER_ID',
      'NEXT_PUBLIC_ADSENSE_PUBLISHER_ID'
    )
  );

  let template = await fs.readFile(DIST_INDEX, 'utf8');
  template = applyAdsenseVerification(template, ADSENSE_PUBLISHER_ID);
  await fs.writeFile(DIST_INDEX, template, 'utf8');
  let generated = 0;

  for (const route of staticRouteMeta) {
    const html = buildSeoHtml(template, route);
    await writeRouteHtml(route.path, html);
    generated += 1;
  }

  const stories = (await fetchStoryRows()).filter(isPublicStory);
  const uniquePaths = new Set();
  for (const story of stories) {
    const seo = toStorySeo(story);
    if (!seo || uniquePaths.has(seo.path)) continue;
    const html = buildSeoHtml(template, seo);
    await writeRouteHtml(seo.path, html);
    uniquePaths.add(seo.path);
    generated += 1;
  }

  const hasAdsensePublisher = await writeAdsTxt(ADSENSE_PUBLISHER_ID);
  console.log(`[prerender] generated ${generated} HTML routes (${uniquePaths.size} story routes).`);
  console.log(
    `[prerender] ads.txt ${hasAdsensePublisher ? 'generated with AdSense publisher id.' : 'generated with placeholder comments.'}`
  );
};

run().catch((error) => {
  console.error('[prerender] failed:', error);
  process.exitCode = 1;
});
