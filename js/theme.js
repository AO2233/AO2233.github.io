initMermaid();

document.addEventListener("DOMContentLoaded", () => {
  initAchievementSystem();
  initIcons();
  initImageZoom();
  initMath();
  initTableOfContents();
  initTitleDecrypt();
});

function initAchievementSystem() {
  const achievementKey = "pixel-achievements";
  const visitedKey = "pixel-visited-areas";
  const unlocked = readStoredList(achievementKey);
  const definitions = {
    "chapter-clear": {
      code: "CHAPTER CLEAR",
      detail: "文章已阅读至终点",
    },
    "area-mapper": {
      code: "AREA MAPPER",
      detail: "已探索 5 个不同领域",
    },
    "lost-traveler": {
      code: "LOST TRAVELER",
      detail: "发现了不存在的领域",
    },
    "command-accepted": {
      code: "COMMAND ACCEPTED",
      detail: "隐藏指令认证完成",
    },
  };

  const unlock = (id) => {
    if (unlocked.has(id) || !definitions[id]) {
      return;
    }

    unlocked.add(id);
    writeStoredList(achievementKey, unlocked);
    showAchievement(definitions[id]);
  };

  trackVisitedAreas(visitedKey, unlock);
  trackChapterClear(unlock);
  trackLostPage(unlock);
  trackSecretCommand(unlock);
}

function readStoredList(key) {
  try {
    const value = JSON.parse(localStorage.getItem(key) || "[]");
    return new Set(Array.isArray(value) ? value : []);
  } catch {
    return new Set();
  }
}

function writeStoredList(key, values) {
  try {
    localStorage.setItem(key, JSON.stringify([...values]));
  } catch {
    // Achievements remain available for the current page without storage.
  }
}

function trackVisitedAreas(storageKey, unlock) {
  const visited = readStoredList(storageKey);
  visited.add(window.location.pathname);
  writeStoredList(storageKey, visited);

  if (visited.size >= 5) {
    unlock("area-mapper");
  }
}

function trackChapterClear(unlock) {
  const article = document.querySelector("main article");
  if (!article) {
    return;
  }

  let hasScrolled = false;
  const checkProgress = () => {
    hasScrolled ||= window.scrollY > 48;
    if (hasScrolled && article.getBoundingClientRect().bottom <= window.innerHeight + 24) {
      unlock("chapter-clear");
      window.removeEventListener("scroll", checkProgress);
    }
  };

  window.addEventListener("scroll", checkProgress, { passive: true });
}

function trackLostPage(unlock) {
  if (document.querySelector(".error-page")) {
    unlock("lost-traveler");
  }
}

function trackSecretCommand(unlock) {
  const sequence = [
    "arrowup",
    "arrowup",
    "arrowdown",
    "arrowdown",
    "arrowleft",
    "arrowright",
    "arrowleft",
    "arrowright",
    "b",
    "a",
  ];
  let position = 0;

  window.addEventListener("keydown", (event) => {
    const key = event.key.toLowerCase();
    position = key === sequence[position] ? position + 1 : key === sequence[0] ? 1 : 0;

    if (position === sequence.length) {
      unlock("command-accepted");
      document.documentElement.classList.add("secret-signal");
      window.setTimeout(() => {
        document.documentElement.classList.remove("secret-signal");
      }, 8000);
      position = 0;
    }
  });
}

function showAchievement(achievement) {
  let stack = document.querySelector(".achievement-stack");
  if (!stack) {
    stack = document.createElement("div");
    stack.className = "achievement-stack";
    stack.setAttribute("aria-live", "polite");
    stack.setAttribute("aria-label", "Achievements");
    document.body.appendChild(stack);
  }

  const notice = document.createElement("div");
  const content = document.createElement("span");
  const title = document.createElement("strong");
  const detail = document.createElement("small");

  notice.className = "achievement-notice";
  notice.setAttribute("role", "status");
  content.className = "achievement-content";
  title.textContent = achievement.code;
  detail.textContent = achievement.detail;

  content.append(title, detail);
  notice.append(content);
  stack.appendChild(notice);

  window.setTimeout(() => {
    notice.classList.add("is-leaving");
    window.setTimeout(() => {
      notice.remove();
      if (!stack.childElementCount) {
        stack.remove();
      }
    }, 280);
  }, 2400);
}

function initIcons() {
  if (typeof feather !== "undefined") {
    feather.replace();
  }
}

function initImageZoom() {
  const images = document.querySelectorAll(".zoom-image");
  if (images.length && typeof mediumZoom !== "undefined") {
    mediumZoom(images, {
      background: "rgba(0, 0, 0, 0.7)",
      margin: 0,
    });
  }
}

