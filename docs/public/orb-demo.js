const sheet = new CSSStyleSheet();
sheet.replaceSync(`
  #orb-demo {
    width: 100%;
    max-width: 1200px;
    aspect-ratio: 16 / 9;
    display: block;
    margin: 0 auto;
    border-radius: 14px;
  }
`);
document.adoptedStyleSheets = [...document.adoptedStyleSheets, sheet];

const SHADER = /* wgsl */ `
  struct Uniforms { time: f32, resolution: vec2f };
  @group(0) @binding(0) var<uniform> u: Uniforms;
  @group(0) @binding(1) var samp: sampler;
  @group(0) @binding(2) var peopleTex: texture_2d<f32>;
  struct V { @builtin(position) pos: vec4f, @location(0) uv: vec2f };

  @vertex fn vs(@builtin(vertex_index) i: u32) -> V {
    var q = array<vec2f,6>(
      vec2f(-1,-1), vec2f(1,-1), vec2f(-1,1),
      vec2f(-1,1),  vec2f(1,-1), vec2f(1,1)
    );
    var o: V;
    o.pos = vec4f(q[i], 0, 1);
    o.uv = q[i] * 0.5 + 0.5;
    return o;
  }

  const PI  = 3.14159265;
  const TAU = 6.28318530;

  fn hash(p: vec2f) -> f32 {
    return fract(sin(dot(p, vec2f(127.1, 311.7))) * 43758.5453);
  }

  // elliptical normalized distance (1.0 = on boundary)
  fn edist(p: vec2f, rx: f32, ry: f32) -> f32 {
    return length(p / vec2f(rx, ry));
  }

  // 3-stop gradient lookup
  fn grad3(t: f32, s0: f32, c0: vec3f, s1: f32, c1: vec3f, c2: vec3f) -> vec3f {
    if (t < s1) { return mix(c0, c1, clamp(t / s1, 0.0, 1.0)); }
    return mix(c1, c2, clamp((t - s1) / (1.0 - s1), 0.0, 1.0));
  }

  // 4-stop gradient lookup
  fn grad4(t: f32, s1: f32, c0: vec3f, c1: vec3f, s2: f32, c2: vec3f, c3: vec3f) -> vec3f {
    if (t < s1) { return mix(c0, c1, clamp(t / s1, 0.0, 1.0)); }
    if (t < s2) { return mix(c1, c2, clamp((t - s1) / (s2 - s1), 0.0, 1.0)); }
    return mix(c2, c3, clamp((t - s2) / (1.0 - s2), 0.0, 1.0));
  }

  // Smooth line segment SDF (unsigned distance to segment a-b)
  fn lineSDF(p: vec2f, a: vec2f, b: vec2f) -> f32 {
    let pa = p - a;
    let ba = b - a;
    let h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
    return length(pa - ba * h);
  }

  // smooth-minimum, for organic blob unions
  fn smin(a: f32, b: f32, k: f32) -> f32 {
    let h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
    return mix(b, a, h) - k * h * (1.0 - h);
  }

  // ─────────────────────────────────────────────
  //  ORB  (the original animated driver, wrapped as a
  //  function so it can be placed inside a scene)
  //  pRaw: local space where the orb's outer shell ~0.8 radius.
  // ─────────────────────────────────────────────
  fn orb(pRaw: vec2f, t: f32) -> vec4f {
    // SVG center is at (200, 197) in 400x400 → offset in p-space
    let ctr = vec2f(0.0, 0.015);
    let p = pRaw - ctr;
    let dist = length(p);
    let ang = atan2(p.y, p.x);

    var col = vec3f(0.0);

    // Elliptical distances (normalized so 1.0 = on boundary)
    // SVG radii → divided by 200 (half of 400 viewBox)
    let eOuter = edist(p, 0.775, 0.8);    // outer shell rx=155 ry=160
    let eCush  = edist(p, 0.61, 0.635);   // cushion rx=122 ry=127
    let eDrivR = edist(p, 0.44, 0.46);    // driver ring rx=88 ry=92
    let eDriv  = edist(p, 0.41, 0.43);    // driver membrane rx=82 ry=86
    let eCap   = edist(p, 0.19, 0.20);    // dust cap rx=38 ry=40

    // ═══════════════════════════════════════════
    //  1. BACKGROUND GLOW (behind everything)
    // ═══════════════════════════════════════════
    let bgGlowD = edist(p, 0.65, 0.675);
    let bgGlow = exp(-bgGlowD * bgGlowD * 3.0) * 0.15;
    col += vec3f(0.0, 1.0, 0.0) * bgGlow;

    // ═══════════════════════════════════════════
    //  2. OUTER SHELL (outerMelt gradient)
    // ═══════════════════════════════════════════
    // Gradient center shifted up: cy=40% → offset ≈ -0.08 in p-space
    let outerGradP = p - vec2f(0.0, -0.08);
    let outerGradD = edist(outerGradP, 0.775 * 1.1, 0.8 * 1.1); // r=55%
    let outerMask = smoothstep(1.01, 0.99, eOuter);

    // outerMelt: 0% #4dff4d → 40% #00cc00 → 100% #003300
    let outerCol = grad3(
      clamp(outerGradD, 0.0, 1.0),
      0.0, vec3f(0.302, 1.0, 0.302),
      0.4, vec3f(0.0, 0.8, 0.0),
           vec3f(0.0, 0.2, 0.0)
    );
    col = mix(col, outerCol, outerMask);

    // Outer shell shadow (meltShadow filter: green glow offset down)
    let shadowP = p - vec2f(0.0, 0.015);
    let shadowD = edist(shadowP, 0.78, 0.81);
    let shadowGlow = smoothstep(1.1, 0.95, shadowD) * smoothstep(0.85, 1.0, shadowD) * 0.3;
    col += vec3f(0.0, 1.0, 0.0) * shadowGlow * 0.15;

    // ═══════════════════════════════════════════
    //  3. CUSHION (very dark, overlays center of outer shell)
    // ═══════════════════════════════════════════
    let cushMask = smoothstep(1.01, 0.98, eCush);
    // cushion gradient: 0% #1a1a1a → 70% #0d0d0d → 100% #1a3310
    let cushCol = grad3(
      clamp(eCush, 0.0, 1.0),
      0.0, vec3f(0.102, 0.102, 0.102),
      0.7, vec3f(0.051, 0.051, 0.051),
           vec3f(0.102, 0.2, 0.063)
    );
    col = mix(col, cushCol, cushMask);

    // Cushion stroke border #004400
    let cushStroke = smoothstep(0.015, 0.003, abs(eCush - 1.0)) * 0.7;
    col = mix(col, vec3f(0.0, 0.267, 0.0), cushStroke * cushMask);

    // ═══════════════════════════════════════════
    //  4. CUSHION TEXTURE MARKS
    // ═══════════════════════════════════════════
    // Small dark ellipses around the cushion ring (subtle)
    let cushTexR = edist(p, 0.61, 0.635);
    // Simple approximation: dark patches near the cushion edge at ~7 positions
    let texRing = smoothstep(0.92, 0.85, cushTexR) * smoothstep(0.6, 0.7, cushTexR);
    let texPattern = pow(abs(sin(ang * 3.5 + 0.5)), 12.0);
    col -= vec3f(0.02) * texRing * texPattern;

    // ═══════════════════════════════════════════
    //  5. DRIVER CONE OUTER RING (stroke only)
    // ═══════════════════════════════════════════
    let drivRingLine = smoothstep(0.018, 0.004, abs(eDrivR - 1.0));
    col = mix(col, vec3f(0.0, 0.667, 0.0), drivRingLine * 0.6);

    // ═══════════════════════════════════════════
    //  6. DRIVER MEMBRANE
    // ═══════════════════════════════════════════
    // driver gradient (cx=48% cy=42% → slight offset upper-left)
    let drivGradP = p - vec2f(-0.008, -0.034);
    let drivGradD = edist(drivGradP, 0.41, 0.43);
    let drivMask = smoothstep(1.01, 0.97, eDriv) * 0.9;

    // driver: 0% #66ff66 → 30% #00dd00 → 70% #008800 → 100% #003300
    let drivCol = grad4(
      clamp(drivGradD, 0.0, 1.0),
      0.3, vec3f(0.4, 1.0, 0.4), vec3f(0.0, 0.867, 0.0),
      0.7, vec3f(0.0, 0.533, 0.0), vec3f(0.0, 0.2, 0.0)
    );
    col = mix(col, drivCol, drivMask);

    // ═══════════════════════════════════════════
    //  7. VEINS (16 radiating spokes)
    // ═══════════════════════════════════════════
    // Spokes from dust cap edge (~0.19) to inner cushion (~0.52)
    let spokeInner = 0.195;
    let spokeOuter = 0.53;
    let spokeLineW = 0.0035; // stroke-width 1.4 / 400 ≈ 0.0035

    var spokeAccum = 0.0;
    for (var s = 0u; s < 16u; s++) {
      let a = f32(s) / 16.0 * TAU - PI;
      let dir = vec2f(cos(a), sin(a));
      // Scale direction for elliptical shape
      let innerPt = dir * spokeInner;
      let outerPt = dir * spokeOuter;
      let ld = lineSDF(p, innerPt, outerPt);
      spokeAccum += smoothstep(spokeLineW * 2.0, spokeLineW * 0.3, ld);
    }
    spokeAccum = min(spokeAccum, 1.0);
    col = mix(col, vec3f(0.0, 1.0, 0.0), spokeAccum * 0.35);

    // ═══════════════════════════════════════════
    //  8. ENDPOINT BLOBS at spoke tips
    // ═══════════════════════════════════════════
    for (var b = 0u; b < 16u; b++) {
      let a = f32(b) / 16.0 * TAU - PI;
      let dir = vec2f(cos(a), sin(a));
      let blobPos = dir * spokeOuter;
      let blobD = length(p - blobPos);
      // Varying sizes: cardinal=bigger, diagonal=medium, sub=smaller
      let blobR = select(0.015, select(0.0125, 0.0175, b % 4u == 2u), b % 2u == 0u);
      let blobGlow = smoothstep(blobR, blobR * 0.3, blobD);
      let blobOpacity = select(0.35, select(0.4, 0.5, b % 4u == 0u), b % 2u == 1u);
      col = mix(col, vec3f(0.0, 0.7, 0.0), blobGlow * blobOpacity);
    }

    // ═══════════════════════════════════════════
    //  9. DUST CAP (central dome)
    // ═══════════════════════════════════════════
    // Animated pulse
    let capPulse = 1.0 + 0.08 * sin(t * 3.0) + 0.04 * sin(t * 7.3);
    let eCapAnim = edist(p, 0.19 * capPulse, 0.20 * capPulse);
    let capMask = smoothstep(1.05, 0.85, eCapAnim);

    // driverCore: 0% #aaffaa → 50% #22cc22 → 100% #006600
    // Shifted gradient center for 3D look
    let capGradP = p - vec2f(-0.005, -0.015);
    let capGradD = edist(capGradP, 0.19 * capPulse, 0.20 * capPulse);
    let capCol = grad3(
      clamp(capGradD, 0.0, 1.0),
      0.0, vec3f(0.667, 1.0, 0.667),
      0.5, vec3f(0.133, 0.8, 0.133),
           vec3f(0.0, 0.4, 0.0)
    );

    // Add meltShadow glow on dust cap too
    let capGlowRing = smoothstep(0.06, 0.0, abs(eCapAnim - 1.0)) * 0.2;
    col += vec3f(0.0, 1.0, 0.0) * capGlowRing;

    col = mix(col, capCol, capMask);

    // ═══════════════════════════════════════════
    // 10. SPECULAR HIGHLIGHT on dust cap
    // ═══════════════════════════════════════════
    // SVG: at (-0.03, -0.045) from center, rx=0.07 ry=0.045, rotated -15°
    let specOff = vec2f(-0.03, -0.045);
    let specP = p - specOff;
    let sa15 = sin(-0.2618); let ca15 = cos(-0.2618);
    let specRot = vec2f(specP.x * ca15 - specP.y * sa15,
                        specP.x * sa15 + specP.y * ca15);
    let specD = length(specRot / vec2f(0.07, 0.045));
    let specIntensity = smoothstep(1.0, 0.0, specD) * 0.25 * capMask;
    let specPulse = 1.0 + 0.3 * sin(t * 3.0);
    col += vec3f(0.8, 1.0, 0.8) * specIntensity * specPulse;

    // ═══════════════════════════════════════════
    // 11. ANIMATED — Core bright glow
    // ═══════════════════════════════════════════
    let corePulse = 1.0 + 0.25 * sin(t * 3.0) + 0.15 * sin(t * 5.7);
    let coreGlow = exp(-dist * dist * 120.0) * corePulse * 0.6;
    col += vec3f(0.7, 1.0, 0.7) * coreGlow;

    // Wider halo glow from center
    let haloPulse = 1.0 + 0.15 * sin(t * 2.0);
    let haloGlow = exp(-dist * dist * 15.0) * haloPulse * 0.15;
    col += vec3f(0.0, 0.8, 0.0) * haloGlow;

    // ═══════════════════════════════════════════
    // 12. ANIMATED — Energy waves expanding outward
    // ═══════════════════════════════════════════
    for (var w = 0; w < 4; w++) {
      let phase = fract(t * 0.35 + f32(w) / 4.0);
      let waveR = phase * 0.45;
      let waveD = abs(dist - waveR);
      let waveFade = (1.0 - phase) * (1.0 - phase);
      let waveIntensity = smoothstep(0.015, 0.0, waveD) * waveFade * 0.35;
      col += vec3f(0.0, 1.0, 0.0) * waveIntensity * smoothstep(0.62, 0.4, dist);
    }

    // ═══════════════════════════════════════════
    // 13. ANIMATED — Spoke energy flow
    // ═══════════════════════════════════════════
    var spokeEnergy = 0.0;
    for (var se = 0u; se < 16u; se++) {
      let a = f32(se) / 16.0 * TAU - PI;
      let dir = vec2f(cos(a), sin(a));
      let innerPt = dir * spokeInner;
      let outerPt = dir * spokeOuter;
      let ld = lineSDF(p, innerPt, outerPt);
      let proj = dot(p - innerPt, outerPt - innerPt) / dot(outerPt - innerPt, outerPt - innerPt);
      let flowPhase = fract(proj - t * 1.5 + f32(se) * 0.0625);
      let flowPulse = smoothstep(0.0, 0.15, flowPhase) * smoothstep(0.4, 0.15, flowPhase);
      let flowMask = smoothstep(spokeLineW * 3.0, spokeLineW * 0.5, ld);
      spokeEnergy += flowMask * flowPulse;
    }
    spokeEnergy = min(spokeEnergy, 1.0);
    col += vec3f(0.1, 1.0, 0.1) * spokeEnergy * 0.25;

    // ═══════════════════════════════════════════
    // 14. ANIMATED — Endpoint dot shimmer
    // ═══════════════════════════════════════════
    for (var bd = 0u; bd < 16u; bd++) {
      let a = f32(bd) / 16.0 * TAU - PI;
      let dir = vec2f(cos(a), sin(a));
      let dotPos = dir * spokeOuter;
      let dotD = length(p - dotPos);
      let dotPulse = 0.5 + 0.5 * sin(t * 3.5 + f32(bd) * 0.9);
      let dotGlow = exp(-dotD * dotD * 8000.0) * dotPulse;
      col += vec3f(0.2, 1.0, 0.2) * dotGlow * 0.3;
    }

    // ═══════════════════════════════════════════
    // 15. ANIMATED — Floating particles
    // ═══════════════════════════════════════════
    for (var fp = 0u; fp < 20u; fp++) {
      let sd = vec2f(f32(fp) * 7.23, f32(fp) * 13.37);
      let pa = hash(sd) * TAU + t * (0.2 + hash(sd + 1.0) * 0.3);
      let pr = 0.12 + hash(sd + 2.0) * 0.28;
      let bob = sin(t * (2.0 + hash(sd + 3.0) * 2.5) + hash(sd + 4.0) * TAU) * 0.02;
      let pp = vec2f(cos(pa), sin(pa)) * (pr + bob);
      let pd = length(p - pp);
      let pb = smoothstep(0.008, 0.001, pd);
      let pf = 0.3 + 0.7 * sin(t * (1.5 + hash(sd + 5.0) * 2.0) + f32(fp));
      col += vec3f(0.0, 1.0, 0.0) * pb * max(0.0, pf) * 0.3 * smoothstep(0.6, 0.4, length(pp));
    }

    // ═══════════════════════════════════════════
    // 16. ANIMATED — Subtle outer ring pulse
    // ═══════════════════════════════════════════
    let outerPulseGlow = smoothstep(0.99, 0.92, eOuter) * smoothstep(0.62, 0.72, eCush);
    let outerPulseVal = 0.04 * sin(t * 1.5) + 0.02 * sin(t * 3.3 + 1.0);
    col += vec3f(0.0, 0.6, 0.0) * outerPulseGlow * outerPulseVal;

    // ═══════════════════════════════════════════
    // 17. HOT SPOT SHIMMERS (from SVG)
    // ═══════════════════════════════════════════
    let hs1P = p - vec2f(-0.2, -0.275);
    let hs1Rot = vec2f(hs1P.x * 0.819 + hs1P.y * 0.574,
                      -hs1P.x * 0.574 + hs1P.y * 0.819);
    let hs1D = length(hs1Rot / vec2f(0.14, 0.07));
    col += vec3f(0.0, 1.0, 0.0) * smoothstep(1.0, 0.0, hs1D) * (0.03 + 0.02 * sin(t * 2.0));

    let hs2P = p - vec2f(0.2, 0.275);
    let hs2Rot = vec2f(hs2P.x * 0.819 - hs2P.y * 0.574,
                       hs2P.x * 0.574 + hs2P.y * 0.819);
    let hs2D = length(hs2Rot / vec2f(0.14, 0.07));
    col += vec3f(0.0, 1.0, 0.0) * smoothstep(1.0, 0.0, hs2D) * (0.02 + 0.015 * sin(t * 2.5 + 1.0));

    col = clamp(col, vec3f(0.0), vec3f(1.0));

    // Alpha shaped to the outer shell with soft glow bleed → premultiplied
    let alpha = smoothstep(1.08, 0.95, eOuter) + bgGlow * 0.5;
    return vec4f(col * min(alpha, 1.0), min(alpha, 1.0));
  }

  // ─────────────────────────────────────────────
  //  BACKGROUND  — sky, ground, orb ambient + reflection
  // ─────────────────────────────────────────────
  fn background(s: vec2f, groundY: f32, orbCenter: vec2f, t: f32) -> vec3f {
    var col: vec3f;
    let dOrb = length(s - orbCenter);

    if (s.y >= groundY) {
      // sky: darker up top, faint green wash near the horizon
      let h = smoothstep(groundY, 1.0, s.y);
      col = mix(vec3f(0.0, 0.05, 0.03), vec3f(0.01, 0.015, 0.03), h);

      // twinkling stars: one small point per sparse grid cell, over the sky
      // and kept clear of the orb's bloom
      let cell = (s + vec2f(37.0, 11.0)) * 11.0;
      let id = floor(cell);
      let sh = hash(id);
      if (sh > 0.87) {
        let starPos = vec2f(hash(id + vec2f(3.1)), hash(id + vec2f(6.7)));
        let dd = length(fract(cell) - starPos);
        let twk = 0.55 + 0.45 * sin(t * 2.0 + sh * TAU);
        let star = smoothstep(0.07, 0.0, dd) * twk;
        col += vec3f(0.6, 1.0, 0.7) * star * smoothstep(0.42, 1.1, dOrb);
      }
    } else {
      // ground plane: darkens with depth (distance below the horizon)
      let depth = groundY - s.y;
      col = mix(vec3f(0.01, 0.05, 0.03), vec3f(0.0, 0.012, 0.01), smoothstep(0.0, 0.7, depth));

      // orb reflection: soft vertical smear directly beneath the orb
      let rx = abs(s.x - orbCenter.x);
      let refl = exp(-rx * rx * 8.0) * exp(-depth * 3.0) * 0.55;
      col += vec3f(0.0, 0.85, 0.28) * refl * (1.0 + 0.15 * sin(t * 3.0));

      // bright horizon line
      col += vec3f(0.0, 0.55, 0.22) * exp(-depth * depth * 120.0) * 0.6;
    }

    // orb ambient bloom, spilling into both sky and ground
    col += vec3f(0.0, 0.35, 0.1) * exp(-dOrb * dOrb * 2.2) * 0.55;
    col += vec3f(0.06, 0.6, 0.16) * exp(-dOrb * dOrb * 9.0) * 0.4;
    return col;
  }

  // ─────────────────────────────────────────────
  //  PEOPLE — hand-authored vector art, drawn on the JS side (see
  //  drawFigure / buildPeopleTexture), rasterized into a texture atlas
  //  (one square cell per figure kind) and sampled here so the drawn
  //  congregation stays composited into — and lit by — the orb scene.
  // ─────────────────────────────────────────────
  struct Member { cx: f32, yoff: f32, size: f32, kind: f32, hue: f32, flip: f32 };

  // Composite the drawn congregation (from the texture atlas) over the scene.
  fn drawCrowd(colIn: vec3f, s: vec2f, groundY: f32, orbCenter: vec2f, t: f32) -> vec3f {
    var col = colIn;
    let KINDS = 5.0;
    // Two rows for depth; back row drawn first so the nearer front row overlaps.
    // Member(cx, yoff, size, kind, hue, flip)   kind = atlas cell 0..4
    var M = array<Member, 11>(
      // back row — near the horizon, small (further away), peeking between front
      Member(-1.08, 0.0,  0.30, 3.0, 0.0, 0.0),
      Member(-0.54, 0.0,  0.31, 1.0, 0.5, 1.0),
      Member( 0.00, 0.0,  0.31, 2.0, 0.0, 0.0),
      Member( 0.54, 0.0,  0.31, 0.0, 1.0, 1.0),
      Member( 1.08, 0.0,  0.30, 3.0, 0.5, 1.0),
      // front row — pushed down into the foreground, larger, sitting on the ground
      Member(-1.35, -0.15, 0.45, 4.0, 0.0, 0.0),
      Member(-0.81, -0.15, 0.48, 1.0, 1.0, 0.0),
      Member(-0.27, -0.15, 0.49, 0.0, 0.0, 1.0),
      Member( 0.27, -0.15, 0.49, 2.0, 0.5, 0.0),
      Member( 0.81, -0.15, 0.47, 3.0, 0.0, 1.0),
      Member( 1.35, -0.15, 0.45, 4.0, 0.5, 1.0)
    );

    for (var i = 0u; i < 11u; i++) {
      let m = M[i];
      let bottom = groundY + m.yoff;
      // map scene point into the figure's square cell (feet at the bottom)
      var lu = (s.x - m.cx) / m.size + 0.5;
      let lv = (s.y - bottom) / m.size;
      if (lu < 0.0 || lu > 1.0 || lv < 0.0 || lv > 1.0) { continue; }
      if (m.flip > 0.5) { lu = 1.0 - lu; }

      let texUV = vec2f((m.kind + lu) / KINDS, 1.0 - lv);
      let art = textureSampleLevel(peopleTex, samp, texUV, 0.0); // premultiplied rgba
      if (art.a < 0.003) { continue; }

      // atmospheric depth: smaller (further) figures read dimmer
      let atmo = mix(0.5, 1.0, smoothstep(0.29, 0.48, m.size));
      let pulse = 1.0 + 0.1 * sin(t * 3.0);           // rim breathes with the orb
      // premultiplied-over composite of the drawn art (kept opaque so it occludes)
      col = art.rgb * atmo * pulse + col * (1.0 - art.a);
      // faint additive bloom from the bright (rim-lit) parts, so they feel emissive
      col += art.rgb * 0.14 * atmo;
    }
    return col;
  }

  @fragment fn fs(@location(0) uv: vec2f) -> @location(0) vec4f {
    let t = u.time;
    let aspect = u.resolution.x / max(u.resolution.y, 1.0);

    // scene space: y in [-1,1] (up), x aspect-corrected so units stay square
    var s = (uv - 0.5) * 2.0;
    s.x *= aspect;

    // scene layout — orb raised high above the kneeling congregation
    let groundY   = -0.32;
    let orbCenter = vec2f(0.0, 0.5);
    let orbScale  = 0.42;

    // 1) background (sky + ground + orb ambient)
    var col = background(s, groundY, orbCenter, t);

    // 2) the orb, floating above the crowd (premultiplied-over composite)
    let o = orb((s - orbCenter) / orbScale, t);
    col = o.rgb + col * (1.0 - o.a);

    // 3) the congregation — removed for now (re-enable to bring the people back)
    // col = drawCrowd(col, s, groundY, orbCenter, t);

    // 4) soft vignette
    let vd = uv - 0.5;
    col *= 1.0 - dot(vd, vd) * 0.8;

    return vec4f(clamp(col, vec3f(0.0), vec3f(1.0)), 1.0);
  }
`;

