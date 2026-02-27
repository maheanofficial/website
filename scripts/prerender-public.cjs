const fs = require('node:fs/promises');
const path = require('node:path');

const ROOT_DIR = path.resolve(__dirname, '..');
const DIST_DIR = path.join(ROOT_DIR, 'dist');
const DIST_INDEX = path.join(DIST_DIR, 'index.html');
const STORIES_TABLE_PATH = path.join(ROOT_DIR, 'data', 'table-stories.json');
const DEFAULT_SITE_URL = 'https://www.mahean.com';
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
    title: 'Mahean Ahmed - Voice Artist and Bangla Stories',
    description: 'Listen to Bangla audiobooks, stories, and voice-over content by Mahean Ahmed.',
    keywords: 'Mahean Ahmed, Bangla Audiobook, Bangla Story, Voice Artist, Audio Story'
  },
  {
    path: '/stories',
    title: 'Bangla Stories Collection - Mahean Ahmed',
    description: 'Read and explore the latest Bangla stories across thriller, horror, and romance genres.',
    keywords: 'Bangla Story, Bengali Story, Thriller Story, Horror Story, Mahean Ahmed'
  },
  {
    path: '/series',
    title: 'Story Series - Mahean Ahmed',
    description: 'Browse multi-part and serialized Bangla story collections.',
    keywords: 'Bangla Series, Story Series, Bengali Serialized Story'
  },
  {
    path: '/authors',
    title: 'Authors - Mahean Ahmed',
    description: 'Discover writer profiles and published stories from our authors.',
    keywords: 'Bangla Authors, Story Writers, Bengali Writers'
  },
  {
    path: '/categories',
    title: 'Story Categories - Mahean Ahmed',
    description: 'Find stories by category and genre.',
    keywords: 'Story Categories, Bangla Story Category, Bengali Story Genres'
  },
  {
    path: '/tags',
    title: 'Story Tags - Mahean Ahmed',
    description: 'Browse stories by topic tags and themes.',
    keywords: 'Story Tags, Bangla Tags, Bengali Story Topics'
  },
  {
    path: '/audiobooks',
    title: 'Bangla Audiobooks - Mahean Ahmed',
    description: 'Listen to Bangla audiobooks and narrated voice content.',
    keywords: 'Bangla Audiobook, Bengali Audiobook, Voice Narration'
  },
  {
    path: '/skills',
    title: 'Skills - Mahean Ahmed',
    description: 'Learn about Mahean Ahmed skills and creative work.',
    keywords: 'Voice Skills, Narration Skills, Mahean Ahmed'
  },
  {
    path: '/contact',
    title: 'Contact - Mahean Ahmed',
    description: 'Contact for voice-over and content collaboration.',
    keywords: 'Contact Mahean Ahmed, Voice Over Contact'
  },
  {
    path: '/privacy',
    title: 'Privacy Policy - Mahean Ahmed',
    description: 'Read our privacy policy and data handling information.',
    keywords: 'Privacy Policy'
  },
  {
    path: '/terms',
    title: 'Terms and Conditions - Mahean Ahmed',
    description: 'Read terms and conditions for using this site.',
    keywords: 'Terms and Conditions'
  },
  {
    path: '/disclaimer',
    title: 'Disclaimer - Mahean Ahmed',
    description: 'Read legal disclaimers about ads, copyright, and content usage.',
    keywords: 'Disclaimer, Legal Notice, Copyright'
  },
  {
    path: '/about',
    title: 'About - Mahean Ahmed',
    description: 'Learn more about Mahean Ahmed and his voice content journey.',
    keywords: 'About Mahean Ahmed, Voice Artist Bio'
  },
  {
    path: '/links',
    title: 'Important Links - Mahean Ahmed',
    description: 'Find important links and resources from Mahean Ahmed.',
    keywords: 'Mahean Links, Social Links'
  },
  {
    path: '/login',
    title: 'লেখক পোর্টাল - লগ ইন করুন | মাহিয়ানের গল্পকথা',
    description: 'মাহিয়ানের গল্পকথা লেখক পোর্টালে লগ ইন করুন।',
    keywords: 'লগইন, লেখক পোর্টাল, মাহিয়ানের গল্পকথা',
    robots: 'noindex, nofollow, noarchive'
  },
  {
    path: '/signup',
    title: 'সাইন আপ করুন - মাহিয়ানের গল্পকথা',
    description: 'মাহিয়ানের গল্পকথায় নতুন অ্যাকাউন্ট তৈরি করুন।',
    keywords: 'সাইন আপ, নতুন অ্যাকাউন্ট, লেখক পোর্টাল',
    robots: 'noindex, nofollow, noarchive'
  },
  {
    path: '/forgot-password',
    title: 'পাসওয়ার্ড ভুলে গেছেন? - মাহিয়ানের গল্পকথা',
    description: 'মাহিয়ানের গল্পকথা পাসওয়ার্ড রিসেট পেজ।',
    keywords: 'পাসওয়ার্ড রিসেট, লেখক পোর্টাল',
    robots: 'noindex, nofollow, noarchive'
  },
  {
    path: '/update-password',
    title: 'নতুন পাসওয়ার্ড সেট করুন - মাহিয়ানের গল্পকথা',
    description: 'আপনার অ্যাকাউন্টের জন্য নতুন পাসওয়ার্ড সেট করুন।',
    keywords: 'নতুন পাসওয়ার্ড, পাসওয়ার্ড আপডেট',
    robots: 'noindex, nofollow, noarchive'
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
const MOJIBAKE_PATTERN = /(?:à¦|à§|Ã|Â|â€|â€™|â€œ|â€�)/;

const scoreMojibake = (value) => (String(value).match(/(?:à¦|à§|Ã|Â|â€|â€™|â€œ|â€�|�)/g) || []).length;
const scoreBangla = (value) => (String(value).match(/[\u0980-\u09FF]/g) || []).length;

const decodeLatin1AsUtf8 = (value) => {
  try {
    return Buffer.from(String(value), 'latin1').toString('utf8');
  } catch {
    return String(value);
  }
};

const repairMojibakeText = (value) => {
  const input = String(value ?? '');
  if (!input || !MOJIBAKE_PATTERN.test(input)) return input;

  let current = input;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const decoded = decodeLatin1AsUtf8(current);
    if (!decoded || decoded === current) break;
    const improvedBangla = scoreBangla(decoded) > scoreBangla(current);
    const reducedNoise = scoreMojibake(decoded) < scoreMojibake(current);
    if (!improvedBangla && !reducedNoise) break;
    current = decoded;
  }

  return current;
};

