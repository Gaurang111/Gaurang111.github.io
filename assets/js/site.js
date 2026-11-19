/* Shared behaviour and renderers for all pages. */
(function () {
  "use strict";
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const ARROW = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 8h10M8.5 3.5 13 8l-4.5 4.5"/></svg>';
  const EXT = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M5 11 11 5M6 5h5v5"/></svg>';
  window.ICONS = { ARROW, EXT };

  /* ---------- Theme ---------- */
  const themeBtn = $("#themeBtn");
  if (themeBtn) {
    themeBtn.addEventListener("click", () => {
      const root = document.documentElement;
      const cur = root.dataset.theme || "dark";
      const next = cur === "dark" ? "light" : "dark";
      root.dataset.theme = next;
      try { localStorage.setItem("theme", next); } catch (e) { /* storage unavailable */ }
      document.dispatchEvent(new CustomEvent("themechange"));
    });
  }

  /* ---------- Nav ---------- */
  const nav = $("#nav");
  let lastY = window.scrollY;
  const onScroll = () => {
    const y = window.scrollY;
    if (nav) {
      nav.classList.toggle("scrolled", y > 20);
      nav.classList.toggle("hide", y > 500 && y > lastY && !$("#navLinks")?.classList.contains("open"));
    }
    lastY = y;
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  const menuBtn = $("#menuBtn"), links = $("#navLinks");
  if (menuBtn && links) {
    menuBtn.addEventListener("click", () => {
      const open = links.classList.toggle("open");
      menuBtn.setAttribute("aria-expanded", String(open));
    });
    links.addEventListener("click", (e) => {
      if (e.target.closest("a")) { links.classList.remove("open"); menuBtn.setAttribute("aria-expanded", "false"); }
    });
  }

  // Active section highlight
  const navAnchors = $$('.nav-links a[href^="#"]');
  if (navAnchors.length && "IntersectionObserver" in window) {
    const map = new Map(navAnchors.map((a) => [a.getAttribute("href").slice(1), a]));
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (en.isIntersecting) {
          navAnchors.forEach((a) => a.classList.remove("on"));
          map.get(en.target.id)?.classList.add("on");
        }
      });
    }, { rootMargin: "-45% 0px -50% 0px" });
    map.forEach((_, id) => { const el = document.getElementById(id); if (el) io.observe(el); });
  }

  /* ---------- Reveal ---------- */
  const revealIO = "IntersectionObserver" in window && !reduced
    ? new IntersectionObserver((entries) => entries.forEach((en) => { if (en.isIntersecting) { en.target.classList.add("in"); revealIO.unobserve(en.target); } }), { rootMargin: "0px 0px -8% 0px" })
    : null;
  function reveal(root = document) {
    $$(".rv:not(.in)", root).forEach((el) => (revealIO ? revealIO.observe(el) : el.classList.add("in")));
  }
  window.reveal = reveal;
  reveal();

  const year = $("#year"); if (year) year.textContent = new Date().getFullYear();

  /* ---------- Email ---------- */
  const mail = $("#mail");
  if (mail && window.SITE) {
    const addr = SITE.email;
    $("#mailText").textContent = addr;
    mail.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(addr);
        mail.classList.add("copied"); $("#mailHint").textContent = "copied ✓";
        setTimeout(() => { mail.classList.remove("copied"); $("#mailHint").textContent = "copy"; }, 2000);
      } catch (e) { window.location.href = "mailto:" + addr; }
    });
  }

  /* ---------- Projects (home) ---------- */
  function catChips(p) {
    return p.cats.map((c) => `<span class="chip ${c === "physical" ? "act" : c === "vision" ? "see" : ""}">${esc(CATEGORIES[c])}</span>`).join("");
  }
  function projectCard(p, i) {
    const pos = p.thumbPos ? ` style="object-position:${esc(p.thumbPos)}"` : "";
    return `<a class="card rv d${i % 3}" href="project.html?p=${esc(p.id)}" data-cats="${esc(p.cats.join(" "))}">
      <div class="card-media"><span class="chip card-status">${esc(p.status)}</span><img src="${esc(p.thumb)}" alt="${esc(p.title)} thumbnail" loading="lazy"${pos}></div>
      <div class="card-body">
        <div class="card-meta mono"><span>${esc(p.year)}</span><span>${esc(p.stack.slice(0, 2).join(" · "))}</span></div>
        <h3>${esc(p.title)}</h3>
        <p>${esc(p.tagline)}</p>
        <div class="card-tags">${catChips(p)}</div>
      </div>
      <span class="card-arrow">${ARROW}</span>
    </a>`;
  }
  function renderHomeProjects() {
    const grid = $("#projectGrid");
    if (!grid || !window.PROJECTS) return;
    grid.innerHTML = PROJECTS.map(projectCard).join("");

    // Archive
    const ag = $("#archiveGrid");
    ag.innerHTML = ARCHIVE.map((a) => `<a class="arc" href="${esc(a.url)}" target="_blank" rel="noopener">
      <img src="${esc(a.img)}" alt="${esc(a.title)}" loading="lazy"><div><b>${esc(a.title)}</b><span class="mono">${esc(a.year)} · ${esc(a.tags)}</span></div></a>`).join("");
    $("#archiveCount").textContent = `${ARCHIVE.length} smaller and earlier projects · ${ARCHIVE[ARCHIVE.length - 1].year} – ${ARCHIVE[0].year}`;
    const arch = $("#archive"), ab = $("#archiveBtn");
    ab.addEventListener("click", () => { const o = arch.classList.toggle("open"); ab.setAttribute("aria-expanded", String(o)); });
    reveal();
  }
  renderHomeProjects();

  /* ---------- Blog ---------- */
  const fmtDate = (d) => new Date(d + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  function postCard(p) {
    const media = p.thumbnail
      ? `<div class="post-media"><img src="${esc(p.thumbnail)}" alt="" loading="lazy"></div>`
      : `<div class="post-media fallback mono">medium</div>`;
    return `<a class="post rv" href="${esc(p.url)}" target="_blank" rel="noopener">
      ${media}
      <div class="post-body">
        <div class="post-meta mono"><span>${fmtDate(p.date)}</span><span>${p.readMinutes} min read</span></div>
        <h3>${esc(p.title)}</h3>
        <p>${esc(p.excerpt)}</p>
        <div class="post-tags">${(p.tags || []).slice(0, 3).map((t) => `<span class="chip">${esc(t)}</span>`).join("")}</div>
      </div>
    </a>`;
  }
  window.postCard = postCard;
  window.loadPosts = function () {
    return fetch("assets/data/blog.json", { cache: "no-cache" }).then((r) => { if (!r.ok) throw new Error(r.status); return r.json(); }).then((d) => d.posts);
  };
  const postsEl = $("#posts");
  if (postsEl && document.body.dataset.page === "home") {
    loadPosts().then((posts) => {
      postsEl.innerHTML = posts.slice(0, 6).map(postCard).join("");
      const all = $("#allPosts"); if (all) all.firstChild.textContent = `All ${posts.length} articles `;
      reveal(postsEl);
    }).catch(() => {
      postsEl.classList.remove("lead-first");
      postsEl.innerHTML = `<p class="empty" style="grid-column:1/-1">Articles are on <a href="${SITE.medium}" target="_blank" rel="noopener" style="color:var(--act)">Medium</a>.</p>`;
    });
  }
})();