// ── Hand-drawn congregation art ─────────────────────────────────────────────
// Each figure is a back-view kneeling worshipper drawn into a square cell with
// smooth bezier contours, then baked with soft cloth shading, a centre seam,
// hair/headwear, and a green backlight rim along its top edges (the orb sits
// above the whole congregation). The cells are packed into a texture atlas the
// shader samples, so the drawn people stay composited into the lit scene.

// Smooth silhouette of the body + robe (fractions of the cell size C, y down).
function bodyPath(P, C) {
  const x = P.cx * C;
  const f = (v) => v * C;
  const headTop = f(P.headTop),
    hcy = f(P.hcy),
    neckY = f(P.neckY),
    shY = f(P.shY),
    waistY = f(P.waistY),
    hemY = f(P.hemY);
  const hrx = f(P.hrx),
    hry = f(P.hry),
    neckH = f(P.neckHalf),
    shX = f(P.shX),
    waistH = f(P.waistHalf),
    hemH = f(P.hemHalf);
  const p = new Path2D();
  p.moveTo(x, headTop);
  p.bezierCurveTo(
    x + hrx * 1.05,
    headTop,
    x + hrx,
    hcy - hry * 0.4,
    x + hrx,
    hcy,
  ); // head R
  p.bezierCurveTo(
    x + hrx,
    hcy + hry * 0.75,
    x + neckH,
    neckY - f(0.02),
    x + neckH,
    neckY,
  ); // → neck
  p.bezierCurveTo(
    x + neckH,
    neckY + f(0.015),
    x + shX * 0.72,
    shY - f(0.02),
    x + shX,
    shY,
  ); // → shoulder
  p.bezierCurveTo(
    x + shX * 1.02,
    shY + f(0.07),
    x + waistH + f(0.03),
    waistY - f(0.06),
    x + waistH,
    waistY,
  ); // arm/waist
  p.bezierCurveTo(
    x + waistH,
    waistY + f(0.1),
    x + hemH,
    hemY - f(0.14),
    x + hemH,
    hemY,
  ); // → hem (flare)
  p.bezierCurveTo(
    x + hemH * 0.55,
    hemY + f(0.02),
    x - hemH * 0.55,
    hemY + f(0.02),
    x - hemH,
    hemY,
  ); // hem
  p.bezierCurveTo(
    x - hemH,
    hemY - f(0.14),
    x - waistH,
    waistY + f(0.1),
    x - waistH,
    waistY,
  ); // left mirror
  p.bezierCurveTo(
    x - waistH - f(0.03),
    waistY - f(0.06),
    x - shX * 1.02,
    shY + f(0.07),
    x - shX,
    shY,
  );
  p.bezierCurveTo(
    x - shX * 0.72,
    shY - f(0.02),
    x - neckH,
    neckY + f(0.015),
    x - neckH,
    neckY,
  );
  p.bezierCurveTo(
    x - neckH,
    neckY - f(0.02),
    x - hrx,
    hcy + hry * 0.75,
    x - hrx,
    hcy,
  );
  p.bezierCurveTo(
    x - hrx,
    hcy - hry * 0.4,
    x - hrx * 1.05,
    headTop,
    x,
    headTop,
  );
  p.closePath();
  return p;
}

