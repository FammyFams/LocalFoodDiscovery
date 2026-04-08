const { Jimp } = require('jimp');

const SIZE = 1024;
const BG = 0x212529FF;
const ACCENT = 0x34AFA9FF;
const WHITE = 0xFFFFFFFF;

function dist(x1, y1, x2, y2) {
  return Math.sqrt((x1 - x2) ** 2 + (y1 - y2) ** 2);
}

async function generate() {
  const img = new Jimp({ width: SIZE, height: SIZE, color: BG });

  const cx = SIZE / 2;

  // Draw location pin (teardrop shape)
  const pinCenterY = 400;
  const pinRadius = 280;
  const pinTipY = 820;

  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      // Circle part of pin
      const d = dist(x, y, cx, pinCenterY);
      if (d <= pinRadius) {
        img.setPixelColor(ACCENT, x, y);
        continue;
      }

      // Triangle part (from circle to tip)
      if (y > pinCenterY && y <= pinTipY) {
        const progress = (y - pinCenterY) / (pinTipY - pinCenterY);
        const halfWidth = pinRadius * (1 - progress * 0.95);
        if (Math.abs(x - cx) <= halfWidth) {
          // Smooth the edges
          const edgeDist = halfWidth - Math.abs(x - cx);
          if (edgeDist >= 0) {
            img.setPixelColor(ACCENT, x, y);
          }
        }
      }
    }
  }

  // Draw white circle inside pin (plate)
  const plateRadius = 170;
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const d = dist(x, y, cx, pinCenterY);
      if (d <= plateRadius) {
        img.setPixelColor(WHITE, x, y);
      }
    }
  }

  // Draw fork inside the plate
  const forkColor = ACCENT;

  // Fork handle
  const handleWidth = 22;
  const handleTop = 310;
  const handleBottom = 520;
  for (let y = handleTop; y <= handleBottom; y++) {
    for (let x = cx - handleWidth / 2; x <= cx + handleWidth / 2; x++) {
      img.setPixelColor(forkColor, Math.round(x), y);
    }
  }

  // Fork head (3 tines)
  const tineTop = 260;
  const tineBottom = 370;
  const tineWidth = 14;
  const tineGap = 36;
  const tines = [-1, 0, 1];

  for (const t of tines) {
    const tineCx = cx + t * tineGap;
    for (let y = tineTop; y <= tineBottom; y++) {
      for (let x = tineCx - tineWidth / 2; x <= tineCx + tineWidth / 2; x++) {
        img.setPixelColor(forkColor, Math.round(x), y);
      }
    }
    // Rounded tine tops
    for (let y = tineTop - tineWidth / 2; y <= tineTop; y++) {
      for (let x = tineCx - tineWidth / 2; x <= tineCx + tineWidth / 2; x++) {
        if (dist(x, y, tineCx, tineTop) <= tineWidth / 2) {
          img.setPixelColor(forkColor, Math.round(x), y);
        }
      }
    }
  }

  // Fork bridge connecting tines
  const bridgeY = tineBottom;
  const bridgeHeight = 24;
  const bridgeLeft = cx - tineGap - tineWidth / 2;
  const bridgeRight = cx + tineGap + tineWidth / 2;
  for (let y = bridgeY; y <= bridgeY + bridgeHeight; y++) {
    for (let x = bridgeLeft; x <= bridgeRight; x++) {
      img.setPixelColor(forkColor, Math.round(x), y);
    }
  }

  // Taper from bridge to handle
  const taperTop = bridgeY + bridgeHeight;
  const taperBottom = handleTop + 40;
  const bridgeHalfW = (bridgeRight - bridgeLeft) / 2;
  for (let y = taperTop; y <= taperBottom; y++) {
    const progress = (y - taperTop) / (taperBottom - taperTop);
    const halfW = bridgeHalfW * (1 - progress) + (handleWidth / 2) * progress;
    for (let x = cx - halfW; x <= cx + halfW; x++) {
      img.setPixelColor(forkColor, Math.round(x), y);
    }
  }

  // Rounded handle bottom
  const handleEndRadius = handleWidth / 2 + 4;
  for (let y = handleBottom - handleEndRadius; y <= handleBottom + handleEndRadius; y++) {
    for (let x = cx - handleEndRadius; x <= cx + handleEndRadius; x++) {
      if (dist(x, y, cx, handleBottom) <= handleEndRadius) {
        img.setPixelColor(forkColor, Math.round(x), y);
      }
    }
  }

  // Save all icon sizes
  await img.write('assets/icon.png');
  await img.write('assets/adaptive-icon.png');

  // Splash icon (same but maybe we keep it)
  await img.write('assets/splash-icon.png');

  console.log('Icons generated: assets/icon.png, assets/adaptive-icon.png, assets/splash-icon.png');
}

generate().catch(console.error);