function initMath() {
  if (typeof renderMathInElement === "undefined") {
    return;
  }

  renderMathInElement(document.body, {
    delimiters: [
      { left: "$$", right: "$$", display: true },
      { left: "\\[", right: "\\]", display: true },
      { left: "\\(", right: "\\)", display: false },
      { left: "$", right: "$", display: false },
    ],
  });
}

function initTableOfContents() {
  const decodeHash = (hash) => {
    try {
      return decodeURIComponent((hash || "").replace(/^#/, ""));
    } catch {
      return (hash || "").replace(/^#/, "");
    }
  };
  const targets = [...document.querySelectorAll("article > :is(h1, h2, h3)[id]")];
  if (!targets.length) {
    return;
  }

  document.querySelectorAll(".post-toc-list").forEach((list) => {
    const items = document.createDocumentFragment();

    targets.forEach((heading) => {
      const level = heading.tagName.slice(1);
      const item = document.createElement("li");
      const link = document.createElement("a");
      const title = heading.cloneNode(true);

      item.className = `post-toc-level-${level}`;
      link.href = `#${encodeURIComponent(heading.id)}`;
      title.querySelectorAll("[id]").forEach((node) => node.removeAttribute("id"));
      title.querySelectorAll("a").forEach((anchor) => {
        anchor.replaceWith(...anchor.childNodes);
      });
      link.append(...title.childNodes);
      item.appendChild(link);
      items.appendChild(item);
    });

    list.appendChild(items);
  });

  document.querySelectorAll(".post-toc").forEach((toc) => {
    toc.hidden = false;
  });
  initFloatingTableOfContents();

  const links = [...document.querySelectorAll(".post-toc a")];
  const decodeTarget = (link) => decodeHash(link.getAttribute("href"));
  let activeId = "";
  let ticking = false;

  const setActive = (id) => {
    if (activeId === id) {
      return;
    }
    activeId = id;

    links.forEach((link) => {
      const active = decodeTarget(link) === id;
      link.classList.toggle("is-active", active);
      if (active) {
        link.setAttribute("aria-current", "location");
      } else {
        link.removeAttribute("aria-current");
      }
    });

    document.querySelectorAll(".post-toc nav").forEach((nav) => {
      const current = [...nav.querySelectorAll("a")].find((link) => decodeTarget(link) === id);
      if (!current) {
        return;
      }

      const navBox = nav.getBoundingClientRect();
      const itemBox = current.getBoundingClientRect();
      const itemTop = itemBox.top - navBox.top + nav.scrollTop;
      const itemBottom = itemTop + itemBox.height;
      if (itemTop < nav.scrollTop) {
        nav.scrollTop = itemTop;
      } else if (itemBottom > nav.scrollTop + nav.clientHeight) {
        nav.scrollTop = itemBottom - nav.clientHeight;
      }
    });
  };

  const updateActive = () => {
    let active = null;

    if (window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 4) {
      active = targets.at(-1);
    } else {
      const marker = window.scrollY + 140;
      for (const target of targets) {
        if (target.getBoundingClientRect().top + window.scrollY <= marker) {
          active = target;
        } else {
          break;
        }
      }
    }

    setActive(active?.id || "");

    ticking = false;
  };

  links.forEach((link) => {
    link.addEventListener("click", (event) => {
      const id = decodeTarget(link);
      const target = document.getElementById(id);
      if (!target) {
        return;
      }

      event.preventDefault();
      link.closest(".post-toc--mobile")?.removeAttribute("open");
      setActive(id);

      window.requestAnimationFrame(() => {
        target.scrollIntoView({
          behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
          block: "start",
        });
        window.history.pushState(null, "", `#${encodeURIComponent(id)}`);
      });
    });
  });

  updateActive();
  const initialId = decodeHash(window.location.hash);
  const initialTarget = initialId ? document.getElementById(initialId) : null;
  if (initialTarget) {
    window.requestAnimationFrame(() => {
      initialTarget.scrollIntoView({ block: "start" });
      setActive(initialId);
    });
  }

  window.addEventListener("scroll", () => {
    if (!ticking) {
      window.requestAnimationFrame(updateActive);
      ticking = true;
    }
  }, { passive: true });
}

function initFloatingTableOfContents() {
  const floatingToc = document.querySelector(".post-toc--desktop");
  const inlineToc = document.querySelector(".post-toc--mobile");
  const handle = floatingToc?.querySelector(".post-toc-header");
  if (!floatingToc || !inlineToc || !handle) {
    return;
  }

  const storageKey = "pixel-toc-window";
  const viewportGap = 8;
  const minimumWidth = 144;
  const minimumHeight = 96;
  const forceInline = Boolean(document.querySelector("article > .media-figure--full"));
  let dragState = null;
  let resizeTimer = 0;
  let viewportResizeFrame = 0;
  let viewportResizeTimer = 0;
  let observeResize = false;
  let screenAnchor = null;

  const clamp = (value, minimum, maximum) => {
    return Math.min(Math.max(value, minimum), Math.max(minimum, maximum));
  };

  const readState = () => {
    try {
      const value = JSON.parse(localStorage.getItem(storageKey) || "null");
      if (!value || !["left", "top", "width", "height"].every((key) => Number.isFinite(value[key]))) {
        return null;
      }
      return value;
    } catch {
      return null;
    }
  };

  const screenPosition = () => {
    const x = Number.isFinite(window.screenX) ? window.screenX : window.screenLeft;
    const y = Number.isFinite(window.screenY) ? window.screenY : window.screenTop;
    return {
      x: Number.isFinite(x) ? x : 0,
      y: Number.isFinite(y) ? y : 0,
    };
  };

  const currentState = () => {
    const rect = floatingToc.getBoundingClientRect();
    return {
      left: rect.left,
      top: rect.top,
      width: rect.width,
      height: rect.height,
    };
  };

  const writeState = () => {
    if (floatingToc.hidden) {
      return;
    }
    try {
      localStorage.setItem(storageKey, JSON.stringify(currentState()));
    } catch {
      // The TOC remains movable for the current page when storage is unavailable.
    }
  };

  const restoreState = (state) => {
    floatingToc.style.right = "auto";
    floatingToc.style.left = `${state.left}px`;
    floatingToc.style.top = `${state.top}px`;
    floatingToc.style.width = `${Math.max(state.width, minimumWidth)}px`;
    floatingToc.style.height = `${Math.max(state.height, minimumHeight)}px`;
    floatingToc.classList.add("is-user-sized");
  };

  const pinCurrentPosition = () => {
    const rect = floatingToc.getBoundingClientRect();
    floatingToc.style.right = "auto";
    floatingToc.style.left = `${rect.left}px`;
    floatingToc.style.top = `${rect.top}px`;
  };

  const updateScreenAnchor = () => {
    const rect = floatingToc.getBoundingClientRect();
    const screen = screenPosition();
    screenAnchor = {
      x: screen.x + rect.left,
      y: screen.y + rect.top,
    };
  };

  const previewScreenAnchor = () => {
    if (!screenAnchor) {
      return;
    }
    const screen = screenPosition();
    const baseLeft = Number.parseFloat(floatingToc.style.left);
    const baseTop = Number.parseFloat(floatingToc.style.top);
    if (!Number.isFinite(baseLeft) || !Number.isFinite(baseTop)) {
      return;
    }
    const offsetX = screenAnchor.x - screen.x - baseLeft;
    const offsetY = screenAnchor.y - screen.y - baseTop;
    floatingToc.style.transform = `translate3d(${offsetX}px, ${offsetY}px, 0)`;
  };

  const commitScreenAnchor = () => {
    if (!screenAnchor) {
      return;
    }
    const screen = screenPosition();
    floatingToc.style.left = `${screenAnchor.x - screen.x}px`;
    floatingToc.style.top = `${screenAnchor.y - screen.y}px`;
    floatingToc.style.transform = "";
    floatingToc.classList.remove("is-window-resizing");
    updateVisibility();
    writeState();
  };

  const updateVisibility = () => {
    const rect = floatingToc.getBoundingClientRect();
    const isClipped = (
      rect.left < 0
      || rect.top < 0
      || rect.right > window.innerWidth
      || rect.bottom > window.innerHeight
    );
    const useInlineToc = forceInline || isClipped;

    floatingToc.classList.toggle("is-viewport-hidden", useInlineToc);
    floatingToc.setAttribute("aria-hidden", String(useInlineToc));
    inlineToc.classList.toggle("is-viewport-fallback", useInlineToc);
    inlineToc.setAttribute("aria-hidden", String(!useInlineToc));
  };

  const storedState = readState();
  if (storedState) {
    restoreState(storedState);
  } else {
    pinCurrentPosition();
  }
  updateScreenAnchor();
  updateVisibility();

  handle.addEventListener("pointerdown", (event) => {
    if (event.button !== 0 || floatingToc.classList.contains("is-viewport-hidden")) {
      return;
    }

    window.clearTimeout(viewportResizeTimer);
    if (viewportResizeFrame) {
      window.cancelAnimationFrame(viewportResizeFrame);
      viewportResizeFrame = 0;
    }
    commitScreenAnchor();
    const rect = floatingToc.getBoundingClientRect();
    dragState = {
      pointerId: event.pointerId,
      offsetX: event.clientX - rect.left,
      offsetY: event.clientY - rect.top,
      startLeft: rect.left,
      startTop: rect.top,
      left: rect.left,
      top: rect.top,
      width: rect.width,
      height: rect.height,
      frame: 0,
    };

    floatingToc.style.right = "auto";
    floatingToc.style.left = `${rect.left}px`;
    floatingToc.style.top = `${rect.top}px`;
    floatingToc.style.width = `${rect.width}px`;
    floatingToc.classList.add("is-dragging");
    handle.setPointerCapture(event.pointerId);
    event.preventDefault();
  });

  handle.addEventListener("pointermove", (event) => {
    if (!dragState || event.pointerId !== dragState.pointerId) {
      return;
    }

    dragState.left = clamp(
      event.clientX - dragState.offsetX,
      viewportGap,
      window.innerWidth - dragState.width - viewportGap,
    );
    dragState.top = clamp(
      event.clientY - dragState.offsetY,
      viewportGap,
      window.innerHeight - dragState.height - viewportGap,
    );
    if (!dragState.frame) {
      dragState.frame = window.requestAnimationFrame(() => {
        if (!dragState) {
          return;
        }
        const offsetX = dragState.left - dragState.startLeft;
        const offsetY = dragState.top - dragState.startTop;
        floatingToc.style.transform = `translate3d(${offsetX}px, ${offsetY}px, 0)`;
        dragState.frame = 0;
      });
    }
  });

  const finishDrag = (event) => {
    if (!dragState || event.pointerId !== dragState.pointerId) {
      return;
    }
    const finalDragState = dragState;
    dragState = null;
    if (finalDragState.frame) {
      window.cancelAnimationFrame(finalDragState.frame);
    }
    floatingToc.style.left = `${finalDragState.left}px`;
    floatingToc.style.top = `${finalDragState.top}px`;
    floatingToc.style.transform = "";
    floatingToc.classList.remove("is-dragging");
    if (handle.hasPointerCapture(event.pointerId)) {
      handle.releasePointerCapture(event.pointerId);
    }
    writeState();
    updateScreenAnchor();
    updateVisibility();
  };

  handle.addEventListener("pointerup", finishDrag);
  handle.addEventListener("pointercancel", finishDrag);

  if ("ResizeObserver" in window) {
    const resizeObserver = new ResizeObserver(() => {
      if (!observeResize) {
        return;
      }
      if (floatingToc.style.height) {
        floatingToc.classList.add("is-user-sized");
      }
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(() => {
        writeState();
        updateVisibility();
      }, 120);
    });
    resizeObserver.observe(floatingToc);
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        observeResize = true;
      });
    });
  }

  window.addEventListener("resize", () => {
    floatingToc.classList.add("is-window-resizing");
    if (!viewportResizeFrame) {
      viewportResizeFrame = window.requestAnimationFrame(() => {
        viewportResizeFrame = 0;
        previewScreenAnchor();
        updateVisibility();
      });
    }
    window.clearTimeout(viewportResizeTimer);
    viewportResizeTimer = window.setTimeout(commitScreenAnchor, 140);
  });
}