// Hair / headwear, as seen from behind. kind: 0 bun · 1 long · 2 short · 3 bald · 4 hood
function hairPath(P, C, kind) {
  const x = P.cx * C,
    f = (v) => v * C;
  const headTop = f(P.headTop),
    hcy = f(P.hcy),
    neckY = f(P.neckY),
    shY = f(P.shY);
  const hrx = f(P.hrx),
    hry = f(P.hry);
  const p = new Path2D();
  if (kind === 0) {
    // bun / top-knot
    p.ellipse(x, headTop - f(0.01), f(0.05), f(0.045), 0, 0, Math.PI * 2);
  } else if (kind === 1) {
    // long hair over neck + upper back
    p.ellipse(
      x,
      (hcy + shY) / 2,
      hrx * 1.18,
      (shY - hcy) * 0.95,
      0,
      0,
      Math.PI * 2,
    );
  } else if (kind === 4) {
    // hood: rounded cover + neck fill
    p.ellipse(x, hcy + f(0.008), hrx * 1.32, hry * 1.28, 0, 0, Math.PI * 2);
    p.moveTo(x - hrx * 1.15, neckY);
    p.lineTo(x + hrx * 1.15, neckY);
    p.lineTo(x + hrx * 0.75, shY);
    p.lineTo(x - hrx * 0.75, shY);
    p.closePath();
  }
  return p; // kinds 2 (short) and 3 (bald) add no extra shape
}

