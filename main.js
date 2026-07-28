const uploadArea = document.getElementById('uploadArea');
const fileInput = document.getElementById('fileInput');
const editor = document.getElementById('editor');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

const shapeSlider = document.getElementById('shapeSlider');
const zoomSlider = document.getElementById('zoomSlider');
const shapeValue = document.getElementById('shapeValue');
const zoomValue = document.getElementById('zoomValue');
const brightnessSlider = document.getElementById('brightnessSlider');
const brightnessValue = document.getElementById('brightnessValue');
const contrastSlider = document.getElementById('contrastSlider');
const contrastValue = document.getElementById('contrastValue');
const saturationSlider = document.getElementById('saturationSlider');
const saturationValue = document.getElementById('saturationValue');
const rotateBtn = document.getElementById('rotateBtn');
const bwBtn = document.getElementById('bwBtn');
const mirrorBtn = document.getElementById('mirrorBtn');
const invertBtn = document.getElementById('invertBtn');
const blurSlider = document.getElementById('blurSlider');
const blurValue = document.getElementById('blurValue');
const sharpenSlider = document.getElementById('sharpenSlider');
const sharpenValue = document.getElementById('sharpenValue');

let isBW = false;
let isMirrored = false;
let isInverted = false;
let img = null;
let offsetX = 0;
let offsetY = 0;
let zoom = 1;
let isDragging = false;
let startX, startY;
let outputSize = 512;
let brightness = 100;
let contrast = 100;
let saturation = 100;
let rotation = 0;
let blur = 0;
let sharpen = 0;
let activeFilter = 'normal';

const filterPresets = {
    normal: { brightness: 100, contrast: 100, saturation: 100, blur: 0, sharpen: 0, isBW: false, isInverted: false },
    vintage: { brightness: 95, contrast: 110, saturation: 85, blur: 0.5, sharpen: 0, isBW: false, isInverted: false, extra: 'sepia(0.3)' },
    grayscale: { brightness: 100, contrast: 110, saturation: 0, blur: 0, sharpen: 10, isBW: true, isInverted: false },
    sepia: { brightness: 100, contrast: 105, saturation: 80, blur: 0, sharpen: 5, isBW: false, isInverted: false, extra: 'sepia(0.7)' },
    vivid: { brightness: 105, contrast: 120, saturation: 150, blur: 0, sharpen: 15, isBW: false, isInverted: false },
    cool: { brightness: 100, contrast: 110, saturation: 90, blur: 0, sharpen: 0, isBW: false, isInverted: false, extra: 'hue-rotate(180deg)' },
    warm: { brightness: 105, contrast: 115, saturation: 120, blur: 0, sharpen: 0, isBW: false, isInverted: false, extra: 'hue-rotate(-20deg)' },
    dramatic: { brightness: 90, contrast: 150, saturation: 80, blur: 0, sharpen: 20, isBW: false, isInverted: false }
};

function sliderToN(sliderValue) {
    if (sliderValue >= 99) return Infinity;
    return 2 + Math.pow(sliderValue / 100, 2) * 50;
}

function clamp(value) {
    return Math.max(0, Math.min(255, value));
}

function createSquirclePath(ctx, cx, cy, size, n) {
    ctx.beginPath();
    if (n === Infinity) {
        const half = size / 2;
        ctx.rect(cx - half, cy - half, size, size);
    } else {
        for (let t = 0; t <= Math.PI * 2; t += 0.02) {
            const cos = Math.cos(t);
            const sin = Math.sin(t);
            const r = size / 2 / Math.pow(Math.pow(Math.abs(cos), n) + Math.pow(Math.abs(sin), n), 1 / n);
            const x = cx + r * cos;
            const y = cy + r * sin;
            if (t === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
    }
    ctx.closePath();
}

function applySharpenEffect(intensity) {
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    const width = canvas.width;
    const height = canvas.height;
    const originalData = new Uint8ClampedArray(data);
    const kernel = [[-1, -1, -1], [-1, 9, -1], [-1, -1, -1]];
    const factor = intensity / 100;

    for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
            let r = 0, g = 0, b = 0;
            for (let ky = -1; ky <= 1; ky++) {
                for (let kx = -1; kx <= 1; kx++) {
                    const pixelIndex = ((y + ky) * width + (x + kx)) * 4;
                    const kernelValue = kernel[ky + 1][kx + 1];
                    r += originalData[pixelIndex] * kernelValue;
                    g += originalData[pixelIndex + 1] * kernelValue;
                    b += originalData[pixelIndex + 2] * kernelValue;
                }
            }
            const pixelIndex = (y * width + x) * 4;
            data[pixelIndex] = clamp(originalData[pixelIndex] * (1 - factor) + r * factor);
            data[pixelIndex + 1] = clamp(originalData[pixelIndex + 1] * (1 - factor) + g * factor);
            data[pixelIndex + 2] = clamp(originalData[pixelIndex + 2] * (1 - factor) + b * factor);
        }
    }
    ctx.putImageData(imageData, 0, 0);
}

