/* Dependency-free particle sculptures, drawn as ink on a transparent surface. */
(function (global) {
  "use strict";

  const TAU = Math.PI * 2;
  const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));
  const SHAPES = { knot: [1, 0, 0], sphere: [0, 1, 0], wave: [0, 0, 1] };
  const PALETTES = {
    mint: { primary: [0.045, 0.16, 0.14], secondary: [0.23, 0.36, 0.31], grain: [36, 65, 53] },
    blue: { primary: [0.065, 0.12, 0.23], secondary: [0.25, 0.36, 0.47], grain: [43, 62, 84] },
    violet: { primary: [0.22, 0.09, 0.19], secondary: [0.42, 0.28, 0.38], grain: [81, 44, 70] },
    gold: { primary: [0.45, 0.16, 0.055], secondary: [0.69, 0.33, 0.14], grain: [124, 72, 43] },
  };
  PALETTES.amber = PALETTES.gold;

  function clamp(value, minimum, maximum) {
    return Math.min(maximum, Math.max(minimum, value));
  }

  function randomGenerator(seed) {
    let state = seed >>> 0;
    return function () {
      state += 0x6d2b79f5;
      let value = state;
      value = Math.imul(value ^ (value >>> 15), value | 1);
      value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
      return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
    };
  }

  function createShader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const message = gl.getShaderInfoLog(shader) || "Particle shader compilation failed";
      gl.deleteShader(shader);
      throw new Error(message);
    }
    return shader;
  }

  function createProgram(gl) {
    const vertex = createShader(gl, gl.VERTEX_SHADER, `
      precision mediump float;
      attribute vec3 aKnot;
      attribute vec3 aSphere;
      attribute vec3 aWave;
      attribute vec4 aMeta;
      uniform vec3 uFrom;
      uniform vec3 uTo;
      uniform float uMorph;
      uniform vec2 uScale;
      uniform vec2 uPointer;
      uniform float uTime;
      uniform float uDpr;
      uniform vec3 uPrimary;
      uniform vec3 uSecondary;
      varying vec3 vColor;
      varying float vAlpha;
      void main() {
        vec3 weights = mix(uFrom, uTo, uMorph);
        vec3 p = aKnot * weights.x + aSphere * weights.y + aWave * weights.z;
        p.z += sin(p.x * 4.0 + uTime * 0.50) * 0.035 * weights.z;
        float yaw = -0.19 + sin(uTime * 0.14) * 0.23 + uPointer.x * 0.23;
        float cy = cos(yaw);
        float sy = sin(yaw);
        p = vec3(cy * p.x + sy * p.z, p.y, -sy * p.x + cy * p.z);
        float pitch = 0.32 + sin(uTime * 0.10) * 0.10 + uPointer.y * 0.20;
        float cp = cos(pitch);
        float sp = sin(pitch);
        p = vec3(p.x, cp * p.y - sp * p.z, sp * p.y + cp * p.z);
        float roll = -0.20 + uTime * 0.032 * (1.0 - weights.z);
        float cr = cos(roll);
        float sr = sin(roll);
        p.xy = vec2(cr * p.x - sr * p.y, sr * p.x + cr * p.y);
        float perspective = 4.8 / (4.8 - p.z);
        gl_Position = vec4((p.xy * perspective + uPointer * 0.025) * uScale, 0.0, 1.0);
        gl_PointSize = clamp(aMeta.x * uDpr * perspective, 0.75 * uDpr, 2.4 * uDpr);
        vColor = mix(uPrimary, uSecondary, aMeta.z * 0.68 + clamp(-p.z, 0.0, 1.0) * 0.22);
        vAlpha = aMeta.y * clamp(0.68 + p.z * 0.33, 0.27, 0.97);
      }
    `);
    const fragment = createShader(gl, gl.FRAGMENT_SHADER, `
      precision mediump float;
      varying vec3 vColor;
      varying float vAlpha;
      void main() {
        vec2 center = gl_PointCoord - 0.5;
        float radius = dot(center, center) * 4.0;
        float alpha = (1.0 - smoothstep(0.20, 1.0, radius)) * vAlpha;
        if (alpha < 0.01) discard;
        gl_FragColor = vec4(vColor, alpha);
      }
    `);
    const program = gl.createProgram();
    gl.attachShader(program, vertex);
    gl.attachShader(program, fragment);
    gl.linkProgram(program);
    gl.deleteShader(vertex);
    gl.deleteShader(fragment);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      const message = gl.getProgramInfoLog(program) || "Particle shader linking failed";
      gl.deleteProgram(program);
      throw new Error(message);
    }
    return program;
  }

  function createGeometry(count) {
    const knot = new Float32Array(count * 3);
    const sphere = new Float32Array(count * 3);
    const wave = new Float32Array(count * 3);
    const metadata = new Float32Array(count * 4);
    const random = randomGenerator(0x75e8b913);
    for (let i = 0; i < count; i++) {
      const p = i * 3;
      const m = i * 4;
      const t = TAU * (i + random() * 0.5) / count;
      const c = Math.cos(2 * t);
      const s = Math.sin(2 * t);
      const r = 0.89 + 0.23 * Math.cos(3 * t);
      const dr = -0.69 * Math.sin(3 * t);
      // A tube following a (2,3) torus knot, with an open central aperture.
      let tx = dr * c - 2 * r * s;
      let ty = dr * s + 2 * r * c;
      let tz = 0.90 * Math.cos(3 * t);
      const tangentLength = Math.hypot(tx, ty, tz);
      tx /= tangentLength;
      ty /= tangentLength;
      tz /= tangentLength;
      const projection = c * tx + s * ty;
      let nx = c - tx * projection;
      let ny = s - ty * projection;
      let nz = -tz * projection;
      const normalLength = Math.hypot(nx, ny, nz);
      nx /= normalLength;
      ny /= normalLength;
      nz /= normalLength;
      const bx = ty * nz - tz * ny;
      const by = tz * nx - tx * nz;
      const bz = tx * ny - ty * nx;
      const phi = i * GOLDEN_ANGLE;
      const tubeRadius = 0.145 * (random() < 0.78 ? 0.90 + random() * 0.10 : Math.sqrt(random()));
      const aroundNormal = Math.cos(phi) * tubeRadius;
      const aroundBinormal = Math.sin(phi) * tubeRadius;
      knot[p] = c * r + nx * aroundNormal + bx * aroundBinormal;
      knot[p + 1] = s * r + ny * aroundNormal + by * aroundBinormal;
      knot[p + 2] = 0.30 * Math.sin(3 * t) + nz * aroundNormal + bz * aroundBinormal;

      const y = 1 - 2 * (i + 0.5) / count;
      const horizontal = Math.sqrt(Math.max(0, 1 - y * y));
      const sphereRadius = random() < 0.84 ? 0.99 + random() * 0.04 : Math.cbrt(random()) * 0.96;
      sphere[p] = Math.cos(phi) * horizontal * sphereRadius;
      sphere[p + 1] = y * sphereRadius;
      sphere[p + 2] = Math.sin(phi) * horizontal * sphereRadius;

      const u = (i + 0.5) / count;
      const v = (i * 0.61803398875) % 1;
      const wx = (u - 0.5) * 2.48;
      const wy = (v - 0.5) * 1.55;
      wave[p] = wx;
      wave[p + 1] = wy + 0.12 * Math.sin(wx * 3.5);
      wave[p + 2] = 0.26 * Math.sin(wx * 4.4 + wy * 2.8) + 0.13 * Math.cos(wy * 6.2) + (random() - 0.5) * 0.045;
      metadata[m] = 0.72 + random() * 0.85;
      metadata[m + 1] = 0.49 + random() * 0.36;
      metadata[m + 2] = random();
      metadata[m + 3] = random();
    }
    return { count, knot, sphere, wave, metadata };
  }

  function createGrain(count) {
    const random = randomGenerator(0x1f90c4a7);
    return Array.from({ length: count }, function () {
      return { x: random(), y: random(), size: 0.5 + random() * 0.6, alpha: 0.04 + random() * 0.08 };
    });
  }

  function createParticleEngine(options) {
    options = options || {};
    const backgroundCanvas = options.backgroundCanvas;
    const sphereCanvas = options.sphereCanvas;
    if (!backgroundCanvas || !sphereCanvas || backgroundCanvas === sphereCanvas) {
      throw new TypeError("createParticleEngine requires two distinct canvas elements");
    }
    let density = clamp(Number.isFinite(Number(options.density)) ? Number(options.density) : 1, 0.3, 1.65);
    let paletteName = Object.prototype.hasOwnProperty.call(PALETTES, options.palette) ? options.palette : "mint";
    let shapeName = Object.prototype.hasOwnProperty.call(SHAPES, options.shape) ? options.shape : "knot";
    let wantsMotion = options.motion !== false;
    let destroyed = false;
    let compact = false;
    let elapsed = 0;
    let previousDraw = 0;
    let animationId = 0;
    let geometry = null;
    let grains = [];
    let backgroundContext = null;
    let sphereContext = null;
    let gl = null;
    let glProgram = null;
    let glBindings = null;
    let buffers = {};
    let renderMode = "css";
    let backgroundDirty = true;
    let morphProgress = 1;
    let fromWeights = SHAPES[shapeName].slice();
    let toWeights = SHAPES[shapeName].slice();
    let backgroundSize = { width: 1, height: 1, dpr: 1 };
    let sphereSize = { width: 1, height: 1, dpr: 1 };
    const pointer = { x: 0, y: 0, targetX: 0, targetY: 0 };
    const media = typeof global.matchMedia === "function" ? global.matchMedia("(prefers-reduced-motion: reduce)") : null;
    let reduceMotion = Boolean(media && media.matches);

    function setupGL() {
      glProgram = createProgram(gl);
      glBindings = {};
      ["Knot", "Sphere", "Wave", "Meta"].forEach(function (name) {
        glBindings[name.toLowerCase()] = gl.getAttribLocation(glProgram, "a" + name);
        buffers[name.toLowerCase()] = gl.createBuffer();
      });
      ["From", "To", "Morph", "Scale", "Pointer", "Time", "Dpr", "Primary", "Secondary"].forEach(function (name) {
        glBindings[name.toLowerCase()] = gl.getUniformLocation(glProgram, "u" + name);
      });
      gl.disable(gl.DEPTH_TEST);
      gl.enable(gl.BLEND);
      // Correct source-over RGB and alpha, composited over the page's light surface.
      gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      renderMode = "webgl";
    }

    function applyCssFallback() {
      const rgb = PALETTES[paletteName].grain.join(",");
      sphereCanvas.style.background = `radial-gradient(ellipse at 50% 49%, transparent 26%, rgba(${rgb},.18) 27%, rgba(${rgb},.32) 28%, transparent 30%, transparent 35%, rgba(${rgb},.22) 36%, transparent 38%)`;
    }

    try { backgroundContext = backgroundCanvas.getContext("2d", { alpha: true }); } catch (_) { /* Optional grain. */ }
    try {
      gl = sphereCanvas.getContext("webgl", { alpha: true, antialias: false, depth: false, stencil: false, premultipliedAlpha: true, preserveDrawingBuffer: false, powerPreference: "high-performance" });
      if (gl) setupGL();
      else {
        sphereContext = sphereCanvas.getContext("2d", { alpha: true });
        renderMode = sphereContext ? "canvas2d" : "css";
      }
    } catch (_) {
      try { sphereContext = sphereCanvas.getContext("2d", { alpha: true }); } catch (_ignored) { /* CSS remains available. */ }
      renderMode = sphereContext ? "canvas2d" : "css";
    }
    if (renderMode === "css") applyCssFallback();

    function isAnimated() { return wantsMotion && !reduceMotion && !global.document.hidden && renderMode !== "css"; }
    function morphEase() { return morphProgress * morphProgress * (3 - 2 * morphProgress); }
    function currentWeights() {
      const mix = morphEase();
      return fromWeights.map(function (value, index) { return value + (toWeights[index] - value) * mix; });
    }

    function canvasMeasure(canvas, maxPixels, maxDpr) {
      const rect = canvas.getBoundingClientRect();
      const width = Math.max(1, Math.round(rect.width || canvas.clientWidth || canvas.parentElement?.clientWidth || 300));
      const height = Math.max(1, Math.round(rect.height || canvas.clientHeight || canvas.parentElement?.clientHeight || 300));
      const desired = Math.min(global.devicePixelRatio || 1, maxDpr);
      const dpr = Math.max(1, Math.min(desired, Math.sqrt(maxPixels / (width * height))));
      const pixelWidth = Math.max(1, Math.round(width * dpr));
      const pixelHeight = Math.max(1, Math.round(height * dpr));
      if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
        canvas.width = pixelWidth;
        canvas.height = pixelHeight;
      }
      return { width, height, dpr };
    }

    function uploadGeometry() {
      if (!gl || !glProgram || !geometry || renderMode !== "webgl") return;
      ["knot", "sphere", "wave", "meta"].forEach(function (name) {
        gl.bindBuffer(gl.ARRAY_BUFFER, buffers[name]);
        gl.bufferData(gl.ARRAY_BUFFER, name === "meta" ? geometry.metadata : geometry[name], gl.STATIC_DRAW);
      });
    }

    function rebuildGeometry() {
      compact = global.innerWidth <= 720 || Math.min(sphereSize.width, sphereSize.height) < 420;
      const fallbackScale = renderMode === "webgl" ? 1 : renderMode === "canvas2d" ? 0.22 : 0;
      geometry = createGeometry(Math.round((compact ? 18500 : 28000) * density * fallbackScale));
      grains = backgroundContext ? createGrain(Math.round((compact ? 150 : 250) * Math.min(density, 1.35))) : [];
      backgroundDirty = true;
      uploadGeometry();
    }

    function resize() {
      if (destroyed) return;
      const wasCompact = compact;
      backgroundSize = canvasMeasure(backgroundCanvas, 2800000, 1.5);
      sphereSize = canvasMeasure(sphereCanvas, 2500000, 2);
      backgroundDirty = true;
      if (gl && renderMode === "webgl") gl.viewport(0, 0, sphereCanvas.width, sphereCanvas.height);
      const isCompact = global.innerWidth <= 720 || Math.min(sphereSize.width, sphereSize.height) < 420;
      if (!geometry || wasCompact !== isCompact) rebuildGeometry();
      requestRender();
    }

    function drawBackground() {
      if (!backgroundContext || !backgroundDirty) return;
      const ctx = backgroundContext;
      const { width, height, dpr } = backgroundSize;
      const rgb = PALETTES[paletteName].grain.join(",");
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);
      for (let i = 0; i < grains.length; i++) {
        const grain = grains[i];
        ctx.fillStyle = `rgba(${rgb},${grain.alpha})`;
        ctx.fillRect(grain.x * width, grain.y * height, grain.size, grain.size);
      }
      backgroundDirty = false;
    }

    function drawWebGL(time) {
      if (!gl || !glProgram || !geometry) return;
      const colors = PALETTES[paletteName];
      const { width, height, dpr } = sphereSize;
      const base = 0.335 * Math.min(width, height);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.useProgram(glProgram);
      gl.uniform3fv(glBindings.from, fromWeights);
      gl.uniform3fv(glBindings.to, toWeights);
      gl.uniform1f(glBindings.morph, morphEase());
      gl.uniform2f(glBindings.scale, 2 * base / width, 2 * base / height);
      gl.uniform2f(glBindings.pointer, pointer.x, pointer.y);
      gl.uniform1f(glBindings.time, time);
      gl.uniform1f(glBindings.dpr, dpr);
      gl.uniform3fv(glBindings.primary, colors.primary);
      gl.uniform3fv(glBindings.secondary, colors.secondary);
      ["knot", "sphere", "wave", "meta"].forEach(function (name) {
        gl.bindBuffer(gl.ARRAY_BUFFER, buffers[name]);
        gl.enableVertexAttribArray(glBindings[name]);
        gl.vertexAttribPointer(glBindings[name], name === "meta" ? 4 : 3, gl.FLOAT, false, 0, 0);
      });
      gl.drawArrays(gl.POINTS, 0, geometry.count);
    }

    function drawCanvas2D(time) {
      if (!sphereContext || !geometry) return;
      const ctx = sphereContext;
      const { width, height, dpr } = sphereSize;
      const colors = PALETTES[paletteName];
      const base = 0.335 * Math.min(width, height);
      const weights = currentWeights();
      const yaw = -0.19 + Math.sin(time * 0.14) * 0.23 + pointer.x * 0.23;
      const pitch = 0.32 + Math.sin(time * 0.10) * 0.10 + pointer.y * 0.20;
      const roll = -0.20 + time * 0.032 * (1 - weights[2]);
      const cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch), cr = Math.cos(roll), sr = Math.sin(roll);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);
      for (let i = 0; i < geometry.count; i++) {
        const p = i * 3, m = i * 4;
        const x0 = geometry.knot[p] * weights[0] + geometry.sphere[p] * weights[1] + geometry.wave[p] * weights[2];
        const y0 = geometry.knot[p + 1] * weights[0] + geometry.sphere[p + 1] * weights[1] + geometry.wave[p + 1] * weights[2];
        const z0 = geometry.knot[p + 2] * weights[0] + geometry.sphere[p + 2] * weights[1] + geometry.wave[p + 2] * weights[2] + Math.sin(x0 * 4 + time * 0.5) * 0.035 * weights[2];
        const x1 = cy * x0 + sy * z0;
        const z1 = -sy * x0 + cy * z0;
        const y1 = cp * y0 - sp * z1;
        const z = sp * y0 + cp * z1;
        const x = cr * x1 - sr * y1;
        const y = sr * x1 + cr * y1;
        const perspective = 4.8 / (4.8 - z);
        const alpha = geometry.metadata[m + 1] * clamp(0.68 + z * 0.33, 0.27, 0.97);
        const tint = geometry.metadata[m + 2] * 0.68 + clamp(-z, 0, 1) * 0.22;
        const rgb = colors.primary.map(function (value, channel) { return Math.round((value + (colors.secondary[channel] - value) * tint) * 255); });
        const size = Math.max(0.8, geometry.metadata[m] * perspective * 1.18);
        ctx.fillStyle = `rgba(${rgb.join(",")},${alpha})`;
        ctx.fillRect(width / 2 + (x * perspective + pointer.x * 0.025) * base, height / 2 - (y * perspective + pointer.y * 0.025) * base, size, size);
      }
    }

    function draw(time) {
      drawBackground();
      if (renderMode === "webgl") drawWebGL(time);
      else if (renderMode === "canvas2d") drawCanvas2D(time);
    }

    function frame(now) {
      animationId = 0;
      if (destroyed || global.document.hidden) return;
      const animated = isAnimated();
      const transitioning = morphProgress < 1;
      const frameInterval = renderMode === "canvas2d" ? 1000 / 30 : 1000 / 45;
      if (!previousDraw || now - previousDraw >= frameInterval || (!animated && !transitioning)) {
        const delta = previousDraw ? Math.min(0.08, Math.max(0, (now - previousDraw) / 1000)) : 0;
        if (animated) {
          elapsed += delta;
          pointer.x += (pointer.targetX - pointer.x) * 0.09;
          pointer.y += (pointer.targetY - pointer.y) * 0.09;
        }
        if (transitioning) morphProgress = reduceMotion ? 1 : Math.min(1, morphProgress + delta / 1.15);
        draw(elapsed);
        previousDraw = now;
      }
      if (animated || morphProgress < 1) animationId = global.requestAnimationFrame(frame);
      else previousDraw = 0;
    }

    function requestRender() {
      if (!destroyed && !global.document.hidden && !animationId) animationId = global.requestAnimationFrame(frame);
    }

    function onPointerMove(event) {
      if (!wantsMotion || reduceMotion) return;
      const rect = sphereCanvas.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;
      const x = (event.clientX - rect.left) / rect.width;
      const y = (event.clientY - rect.top) / rect.height;
      const near = x >= -0.15 && x <= 1.15 && y >= -0.15 && y <= 1.15;
      pointer.targetX = near ? clamp((x - 0.5) * 1.20, -0.65, 0.65) : 0;
      pointer.targetY = near ? clamp((0.5 - y) * 1.05, -0.60, 0.60) : 0;
    }

    function onVisibility() {
      previousDraw = 0;
      if (global.document.hidden && animationId) {
        global.cancelAnimationFrame(animationId);
        animationId = 0;
      } else requestRender();
    }

    function onMediaChange(event) {
      reduceMotion = event.matches;
      if (reduceMotion) {
        pointer.targetX = pointer.x = 0;
        pointer.targetY = pointer.y = 0;
        morphProgress = 1;
      }
      previousDraw = 0;
      requestRender();
    }

    function onContextLost(event) {
      event.preventDefault();
      renderMode = "css";
      glProgram = null;
      buffers = {};
      applyCssFallback();
      requestRender();
    }

    function onContextRestored() {
      if (destroyed || !gl) return;
      try {
        setupGL();
        sphereCanvas.style.background = "";
        gl.viewport(0, 0, sphereCanvas.width, sphereCanvas.height);
        rebuildGeometry();
        requestRender();
      } catch (_) {
        renderMode = "css";
        applyCssFallback();
      }
    }

    global.addEventListener("pointermove", onPointerMove, { passive: true });
    global.addEventListener("resize", resize, { passive: true });
    global.document.addEventListener("visibilitychange", onVisibility);
    if (media) {
      if (media.addEventListener) media.addEventListener("change", onMediaChange);
      else if (media.addListener) media.addListener(onMediaChange);
    }
    if (gl) {
      sphereCanvas.addEventListener("webglcontextlost", onContextLost);
      sphereCanvas.addEventListener("webglcontextrestored", onContextRestored);
    }
    const observer = typeof global.ResizeObserver === "function" ? new global.ResizeObserver(resize) : null;
    if (observer) {
      observer.observe(backgroundCanvas);
      observer.observe(sphereCanvas);
    }
    resize();

    return {
      setDensity(value) {
        const numeric = Number(value);
        if (destroyed || !Number.isFinite(numeric)) return;
        const next = clamp(numeric, 0.3, 1.65);
        if (next === density) return;
        density = next;
        rebuildGeometry();
        requestRender();
      },
      setPalette(value) {
        if (destroyed || !Object.prototype.hasOwnProperty.call(PALETTES, value) || value === paletteName) return;
        paletteName = value;
        backgroundDirty = true;
        if (renderMode === "css") applyCssFallback();
        requestRender();
      },
      setShape(value) {
        if (destroyed || !Object.prototype.hasOwnProperty.call(SHAPES, value) || value === shapeName) return;
        fromWeights = currentWeights();
        toWeights = SHAPES[value].slice();
        shapeName = value;
        morphProgress = reduceMotion || renderMode === "css" ? 1 : 0;
        requestRender();
      },
      setMotion(value) {
        if (destroyed) return;
        wantsMotion = Boolean(value);
        if (!wantsMotion) {
          pointer.targetX = pointer.x = 0;
          pointer.targetY = pointer.y = 0;
        }
        previousDraw = 0;
        requestRender();
      },
      getCount() { return (renderMode !== "css" && geometry ? geometry.count : 0) + grains.length; },
      destroy() {
        if (destroyed) return;
        destroyed = true;
        if (animationId) global.cancelAnimationFrame(animationId);
        global.removeEventListener("pointermove", onPointerMove);
        global.removeEventListener("resize", resize);
        global.document.removeEventListener("visibilitychange", onVisibility);
        if (media) {
          if (media.removeEventListener) media.removeEventListener("change", onMediaChange);
          else if (media.removeListener) media.removeListener(onMediaChange);
        }
        if (observer) observer.disconnect();
        if (gl) {
          sphereCanvas.removeEventListener("webglcontextlost", onContextLost);
          sphereCanvas.removeEventListener("webglcontextrestored", onContextRestored);
          Object.keys(buffers).forEach(function (name) { if (buffers[name]) gl.deleteBuffer(buffers[name]); });
          if (glProgram) gl.deleteProgram(glProgram);
        }
        geometry = null;
        grains = [];
      },
    };
  }

  global.createParticleEngine = createParticleEngine;
})(window);