function drawFigure(g, kind, C) {
  const cx = C * 0.5;
  const robe = kind !== 2; // kind 2 = suit: narrower shoulders + base
  const P = {
    cx: 0.5,
    headTop: 0.135,
    hcy: 0.245,
    hrx: 0.092,
    hry: 0.112,
    neckY: 0.365,
    neckHalf: 0.046,
    shY: 0.47,
    shX: robe ? 0.235 : 0.2,
    waistY: 0.65,
    waistHalf: robe ? 0.185 : 0.15,
    hemY: 0.955,
    hemHalf: robe ? 0.285 : 0.185,
  };
  const body = bodyPath(P, C);
  const hair = hairPath(P, C, kind);

  // 1) base silhouette (its anti-aliased edge becomes the alpha coverage)
  g.fillStyle = "#0e1a15";
  g.fill(body);
  g.fill(hair);

  // 2) form shading, confined to the silhouette
  g.save();
  g.globalCompositeOperation = "source-atop";
  const vg = g.createLinearGradient(0, P.headTop * C, 0, P.hemY * C);
  vg.addColorStop(0.0, "#1f2f26");
  vg.addColorStop(0.45, "#101b14");
  vg.addColorStop(1.0, "#050907");
  g.fillStyle = vg;
  g.fillRect(0, 0, C, C);
  // light spilling onto the upper back / shoulders from the orb above
  const rg = g.createRadialGradient(
    cx,
    P.shY * C - C * 0.03,
    C * 0.02,
    cx,
    P.shY * C - C * 0.03,
    C * 0.28,
  );
  rg.addColorStop(0, "rgba(80,155,105,0.5)");
  rg.addColorStop(1, "rgba(80,155,105,0)");
  g.fillStyle = rg;
  g.fillRect(0, 0, C, C);
  // darken the far sides for roundness
  const sg = g.createLinearGradient(
    (0.5 - P.hemHalf) * C,
    0,
    (0.5 + P.hemHalf) * C,
    0,
  );
  sg.addColorStop(0.0, "rgba(0,0,0,0.5)");
  sg.addColorStop(0.5, "rgba(0,0,0,0)");
  sg.addColorStop(1.0, "rgba(0,0,0,0.5)");
  g.fillStyle = sg;
  g.fillRect(0, 0, C, C);
  // robe centre seam
  g.strokeStyle = "rgba(0,0,0,0.4)";
  g.lineWidth = C * 0.01;
  g.beginPath();
  g.moveTo(cx, P.neckY * C);
  g.lineTo(cx, (P.hemY - 0.04) * C);
  g.stroke();
  g.restore();

  // 3) green backlight rim — a thin crescent on the TOP edges only (the orb is
  // above everyone). Built by subtracting a downward-shifted copy of the union
  // silhouette, so it hugs the true outline with no internal seams or halo.
  const tmp = document.createElement("canvas");
  tmp.width = C;
  tmp.height = C;
  const tg = tmp.getContext("2d");
  tg.fillStyle = "#fff";
  tg.fill(body);
  tg.fill(hair);
  tg.globalCompositeOperation = "destination-out";
  tg.save();
  tg.translate(0, C * 0.022);
  tg.fill(body);
  tg.fill(hair);
  tg.restore();
  // keep the rim only near the top, fading out lower down the figure
  tg.globalCompositeOperation = "source-in";
  const rimGrad = tg.createLinearGradient(0, P.headTop * C, 0, P.waistY * C);
  rimGrad.addColorStop(0.0, "rgba(150,240,175,0.92)");
  rimGrad.addColorStop(1.0, "rgba(150,240,175,0)");
  tg.fillStyle = rimGrad;
  tg.fillRect(0, 0, C, C);
  // composite the glowing rim additively onto the figure
  g.save();
  g.globalCompositeOperation = "lighter";
  g.shadowColor = "rgba(120,255,150,0.85)";
  g.shadowBlur = C * 0.03;
  g.drawImage(tmp, 0, 0);
  g.restore();
}