const repairDeep = (value) => {
  if (typeof value === 'string') return repairMojibakeText(value);
  if (Array.isArray(value)) return value.map(repairDeep);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [key, repairDeep(entry)])
    );
  }
  return value;
};

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
  const plain = repairMojibakeText(String(value || ''))
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!plain) return '';
  return plain.length > 180 ? `${plain.slice(0, 177)}...` : plain;
};

const normalizeExcerpt = (value) => {
  const raw = String(value || '');
  if (!raw.startsWith(LEGACY_META_START)) return repairMojibakeText(raw);
  const markerEnd = raw.indexOf(LEGACY_META_END);
  if (markerEnd < 0) return repairMojibakeText(raw);
  return repairMojibakeText(raw.slice(markerEnd + LEGACY_META_END.length));
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
    return repairDeep(parsed);
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
  if (seo.author) {
    html = setMetaName(html, 'author', seo.author);
  }
  html = setMetaProperty(html, 'og:type', seo.ogType || 'website');
  html = setMetaProperty(html, 'og:title', seo.title);
  html = setMetaProperty(html, 'og:description', seo.description);
  html = setMetaProperty(html, 'og:url', canonicalUrl);
  html = setMetaProperty(html, 'og:site_name', 'Mahean Ahmed');
  html = setMetaProperty(html, 'og:image', ogImage);
  html = setMetaProperty(html, 'og:image:alt', seo.imageAlt || seo.title);
  if ((seo.ogType || 'website') === 'article') {
    if (seo.author) {
      html = setMetaProperty(html, 'article:author', seo.author);
    }
    if (seo.publishedTime) {
      html = setMetaProperty(html, 'article:published_time', seo.publishedTime);
    }
    if (seo.modifiedTime) {
      html = setMetaProperty(html, 'article:modified_time', seo.modifiedTime);
    }
  }
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

const toStorySegment = (story) => {
  const meta = parseLegacyMeta(story?.excerpt);
  const rawSlug = typeof story.slug === 'string' ? story.slug.trim() : '';
  const metaSlug = typeof meta?.slug === 'string' ? meta.slug.trim() : '';
  const generated = slugify(typeof story.title === 'string' ? story.title : '');
  const fallbackId = String(story.id || '').trim();
  const segment = rawSlug || metaSlug || generated || fallbackId;
  return segment || null;
};

const buildFallbackPartTitle = (index) => {
  const padded = String(index + 1).padStart(2, '0');
  return `Part ${padded}`;
};

const BANGLA_DIGIT_TO_LATIN = {
  '\u09e6': '0',
  '\u09e7': '1',
  '\u09e8': '2',
  '\u09e9': '3',
  '\u09ea': '4',
  '\u09eb': '5',
  '\u09ec': '6',
  '\u09ed': '7',
  '\u09ee': '8',
  '\u09ef': '9'
};

const LEGACY_BANGLA_PART_TITLE_REGEX = /^\u09aa\u09b0\u09cd\u09ac\s*([\u09e6-\u09ef0-9]+)$/u;

const normalizeLegacyPartTitle = (title, index) => {
  const fallback = buildFallbackPartTitle(index);
  const trimmed = String(title || '').trim();
  if (!trimmed) return fallback;

  const match = trimmed.match(LEGACY_BANGLA_PART_TITLE_REGEX);
  if (!match) return trimmed;

  const normalizedDigits = String(match[1]).replace(/[\u09e6-\u09ef]/g, (digit) => BANGLA_DIGIT_TO_LATIN[digit] || digit);
  const parsed = Number.parseInt(normalizedDigits, 10);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return `Part ${String(parsed).padStart(2, '0')}`;
};

const normalizeStoryParts = (story) => {
  const meta = parseLegacyMeta(story?.excerpt);
  const fromRow = Array.isArray(story?.parts) ? story.parts : null;
  const fromMeta = Array.isArray(meta?.parts) ? meta.parts : null;
  const candidate = (fromRow && fromRow.length ? fromRow : fromMeta) || [];

  const normalized = candidate
    .map((part) => {
      if (!part || typeof part !== 'object') return null;
      const title = typeof part.title === 'string' ? part.title : '';
      const content = typeof part.content === 'string' ? part.content : '';
      const slug = typeof part.slug === 'string' ? part.slug : '';
      if (!title.trim() && !content.trim()) return null;
      return { title: title.trim(), slug: slug.trim(), content: content.trim() };
    })
    .filter(Boolean);

  if (normalized.length) return normalized;

  const content = typeof story?.content === 'string' ? story.content : '';
  const excerpt = normalizeExcerpt(story?.excerpt);
  const fallback = content || excerpt || '';
  return [{ title: '', content: String(fallback).trim() }];
};

const toStoryPartSegment = (part, index) => {
  const fromTitle = slugify(normalizeLegacyPartTitle(part?.title, index));
  const custom = slugify(typeof part?.slug === 'string' ? part.slug : '');
  return fromTitle || custom || String(index + 1);
};

const fetchStoryRows = async () => {
  try {
    const raw = await fs.readFile(STORIES_TABLE_PATH, 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed?.rows) ? repairDeep(parsed.rows) : [];
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
      return [];
    }
    console.warn('[prerender] unable to read stories table:', error);
    return [];
  }
};

