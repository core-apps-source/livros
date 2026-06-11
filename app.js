const pdfUrl = "./dotcom-secrets.pdf";
const pdfJsUrl = "https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.mjs";
const pdfWorkerUrl = "https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.worker.mjs";
const storageKey = "kindle-dotcom-secrets-pdf-state";

const shell = document.querySelector(".reader-shell");
const pageFrame = document.getElementById("pageFrame");
const pageCanvas = document.getElementById("pageCanvas");
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
let pdfDocument = null;
let renderTask = null;
let renderSerial = 0;

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey));
    return {
      ...defaultState,
      ...saved,
      index: Math.max(0, saved?.index ?? 0),
      zoom: clamp(saved?.zoom ?? 1, 0.85, 1.35),
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

function updateChrome(animate = true) {
  const totalPages = pdfDocument?.numPages ?? 1;
  const currentPage = clamp(state.index + 1, 1, totalPages);
  const percent = Math.max(1, Math.round((currentPage / totalPages) * 100));

  pageSlider.max = String(totalPages - 1);
  pageSlider.value = String(state.index);
  pageLabel.textContent = `Pagina ${currentPage} de ${totalPages}`;
  percentLabel.textContent = `${percent}%`;
  prevButton.disabled = state.index === 0 || !pdfDocument;
  nextButton.disabled = state.index >= totalPages - 1 || !pdfDocument;
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

async function renderPage(animate = true) {
  if (!pdfDocument) return;

  const serial = ++renderSerial;
  const pageNumber = clamp(state.index + 1, 1, pdfDocument.numPages);
  state.index = pageNumber - 1;
  updateChrome(animate);

  if (renderTask) {
    renderTask.cancel();
    renderTask = null;
  }

  const page = await pdfDocument.getPage(pageNumber);
  if (serial !== renderSerial) return;

  const container = document.querySelector(".reading-area").getBoundingClientRect();
  const rawViewport = page.getViewport({ scale: 1 });
  const availableWidth = Math.max(280, container.width - 28);
  const availableHeight = Math.max(360, container.height - 28);
  const fitScale =
    state.fit === "width"
      ? availableWidth / rawViewport.width
      : availableHeight / rawViewport.height;
  const outputScale = Math.min(2.4, Math.max(1, window.devicePixelRatio || 1));
  const viewport = page.getViewport({ scale: fitScale * state.zoom });

  pageCanvas.width = Math.floor(viewport.width * outputScale);
  pageCanvas.height = Math.floor(viewport.height * outputScale);
  pageCanvas.style.width = `${Math.floor(viewport.width)}px`;
  pageCanvas.style.height = `${Math.floor(viewport.height)}px`;
  pageCanvas.setAttribute("aria-label", `Pagina ${pageNumber} do livro`);

  const context = pageCanvas.getContext("2d", { alpha: false });
  context.setTransform(outputScale, 0, 0, outputScale, 0, 0);
  context.fillStyle = "#fff";
  context.fillRect(0, 0, viewport.width, viewport.height);

  renderTask = page.render({ canvasContext: context, viewport });

  try {
    await renderTask.promise;
  } catch (error) {
    if (error?.name !== "RenderingCancelledException") {
      throw error;
    }
  }
}

function goTo(index) {
  if (!pdfDocument) return;
  const nextIndex = clamp(index, 0, pdfDocument.numPages - 1);
  if (nextIndex === state.index) return;
  state.index = nextIndex;
  renderPage();
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
  updateChrome(false);
});

fitSelect.addEventListener("change", (event) => {
  state.fit = event.target.value;
  renderPage(false);
});

decreaseZoom.addEventListener("click", () => {
  state.zoom = clamp(state.zoom - 0.05, 0.85, 1.35);
  renderPage(false);
});

increaseZoom.addEventListener("click", () => {
  state.zoom = clamp(state.zoom + 0.05, 0.85, 1.35);
  renderPage(false);
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

  if (event.key === "End" && pdfDocument) {
    event.preventDefault();
    goTo(pdfDocument.numPages - 1);
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

let resizeTimer = null;
window.addEventListener("resize", () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => renderPage(false), 150);
});

async function startReader() {
  updateChrome(false);
  pageLabel.textContent = "Carregando PDF...";
  percentLabel.textContent = "";

  try {
    const pdfjsLib = await import(pdfJsUrl);
    pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;
    pdfDocument = await pdfjsLib.getDocument(pdfUrl).promise;
    state.index = clamp(state.index, 0, pdfDocument.numPages - 1);
    await renderPage(false);
  } catch (error) {
    pageLabel.textContent = "Nao foi possivel carregar o PDF";
    percentLabel.textContent = "";
    console.error(error);
  }
}

startReader();