// Rasterize all figure kinds into a mip-mapped texture atlas (one square per kind).
function buildPeopleTexture(device) {
  const KINDS = 5;
  const C = 384;
  const atlas = document.createElement("canvas");
  atlas.width = C * KINDS;
  atlas.height = C;
  const g = atlas.getContext("2d");
  for (let k = 0; k < KINDS; k++) {
    g.save();
    g.translate(k * C, 0);
    g.beginPath();
    g.rect(0, 0, C, C);
    g.clip(); // keep each figure's rim glow inside its own cell
    drawFigure(g, k, C);
    g.restore();
  }

  const W = atlas.width,
    H = atlas.height;
  const mipLevelCount = Math.floor(Math.log2(Math.max(W, H))) + 1;
  const tex = device.createTexture({
    size: [W, H, 1],
    format: "rgba8unorm",
    mipLevelCount,
    usage:
      GPUTextureUsage.TEXTURE_BINDING |
      GPUTextureUsage.COPY_DST |
      GPUTextureUsage.RENDER_ATTACHMENT,
  });
  device.queue.copyExternalImageToTexture(
    { source: atlas, flipY: false },
    { texture: tex, premultipliedAlpha: true, mipLevel: 0 },
    [W, H],
  );
  // Downscaled mips (resampled from the full-res atlas) for clean minification.
  for (let l = 1; l < mipLevelCount; l++) {
    const mw = Math.max(1, W >> l),
      mh = Math.max(1, H >> l);
    const mc = document.createElement("canvas");
    mc.width = mw;
    mc.height = mh;
    const mg = mc.getContext("2d");
    mg.imageSmoothingEnabled = true;
    mg.imageSmoothingQuality = "high";
    mg.drawImage(atlas, 0, 0, mw, mh);
    device.queue.copyExternalImageToTexture(
      { source: mc, flipY: false },
      { texture: tex, premultipliedAlpha: true, mipLevel: l },
      [mw, mh],
    );
  }
  return tex;
}

