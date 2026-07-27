initMermaid();

document.addEventListener("DOMContentLoaded", () => {
  initAchievementSystem();
  initIcons();
  initImageZoom();
  initMath();
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
