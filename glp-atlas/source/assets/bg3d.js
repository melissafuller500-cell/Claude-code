/* GLP Atlas — WebGL background: two rotating peptide helices and a drifting particle field.
   No dependencies. All motion runs in the vertex shader, so the CPU cost per frame is a few uniforms.
   Respects prefers-reduced-motion (renders one still frame), pauses in hidden tabs, degrades to CSS when WebGL is unavailable. */
(function () {
  var canvas = document.getElementById('bg3d');
  if (!canvas) return;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  var small = Math.min(window.innerWidth, window.innerHeight) < 640;
  var weak = (navigator.hardwareConcurrency || 8) <= 4 || small;

  var VS = [
    'attribute vec4 a_a;', // helix: t, strand, -, rnd   | dust: x, y, z, rnd
    'attribute vec3 a_b;', // kind (0 helix, 1 dust, 2 rung), helix id, size
    'uniform float u_time, u_scroll, u_dpr;',
    'uniform vec2 u_mouse, u_res;',
    'uniform vec3 u_c1, u_c2;',
    'varying vec3 v_col; varying float v_a;',
    'mat3 rx(float a){float c=cos(a),s=sin(a);return mat3(1.,0.,0.,0.,c,s,0.,-s,c);}',
    'mat3 ry(float a){float c=cos(a),s=sin(a);return mat3(c,0.,-s,0.,1.,0.,s,0.,c);}',
    'mat3 rz(float a){float c=cos(a),s=sin(a);return mat3(c,s,0.,-s,c,0.,0.,0.,1.);}',
    'void main(){',
    '  float aspect=u_res.x/u_res.y; float wide=clamp((aspect-.55)/1.,0.,1.);',
    '  vec3 p; float tone;',
    '  if(a_b.x>.5&&a_b.x<1.5){',
    '    p=(a_a.xyz-.5)*vec3(18.,12.,12.);',
    '    p.x+=cos(u_time*.07+a_a.w*12.)*.5; p.z+=sin(u_time*.05+a_a.w*9.)*.5;',
    '    p.y=mod(p.y+u_time*.05*(.3+a_a.w)+u_scroll*3.+6.,12.)-6.;',
    '    tone=a_a.w;',
    '  } else {',
    '    float id=a_b.y, t=a_a.x;',
    '    float R=id<.5?1.3:.85, H=id<.5?12.:8., turns=id<.5?3.4:2.6;',
    '    float ang=t*turns*6.2832+a_a.y*3.14159+u_time*(id<.5?.22:-.15)+u_scroll*2.2;',
    '    p=vec3(cos(ang)*R,(t-.5)*H,sin(ang)*R);',
    '    p.xz*=1.+.06*sin(t*14.+u_time*.8);',
    '    p=rz(id<.5?-.62:.5)*p;',
    '    p+=id<.5?vec3(mix(.9,3.4,wide),.2,-.5):vec3(mix(-1.6,-5.,wide),-.8,-4.5);',
    '    tone=t;',
    '  }',
    '  p=ry(u_mouse.x*.32+sin(u_time*.05)*.08)*rx(-u_mouse.y*.2)*p;',
    '  float z=9.5-p.z;',
    '  gl_Position=vec4(p.x*1.65/aspect,p.y*1.65,0.,z);',
    '  gl_PointSize=a_b.z*u_dpr*(u_res.y/(900.*u_dpr))*(9./z)*(a_b.x>.5?1.:1.35);',
    '  v_col=mix(u_c1,u_c2,clamp(tone,0.,1.));',
    '  v_a=clamp(1.35-(z-6.)/9.,.12,1.)*(a_b.x>.5?.55:1.);',
    '}'
  ].join('\n');
  var FS = [
    'precision mediump float;',
    'varying vec3 v_col; varying float v_a; uniform float u_line, u_gain;',
    'void main(){',
    '  if(u_line>.5){gl_FragColor=vec4(v_col,v_a*.32*u_gain);return;}',
    '  vec2 c=gl_PointCoord-.5; float d=dot(c,c);',
    '  if(d>.25)discard;',
    '  float a=exp(-d*22.)+.35*exp(-d*7.);',
    '  gl_FragColor=vec4(mix(v_col,vec3(1.),exp(-d*60.)*.6),a*v_a*u_gain);',
    '}'
  ].join('\n');

  var gl = canvas.getContext('webgl', { antialias: true, alpha: true, depth: false, premultipliedAlpha: false, powerPreference: 'low-power' });
  if (!gl) return;

  function sh(type, src) {
    var s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
    return s;
  }
  var prog;
  try {
    prog = gl.createProgram();
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FS));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
  } catch (e) { return; }
  gl.useProgram(prog);

  // ---- geometry
  var pts = [], lines = [];
  function push(arr, a, b) { arr.push(a[0], a[1], a[2], a[3], b[0], b[1], b[2]); }
  var helixN = weak ? 180 : 320, dustN = weak ? 380 : 900;
  [0, 1].forEach(function (id) {
    var n = id ? Math.round(helixN * .6) : helixN;
    for (var i = 0; i < n; i++) {
      var t = i / (n - 1);
      for (var s = 0; s < 2; s++) {
        push(pts, [t, s, 0, Math.random()], [0, id, (id ? 6 : 9) + Math.random() * 3.5]);
      }
      if (i % 5 === 0) {
        push(lines, [t, 0, 0, 0], [2, id, 0]);
        push(lines, [t, 1, 0, 0], [2, id, 0]);
      }
    }
    for (var j = 0; j < n - 1; j += 1) {
      for (var s2 = 0; s2 < 2; s2++) {
        push(lines, [j / (n - 1), s2, 0, 0], [2, id, 0]);
        push(lines, [(j + 1) / (n - 1), s2, 0, 0], [2, id, 0]);
      }
    }
  });
  for (var k = 0; k < dustN; k++) {
    push(pts, [Math.random(), Math.random(), Math.random(), Math.random()], [1, 0, 1.5 + Math.random() * 3.5]);
  }
  function buf(data) {
    var b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.STATIC_DRAW);
    return { b: b, n: data.length / 7 };
  }
  var P = buf(pts), L = buf(lines);
  var aA = gl.getAttribLocation(prog, 'a_a'), aB = gl.getAttribLocation(prog, 'a_b');
  gl.enableVertexAttribArray(aA); gl.enableVertexAttribArray(aB);
  function bind(o) {
    gl.bindBuffer(gl.ARRAY_BUFFER, o.b);
    gl.vertexAttribPointer(aA, 4, gl.FLOAT, false, 28, 0);
    gl.vertexAttribPointer(aB, 3, gl.FLOAT, false, 28, 16);
  }
  var U = {};
  ['u_time', 'u_scroll', 'u_dpr', 'u_mouse', 'u_res', 'u_c1', 'u_c2', 'u_line', 'u_gain'].forEach(function (n) { U[n] = gl.getUniformLocation(prog, n); });

  // ---- state
  var dpr = 1, W = 0, H = 0, mx = 0, my = 0, tx = 0, ty = 0, sc = 0, ts = 0, t0 = performance.now(), raf = 0, running = false;
  function isDark() {
    var t = document.documentElement.getAttribute('data-theme');
    return t ? t === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches;
  }
  function theme() {
    var d = isDark();
    gl.uniform3f(U.u_c1, d ? .18 : .05, d ? .83 : .5, d ? .75 : .47);
    gl.uniform3f(U.u_c2, d ? .58 : .42, d ? .4 : .18, d ? .98 : .86);
    gl.uniform1f(U.u_gain, d ? 1 : .7);
    if (d) gl.blendFunc(gl.SRC_ALPHA, gl.ONE); else gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  }
  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, weak ? 1.25 : 1.6);
    W = window.innerWidth; H = window.innerHeight;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.uniform2f(U.u_res, canvas.width, canvas.height);
    gl.uniform1f(U.u_dpr, dpr);
  }
  function draw(now) {
    var t = (now - t0) / 1000;
    mx += (tx - mx) * .04; my += (ty - my) * .04; sc += (ts - sc) * .06;
    gl.uniform1f(U.u_time, reduce.matches ? 12 : t);
    gl.uniform2f(U.u_mouse, mx, my);
    gl.uniform1f(U.u_scroll, sc);
    gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
    gl.uniform1f(U.u_line, 1); bind(L); gl.drawArrays(gl.LINES, 0, L.n);
    gl.uniform1f(U.u_line, 0); bind(P); gl.drawArrays(gl.POINTS, 0, P.n);
  }
  function loop(now) { draw(now); raf = running ? requestAnimationFrame(loop) : 0; }
  function start() { if (running || reduce.matches || document.hidden) { draw(performance.now()); return; } running = true; raf = requestAnimationFrame(loop); }
  function stop() { running = false; cancelAnimationFrame(raf); }

  gl.enable(gl.BLEND);
  resize(); theme();

  window.addEventListener('resize', function () { resize(); if (!running) draw(performance.now()); }, { passive: true });
  window.addEventListener('pointermove', function (e) {
    if (e.pointerType !== 'mouse') return;
    tx = (e.clientX / W) * 2 - 1; ty = (e.clientY / H) * 2 - 1;
  }, { passive: true });
  window.addEventListener('scroll', function () { ts = window.scrollY / Math.max(H, 1) * .35; if (!running) draw(performance.now()); }, { passive: true });
  document.addEventListener('visibilitychange', function () { document.hidden ? stop() : start(); });
  document.addEventListener('themechange', function () { theme(); if (!running) draw(performance.now()); });
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function () { theme(); if (!running) draw(performance.now()); });
  reduce.addEventListener('change', function () { reduce.matches ? (stop(), draw(performance.now())) : start(); });
  canvas.addEventListener('webglcontextlost', function (e) { e.preventDefault(); stop(); canvas.classList.remove('on'); });

  var go = function () { start(); canvas.classList.add('on'); };
  (window.requestIdleCallback || function (f) { setTimeout(f, 120); })(go, { timeout: 800 });
})();