function applySharpenToImageData(imageData, intensity) {
    const data = imageData.data;
    const width = imageData.width;
    const height = imageData.height;
    const originalData = new Uint8ClampedArray(data);
    const kernel = [[-1, -1, -1], [-1, 9, -1], [-1, -1, -1]];
    const factor = intensity / 100;

    for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
            let r = 0, g = 0, b = 0;
            for (let ky = -1; ky <= 1; ky++) {
                for (let kx = -1; kx <= 1; kx++) {
                    const pixelIndex = ((y + ky) * width + (x + kx)) * 4;
                    const kernelValue = kernel[ky + 1][kx + 1];
                    r += originalData[pixelIndex] * kernelValue;
                    g += originalData[pixelIndex + 1] * kernelValue;
                    b += originalData[pixelIndex + 2] * kernelValue;
                }
            }
            const pixelIndex = (y * width + x) * 4;
            data[pixelIndex] = clamp(originalData[pixelIndex] * (1 - factor) + r * factor);
            data[pixelIndex + 1] = clamp(originalData[pixelIndex + 1] * (1 - factor) + g * factor);
            data[pixelIndex + 2] = clamp(originalData[pixelIndex + 2] * (1 - factor) + b * factor);
        }
    }
    return imageData;
}

function draw() {
    if (!img) return;

    ctx.clearRect(0, 0, 500, 500);
    ctx.save();

    const sliderVal = parseFloat(shapeSlider.value);
    const n = sliderToN(sliderVal);
    createSquirclePath(ctx, 250, 250, 500, n);
    ctx.clip();

    ctx.translate(250, 250);
    if (isMirrored) ctx.scale(-1, 1);
    ctx.rotate(rotation * Math.PI / 180);
    ctx.translate(-250, -250);

    let filters = `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%)`;
    if (blur > 0) filters += ` blur(${blur}px)`;
    if (isBW) filters += " grayscale(100%)";
    if (isInverted) filters += " invert(100%)";
    if (filterPresets[activeFilter] && filterPresets[activeFilter].extra) {
        filters += " " + filterPresets[activeFilter].extra;
    }
    ctx.filter = filters;

    const scale = Math.max(500 / img.width, 500 / img.height) * zoom;
    const drawWidth = img.width * scale;
    const drawHeight = img.height * scale;
    const centerX = 250 - drawWidth / 2 + offsetX;
    const centerY = 250 - drawHeight / 2 + offsetY;

    ctx.drawImage(img, centerX, centerY, drawWidth, drawHeight);

    if (sharpen > 0) applySharpenEffect(sharpen);

    ctx.restore();

    ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)';
    ctx.lineWidth = 2;
    createSquirclePath(ctx, 250, 250, 500, n);
    ctx.stroke();
}

function resetPosition() {
    zoom = 1;
    zoomSlider.value = 1;
    zoomValue.textContent = '1.0×';

    shapeSlider.value = 20;
    shapeValue.textContent = 'Arredondado';

    activeFilter = 'normal';
    const normalFilter = filterPresets.normal;

    brightness = normalFilter.brightness;
    contrast = normalFilter.contrast;
    saturation = normalFilter.saturation;
    blur = normalFilter.blur;
    sharpen = normalFilter.sharpen;
    isBW = normalFilter.isBW;
    isInverted = normalFilter.isInverted;

    rotation = 0;
    isMirrored = false;

    brightnessSlider.value = brightness;
    contrastSlider.value = contrast;
    saturationSlider.value = saturation;
    blurSlider.value = blur;
    sharpenSlider.value = sharpen;

    brightnessValue.textContent = brightness + '%';
    contrastValue.textContent = contrast + '%';
    saturationValue.textContent = saturation + '%';
    blurValue.textContent = blur + 'px';
    sharpenValue.textContent = sharpen;

    bwBtn.classList.remove("active");
    mirrorBtn.classList.remove("active");
    invertBtn.classList.remove("active");

    document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
    const originalBtn = document.querySelector('.filter-btn[onclick*="normal"]');
    if (originalBtn) originalBtn.classList.add('active');

    const scale = Math.max(500 / img.width, 500 / img.height) * zoom;
    offsetX = (500 - img.width * scale) / 2;
    offsetY = (500 - img.height * scale) / 2;
}