function initMermaid() {
  if (typeof mermaid === "undefined") {
    return;
  }

  const colorScheme = window.matchMedia("(prefers-color-scheme: dark)");
  mermaid.initialize({
    startOnLoad: true,
    securityLevel: "loose",
    theme: colorScheme.matches ? "dark" : "base",
    flowchart: {
      useMaxWidth: true,
      htmlLabels: true,
      curve: "cardinal",
    },
  });

  const reloadForTheme = () => window.location.reload();
  if (colorScheme.addEventListener) {
    colorScheme.addEventListener("change", reloadForTheme);
  } else {
    colorScheme.addListener(reloadForTheme);
  }
}

function initTitleDecrypt() {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    return;
  }

  const targets = document.querySelectorAll("h1.title, p.site-description");
  const glyphs = "アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワン0123456789!?#$@&%";

  targets.forEach((element) => {
    const originalText = element.textContent.trim();
    if (!originalText) {
      return;
    }

    const maxSteps = originalText.length + 8;
    let step = 0;

    const timer = window.setInterval(() => {
      step += 1;
      const revealedLength = Math.floor((step / maxSteps) * originalText.length);
      let result = "";

      for (let index = 0; index < originalText.length; index += 1) {
        result += index < revealedLength
          ? originalText.charAt(index)
          : glyphs.charAt(Math.floor(Math.random() * glyphs.length));
      }

      if (revealedLength < originalText.length) {
        result += '<span class="decrypt-cursor">█</span>';
      }

      element.innerHTML = result;

      if (step >= maxSteps) {
        window.clearInterval(timer);
        element.textContent = originalText;
      }
    }, 48);
  });
}
