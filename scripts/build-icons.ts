// Builds the app icons (home screen, Android launch screen, iOS, favicon) from one SVG drawing of the Setu bridge.
// Output goes to public/ and is committed; run again only when the logo changes:  npm run data:icons
// Uses sharp, which ships with Next.js.
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";

const OUT = join(import.meta.dirname, "..", "public");
const INK = "#121621"; // same night navy as the intro and the manifest's launch screen
const SAFFRON = "#f59346";
const GOLD = "#f2c14e";
const DECK = "#f1ede4";

// The arch: quadratic curve (96,352) → (416,352) with control (256,96); y(x) = 352 − 512·t(1 − t), t = (x − 96) / 320.
const archY = (x: number) => {
  const t = (x - 96) / 320;
  return 352 - 512 * t * (1 - t);
};
const bridge = [
  `<path d="M72 352 H440" stroke="${DECK}" stroke-opacity="0.55" stroke-width="22" stroke-linecap="round"/>`,
  ...[144, 200, 256, 312, 368].map((x) => `<path d="M${x} ${archY(x) + 10} V346" stroke="${DECK}" stroke-opacity="0.45" stroke-width="9" stroke-linecap="round"/>`),
  `<path d="M96 352 Q256 96 416 352" fill="none" stroke="${SAFFRON}" stroke-width="40" stroke-linecap="round"/>`,
  `<circle cx="256" cy="${archY(256)}" r="20" fill="${GOLD}"/>`,
].join("");
const glow = `<defs><radialGradient id="g" cx="0.5" cy="0.38" r="0.6"><stop offset="0" stop-color="${SAFFRON}" stop-opacity="0.22"/><stop offset="1" stop-color="${SAFFRON}" stop-opacity="0"/></radialGradient></defs>`;

/** `rounded`: transparent corners (normal icon). `scale`: shrink the drawing into the safe zone (maskable icons). */
function svg({ rounded, scale = 1 }: { rounded: boolean; scale?: number }) {
  const bg = rounded ? `<rect width="512" height="512" rx="112" fill="${INK}"/>` : `<rect width="512" height="512" fill="${INK}"/>`;
  const glowRect = rounded ? `<rect width="512" height="512" rx="112" fill="url(#g)"/>` : `<rect width="512" height="512" fill="url(#g)"/>`;
  // Centre the drawing (its bounding box is roughly y 214–364) in the square.
  const content = `<g transform="translate(256 256) scale(${scale}) translate(-256 -289)">${bridge}</g>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">${glow}${bg}${glowRect}${content}</svg>`;
}

mkdirSync(join(OUT, "icons"), { recursive: true });
const png = (s: string, size: number, file: string) => sharp(Buffer.from(s)).resize(size, size).png().toFile(join(OUT, file));

await Promise.all([
  png(svg({ rounded: true }), 192, "icons/icon-192.png"),
  png(svg({ rounded: true }), 512, "icons/icon-512.png"),
  // Maskable: the OS crops to a circle or squircle, so the drawing stays inside the central 80 % safe zone.
  png(svg({ rounded: false, scale: 0.72 }), 512, "icons/maskable-512.png"),
  // iOS adds its own rounded corners and needs an opaque square.
  png(svg({ rounded: false, scale: 0.86 }), 180, "icons/apple-touch-icon.png"),
]);
writeFileSync(join(OUT, "icon.svg"), svg({ rounded: true }));

// favicon.ico: an ICO file can simply wrap a PNG (6-byte header + 16-byte directory entry + the PNG).
const fav = await sharp(Buffer.from(svg({ rounded: true }))).resize(48, 48).png().toBuffer();
const ico = Buffer.alloc(22);
ico.writeUInt16LE(0, 0); // reserved
ico.writeUInt16LE(1, 2); // type: icon
ico.writeUInt16LE(1, 4); // one image
ico.writeUInt8(48, 6); // width
ico.writeUInt8(48, 7); // height
ico.writeUInt16LE(1, 10); // colour planes
ico.writeUInt16LE(32, 12); // bits per pixel
ico.writeUInt32LE(fav.length, 14); // image size
ico.writeUInt32LE(22, 18); // image offset
writeFileSync(join(import.meta.dirname, "..", "src", "app", "favicon.ico"), Buffer.concat([ico, fav]));
console.log("icons written to public/icons, public/icon.svg and src/app/favicon.ico");