function loadImage(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
        localStorage.setItem('savedAvatarImage', e.target.result);
        loadImageFromData(e.target.result);
    };
    reader.readAsDataURL(file);
}

function loadImageFromData(imageData) {
    img = new Image();
    img.onload = () => {
        uploadArea.style.display = 'none';
        editor.style.display = 'block';
        resetPosition();
        draw();
    };
    img.src = imageData;
}

function applyFilter(filterName) {
    if (!img || !filterPresets[filterName]) return;

    const filter = filterPresets[filterName];

    brightness = filter.brightness;
    contrast = filter.contrast;
    saturation = filter.saturation;
    blur = filter.blur;
    sharpen = filter.sharpen;
    isBW = filter.isBW;
    isInverted = filter.isInverted;

    brightnessSlider.value = brightness;
    contrastSlider.value = contrast;
    saturationSlider.value = saturation;
    blurSlider.value = blur;
    sharpenSlider.value = sharpen;

    brightnessValue.textContent = brightness + '%';
    contrastValue.textContent = contrast + '%';
    saturationValue.textContent = saturation + '%';
    blurValue.textContent = blur + 'px';
    sharpenValue.textContent = sharpen;

    bwBtn.classList.toggle("active", isBW);
    invertBtn.classList.toggle("active", isInverted);

    document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');

    activeFilter = filterName;
    draw();
}

function saveCustomFilter(name) {
    filterPresets[name] = {
        brightness: brightness,
        contrast: contrast,
        saturation: saturation,
        blur: blur,
        sharpen: sharpen,
        isBW: isBW,
        isInverted: isInverted
    };

    const filtersContainer = document.querySelector('.filters-container');
    if (filtersContainer) {
        const newFilterBtn = document.createElement('button');
        newFilterBtn.className = 'filter-btn';
        newFilterBtn.onclick = () => applyFilter(name);
        newFilterBtn.innerHTML = `
            <div class="filter-preview" style="background: linear-gradient(135deg, var(--correios-blue), var(--creative-purple));"></div>
            <span>${name}</span>
        `;
        filtersContainer.appendChild(newFilterBtn);
    }
}

function setShape(sliderVal) {
    shapeSlider.value = sliderVal;
    const val = parseFloat(sliderVal);
    if (val === 0) shapeValue.textContent = 'Círculo';
    else if (val < 30) shapeValue.textContent = 'Arredondado';
    else if (val < 50) shapeValue.textContent = 'Médio';
    else if (val < 80) shapeValue.textContent = 'Suave';
    else if (val <= 100) shapeValue.textContent = 'Quadrado';
    else shapeValue.textContent = val;

    document.querySelectorAll('.preset-btn-premium').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    draw();
}

function setSize(size) {
    outputSize = size;
    document.querySelectorAll('.size-btn-premium').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
}

function resetImage() {
    localStorage.removeItem('savedAvatarImage');
    uploadArea.style.display = 'block';
    editor.style.display = 'none';
    fileInput.value = '';
    img = null;
}

function downloadImage() {
    if (!img) return;

    const outputCanvas = document.createElement('canvas');
    outputCanvas.width = outputSize;
    outputCanvas.height = outputSize;
    const outputCtx = outputCanvas.getContext('2d');

    const scaleFactor = outputSize / 500;

    outputCtx.clearRect(0, 0, outputSize, outputSize);
    outputCtx.save();

    const sliderVal = parseFloat(shapeSlider.value);
    const n = sliderToN(sliderVal);
    createSquirclePath(outputCtx, outputSize / 2, outputSize / 2, outputSize, n);
    outputCtx.clip();

    outputCtx.translate(outputSize / 2, outputSize / 2);
    if (isMirrored) outputCtx.scale(-1, 1);
    outputCtx.rotate(rotation * Math.PI / 180);
    outputCtx.translate(-outputSize / 2, -outputSize / 2);

    let filters = `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%)`;
    if (blur > 0) filters += ` blur(${blur}px)`;
    if (isBW) filters += " grayscale(100%)";
    if (isInverted) filters += " invert(100%)";
    if (filterPresets[activeFilter] && filterPresets[activeFilter].extra) {
        filters += " " + filterPresets[activeFilter].extra;
    }
    outputCtx.filter = filters;

    const baseScale = Math.max(500 / img.width, 500 / img.height);
    const finalScale = baseScale * zoom * scaleFactor;
    const drawWidth = img.width * finalScale;
    const drawHeight = img.height * finalScale;
    const centerX = outputSize / 2 - drawWidth / 2 + offsetX * scaleFactor;
    const centerY = outputSize / 2 - drawHeight / 2 + offsetY * scaleFactor;

    outputCtx.drawImage(img, centerX, centerY, drawWidth, drawHeight);

    if (sharpen > 0) {
        const imageData = outputCtx.getImageData(0, 0, outputSize, outputSize);
        const sharpenedData = applySharpenToImageData(imageData, sharpen);
        outputCtx.putImageData(sharpenedData, 0, 0);
    }

    outputCtx.restore();

    outputCanvas.toBlob((blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `pixelcraft-${outputSize}x${outputSize}.png`;
        a.click();
        URL.revokeObjectURL(url);
    }, 'image/png', 0.95);
}