async function init() {
  const canvas = document.getElementById("orb-demo");
  if (!canvas) {
    console.error("orb-demo: canvas#orb-demo not found");
    return;
  }

  if (!navigator.gpu) {
    canvas.style.display = "none";
    console.error("orb-demo: WebGPU not supported");
    return;
  }

  const adapter = await navigator.gpu.requestAdapter();
  if (!adapter) {
    canvas.style.display = "none";
    console.error("orb-demo: no adapter");
    return;
  }
  const device = await adapter.requestDevice();
  const ctx = canvas.getContext("webgpu");
  const fmt = navigator.gpu.getPreferredCanvasFormat();

  function resize() {
    const rect = canvas.getBoundingClientRect();
    const dpr = devicePixelRatio || 1;
    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);
    ctx.configure({ device, format: fmt, alphaMode: "premultiplied" });
  }
  resize();
  new ResizeObserver(resize).observe(canvas);

  const peopleTex = buildPeopleTexture(device);
  const sampler = device.createSampler({
    magFilter: "linear",
    minFilter: "linear",
    mipmapFilter: "linear",
    addressModeU: "clamp-to-edge",
    addressModeV: "clamp-to-edge",
  });

  const mod = device.createShaderModule({ code: SHADER });
  const bgl = device.createBindGroupLayout({
    entries: [
      {
        binding: 0,
        visibility: GPUShaderStage.FRAGMENT | GPUShaderStage.VERTEX,
        buffer: { type: "uniform" },
      },
      {
        binding: 1,
        visibility: GPUShaderStage.FRAGMENT,
        sampler: { type: "filtering" },
      },
      {
        binding: 2,
        visibility: GPUShaderStage.FRAGMENT,
        texture: { sampleType: "float", viewDimension: "2d" },
      },
    ],
  });
  const ubuf = device.createBuffer({
    size: 16,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });
  const bg = device.createBindGroup({
    layout: bgl,
    entries: [
      { binding: 0, resource: { buffer: ubuf } },
      { binding: 1, resource: sampler },
      { binding: 2, resource: peopleTex.createView() },
    ],
  });
  const pipe = device.createRenderPipeline({
    layout: device.createPipelineLayout({ bindGroupLayouts: [bgl] }),
    vertex: { module: mod, entryPoint: "vs" },
    fragment: {
      module: mod,
      entryPoint: "fs",
      targets: [
        {
          format: fmt,
          blend: {
            color: {
              srcFactor: "src-alpha",
              dstFactor: "one-minus-src-alpha",
              operation: "add",
            },
            alpha: {
              srcFactor: "one",
              dstFactor: "one-minus-src-alpha",
              operation: "add",
            },
          },
        },
      ],
    },
    primitive: { topology: "triangle-list" },
  });

  // Uniforms { time: f32, resolution: vec2f } → vec2f aligns to byte 8,
  // so resolution.x/.y live in ud[2]/ud[3] (ud[1] is padding).
  const ud = new Float32Array(4);

  function frame(now) {
    ud[0] = now * 0.001;
    ud[2] = canvas.width;
    ud[3] = canvas.height;
    device.queue.writeBuffer(ubuf, 0, ud);

    const enc = device.createCommandEncoder();
    const pass = enc.beginRenderPass({
      colorAttachments: [
        {
          view: ctx.getCurrentTexture().createView(),
          clearValue: { r: 0, g: 0, b: 0, a: 0 },
          loadOp: "clear",
          storeOp: "store",
        },
      ],
    });
    pass.setPipeline(pipe);
    pass.setBindGroup(0, bg);
    pass.draw(6);
    pass.end();
    device.queue.submit([enc.finish()]);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

init();
