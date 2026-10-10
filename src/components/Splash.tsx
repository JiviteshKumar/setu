import type { CSSProperties } from "react";
import { APP_NAME, APP_TAGLINE } from "@/lib/site";
import { SplashSound } from "./SplashSound";

// Opening motion graphic (~6.9 s), shown once per browser session. Pure SVG + CSS (styles: "sp-" classes in
// globals.css), so it plays from the very first paint — before any JavaScript — and removes itself at the end.
//
//   0.0–1.0  DROP      a saffron drop falls, squashes, bounces; shockwave rings; huge "भारत" drifts behind
//   0.95–2.4 JOURNEY   a plane launches on a looping comet trail; kinetic words Courses → APS → dMAT → Visa;
//                      document cards fly past at three depths; the starfield pans like a camera
//   2.4–3.3  GERMANY   the plane drags in a black-red-gold wipe across the screen; "DEUTSCHLAND" slides back
//   3.0–4.0  BRIDGE    camera close-up: India and Germany anchors fly in, two half-arches meet in a spark,
//                      deck snaps out, cables drop; the camera pulls back
//   3.95–6.0 LOGO      the bridge settles into the logo, "Setu" rises letter by letter, tagline, facts, gold dot
//   6.0–6.85 EXIT      the screen splits open (like a bascule bridge) to reveal the app
//
// Skipped when already seen this session or when animations are off; a still version (final frame) when the device
// asks for reduced motion. Tap, the Skip button or Esc ends it early (see SPLASH_SCRIPT). Optional sound: SplashSound.

