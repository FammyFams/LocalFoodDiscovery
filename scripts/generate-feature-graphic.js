const { Jimp } = require('jimp');

const WIDTH = 1024;
const HEIGHT = 500;
const BG = 0x212529FF;
const ACCENT = 0x34AFA9FF;
const WHITE = 0xFFFFFFFF;

function dist(x1, y1, x2, y2) {
  return Math.sqrt((x1 - x2) ** 2 + (y1 - y2) ** 2);
}

async function generate() {
  const img = new Jimp({ width: WIDTH, height: HEIGHT, color: BG });

  // Draw a subtle accent gradient arc at bottom
  for (let y = 0; y < HEIGHT; y++) {
    for (let x = 0; x < WIDTH; x++) {
      const d = dist(x, y, WIDTH / 2, HEIGHT + 600);
      if (d < 900 && d > 700) {
        const alpha = Math.max(0, 1 - Math.abs(d - 800) / 100);
        if (Math.random() < alpha * 0.15) {
          img.setPixelColor(ACCENT, x, y);
        }
      }
    }
  }

  // Draw small location pin on the left side
  const pinCx = 200;
  const pinCy = 190;
  const pinR = 100;
  const pinTipY = 350;

  for (let y = 0; y < HEIGHT; y++) {
    for (let x = 0; x < WIDTH; x++) {
      const d = dist(x, y, pinCx, pinCy);
      if (d <= pinR) {
        img.setPixelColor(ACCENT, x, y);
      }
      if (y > pinCy && y <= pinTipY) {
        const progress = (y - pinCy) / (pinTipY - pinCy);
        const halfW = pinR * (1 - progress * 0.95);
        if (Math.abs(x - pinCx) <= halfW) {
          img.setPixelColor(ACCENT, x, y);
        }
      }
    }
  }

  // White circle inside pin
  const plateR = 60;
  for (let y = 0; y < HEIGHT; y++) {
    for (let x = 0; x < WIDTH; x++) {
      if (dist(x, y, pinCx, pinCy) <= plateR) {
        img.setPixelColor(WHITE, x, y);
      }
    }
  }

  // Mini fork in plate
  const forkColor = ACCENT;
  const handleW = 8;
  const hTop = 155;
  const hBot = 230;
  for (let y = hTop; y <= hBot; y++) {
    for (let x = pinCx - handleW / 2; x <= pinCx + handleW / 2; x++) {
      img.setPixelColor(forkColor, Math.round(x), y);
    }
  }
  const tineTop = 140;
  const tineBot = 185;
  const tineW = 5;
  const tineGap = 14;
  for (const t of [-1, 0, 1]) {
    const tcx = pinCx + t * tineGap;
    for (let y = tineTop; y <= tineBot; y++) {
      for (let x = tcx - tineW / 2; x <= tcx + tineW / 2; x++) {
        img.setPixelColor(forkColor, Math.round(x), y);
      }
    }
  }
  // Bridge
  for (let y = tineBot; y <= tineBot + 8; y++) {
    for (let x = pinCx - tineGap - tineW / 2; x <= pinCx + tineGap + tineW / 2; x++) {
      img.setPixelColor(forkColor, Math.round(x), y);
    }
  }

  // Draw "mesoHungry" text area — large white text (using pixel font approach)
  // Since jimp doesn't have easy text, we'll put the app name as a clean wordmark
  // Using block letters

  const letters = {
    m: [
      '##...##',
      '###.###',
      '#.#.#.#',
      '#..#..#',
      '#.....#',
      '#.....#',
      '#.....#',
    ],
    e: [
      '#####',
      '#....',
      '#####',
      '#....',
      '#####',
    ],
    s: [
      '.####',
      '#....',
      '.###.',
      '....#',
      '####.',
    ],
    o: [
      '.###.',
      '#...#',
      '#...#',
      '#...#',
      '.###.',
    ],
    H: [
      '#...#',
      '#...#',
      '#####',
      '#...#',
      '#...#',
    ],
    u: [
      '#...#',
      '#...#',
      '#...#',
      '#...#',
      '.###.',
    ],
    n: [
      '#..##',
      '##..#',
      '#...#',
      '#...#',
      '#...#',
    ],
    g: [
      '.####',
      '#...#',
      '#...#',
      '.####',
      '....#',
      '.###.',
    ],
    r: [
      '#.##.',
      '##..#',
      '#....',
      '#....',
      '#....',
    ],
    y: [
      '#...#',
      '.#.#.',
      '..#..',
      '..#..',
      '..#..',
    ],
  };

  const word = 'mesoHungry';
  const pixelSize = 8;
  const letterSpacing = 3;
  let startX = 340;
  const startY = 160;

  for (const ch of word) {
    const glyph = letters[ch];
    if (!glyph) { startX += 30; continue; }
    let maxW = 0;
    for (let row = 0; row < glyph.length; row++) {
      for (let col = 0; col < glyph[row].length; col++) {
        if (glyph[row][col] === '#') {
          const px = startX + col * pixelSize;
          const py = startY + row * pixelSize;
          for (let dy = 0; dy < pixelSize - 1; dy++) {
            for (let dx = 0; dx < pixelSize - 1; dx++) {
              if (px + dx < WIDTH && py + dy < HEIGHT) {
                img.setPixelColor(WHITE, px + dx, py + dy);
              }
            }
          }
        }
        if (glyph[row].length > maxW) maxW = glyph[row].length;
      }
    }
    startX += maxW * pixelSize + letterSpacing * pixelSize;
  }

  // Tagline below
  const tagline = {
    S: ['.###.', '#....', '.###.', '....#', '.###.'],
    w: ['#...#', '#...#', '#.#.#', '##.##', '#...#'],
    i: ['#', '.', '#', '#', '#'],
    p: ['####.', '#...#', '####.', '#....', '#....'],
    t: ['.#.', '###', '.#.', '.#.', '.#.'],
    F: ['#####', '#....', '###..', '#....', '#....'],
    d: ['....#', '....#', '.####', '#...#', '.####'],
  };

  // Simple tagline: "Swipe to Find Food"
  const tag = 'Swipe to Find Food';
  let tagX = 370;
  const tagY = 320;
  const tagPixel = 4;
  const allLetters = { ...letters, ...tagline, ' ': ['...', '...', '...', '...', '...'], F: tagline.F, d: tagline.d, S: tagline.S, w: tagline.w, i: tagline.i, p: tagline.p, t: tagline.t };

  for (const ch of tag) {
    const glyph = allLetters[ch];
    if (!glyph) { tagX += 20; continue; }
    let maxW = 0;
    for (let row = 0; row < glyph.length; row++) {
      for (let col = 0; col < glyph[row].length; col++) {
        if (glyph[row][col] === '#') {
          const px = tagX + col * tagPixel;
          const py = tagY + row * tagPixel;
          for (let dy = 0; dy < tagPixel - 1; dy++) {
            for (let dx = 0; dx < tagPixel - 1; dx++) {
              if (px + dx < WIDTH && py + dy < HEIGHT) {
                img.setPixelColor(ACCENT, px + dx, py + dy);
              }
            }
          }
        }
        if (glyph[row].length > maxW) maxW = glyph[row].length;
      }
    }
    tagX += maxW * tagPixel + 2 * tagPixel;
  }

  await img.write('assets/feature-graphic.png');
  console.log('Created assets/feature-graphic.png (1024x500)');
}

generate().catch(console.error);
