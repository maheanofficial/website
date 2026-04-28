const fs = require('node:fs');
const path = require('node:path');
const { createCanvas, loadImage, GlobalFonts } = require('@napi-rs/canvas');

const ROOT_DIR = path.resolve(__dirname, '..');
const STORY_DATA_PATH = path.join(ROOT_DIR, 'data-export', 'table-stories-final.json');
const FONT_PATH = path.join(ROOT_DIR, 'public', 'assets', 'fonts', 'LiSubhaLetterpressUnicode.ttf');
const LOGO_PATH = path.join(ROOT_DIR, 'public', 'assets', 'thumbnail-logo.png');
const PUBLIC_DIR = path.join(ROOT_DIR, 'public');

const canvasWidth = 800;
const canvasHeight = 450;

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

  // === BACKGROUND: radial gradient (deep indigo -> near black) ===
  const bgGradient = ctx.createRadialGradient(
    canvasWidth / 2, canvasHeight * 0.5, 40,
    canvasWidth / 2, canvasHeight * 0.5, Math.max(canvasWidth, canvasHeight) * 0.7
  );
  bgGradient.addColorStop(0, '#1a0f2e');
  bgGradient.addColorStop(0.55, '#0a0612');
  bgGradient.addColorStop(1, '#050505');
  ctx.fillStyle = bgGradient;
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  // === SUBTLE NOISE/DOT TEXTURE for depth (deterministic so regen is stable) ===
  ctx.save();
  ctx.globalAlpha = 0.04;
  ctx.fillStyle = '#ffffff';
  let seed = (String(title) + String(author)).split('').reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 0x9e3779b1);
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 0xffffffff;
  };
  for (let i = 0; i < 240; i += 1) {
    ctx.fillRect(rand() * canvasWidth, rand() * canvasHeight, 1, 1);
  }
  ctx.restore();

  // === TOP ACCENT BAR (orange gradient) ===
  const topBar = ctx.createLinearGradient(0, 0, canvasWidth, 0);
  topBar.addColorStop(0, '#FF5C00');
  topBar.addColorStop(0.5, '#FFA500');
  topBar.addColorStop(1, '#FF5C00');
  ctx.fillStyle = topBar;
  ctx.fillRect(0, 0, canvasWidth, 5);

  // === INNER FRAME ===
  const frameInset = 22;
  ctx.strokeStyle = 'rgba(255, 165, 0, 0.28)';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(frameInset, frameInset, canvasWidth - frameInset * 2, canvasHeight - frameInset * 2);

  // === CORNER TRIANGLE ORNAMENTS (orange) ===
  const cornerSize = 20;
  ctx.fillStyle = '#FF5C00';
  ctx.beginPath();
  ctx.moveTo(frameInset, frameInset + cornerSize);
  ctx.lineTo(frameInset, frameInset);
  ctx.lineTo(frameInset + cornerSize, frameInset);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(canvasWidth - frameInset - cornerSize, frameInset);
  ctx.lineTo(canvasWidth - frameInset, frameInset);
  ctx.lineTo(canvasWidth - frameInset, frameInset + cornerSize);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(frameInset, canvasHeight - frameInset - cornerSize);
  ctx.lineTo(frameInset, canvasHeight - frameInset);
  ctx.lineTo(frameInset + cornerSize, canvasHeight - frameInset);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(canvasWidth - frameInset - cornerSize, canvasHeight - frameInset);
  ctx.lineTo(canvasWidth - frameInset, canvasHeight - frameInset);
  ctx.lineTo(canvasWidth - frameInset, canvasHeight - frameInset - cornerSize);
  ctx.closePath();
  ctx.fill();

  // === LOGO (top-right) ===
  try {
    if (fs.existsSync(LOGO_PATH)) {
      const logo = await loadImage(LOGO_PATH);
      const targetHeight = Math.round(canvasHeight * 0.13);
      const scale = targetHeight / logo.height;
      const targetWidth = logo.width * scale;
      const logoX = canvasWidth - targetWidth - Math.round(canvasWidth * 0.025);
      const logoY = Math.round(canvasHeight * 0.035);
      ctx.drawImage(logo, logoX, logoY, targetWidth, targetHeight);
    }
  } catch (error) {
    console.warn('Logo load failed.', error.message || error);
  }

  const coverTitle = String(title || '\u0997\u09b2\u09cd\u09aa\u09c7\u09b0 \u09b6\u09bf\u09b0\u09cb\u09a8\u09be\u09ae');
  const coverAuthor = String(author || '\u09b2\u09c7\u0995\u09a4');
  const titleFontFamily = 'Li Subha Letterpress Unicode';
  const authorFontFamily = 'Hind Siliguri, Noto Sans Bengali, Nirmala UI, Vrinda, sans-serif';
  const maxTitleWidth = canvasWidth - 200;
  const maxTitleHeight = canvasHeight * 0.46;
  const maxLines = 3;

  let titleFontSize = 80;
  let titleLines = [];
  let titleLineHeight = Math.round(titleFontSize * 1.15);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  for (let size = 80; size >= 46; size -= 4) {
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
    if (size === 46) {
      titleFontSize = size;
      titleLines = lines;
      titleLineHeight = lineHeight;
    }
  }

  const totalTitleHeight = titleLines.length * titleLineHeight;
  const startY = canvasHeight * 0.48 - totalTitleHeight / 2;

  // === TITLE: gradient gold->orange + glow shadow ===
  ctx.font = `700 ${titleFontSize}px ${titleFontFamily}`;
  const titleGradient = ctx.createLinearGradient(
    0, startY - titleLineHeight / 2,
    0, startY + totalTitleHeight + titleLineHeight / 2
  );
  titleGradient.addColorStop(0, '#FFE066');
  titleGradient.addColorStop(0.5, '#FFA94D');
  titleGradient.addColorStop(1, '#FF5C00');
  ctx.fillStyle = titleGradient;
  ctx.shadowColor = 'rgba(255, 92, 0, 0.55)';
  ctx.shadowBlur = 22;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 4;
  titleLines.forEach((line, index) => {
    ctx.fillText(line, canvasWidth / 2, startY + index * titleLineHeight);
  });
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;

  // === ORNAMENTAL DIVIDER (line - diamond - line) ===
  const dividerY = startY + totalTitleHeight + 22;
  const dividerCx = canvasWidth / 2;
  const lineLength = 90;
  const diamondHalf = 7;
  ctx.strokeStyle = 'rgba(255, 169, 77, 0.55)';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(dividerCx - lineLength - diamondHalf - 8, dividerY);
  ctx.lineTo(dividerCx - diamondHalf - 8, dividerY);
  ctx.moveTo(dividerCx + diamondHalf + 8, dividerY);
  ctx.lineTo(dividerCx + lineLength + diamondHalf + 8, dividerY);
  ctx.stroke();
  ctx.fillStyle = '#FFA94D';
  ctx.beginPath();
  ctx.moveTo(dividerCx, dividerY - diamondHalf);
  ctx.lineTo(dividerCx + diamondHalf, dividerY);
  ctx.lineTo(dividerCx, dividerY + diamondHalf);
  ctx.lineTo(dividerCx - diamondHalf, dividerY);
  ctx.closePath();
  ctx.fill();

  // === AUTHOR NAME (light gray + soft shadow) ===
  const authorFontSize = Math.max(26, Math.round(titleFontSize * 0.4));
  ctx.fillStyle = '#f3f4f6';
  ctx.font = `500 ${authorFontSize}px ${authorFontFamily}`;
  ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
  ctx.shadowBlur = 6;
  ctx.shadowOffsetY = 2;
  ctx.fillText(coverAuthor, dividerCx, dividerY + Math.round(authorFontSize * 0.95));
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;

  // === BOTTOM-LEFT WATERMARK 'GolpoHub' ===
  ctx.fillStyle = 'rgba(255, 255, 255, 0.28)';
  ctx.font = `600 14px "Hind Siliguri", "Noto Sans Bengali", sans-serif`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'bottom';
  ctx.fillText('GolpoHub', frameInset + 12, canvasHeight - frameInset - 8);

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