const ARC = "M60 250 Q180 70 300 250"; // the logo's arch; x is linear in t, so y(x) = 250 − 360·t(1 − t), t = (x − 60) / 240
const arcY = (x: number) => {
  const t = (x - 60) / 240;
  return 250 - 360 * t * (1 - t);
};
const HANGERS = [90, 120, 150, 180, 210, 240, 270];
const RIVETS = [120, 180, 240];
// Flight path in a 100 × 100 box centred on screen: launches from the centre, loops over the top, dives and exits right.
const FLIGHT = "M50 50 C28 40 26 14 48 12 C68 10 74 34 66 52 C58 70 80 86 104 70 C116 62 122 48 132 36";
const WORDS = [
  { w: "Courses", cls: "sp-w-serif", d: 1.05 },
  { w: "APS", cls: "sp-w-mono", d: 1.35 },
  { w: "dMAT", cls: "sp-w-sans", d: 1.65 },
  { w: "Visa", cls: "sp-w-serif sp-w-gold", d: 1.95 },
];
// Document cards flying past at different depths: y position, duration, delay, scale, tilt, opacity.
const CARDS = [
  { t: "Transcript", y: 12, dur: 1.9, d: 0.85, s: 0.9, r: -6, o: 0.8 },
  { t: "APS certificate", y: 80, dur: 1.5, d: 0.95, s: 1.1, r: 5, o: 0.95 },
  { t: "IELTS / TOEFL", y: 27, dur: 2.2, d: 1.05, s: 0.7, r: 3, o: 0.45 },
  { t: "Motivation letter", y: 68, dur: 2.0, d: 1.15, s: 0.8, r: -4, o: 0.6 },
  { t: "uni-assist", y: 5, dur: 2.0, d: 1.25, s: 0.65, r: 7, o: 0.4 },
  { t: "Blocked account", y: 89, dur: 1.7, d: 1.35, s: 1, r: -3, o: 0.85 },
  { t: "Health insurance", y: 38, dur: 1.8, d: 1.5, s: 0.7, r: -7, o: 0.4 },
  { t: "Visa appointment", y: 58, dur: 1.6, d: 1.6, s: 0.95, r: 4, o: 0.8 },
];
// Deterministic star field (a hash scatter, so server and browser render the same stars).
const rand = (n: number) => {
  const x = Math.sin(n * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
};
const STARS = Array.from({ length: 70 }, (_, i) => ({
  x: Math.round(rand(i) * 1400) / 10, // wider than the screen: the layer pans left
  y: Math.round(rand(i + 100) * 1000) / 10,
  r: rand(i + 200) > 0.85 ? 0.3 : 0.16,
  d: Math.round(rand(i + 300) * 30) / 10,
}));

const v = (vars: Record<string, string | number>) => vars as CSSProperties;

export function Splash({ courses, universities }: { courses: number; universities: number }) {
  return (
    <div id="splash" className="sp-root" aria-hidden="true">
      <div className="sp-panel sp-panel-top" />
      <div className="sp-panel sp-panel-bottom" />

      <div className="sp-content">
        <div className="sp-glow sp-glow-a" />
        <div className="sp-glow sp-glow-b" />
        <div className="sp-stars">
          <svg viewBox="0 0 140 100" preserveAspectRatio="xMidYMid slice">
            {STARS.map((s, i) => (
              <circle key={i} cx={s.x} cy={s.y} r={s.r} className="sp-star" style={v({ "--d": `${s.d}s` })} />
            ))}
          </svg>
        </div>

        {/* Huge outlined words drifting behind the action */}
        <span className="sp-bigword sp-bigword-in" lang="hi">
          भारत
        </span>
        <span className="sp-bigword sp-bigword-de" lang="de">
          DEUTSCHLAND
        </span>

        {/* Scene 1: the drop */}
        {[
          { c: "var(--accent-bright)", d: 0.57, s: 9 },
          { c: "var(--gold)", d: 0.66, s: 13 },
          { c: "var(--on-ink)", d: 0.75, s: 19 },
        ].map((r) => (
          <span key={r.d} className="sp-ring" style={v({ "--c": r.c, "--d": `${r.d}s`, "--s": r.s })} />
        ))}
        <span className="sp-flash" />
        <span className="sp-drop" />
        <span className="sp-india">
          <span lang="hi">भारत</span>
          <small>INDIA</small>
        </span>

        {/* Scene 2: cards, flight and kinetic words */}
        {CARDS.map((c) => (
          <span key={c.t} className="sp-card" style={v({ "--y": `${c.y}%`, "--dur": `${c.dur}s`, "--d": `${c.d}s`, "--s": c.s, "--r": `${c.r}deg`, "--o": c.o })}>
            <i />
            {c.t}
          </span>
        ))}
        <svg className="sp-flight" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet">
          <defs>
            <linearGradient id="sp-comet" gradientUnits="userSpaceOnUse" x1="30" y1="0" x2="130" y2="0">
              <stop offset="0" stopColor="var(--accent-bright)" />
              <stop offset="1" stopColor="var(--gold)" />
            </linearGradient>
            <mask id="sp-flight-mask" maskUnits="userSpaceOnUse" x="-20" y="-20" width="170" height="140">
              <path d={FLIGHT} className="sp-flight-reveal" pathLength={1} fill="none" stroke="#fff" strokeWidth="4" />
            </mask>
          </defs>
          <path d={FLIGHT} className="sp-flight-route" fill="none" stroke="var(--on-ink)" strokeWidth="0.35" strokeDasharray="0.8 1.6" strokeLinecap="round" mask="url(#sp-flight-mask)" />
          <path d={FLIGHT} className="sp-comet" fill="none" stroke="url(#sp-comet)" strokeWidth="1.3" strokeLinecap="round" pathLength={1} />
          <g className="sp-plane">
            <g>
              <path d="M-3.6 -2.3 L4.2 0 L-3.6 2.3 L-2 0 Z" fill="var(--on-ink)" />
              <animateMotion dur="1.35s" begin="0.95s" fill="freeze" rotate="auto" path={FLIGHT} calcMode="spline" keyPoints="0;1" keyTimes="0;1" keySplines="0.45 0.05 0.35 1" />
            </g>
          </g>
        </svg>
        <div className="sp-montage">
          {WORDS.map((w) => (
            <span key={w.w} className="sp-mline">
              <span className={`sp-mword ${w.cls}`} style={v({ "--d": `${w.d}s` })}>
                {w.w}
              </span>
            </span>
          ))}
        </div>

        {/* Scene 4 + 5: the bridge becomes the logo */}
        <div className="sp-stage">
          <svg viewBox="0 0 360 300" className="sp-svg">
            <g className="sp-settle">
              <g className="sp-zoom">
                <path d="M40 250 H320" stroke="var(--on-ink)" strokeOpacity="0.45" strokeWidth="5" strokeLinecap="round" className="sp-deck" />
                {HANGERS.map((x, i) => (
                  <line key={x} x1={x} y1={arcY(x) + 4} x2={x} y2="248" stroke="var(--on-ink)" strokeOpacity="0.35" strokeWidth="1.6" className="sp-hanger" style={v({ "--d": `${3.78 + i * 0.04}s` })} />
                ))}
                <path d="M60 250 Q120 160 180 160" fill="none" stroke="var(--accent-bright)" strokeWidth="9" strokeLinecap="round" pathLength={1} className="sp-half" />
                <path d="M300 250 Q240 160 180 160" fill="none" stroke="var(--accent-bright)" strokeWidth="9" strokeLinecap="round" pathLength={1} className="sp-half" />
                <g className="sp-rays">
                  {Array.from({ length: 10 }, (_, i) => {
                    const a = (i / 10) * Math.PI * 2;
                    return <line key={i} x1={180 + Math.cos(a) * 12} y1={160 + Math.sin(a) * 12} x2={180 + Math.cos(a) * 26} y2={160 + Math.sin(a) * 26} stroke="var(--gold)" strokeWidth="2.4" strokeLinecap="round" />;
                  })}
                  <circle cx="180" cy="160" r="9" fill="var(--gold)" />
                </g>
                {RIVETS.map((x, i) => (
                  <circle key={x} cx={x} cy={arcY(x)} r="5.5" fill="var(--gold)" className="sp-rivet" style={v({ "--d": `${3.9 + i * 0.07}s` })} />
                ))}
                <circle cx="60" cy="250" r="7" fill="var(--accent-bright)" className="sp-anchor sp-anchor-in" />
                <circle cx="300" cy="250" r="7" fill="var(--gold)" className="sp-anchor sp-anchor-de" />
                <circle r="6" fill="var(--gold)" className="sp-crosser">
                  <animateMotion dur="1s" begin="4.9s" fill="freeze" path={ARC} calcMode="spline" keyPoints="0;1" keyTimes="0;1" keySplines="0.45 0 0.3 1" />
                </circle>
              </g>
            </g>
          </svg>

          <div className="sp-words">
            <p className="sp-name" aria-label={APP_NAME}>
              {APP_NAME.split("").map((ch, i) => (
                <span key={i} style={v({ "--i": i })}>
                  {ch}
                </span>
              ))}
            </p>
            <p className="sp-tagline">{APP_TAGLINE}</p>
            <p className="sp-facts">
              {[`${courses.toLocaleString("en-IN")} Master's courses`, `${universities} public universities`, "every fact sourced"].map((t, i) => (
                <span key={t} style={v({ "--i": i })}>
                  {t}
                </span>
              ))}
            </p>
          </div>
        </div>
      </div>

      {/* Scene 3: black-red-gold wipe, above everything else */}
      {["#0b0b0d", "#d1121b", "#f5c400"].map((c, i) => (
        <span key={c} className="sp-band" style={v({ "--c": c, "--i": i })} />
      ))}

      <SplashSound />
      <button type="button" className="sp-skip" data-splash-skip tabIndex={-1}>
        Skip
      </button>
    </div>
  );
}

/**
 * Runs in <head> before the first paint: decides whether the intro plays (once per session — in the installed app that
 * means once per launch — not when animations are off, still when the device asks for reduced motion), wires up
 * skipping before React has loaded, and marks it finished afterwards (which releases the scroll lock). The sound button
 * replays the intro through window.__setuSplashRestart, which restarts the end timer.
 */
export const SPLASH_SCRIPT = `(function(){try{
var d=document.documentElement,k="setu:splash-seen",p="auto";
try{p=JSON.parse(localStorage.getItem("setu:motion")||'"auto"')}catch(e){}
d.dataset.motion=p;
var seen=sessionStorage.getItem(k);
if(seen||p==="off"){d.dataset.splash="skip";return}
d.dataset.splash=(p!=="on"&&matchMedia("(prefers-reduced-motion: reduce)").matches)?"calm":"play";
sessionStorage.setItem(k,"1");
var end=function(){if(d.dataset.splash==="play"||d.dataset.splash==="calm")d.dataset.splash="done"},timer;
var arm=function(ms){clearTimeout(timer);timer=setTimeout(end,ms)};
arm(d.dataset.splash==="play"?6900:2900);
window.__setuSplashRestart=function(){if(d.dataset.splash!=="play")return false;arm(6900);return true};
document.addEventListener("click",function(e){var t=e.target;if(t&&t.closest&&t.closest("#splash")&&!t.closest("[data-splash-sound]"))end()},true);
document.addEventListener("keydown",function(e){if(e.key==="Escape")end()});
}catch(e){document.documentElement.dataset.splash="skip"}})();`;
