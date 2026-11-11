(function () {
  var root = document.documentElement;
  var reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Night is the default; the toggle switches to a daylight palette.
  function saved() { try { return localStorage.getItem("theme"); } catch (e) { return null; } }
  root.dataset.theme = saved() || "dark";

  var btn;
  function paint() { if (btn) btn.textContent = root.dataset.theme === "dark" ? "☀" : "☾"; }

  document.addEventListener("DOMContentLoaded", function () {
    btn = document.getElementById("theme");
    if (btn) {
      btn.setAttribute("aria-label", "Toggle theme");
      btn.addEventListener("click", function () {
        var next = root.dataset.theme === "dark" ? "light" : "dark";
        root.dataset.theme = next;
        try { localStorage.setItem("theme", next); } catch (e) {}
        paint();
        if (next === "dark") frame();
      });
      paint();
    }

    // ---------- Network graph ----------
    var canvas = document.createElement("canvas");
    canvas.id = "sky";
    var band = document.createElement("div");
    band.className = "grid";
    document.body.prepend(canvas, band);
    var ctx = canvas.getContext("2d");
    var W, H, dpr, nodes = [], packets = [], ripples = [], mx = 0, my = 0, tx = 0, ty = 0, scrollY = 0, nextPacket = 800;
    var LINK = 125;

    function build() {
      dpr = Math.min(devicePixelRatio || 1, 2);
      W = innerWidth; H = innerHeight;
      canvas.width = W * dpr; canvas.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      nodes = [];
      var n = Math.min(Math.floor(W * H / 15000), 100);
      for (var i = 0; i < n; i++) {
        var d = Math.random();
        nodes.push({ x: Math.random() * W, y: Math.random() * H, d: d, r: 0.8 + d * 1.4,
          vx: (Math.random() - .5) * 0.22, vy: (Math.random() - .5) * 0.22, sx: 0, sy: 0 });
      }
    }

    function wrap(v, m) { return ((v % m) + m) % m; }

    function draw(t) {
      ctx.clearRect(0, 0, W, H);
      mx += (tx - mx) * 0.05; my += (ty - my) * 0.05;
      var i, j, a, b, dx, dy, dd, edges = [];
      for (i = 0; i < nodes.length; i++) {
        a = nodes[i];
        if (!reduce) { a.x += a.vx; a.y += a.vy; }
        a.sx = wrap(a.x + mx * a.d * 16, W);
        a.sy = wrap(a.y - scrollY * a.d * 0.2 + my * a.d * 16, H);
      }
      ctx.lineWidth = 0.7;
      for (i = 0; i < nodes.length; i++) {
        a = nodes[i];
        for (j = i + 1; j < nodes.length; j++) {
          b = nodes[j]; dx = a.sx - b.sx; dy = a.sy - b.sy;
          if (dx > LINK || dx < -LINK || dy > LINK || dy < -LINK) continue;
          dd = Math.sqrt(dx * dx + dy * dy);
          if (dd < LINK) {
            ctx.strokeStyle = "rgba(120,170,255," + (1 - dd / LINK) * 0.2 + ")";
            ctx.beginPath(); ctx.moveTo(a.sx, a.sy); ctx.lineTo(b.sx, b.sy); ctx.stroke();
            edges.push([a, b]);
          }
        }
      }
      // the cursor joins the graph
      if (!reduce && mouse.on) {
        for (i = 0; i < nodes.length; i++) {
          a = nodes[i]; dx = a.sx - mouse.x; dy = a.sy - mouse.y; dd = Math.sqrt(dx * dx + dy * dy);
          if (dd < 170) {
            ctx.strokeStyle = "rgba(140,230,220," + (1 - dd / 170) * 0.55 + ")";
            ctx.beginPath(); ctx.moveTo(mouse.x, mouse.y); ctx.lineTo(a.sx, a.sy); ctx.stroke();
          }
        }
      }
      // nodes
      for (i = 0; i < nodes.length; i++) {
        a = nodes[i];
        ctx.fillStyle = "rgba(170,205,255," + (0.35 + a.d * 0.55) + ")";
        ctx.beginPath(); ctx.arc(a.sx, a.sy, a.r, 0, 6.283); ctx.fill();
      }
      // a ripple where a packet lands: "verified"
      for (i = ripples.length - 1; i >= 0; i--) {
        var rp = ripples[i]; rp.r += 0.5; rp.a -= 0.015;
        if (rp.a <= 0) { ripples.splice(i, 1); continue; }
        ctx.strokeStyle = "rgba(140,230,220," + rp.a + ")"; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(rp.n.sx, rp.n.sy, rp.r, 0, 6.283); ctx.stroke();
      }
      // data packets hopping along edges
      if (!reduce) {
        if (t > nextPacket && edges.length) {
          packets.push({ e: edges[(Math.random() * edges.length) | 0], p: 0 });
          nextPacket = t + 350 + Math.random() * 700;
        }
        for (i = packets.length - 1; i >= 0; i--) {
          var k = packets[i]; k.p += 0.018;
          if (k.p >= 1) { ripples.push({ n: k.e[1], r: 2, a: 0.7 }); packets.splice(i, 1); continue; }
          var px = k.e[0].sx + (k.e[1].sx - k.e[0].sx) * k.p, py = k.e[0].sy + (k.e[1].sy - k.e[0].sy) * k.p;
          ctx.fillStyle = "rgba(140,230,220,.18)"; ctx.beginPath(); ctx.arc(px, py, 6, 0, 6.283); ctx.fill();
          ctx.fillStyle = "rgba(180,255,245,.95)"; ctx.beginPath(); ctx.arc(px, py, 1.8, 0, 6.283); ctx.fill();
        }
      }
    }

    var mouse = { x: 0, y: 0, on: false }, running = false;
    function frame() {
      if (running) return;
      running = true;
      (function loop(t) {
        if (root.dataset.theme !== "dark") { running = false; return; }
        draw(t);
        if (reduce) { running = false; return; }
        requestAnimationFrame(loop);
      })(performance.now());
    }

    addEventListener("pointermove", function (e) {
      mouse.x = e.clientX; mouse.y = e.clientY; mouse.on = true;
      tx = e.clientX / W - 0.5; ty = e.clientY / H - 0.5;
    }, { passive: true });
    document.addEventListener("pointerleave", function () { mouse.on = false; });
    addEventListener("resize", function () { build(); if (reduce) draw(0); });

    // ---------- Scroll progress ----------
    var bar = document.createElement("div");
    bar.className = "progress";
    document.body.appendChild(bar);
    var ticking = false;
    function onScroll() {
      var max = document.documentElement.scrollHeight - innerHeight;
      scrollY = window.scrollY;
      bar.style.transform = "scaleX(" + (max > 0 ? scrollY / max : 0) + ")";
      if (reduce && root.dataset.theme === "dark") draw(0);
      ticking = false;
    }
    addEventListener("scroll", function () {
      if (!ticking) { ticking = true; requestAnimationFrame(onScroll); }
    }, { passive: true });

    build(); onScroll(); frame();

    // ---------- Reveal on scroll ----------
    var targets = [].slice.call(document.querySelectorAll("main .item, main .role, main h2.label, main .now"));
    if (!("IntersectionObserver" in window) || reduce) return;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
      });
    }, { rootMargin: "0px 0px -8% 0px" });
    targets.forEach(function (el, i) {
      el.classList.add("reveal");
      el.style.transitionDelay = (i % 3) * 70 + "ms";
      io.observe(el);
    });
  });
})();
