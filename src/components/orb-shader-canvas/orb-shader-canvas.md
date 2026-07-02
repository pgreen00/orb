---
title: 'JeShaderCanvas | <je-shader-canvas>'
sidebar_label: 'GPU Shader Canvas'
---

Put your fragment shader in a `<script type="wgsl">` child. Because script content is
opaque to the HTML parser, angle brackets and generics like `mat2x2<f32>` need no
escaping. A `uniforms` binding and a full-screen vertex stage are injected for you, so
you only write the fragment:

::: live-code-demo

```html
<je-shader-canvas height="800">
  <script type="wgsl">
    fn rot(a: f32) -> mat2x2f {
      let c = cos(a);
      let s = sin(a);
      return mat2x2f(c, s, -s, c);
    }

    fn modv(x: vec3f, y: vec3f) -> vec3f {
      return x - y * floor(x / y);
    }

    @fragment
    fn main(@builtin(position) fragCoord: vec4f) -> @location(0) vec4f {
      let res = uniforms.resolution;
      var uv = fragCoord.xy / res - vec2f(0.5);
      uv.y *= res.y / res.x;

      var dir = vec3f(uv * 0.8, 1.0);
      let t = uniforms.time * 0.01 + 0.25;

      let a1 = 0.5 + uniforms.mouse.x / res.x * 2.0;
      let a2 = 0.8 + uniforms.mouse.y / res.y * 2.0;
      let r1 = rot(a1);
      let r2 = rot(a2);

      let dxz = r1 * dir.xz;
      dir.x = dxz.x; dir.z = dxz.y;
      let dxy = r2 * dir.xy;
      dir.x = dxy.x; dir.y = dxy.y;

      var origin = vec3f(1.0, 0.5, 0.5) + vec3f(t * 2.0, t, -2.0);
      let fxz = r1 * origin.xz;
      origin.x = fxz.x; origin.z = fxz.y;
      let fxy = r2 * origin.xy;
      origin.x = fxy.x; origin.y = fxy.y;

      let formuparam = 0.53;
      let tile = 0.85;
      let brightness = 0.0015;
      let darkmatter = 0.3;
      let distfading = 0.73;
      let saturation = 0.85;

      var s = 0.1;
      var fade = 1.0;
      var v = vec3f(0.0);

      for (var r = 0; r < 20; r = r + 1) {
        var p = origin + dir * (s * 0.5);
        p = abs(vec3f(tile) - modv(p, vec3f(tile * 2.0)));
        var pa = 0.0;
        var a = 0.0;
        for (var i = 0; i < 17; i = i + 1) {
          p = abs(p) / dot(p, p) - formuparam;
          a += abs(length(p) - pa);
          pa = length(p);
        }
        let dm = max(0.0, darkmatter - a * a * 0.001);
        a = a * a * a;
        if (r > 6) { fade *= 1.0 - dm; }
        v += vec3f(fade);
        v += vec3f(s, s * s, s * s * s * s) * a * brightness * fade;
        fade *= distfading;
        s += 0.1;
      }

      let vlen = length(v);
      v = mix(vec3f(vlen), v, saturation);
      return vec4f(v * 0.01, 1.0);
    }
  </script>
</je-shader-canvas>
```

:::

Available uniforms (WGSL `struct Uniforms`, bound at `@group(0) @binding(0)`):
- `resolution: vec2f` — framebuffer size in pixels
- `time: f32` — seconds elapsed (pauses with `paused`)
- `timeDelta: f32` — seconds since the previous frame
- `mouse: vec4f` — `xy` current pointer, `zw` last press position (framebuffer pixels, top-left origin)
- `frame: f32` — frames rendered