brightnessSlider.addEventListener("input", () => {
    brightness = brightnessSlider.value;
    brightnessValue.textContent = brightness + '%';
    draw();
});

contrastSlider.addEventListener("input", () => {
    contrast = contrastSlider.value;
    contrastValue.textContent = contrast + '%';
    draw();
});

saturationSlider.addEventListener("input", () => {
    saturation = saturationSlider.value;
    saturationValue.textContent = saturation + '%';
    draw();
});

blurSlider.addEventListener("input", () => {
    blur = parseFloat(blurSlider.value);
    blurValue.textContent = blur + 'px';
    draw();
});

sharpenSlider.addEventListener("input", () => {
    sharpen = parseInt(sharpenSlider.value);
    sharpenValue.textContent = sharpen;
    draw();
});

bwBtn.addEventListener("click", () => {
    isBW = !isBW;
    bwBtn.classList.toggle("active");
    draw();
});

mirrorBtn.addEventListener("click", () => {
    isMirrored = !isMirrored;
    mirrorBtn.classList.toggle("active");
    draw();
});

invertBtn.addEventListener("click", () => {
    isInverted = !isInverted;
    invertBtn.classList.toggle("active");
    draw();
});

rotateBtn.addEventListener("click", () => {
    rotation = (rotation + 90) % 360;
    draw();
});

shapeSlider.addEventListener("input", () => {
    const val = parseFloat(shapeSlider.value);
    if (val === 0) shapeValue.textContent = 'Círculo';
    else if (val < 30) shapeValue.textContent = 'Arredondado';
    else if (val < 50) shapeValue.textContent = 'Médio';
    else if (val < 80) shapeValue.textContent = 'Suave';
    else if (val <= 100) shapeValue.textContent = 'Quadrado';
    else shapeValue.textContent = val;

    document.querySelectorAll('.preset-btn-premium').forEach(btn => btn.classList.remove('active'));
    draw();
});

zoomSlider.addEventListener("input", () => {
    const newZoom = parseFloat(zoomSlider.value);
    const zoomDiff = newZoom / zoom;
    zoom = newZoom;
    zoomValue.textContent = zoom.toFixed(1) + '×';
    offsetX = 250 + (offsetX - 250) * zoomDiff;
    offsetY = 250 + (offsetY - 250) * zoomDiff;
    draw();
});

uploadArea.addEventListener("click", () => fileInput.click());

uploadArea.addEventListener("dragover", (e) => {
    e.preventDefault();
    uploadArea.classList.add("drag-over");
});

uploadArea.addEventListener("dragleave", () => {
    uploadArea.classList.remove("drag-over");
});

uploadArea.addEventListener("drop", (e) => {
    e.preventDefault();
    uploadArea.classList.remove("drag-over");
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith("image/")) loadImage(file);
});

fileInput.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (file) loadImage(file);
});

canvas.addEventListener("mousedown", (e) => {
    isDragging = true;
    const rect = canvas.getBoundingClientRect();
    startX = e.clientX - rect.left - offsetX;
    startY = e.clientY - rect.top - offsetY;
    canvas.style.cursor = "grabbing";
});

document.addEventListener("mousemove", (e) => {
    if (!isDragging) return;
    const rect = canvas.getBoundingClientRect();
    offsetX = e.clientX - rect.left - startX;
    offsetY = e.clientY - rect.top - startY;
    draw();
});

document.addEventListener("mouseup", () => {
    isDragging = false;
    canvas.style.cursor = "move";
});

document.addEventListener("DOMContentLoaded", () => {
    const savedImage = localStorage.getItem("savedAvatarImage");
    if (savedImage) loadImageFromData(savedImage);
});