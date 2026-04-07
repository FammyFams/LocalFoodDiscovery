const { Jimp, loadFont, HorizontalAlign, VerticalAlign } = require("jimp");
const path = require("path");

const FONT_PATH = path.join(
  __dirname,
  "node_modules/@jimp/plugin-print/dist/fonts/open-sans/open-sans-128-white/open-sans-128-white.fnt"
);

async function generateIcon(size, outputPath) {
  const img = new Jimp({ width: size, height: size, color: 0xff6b35ff });
  const font = await loadFont(FONT_PATH);

  img.print({
    font,
    x: 0,
    y: 0,
    text: {
      text: "food\nFinder",
      alignmentX: HorizontalAlign.CENTER,
      alignmentY: VerticalAlign.MIDDLE,
    },
    maxWidth: size,
    maxHeight: size,
  });

  await img.write(outputPath);
  console.log(`Generated: ${outputPath}`);
}

async function main() {
  await generateIcon(1024, path.join(__dirname, "assets", "icon.png"));
  await generateIcon(1024, path.join(__dirname, "assets", "adaptive-icon.png"));
  await generateIcon(1024, path.join(__dirname, "assets", "splash-icon.png"));
  await generateIcon(196, path.join(__dirname, "assets", "favicon.png"));
  console.log("Done!");
}

main().catch(console.error);
