// Set up the PDF.js worker. This is crucial for performance.
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.10.377/pdf.worker.min.js';

// --- DOM Elements ---
const pdfUrl = document.body.dataset.pdfUrl;
const pageLang = document.body.dataset.lang;
const loader = document.getElementById('loader');
const viewerContainer = document.getElementById('pdf-viewer-container');
const canvas = document.getElementById('pdf-canvas');
const ctx = canvas.getContext('2d');

const prevPageBtn = document.getElementById('prev-page');
const nextPageBtn = document.getElementById('next-page');
const pageNumSpan = document.getElementById('page-num');
const pageCountSpan = document.getElementById('page-count');
const zoomOutBtn = document.getElementById('zoom-out');
const zoomInBtn = document.getElementById('zoom-in');
const zoomLevelSpan = document.getElementById('zoom-level');

// --- State Management ---
let pdfDoc = null;
let pageNum = 1;
let pageRendering = false;
let pageNumPending = null;
let scale = 1.0; // Initial scale set to 100%

// --- Text translations based on HTML lang attribute ---
const translations = {
    en: { page: "Page", of: "of" },
    fr: { page: "Page", of: "sur" }
};
document.getElementById('page-num-text').textContent = translations[pageLang].page;
document.getElementById('page-count-text').textContent = translations[pageLang].of;

/**
 * Renders a specific page of the PDF with high quality.
 * @param {number} num The page number to render.
 */
const renderPage = num => {
    pageRendering = true;

    pdfDoc.getPage(num).then(page => {
        // --- High-Quality Rendering Logic ---
        // 1. Get the device's pixel ratio for scaling
        const devicePixelRatio = window.devicePixelRatio || 1;
        
        // 2. Get the viewport at the desired scale
        const viewport = page.getViewport({ scale: scale });

        // 3. Set the canvas's actual drawing surface size to be higher resolution
        canvas.width = Math.floor(viewport.width * devicePixelRatio);
        canvas.height = Math.floor(viewport.height * devicePixelRatio);

        // 4. Set the canvas's display size using CSS
        canvas.style.width = Math.floor(viewport.width) + 'px';
        canvas.style.height = Math.floor(viewport.height) + 'px';
        
        // 5. Create the rendering context, scaling it up for the high-res surface
        const renderContext = {
            canvasContext: ctx,
            viewport: viewport,
            transform: devicePixelRatio !== 1 
                ? [devicePixelRatio, 0, 0, devicePixelRatio, 0, 0] 
                : null
        };
        // --- End of High-Quality Logic ---

        const renderTask = page.render(renderContext);

        renderTask.promise.then(() => {
            pageRendering = false;
            if (pageNumPending !== null) {
                renderPage(pageNumPending);
                pageNumPending = null;
            }
        });
    });

    pageNumSpan.textContent = num;
};


/**
 * If another page is rendering, wait until it's done. Otherwise, render immediately.
 * @param {number} num The page number.
 */
const queueRenderPage = num => {
    if (pageRendering) {
        pageNumPending = num;
    } else {
        renderPage(num);
    }
};

// --- Event Handlers ---
const onPrevPage = () => {
    if (pageNum <= 1) return;
    pageNum--;
    queueRenderPage(pageNum);
};

const onNextPage = () => {
    if (pageNum >= pdfDoc.numPages) return;
    pageNum++;
    queueRenderPage(pageNum);
};

const onZoomIn = () => {
    if (scale >= 3.0) return;
    scale += 0.1; // 10% zoom interval
    zoomLevelSpan.textContent = `${Math.round(scale * 100)}%`;
    queueRenderPage(pageNum);
};

const onZoomOut = () => {
    if (scale <= 0.4) return;
    scale -= 0.1; // 10% zoom interval
    zoomLevelSpan.textContent = `${Math.round(scale * 100)}%`;
    queueRenderPage(pageNum);
};

// --- Event Listeners ---
prevPageBtn.addEventListener('click', onPrevPage);
nextPageBtn.addEventListener('click', onNextPage);
zoomInBtn.addEventListener('click', onZoomIn);
zoomOutBtn.addEventListener('click', onZoomOut);

// --- Initial Load ---
pdfjsLib.getDocument(pdfUrl).promise.then(pdfDoc_ => {
    pdfDoc = pdfDoc_;
    pageCountSpan.textContent = pdfDoc.numPages;
    zoomLevelSpan.textContent = `${Math.round(scale * 100)}%`;

    // Initial page render
    renderPage(pageNum);

    // Hide loader and show viewer with a fade-in animation
    loader.classList.remove('active');
    viewerContainer.classList.add('loaded');

}).catch(err => {
    // Display error
    console.error(err);
    const loaderDiv = document.getElementById('loader');
    if (loaderDiv) {
        loaderDiv.textContent = 'Error: PDF file not found. Please check file name and location.';
    }
});
