/* Renders one project case study from window.PROJECTS, chosen by ?p=<id>. */
(function () {
  "use strict";
  const root = document.getElementById("project");
  if (!root) return;
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  const id = new URLSearchParams(location.search).get("p") || PROJECTS[0].id;
  const idx = Math.max(0, PROJECTS.findIndex((p) => p.id === id));
  const p = PROJECTS[idx];
  const { ARROW, EXT } = window.ICONS;
  const PLAY = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 4.5v15l13-7.5z"/></svg>';

  document.title = `${p.title} · Gaurang Solanki`;
  document.querySelector('meta[name="description"]').setAttribute("content", p.tagline);

  function heroMedia(m) {
    if (m.type === "video") {
      return `<div class="p-media rv"><video src="${esc(m.src)}" poster="${esc(m.poster || "")}" controls muted autoplay loop playsinline preload="metadata"></video></div>`;
    }
    if (m.type === "youtube") {
      return `<div class="p-media rv" id="yt"><div class="yt"><img src="${esc(m.poster)}" alt="${esc(p.title)} demo video"><button class="play" type="button" aria-label="Play demo video">${PLAY}</button></div></div>`;
    }
    return `<div class="p-media rv${m.contain ? " contain" : ""}"><img src="${esc(m.src)}" alt="${esc(p.title)}"></div>`;
  }

  const sections = [{ h: "Overview", id: "overview" }]
    .concat(p.sections.map((s) => ({ h: s.h, id: slug(s.h) })))
    .concat(p.gallery.length ? [{ h: "Gallery", id: "gallery" }] : []);

  const cats = p.cats.map((c) => CATEGORIES[c]).join(" · ");
  const prev = PROJECTS[(idx - 1 + PROJECTS.length) % PROJECTS.length];
  const next = PROJECTS[(idx + 1) % PROJECTS.length];

  root.innerHTML = `
    <section class="p-hero">
      <div class="crumbs mono rv"><a href="index.html#work">Work</a><span>/</span><span>${esc(p.title)}</span></div>
      <h1 class="p-title rv d1">${esc(p.title)}</h1>
      <p class="p-tagline rv d2">${esc(p.tagline)}</p>
      <dl class="p-meta rv d3">
        <div><dt>Year</dt><dd>${esc(p.year)}</dd></div>
        <div><dt>Status</dt><dd>${esc(p.status)}</dd></div>
        <div><dt>Area</dt><dd>${esc(cats)}</dd></div>
        <div><dt>Role</dt><dd>Solo, end to end</dd></div>
      </dl>
      ${p.links.length ? `<div class="p-links rv">${p.links.map((l, i) => `<a class="btn${i === 0 ? " btn-act" : ""}" href="${esc(l.url)}" target="_blank" rel="noopener">${esc(l.label)} ${EXT}</a>`).join("")}</div>` : ""}
    </section>
    ${heroMedia(p.hero)}
    ${p.metrics.length ? `<div class="p-metrics rv">${p.metrics.map((m) => `<div><b>${esc(m.value)}</b><span>${esc(m.label)}</span></div>`).join("")}</div>` : ""}
    <div class="p-body">
      <aside class="p-toc">
        ${sections.map((s) => `<a href="#${s.id}">${esc(s.h)}</a>`).join("")}
        <div class="stack">${p.stack.map((t) => `<span class="chip">${esc(t)}</span>`).join("")}</div>
      </aside>
      <article class="p-content">
        <section class="p-sec" id="overview"><p class="p-summary rv">${esc(p.summary)}</p></section>
        ${p.sections.map((s) => `
          <section class="p-sec" id="${slug(s.h)}">
            <h2 class="rv">${esc(s.h)}</h2>
            ${(s.p || []).map((t) => `<p class="rv">${esc(t)}</p>`).join("")}
            ${s.steps ? `<div class="steps rv">${s.steps.map(([a, b]) => `<div class="step"><b>${esc(a)}</b><span>${esc(b)}</span></div>`).join("")}</div>` : ""}
            ${s.list ? `<ul class="rv">${s.list.map((t) => `<li>${esc(t)}</li>`).join("")}</ul>` : ""}
          </section>`).join("")}
      </article>
    </div>
        ${p.gallery.length ? `
          <section class="p-sec" id="gallery">
            <h2 class="rv">Gallery</h2>
            <div class="gallery">${p.gallery.map((g, i) => `
              <button class="g-item rv${g.contain ? " contain" : ""}" type="button" data-i="${i}">
                <div class="g-frame">${g.type === "video"
                  ? `<video src="${esc(g.src)}" poster="${esc(g.poster || "")}" muted loop playsinline preload="metadata"></video><span class="chip act g-type" style="background:#0b0d11">video</span>`
                  : `<img src="${esc(g.src)}" alt="${esc(g.caption || "")}" loading="lazy">`}</div>
                ${g.caption ? `<figcaption>${esc(g.caption)}</figcaption>` : ""}
              </button>`).join("")}
            </div>
          </section>` : ""}
    <nav class="next-proj" aria-label="More projects">
      <a href="project.html?p=${esc(prev.id)}"><span class="mono">← Previous</span><b>${esc(prev.title)}</b></a>
      <a href="project.html?p=${esc(next.id)}"><span class="mono">Next →</span><b>${esc(next.title)}</b></a>
    </nav>`;
  window.reveal(root);

  // YouTube: load the player only on click (privacy-friendly domain)
  const yt = document.getElementById("yt");
  if (yt) yt.querySelector(".play").addEventListener("click", () => {
    yt.innerHTML = `<iframe src="https://www.youtube-nocookie.com/embed/${encodeURIComponent(p.hero.src)}?autoplay=1&rel=0" title="${esc(p.title)} demo" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen></iframe>`;
  });

  // Gallery videos play on hover
  root.querySelectorAll(".g-item video").forEach((v) => {
    const item = v.closest(".g-item");
    item.addEventListener("mouseenter", () => v.play().catch(() => {}));
    item.addEventListener("mouseleave", () => v.pause());
  });

  // TOC highlight
  const tocLinks = Array.from(root.querySelectorAll(".p-toc a"));
  const io = new IntersectionObserver((entries) => entries.forEach((en) => {
    if (en.isIntersecting) tocLinks.forEach((a) => a.classList.toggle("on", a.getAttribute("href") === "#" + en.target.id));
  }), { rootMargin: "-30% 0px -60% 0px" });
  root.querySelectorAll(".p-sec").forEach((s) => io.observe(s));

  // Lightbox
  const lb = document.getElementById("lb"), stage = document.getElementById("lbStage"), count = document.getElementById("lbCount");
  let cur = 0, opener = null;
  function show(i) {
    cur = (i + p.gallery.length) % p.gallery.length;
    const g = p.gallery[cur];
    stage.innerHTML = (g.type === "video"
      ? `<video src="${esc(g.src)}" controls autoplay loop playsinline style="${g.contain ? "" : "background:#000"}"></video>`
      : `<img src="${esc(g.src)}" alt="${esc(g.caption || "")}" style="${g.contain ? "" : "background:#000"}">`) +
      (g.caption ? `<p class="lb-cap">${esc(g.caption)}</p>` : "");
    count.textContent = `${cur + 1} / ${p.gallery.length}`;
  }
  function open(i, el) { opener = el; show(i); lb.classList.add("open"); document.body.style.overflow = "hidden"; document.getElementById("lbClose").focus(); }
  function close() { lb.classList.remove("open"); stage.innerHTML = ""; document.body.style.overflow = ""; if (opener) opener.focus(); }
  root.querySelectorAll(".g-item").forEach((b) => b.addEventListener("click", () => open(+b.dataset.i, b)));
  document.getElementById("lbClose").addEventListener("click", close);
  document.getElementById("lbPrev").addEventListener("click", () => show(cur - 1));
  document.getElementById("lbNext").addEventListener("click", () => show(cur + 1));
  lb.addEventListener("click", (e) => { if (e.target === lb) close(); });
  // swipe left/right on touch screens
  let touchX = null;
  lb.addEventListener("touchstart", (e) => { touchX = e.touches[0].clientX; }, { passive: true });
  lb.addEventListener("touchend", (e) => {
    if (touchX === null) return;
    const dx = e.changedTouches[0].clientX - touchX;
    if (Math.abs(dx) > 50) show(cur + (dx < 0 ? 1 : -1));
    touchX = null;
  }, { passive: true });
  document.addEventListener("keydown", (e) => {
    if (!lb.classList.contains("open")) return;
    if (e.key === "Escape") close();
    if (e.key === "ArrowLeft") show(cur - 1);
    if (e.key === "ArrowRight") show(cur + 1);
  });
})();