const toStoryPartSeos = (story) => {
  const segment = toStorySegment(story);
  if (!segment) return [];

  const storyTitle = typeof story.title === 'string' ? story.title.trim() : '';
  const authorName =
    typeof story.author === 'string' && story.author.trim() ? story.author.trim() : 'Mahean Ahmed';
  const image = story.cover_image || story.image || '/mahean-3.jpg';
  const publishedTime = story.date || undefined;
  const modifiedTime = story.updated_at || story.date || undefined;

  const rawTags = Array.isArray(story.tags)
    ? story.tags.filter((tag) => typeof tag === 'string')
    : [];
  const keywords = [...rawTags, authorName, 'Bangla Story', 'Bengali Story']
    .filter(Boolean)
    .join(', ');

  const parts = normalizeStoryParts(story);
  return parts.map((part, index) => {
    const partTitle = normalizeLegacyPartTitle(part.title, index) || buildFallbackPartTitle(index);
    const pathValue = `/stories/${encodeURIComponent(segment)}/part/${encodeURIComponent(toStoryPartSegment(part, index))}`;
    const canonicalUrl = `${SITE_URL}${pathValue}`;

    const description =
      normalizeDescription(part.content) ||
      normalizeDescription(normalizeExcerpt(story.excerpt)) ||
      normalizeDescription(story.content) ||
      '\u09ac\u09be\u0982\u09b2\u09be \u0997\u09b2\u09cd\u09aa \u09aa\u09dc\u09c1\u09a8 - Mahean Ahmed';

    const pageTitle = storyTitle
      ? `${storyTitle} - ${partTitle} | Mahean Ahmed`
      : `Bangla Story | Mahean Ahmed`;
    const headline = storyTitle ? `${storyTitle} - ${partTitle}` : partTitle;

    return {
      path: pathValue,
      title: pageTitle,
      description,
      keywords,
      ogType: 'article',
      ogImage: image,
      imageAlt: storyTitle || 'Story cover image',
      author: authorName,
      publishedTime,
      modifiedTime,
      jsonLd: {
        '@context': 'https://schema.org',
        '@type': 'Article',
        headline,
        description,
        url: canonicalUrl,
        datePublished: publishedTime,
        dateModified: modifiedTime,
        author: {
          '@type': 'Person',
          name: authorName
        },
        image: [toAbsoluteUrl(image)]
      }
    };
  });
};

const parsePositiveInt = (value, fallback) => {
  const parsed = Number.parseInt(String(value || ''), 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return parsed;
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

  const MAX_PARTS_PER_STORY = parsePositiveInt(pickFirstEnv('PRERENDER_MAX_PARTS_PER_STORY'), 200);
  const MAX_STORY_ROUTES = parsePositiveInt(pickFirstEnv('PRERENDER_MAX_STORY_ROUTES'), 5000);

  const stories = (await fetchStoryRows()).filter(isPublicStory);
  const uniquePaths = new Set();
  for (const story of stories) {
    if (uniquePaths.size >= MAX_STORY_ROUTES) break;
    const seoEntries = toStoryPartSeos(story).slice(0, MAX_PARTS_PER_STORY);
    for (const seo of seoEntries) {
      if (!seo || uniquePaths.has(seo.path)) continue;
      if (uniquePaths.size >= MAX_STORY_ROUTES) break;
      const html = buildSeoHtml(template, seo);
      await writeRouteHtml(seo.path, html);
      uniquePaths.add(seo.path);
      generated += 1;
    }
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

