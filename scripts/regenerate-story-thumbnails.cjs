const fs = require('node:fs');
const path = require('node:path');
const { createCanvas, loadImage, GlobalFonts } = require('@napi-rs/canvas');

const ROOT_DIR = path.resolve(__dirname, '..');
const STORY_DATA_PATH = path.join(ROOT_DIR, 'data-export', 'table-stories-final.json');
const FONT_PATH = path.join(ROOT_DIR, 'public', 'assets', 'fonts', 'LiSubhaLetterpressUnicodeItalic.ttf');
const LOGO_PATH = path.join(ROOT_DIR, 'public', 'assets', 'thumbnail-logo.png');
const PUBLIC_DIR = path.join(ROOT_DIR, 'public');

const canvasWidth = 1280;
const canvasHeight = 720;

const wrapCanvasText = (ctx, text, maxWidth) => {
  const words = String(text || '').trim().split(/\s+/);
  const lines = [];
  let currentLine = '';

  const pushLine = () => {
    if (currentLine) {
      lines.push(currentLine);
      currentLine = '';
    }
  };

  const pushWordAsLines = (word) => {
    let chunk = '';
    for (const char of word) {
      const testChunk = chunk + char;
      if (ctx.measureText(testChunk).width > maxWidth && chunk) {
        lines.push(chunk);
        chunk = char;
      } else {
        chunk = testChunk;
      }
    }
    if (chunk) {
      lines.push(chunk);
    }
  };

  for (const word of words) {
    const nextLine = currentLine ? `${currentLine} ${word}` : word;
    if (ctx.measureText(nextLine).width <= maxWidth) {
      currentLine = nextLine;
      continue;
    }

    pushLine();

    if (ctx.measureText(word).width <= maxWidth) {
      currentLine = word;
    } else {
      pushWordAsLines(word);
    }
  }

  pushLine();
  return lines.length ? lines : [String(text || '')];
};

const ensureDirectory = (targetPath) => {
  const dir = path.dirname(targetPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

const generateCover = async (title, author) => {
  const canvas = createCanvas(canvasWidth, canvasHeight);
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#050505';
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  ctx.strokeStyle = '#1f2937';
  ctx.lineWidth = 3;
  ctx.strokeRect(18, 18, canvasWidth - 36, canvasHeight - 36);

  try {
    if (fs.existsSync(LOGO_PATH)) {
      const logo = await loadImage(LOGO_PATH);
      const targetHeight = Math.round(canvasHeight * 0.12);
      const scale = targetHeight / logo.height;
      const targetWidth = logo.width * scale;
      const logoX = canvasWidth - targetWidth - Math.round(canvasWidth * 0.01);
      const logoY = Math.round(canvasHeight * 0.015);
      ctx.drawImage(logo, logoX, logoY, targetWidth, targetHeight);
    }
  } catch (error) {
    console.warn('Logo load failed.', error.message || error);
  }

  const coverTitle = String(title || '\u0997\u09b2\u09cd\u09aa\u09c7\u09b0 \u09b6\u09bf\u09b0\u09cb\u09a8\u09be\u09ae');
  const coverAuthor = String(author || '\u09b2\u09c7\u0995\u09a4');
  const titleFontFamily = 'Li Subha Letterpress Unicode';
  const authorFontFamily = 'Hind Siliguri, Noto Sans Bengali, Nirmala UI, Vrinda, sans-serif';
  const maxTitleWidth = canvasWidth - 240;
  const maxTitleHeight = canvasHeight * 0.46;
  const maxLines = 4;

  let titleFontSize = 84;
  let titleLines = [];
  let titleLineHeight = Math.round(titleFontSize * 1.15);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#FF5C00';

  for (let size = 84; size >= 56; size -= 4) {
    ctx.font = `700 ${size}px ${titleFontFamily}`;
    const lines = wrapCanvasText(ctx, coverTitle, maxTitleWidth);
    const lineHeight = Math.round(size * 1.15);
    const totalHeight = lines.length * lineHeight;
    if (lines.length <= maxLines && totalHeight <= maxTitleHeight) {
      titleFontSize = size;
      titleLines = lines;
      titleLineHeight = lineHeight;
      break;
    }
    if (size === 56) {
      titleFontSize = size;
      titleLines = lines;
      titleLineHeight = lineHeight;
    }
  }

  const totalTitleHeight = titleLines.length * titleLineHeight;
  const startY = canvasHeight * 0.5 - totalTitleHeight / 2;

  titleLines.forEach((line, index) => {
    ctx.fillText(line, canvasWidth / 2, startY + index * titleLineHeight);
  });

  const authorFontSize = Math.max(28, Math.round(titleFontSize * 0.4));
  ctx.fillStyle = '#e5e7eb';
  ctx.font = `500 ${authorFontSize}px ${authorFontFamily}`;
  ctx.fillText(coverAuthor, canvasWidth / 2, startY + totalTitleHeight + Math.round(authorFontSize * 1.35));

  return canvas.toBuffer('image/png');
};

const main = async () => {
  if (!fs.existsSync(FONT_PATH)) {
    console.error('Font file not found at', FONT_PATH);
    process.exit(1);
  }
  GlobalFonts.registerFromPath(FONT_PATH);

  const storyData = JSON.parse(fs.readFileSync(STORY_DATA_PATH, 'utf8'));
  const rows = Array.isArray(storyData.rows) ? storyData.rows : [];

  if (!rows.length) {
    console.error('No story rows found in', STORY_DATA_PATH);
    process.exit(1);
  }

  let generated = 0;
  for (const story of rows) {
    const coverPath = String(story.cover_image || '').trim();
    if (!coverPath || !coverPath.startsWith('/uploads/stories/covers/')) {
      continue;
    }

    const localPath = path.join(PUBLIC_DIR, coverPath.replace(/^\//, ''));
    ensureDirectory(localPath);

    try {
      const buffer = await generateCover(story.title, story.author);
      fs.writeFileSync(localPath, buffer);
      generated += 1;
      console.log('Regenerated:', coverPath);
    } catch (error) {
      console.error('Failed to generate cover for', coverPath, error.message || error);
    }
  }

  console.log(`Done. Regenerated ${generated} thumbnail(s).`);
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
