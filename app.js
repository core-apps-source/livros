const pages = [
  { src: "./assets/p6.jpg", label: "Página 113 de 175", percent: "61%" },
  { src: "./assets/p5.jpg", label: "Página 113 de 175", percent: "62%" },
  { src: "./assets/p4.jpg", label: "Página 114 de 175", percent: "62%" },
  { src: "./assets/p3.jpg", label: "Página 114 de 175", percent: "62%" },
  { src: "./assets/p2.jpg", label: "Página 115 de 175", percent: "63%" },
  { src: "./assets/p1.jpg", label: "Página 115 de 175", percent: "63%" },
];

const storageKey = "kindle-demo-state";

const shell = document.querySelector(".reader-shell");
const pageFrame = document.getElementById("pageFrame");
const pageImage = document.getElementById("pageImage");
const pageLabel = document.getElementById("pageLabel");
const percentLabel = document.getElementById("percentLabel");
const pageSlider = document.getElementById("pageSlider");
const prevButton = document.getElementById("prevButton");
const nextButton = document.getElementById("nextButton");
const prevZone = document.getElementById("prevZone");
const nextZone = document.getElementById("nextZone");
const themeSelect = document.getElementById("themeSelect");
const fitSelect = document.getElementById("fitSelect");
const decreaseZoom = document.getElementById("decreaseZoom");
const increaseZoom = document.getElementById("increaseZoom");
const fullscreenButton = document.getElementById("fullscreenButton");

const defaultState = {
  index: 0,
  theme: "light",
  fit: "height",
  zoom: 1,
};

let state = loadState();

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey));
    return {
      ...defaultState,
      ...saved,
      index: clamp(saved?.index ?? 0, 0, pages.length - 1),
      zoom: clamp(saved?.zoom ?? 1, 0.85, 1.2),
    };
  } catch {
    return { ...defaultState };
  }
}

function saveState() {
  localStorage.setItem(storageKey, JSON.stringify(state));
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function render(animate = true) {
  const page = pages[state.index];
  pageSlider.max = String(pages.length - 1);
  pageImage.src = page.src;
  pageImage.alt = `Página ${state.index + 1} do livro de teste`;
  pageLabel.textContent = `${page.label}  |  teste ${state.index + 1} de ${pages.length}`;
  percentLabel.textContent = page.percent;
  pageSlider.value = String(state.index);
  prevButton.disabled = state.index === 0;
  nextButton.disabled = state.index === pages.length - 1;
  themeSelect.value = state.theme;
  fitSelect.value = state.fit;
  shell.dataset.theme = state.theme;
  shell.dataset.fit = state.fit;
  shell.style.setProperty("--page-scale", state.zoom.toFixed(2));

  if (animate) {
    pageFrame.classList.remove("is-turning");
    void pageFrame.offsetWidth;
    pageFrame.classList.add("is-turning");
  }

  saveState();
}

function goTo(index) {
  const nextIndex = clamp(index, 0, pages.length - 1);
  if (nextIndex === state.index) return;
  state.index = nextIndex;
  render();
}

function nextPage() {
  goTo(state.index + 1);
}

function prevPage() {
  goTo(state.index - 1);
}

prevButton.addEventListener("click", prevPage);
nextButton.addEventListener("click", nextPage);
prevZone.addEventListener("click", prevPage);
nextZone.addEventListener("click", nextPage);

pageSlider.addEventListener("input", (event) => {
  goTo(Number(event.target.value));
});

themeSelect.addEventListener("change", (event) => {
  state.theme = event.target.value;
  render(false);
});

fitSelect.addEventListener("change", (event) => {
  state.fit = event.target.value;
  render(false);
});

decreaseZoom.addEventListener("click", () => {
  state.zoom = clamp(state.zoom - 0.05, 0.85, 1.2);
  render(false);
});

increaseZoom.addEventListener("click", () => {
  state.zoom = clamp(state.zoom + 0.05, 0.85, 1.2);
  render(false);
});

fullscreenButton.addEventListener("click", async () => {
  if (!document.fullscreenElement) {
    await document.documentElement.requestFullscreen();
  } else {
    await document.exitFullscreen();
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "ArrowRight" || event.key === " ") {
    event.preventDefault();
    nextPage();
  }

  if (event.key === "ArrowLeft") {
    event.preventDefault();
    prevPage();
  }

  if (event.key === "Home") {
    event.preventDefault();
    goTo(0);
  }

  if (event.key === "End") {
    event.preventDefault();
    goTo(pages.length - 1);
  }
});

let touchStartX = 0;
let touchStartY = 0;

pageFrame.addEventListener(
  "touchstart",
  (event) => {
    const touch = event.changedTouches[0];
    touchStartX = touch.clientX;
    touchStartY = touch.clientY;
  },
  { passive: true },
);

pageFrame.addEventListener(
  "touchend",
  (event) => {
    const touch = event.changedTouches[0];
    const deltaX = touch.clientX - touchStartX;
    const deltaY = touch.clientY - touchStartY;

    if (Math.abs(deltaX) < 45 || Math.abs(deltaX) < Math.abs(deltaY)) return;
    if (deltaX < 0) nextPage();
    if (deltaX > 0) prevPage();
  },
  { passive: true },
);

render(false);
