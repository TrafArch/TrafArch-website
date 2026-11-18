(function () {
  "use strict";

  var root = document.documentElement;
  var themeButton = document.getElementById("theme-toggle");
  var themeIcon = document.getElementById("theme-icon");
  var themeColor = document.getElementById("meta-theme");
  var systemTheme = window.matchMedia("(prefers-color-scheme: dark)");
  var themeKey = "trafarch-theme";
  var reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  var t = window.TrafArchI18n.t;

  function savedTheme() {
    try { return localStorage.getItem(themeKey) || localStorage.getItem("trafarch-apron-theme"); }
    catch (error) { return null; }
  }

  function setTheme(theme, persist) {
    var dark = theme === "dark";
    root.dataset.theme = theme;
    themeButton.setAttribute("aria-label", t(dark ? "切换到浅色模式" : "切换到深色模式"));
    themeIcon.textContent = dark ? "light_mode" : "dark_mode";
    themeColor.content = dark ? "#131A24" : "#F3F7FB";
    document.querySelectorAll(".brand-icon").forEach(function (image) {
      image.src = dark ? "assets/app-icon-dark.png" : "assets/app-icon.png";
    });
    if (persist) {
      try { localStorage.setItem(themeKey, theme); } catch (error) { /* Theme remains usable without storage. */ }
    }
  }

  setTheme(root.dataset.theme || "light", false);
  themeButton.addEventListener("click", function () {
    setTheme(root.dataset.theme === "dark" ? "light" : "dark", true);
  });
  systemTheme.addEventListener("change", function (event) {
    if (!savedTheme()) setTheme(event.matches ? "dark" : "light", false);
  });
  window.addEventListener("trafarch:languagechange", function () { setTheme(root.dataset.theme, false); });

  var menuButton = document.getElementById("menu-toggle");
  var menu = document.getElementById("mobile-nav");
  if (menuButton && menu) {
    function setMenu(open) {
      menu.hidden = !open;
      menuButton.setAttribute("aria-expanded", String(open));
      menuButton.setAttribute("aria-label", t(open ? "关闭菜单" : "打开菜单"));
      document.getElementById("menu-icon").textContent = open ? "close" : "menu";
    }
    menuButton.addEventListener("click", function () { setMenu(menu.hidden); });
    menu.querySelectorAll("a").forEach(function (link) {
      link.addEventListener("click", function () { setMenu(false); });
    });
    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && !menu.hidden) { setMenu(false); menuButton.focus(); }
    });
    document.addEventListener("click", function (event) {
      if (!menu.hidden && !menu.contains(event.target) && !menuButton.contains(event.target)) setMenu(false);
    });
    window.addEventListener("resize", function () { if (innerWidth > 760) setMenu(false); });
    window.addEventListener("trafarch:languagechange", function () { setMenu(!menu.hidden); });
  }

  var viewer = document.querySelector(".viewer");
  if (viewer) {
    var shots = Array.from(viewer.querySelectorAll(".shot"));
    var hotspots = Array.from(viewer.querySelectorAll(".hotspot"));
    var currentView = 0;

    function selectView(index) {
      var direction = index >= currentView ? 1 : -1;
      shots.forEach(function (shot, i) {
        var active = i === index;
        shot.hidden = !active;
        shot.classList.toggle("is-active", active);
        if (active) shot.style.setProperty("--enter-x", direction * 18 + "px");
      });
      hotspots.forEach(function (hotspot, i) {
        var active = i === index;
        hotspot.classList.toggle("is-current", active);
        if (active) hotspot.setAttribute("aria-current", "page");
        else hotspot.removeAttribute("aria-current");
      });
      currentView = index;
    }

    hotspots.forEach(function (hotspot, index) {
      hotspot.addEventListener("click", function () {
        if (index !== currentView) selectView(index);
      });
    });
  }

  var category = "all";
  var search = document.getElementById("support-search");
  var supportRows = Array.from(document.querySelectorAll(".support-row"));
  var filters = Array.from(document.querySelectorAll("[data-filter]"));
  if (search && supportRows.length) {
    function filterCards() {
      var query = search.value.trim().toLocaleLowerCase();
      var count = 0;
      supportRows.forEach(function (row) {
        var matches = (category === "all" || row.dataset.category === category) &&
          (row.dataset.keywords + " " + row.textContent).toLocaleLowerCase().includes(query);
        row.hidden = !matches;
        if (matches) count += 1;
      });
      document.getElementById("support-empty").hidden = count > 0;
      document.getElementById("support-result").textContent = t(category === "all" && !query
        ? "共 6 类卡种与乘车码。卡片仅保留有限条最近记录，及时保存可以留存已读到的信息。"
        : "共 {count} 类匹配。卡片仅保留有限条最近记录，及时保存可以留存已读到的信息。", { count: count });
    }
    search.addEventListener("input", filterCards);
    filters.forEach(function (button) {
      button.addEventListener("click", function () {
        category = button.dataset.filter;
        filters.forEach(function (filter) {
          var active = filter === button;
          filter.classList.toggle("is-active", active);
          filter.setAttribute("aria-pressed", String(active));
        });
        filterCards();
      });
    });
    window.addEventListener("trafarch:languagechange", filterCards);
    filterCards();
  }

  var sections = Array.from(document.querySelectorAll("main section[id]"));
  var navLinks = Array.from(document.querySelectorAll(".desktop-nav a[href^='#']"));
  if (sections.length && navLinks.length && "IntersectionObserver" in window) {
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        navLinks.forEach(function (link) {
          if (link.hash === "#" + entry.target.id) link.setAttribute("aria-current", "location");
          else link.removeAttribute("aria-current");
        });
      });
    }, { rootMargin: "-18% 0px -62% 0px" });
    sections.forEach(function (section) { observer.observe(section); });
  }

  var hero = document.querySelector(".hero");
  var railLayouts = Array.from(document.querySelectorAll(".rail-layout"));
  var revealObserver = null;
  var revealItems = [];

  function revealItem(element) {
    element.classList.add("is-revealed");
    if (revealObserver) revealObserver.unobserve(element);
  }

  if ("IntersectionObserver" in window) {
    var railObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-rail-drawn");
        railObserver.unobserve(entry.target);
      });
    }, { threshold: .12 });
    railLayouts.forEach(function (layout) { railObserver.observe(layout); });

    if (hero) {
      var heroObserver = new IntersectionObserver(function (entries) {
        hero.classList.toggle("is-offscreen", !entries[0].isIntersecting);
      });
      heroObserver.observe(hero);
    }

    if (!reducedMotion.matches) {
      revealItems = Array.from(document.querySelectorAll(
        ".value-strip, .section-heading, .spotlight, .more-features article, .guide-intro, .guide-steps li, " +
        ".support-tools, .support-board, .privacy-copy, .privacy-points > div, .faq-intro, .faq-list details, " +
        ".boarding-pass, .friends, .page-footer"
      ));
      revealObserver = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) { if (entry.isIntersecting) revealItem(entry.target); });
      }, { threshold: .08, rootMargin: "0px 0px -24px 0px" });
      revealItems.forEach(function (element) {
        element.setAttribute("data-reveal", "");
        var siblings = Array.from(element.parentElement.children).filter(function (sibling) {
          return sibling.tagName === element.tagName;
        });
        element.style.setProperty("--reveal-delay", Math.min(siblings.indexOf(element), 3) * 90 + "ms");
        revealObserver.observe(element);
      });
      root.classList.add("motion-ready");
    }
  }

  document.addEventListener("focusin", function (event) {
    var parent = event.target.closest("[data-reveal]");
    if (parent) revealItem(parent);
  });
  window.addEventListener("beforeprint", function () {
    revealItems.forEach(function (element) { revealItem(element); });
  });

  function updateVisibility() {
    root.classList.toggle("page-idle", document.hidden);
  }
  document.addEventListener("visibilitychange", updateVisibility);
  updateVisibility();

  reducedMotion.addEventListener("change", function (event) {
    if (!event.matches) return;
    if (revealObserver) revealObserver.disconnect();
    revealItems.forEach(function (element) { element.classList.add("is-revealed"); });
    root.classList.remove("motion-ready");
  });

  var policyContents = document.querySelector(".policy-toc");
  if (policyContents) {
    var wideLayout = window.matchMedia("(min-width: 1001px)");
    function setContentsLayout() { policyContents.open = wideLayout.matches; }
    setContentsLayout();
    wideLayout.addEventListener("change", setContentsLayout);
    policyContents.querySelectorAll("a").forEach(function (link) {
      link.addEventListener("click", function () { if (!wideLayout.matches) policyContents.open = false; });
    });
    var contentsLinks = Array.from(policyContents.querySelectorAll("a[href^='#']"));
    var contentsTicking = false;
    function updateContents() {
      var current = contentsLinks[0];
      contentsLinks.forEach(function (link) {
        var heading = document.querySelector(link.hash);
        if (heading && heading.getBoundingClientRect().top <= 155) current = link;
      });
      contentsLinks.forEach(function (link) {
        if (link === current) link.setAttribute("aria-current", "location");
        else link.removeAttribute("aria-current");
      });
      contentsTicking = false;
    }
    window.addEventListener("scroll", function () {
      if (contentsTicking) return;
      contentsTicking = true;
      requestAnimationFrame(updateContents);
    }, { passive: true });
    window.addEventListener("resize", updateContents);
    updateContents();
  }

  var year = document.getElementById("year");
  if (year) year.textContent = new Date().getFullYear();

  if (reducedMotion.matches) root.classList.add("reduce-motion");
})();
