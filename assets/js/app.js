const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

const widthSlider       = document.getElementById('widthSlider');
const widthLabel        = document.getElementById('widthLabel');
const gradientStopsCont = document.getElementById('gradientStops');
const addStopBtn        = document.getElementById('addStopBtn');
const removeStopBtn     = document.getElementById('removeStopBtn');
const gradientType      = document.getElementById('gradientType');
const blendMode         = document.getElementById('blendMode');
const textColorMode     = document.getElementById('textColorMode');
const textColorInput    = document.getElementById('textColor');
const roundedCornersCheckbox = document.getElementById('roundedCorners');
const autoWidthCheckbox      = document.getElementById('autoWidth');
const overlayTextInput       = document.getElementById('overlayText');
const downloadBtn            = document.getElementById('download');
const borderMode             = document.getElementById('borderMode');
const borderBrightness       = document.getElementById('borderBrightness');
const borderBrightnessLabel  = document.getElementById('borderBrightnessLabel');
const borderColor1           = document.getElementById('borderColor1');
const borderColor2           = document.getElementById('borderColor2');
const overlayControls        = document.getElementById('overlayControls');
const manualBorderControls   = document.getElementById('manualBorderControls');
const shareBtn               = document.getElementById('shareBtn');

const FONT_FILE   = '/assets/img/rolefont.png';
const FONT_COLS   = 9;
const FONT_ROWS   = 10;
const CHAR_WIDTH  = 5;
const CHAR_HEIGHT = 5;
const SPACE_WIDTH = 1;

const FONT_CHARS = [
    'A','B','C','D','E','F','G','H','I','J','K','L','M','N','Ñ',
    'O','P','Q','R','S','T','U','V','W','X','Y','Z',
    '0','1','2','3','4','5','6','7','8','9',
    ',', "'", '`', '"', '/', '\\', '<', '>', '.', '!', '?',
    '🙂','😐','☹','😡','😏','😃','🤨','❤','🛸','🐕','✅','⚔','⛏','🪓','🔨','👜',
    '+','−','―','_','=','→','←','↓','↑','▪','■','🎯','❌','⏸','▶','🐱','👤','✎',
    ' ', ':'
];

const fontImage = new Image();
fontImage.src = FONT_FILE;

/* ---- GRADIENT STOPS STATE ---- */

// Each stop: { color: '#rrggbb', position: 0..1 }
let gradientStops = [
    { color: '#ff0000', position: 0.0 },
    { color: '#0000ff', position: 1.0 }
];

function renderStopRows() {
    gradientStopsCont.innerHTML = '';
    gradientStops.forEach((stop, i) => {
        const row = document.createElement('div');
        row.className = 'options stop-row';

        const colorLabel = document.createElement('label');
        colorLabel.textContent = `Color ${i + 1}`;

        const colorPicker = document.createElement('input');
        colorPicker.type = 'color';
        colorPicker.value = stop.color;
        colorPicker.addEventListener('input', () => {
            gradientStops[i].color = colorPicker.value;
            autoGenerate();
        });

        const posLabel = document.createElement('label');
        posLabel.textContent = 'Pos';
        posLabel.style.marginLeft = '0.5rem';

        const posSlider = document.createElement('input');
        posSlider.type = 'range';
        posSlider.min = 0;
        posSlider.max = 100;
        posSlider.value = Math.round(stop.position * 100);
        posSlider.style.flex = '1';
        posSlider.addEventListener('input', () => {
            gradientStops[i].position = parseInt(posSlider.value) / 100;
            posValLabel.textContent = posSlider.value + '%';
            autoGenerate();
        });

        const posValLabel = document.createElement('span');
        posValLabel.textContent = Math.round(stop.position * 100) + '%';
        posValLabel.style.minWidth = '2.5rem';
        posValLabel.style.textAlign = 'right';
        posValLabel.style.fontSize = '0.65rem';
        posValLabel.style.color = 'var(--muted)';

        row.appendChild(colorLabel);
        row.appendChild(colorPicker);
        row.appendChild(posLabel);
        row.appendChild(posSlider);
        row.appendChild(posValLabel);
        gradientStopsCont.appendChild(row);
    });
}

addStopBtn.addEventListener('click', () => {
    // Add a new stop near the end
    const lastPos = gradientStops.length > 0
        ? gradientStops[gradientStops.length - 1].position
        : 1.0;
    gradientStops.push({ color: '#00ff00', position: Math.min(1, lastPos) });
    renderStopRows();
    autoGenerate();
});

removeStopBtn.addEventListener('click', () => {
    if (gradientStops.length > 2) {
        gradientStops.pop();
        renderStopRows();
        autoGenerate();
    }
});

/* ---- UTIL ---- */

function hexToRgb(hex) {
    hex = hex.replace('#', '');
    if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
    const num = parseInt(hex, 16);
    return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
}

function darkenColor(rgb, amount = 0.5) {
    return {
        r: Math.floor(rgb.r * amount),
        g: Math.floor(rgb.g * amount),
        b: Math.floor(rgb.b * amount)
    };
}

/* ---- MULTI-STOP GRADIENT SAMPLING ---- */

// Returns an RGB color for a given t (0..1) using the current gradientStops
function sampleGradient(t) {
    // Sort stops by position
    const stops = [...gradientStops].sort((a, b) => a.position - b.position);

    const mode = blendMode.value;

    if (mode === 'steps') {
        // Hard cut: find which segment t falls in and snap to nearest stop
        // Find the stop just before or at t
        let chosen = stops[0];
        for (const s of stops) {
            if (t >= s.position) chosen = s;
        }
        return hexToRgb(chosen.color);
    }

    // Smooth: interpolate between the two surrounding stops
    if (stops.length === 1) return hexToRgb(stops[0].color);

    // Clamp t
    if (t <= stops[0].position) return hexToRgb(stops[0].color);
    if (t >= stops[stops.length - 1].position) return hexToRgb(stops[stops.length - 1].color);

    // Find surrounding pair
    for (let i = 0; i < stops.length - 1; i++) {
        const s0 = stops[i];
        const s1 = stops[i + 1];
        if (t >= s0.position && t <= s1.position) {
            const span = s1.position - s0.position;
            const localT = span === 0 ? 0 : (t - s0.position) / span;
            const c0 = hexToRgb(s0.color);
            const c1 = hexToRgb(s1.color);
            return {
                r: Math.floor(c0.r * (1 - localT) + c1.r * localT),
                g: Math.floor(c0.g * (1 - localT) + c1.g * localT),
                b: Math.floor(c0.b * (1 - localT) + c1.b * localT)
            };
        }
    }

    return hexToRgb(stops[stops.length - 1].color);
}

/* Compute gradient t for a pixel at (x, y) given canvas dimensions */
function gradientT(x, y, width, height) {
    const type = gradientType.value;
    if (type === 'linear-h')  return width  > 1 ? x / (width  - 1) : 0;
    if (type === 'linear-v')  return height > 1 ? y / (height - 1) : 0;
    if (type === 'linear-d')  return ((x / (width - 1 || 1)) + (y / (height - 1 || 1))) / 2;
    if (type === 'linear-d2') return ((x / (width - 1 || 1)) + (1 - y / (height - 1 || 1))) / 2;
    if (type === 'radial') {
        const cx = (width  - 1) / 2;
        const cy = (height - 1) / 2;
        const maxR = Math.sqrt(cx * cx + cy * cy);
        const dx = x - cx, dy = y - cy;
        return maxR === 0 ? 0 : Math.min(1, Math.sqrt(dx * dx + dy * dy) / maxR);
    }
    return width > 1 ? x / (width - 1) : 0;
}

/* ---- BORDER ---- */

function getBorderColor(baseColor, x, width) {
    const mode = borderMode.value;
    if (mode === 'auto')    return darkenColor(baseColor, 0.5);
    if (mode === 'overlay') return darkenColor(baseColor, parseFloat(borderBrightness.value));
    if (mode === 'manual') {
        const c1 = hexToRgb(borderColor1.value);
        const c2 = hexToRgb(borderColor2.value);
        const t  = width > 1 ? x / (width - 1) : 0;
        return {
            r: Math.floor(c1.r * (1 - t) + c2.r * t),
            g: Math.floor(c1.g * (1 - t) + c2.g * t),
            b: Math.floor(c1.b * (1 - t) + c2.b * t)
        };
    }
    return baseColor;
}

/* ---- UI ---- */

function updateBorderUI() {
    overlayControls.style.display     = borderMode.value === 'overlay' ? 'block' : 'none';
    manualBorderControls.style.display = borderMode.value === 'manual'  ? 'block' : 'none';
}

function updateTextColorUI() {
    textColorInput.style.display = textColorMode.value === 'custom' ? 'inline-block' : 'none';
}

/* ---- RENDER ---- */

function generateGradientImage(width, rounded, text) {
    const height = 9;
    canvas.width  = width;
    canvas.height = height;

    const imageData = ctx.createImageData(width, height);

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            // Skip transparent corners for rounded
            if (rounded && (
                (x === 0 && y === 0) || (x === width-1 && y === 0) ||
                (x === 0 && y === height-1) || (x === width-1 && y === height-1)
            )) continue;

            const t = gradientT(x, y, width, height);
            const baseColor = sampleGradient(t);

            const isBorder = x === 0 || x === width-1 || y === 0 || y === height-1;
            const finalColor = isBorder ? getBorderColor(baseColor, x, width) : baseColor;

            const idx = (y * width + x) * 4;
            imageData.data[idx]     = finalColor.r;
            imageData.data[idx + 1] = finalColor.g;
            imageData.data[idx + 2] = finalColor.b;
            imageData.data[idx + 3] = 255;
        }
    }

    if (rounded) {
        const corners = [
            { x: 1, y: 1 }, { x: width-2, y: 1 },
            { x: 1, y: height-2 }, { x: width-2, y: height-2 }
        ];
        corners.forEach(corner => {
            if (corner.x < 0 || corner.x >= width) return;
            const t = gradientT(corner.x, corner.y, width, height);
            const baseColor = sampleGradient(t);
            const finalColor = getBorderColor(baseColor, corner.x, width);
            const idx = (corner.y * width + corner.x) * 4;
            imageData.data[idx]     = finalColor.r;
            imageData.data[idx + 1] = finalColor.g;
            imageData.data[idx + 2] = finalColor.b;
            imageData.data[idx + 3] = 255;
        });
    }

    ctx.putImageData(imageData, 0, 0);

    /* TEXT */
    if (text && fontImage.complete) {
        // Determine text color
        let textRgb;
        const tcMode = textColorMode.value;
        if      (tcMode === 'white')  textRgb = { r: 255, g: 255, b: 255 };
        else if (tcMode === 'black')  textRgb = { r:   0, g:   0, b:   0 };
        else                          textRgb = hexToRgb(textColorInput.value);

        // Draw font with color tinting via off-screen canvas
        const offscreen = document.createElement('canvas');
        offscreen.width  = canvas.width;
        offscreen.height = canvas.height;
        const offCtx = offscreen.getContext('2d');

        let xOffset = 2;
        const yOffset = 2;

        for (let rawChar of text) {
            let c = rawChar === ' ' ? ' ' : rawChar.toUpperCase();
            let charWidth = CHAR_WIDTH;

            if (c === ' ') {
                charWidth = SPACE_WIDTH;
            } else {
                const idx = FONT_CHARS.indexOf(c);
                if (idx === -1) continue;

                const col = idx % FONT_COLS;
                const row = Math.floor(idx / FONT_COLS);

                // Draw char to offscreen first, then tint
                const charCanvas = document.createElement('canvas');
                charCanvas.width  = CHAR_WIDTH;
                charCanvas.height = CHAR_HEIGHT;
                const charCtx = charCanvas.getContext('2d');

                charCtx.drawImage(
                    fontImage,
                    col * CHAR_WIDTH, row * CHAR_HEIGHT,
                    CHAR_WIDTH, CHAR_HEIGHT,
                    0, 0, CHAR_WIDTH, CHAR_HEIGHT
                );

                // Tint: replace opaque pixels with textRgb
                const charData = charCtx.getImageData(0, 0, CHAR_WIDTH, CHAR_HEIGHT);
                for (let p = 0; p < charData.data.length; p += 4) {
                    if (charData.data[p + 3] > 0) {
                        // preserve brightness channel from original
                        const brightness = charData.data[p] / 255;
                        charData.data[p]     = Math.floor(textRgb.r * brightness);
                        charData.data[p + 1] = Math.floor(textRgb.g * brightness);
                        charData.data[p + 2] = Math.floor(textRgb.b * brightness);
                    }
                }
                charCtx.putImageData(charData, 0, 0);

                offCtx.drawImage(charCanvas, xOffset, yOffset);
            }

            xOffset += charWidth + 1;
            if (xOffset > width - 2) break;
        }

        ctx.drawImage(offscreen, 0, 0);
    }
}

/* ---- GENERATE ---- */

function autoGenerate() {
    let width = parseInt(widthSlider.value) || 40;
    const rounded = roundedCornersCheckbox.checked;
    const text    = overlayTextInput.value;

    if (autoWidthCheckbox.checked && text) {
        let textWidth = 0;
        for (let rawChar of text) {
            const c = rawChar === ' ' ? ' ' : rawChar.toUpperCase();
            textWidth += (c === ' ') ? SPACE_WIDTH : CHAR_WIDTH;
            textWidth += 1;
        }
        if (textWidth > 0) textWidth -= 1;
        width = 2 + textWidth + 2;
        widthSlider.value    = width;
        widthSlider.disabled = true;
    } else {
        widthSlider.disabled = false;
    }

    widthLabel.textContent = width;
    generateGradientImage(width, rounded, text);
}

/* ---- URL SHARING ---- */

function loadFromURL() {
    const p = new URLSearchParams(location.search);

    if (p.has('w'))    widthSlider.value = p.get('w');
    if (p.has('text')) overlayTextInput.value = p.get('text');
    if (p.has('rounded')) roundedCornersCheckbox.checked = p.get('rounded') === '1';
    if (p.has('autoW'))   autoWidthCheckbox.checked      = p.get('autoW')   === '1';
    if (p.has('bmode'))   borderMode.value               = p.get('bmode');
    if (p.has('bbright')) borderBrightness.value         = p.get('bbright');
    if (p.has('bc1'))     borderColor1.value             = p.get('bc1');
    if (p.has('bc2'))     borderColor2.value             = p.get('bc2');
    if (p.has('gtype'))   gradientType.value             = p.get('gtype');
    if (p.has('gblend'))  blendMode.value                = p.get('gblend');
    if (p.has('tcmode'))  textColorMode.value            = p.get('tcmode');
    if (p.has('tc'))      textColorInput.value           = p.get('tc');

    if (p.has('stops')) {
        try {
            gradientStops = JSON.parse(decodeURIComponent(p.get('stops')));
        } catch (e) {
            // fallback to defaults
        }
    }

    borderBrightnessLabel.textContent = borderBrightness.value;
    updateBorderUI();
    updateTextColorUI();
    renderStopRows();
}

/* ---- EVENTS ---- */

[
    widthSlider, roundedCornersCheckbox, autoWidthCheckbox,
    overlayTextInput, borderColor1, borderColor2
].forEach(el => el.addEventListener('input', autoGenerate));

borderMode.addEventListener('change', () => { updateBorderUI(); autoGenerate(); });
borderBrightness.addEventListener('input', () => {
    borderBrightnessLabel.textContent = borderBrightness.value;
    autoGenerate();
});
gradientType.addEventListener('change', autoGenerate);
blendMode.addEventListener('change', autoGenerate);
textColorMode.addEventListener('change', () => { updateTextColorUI(); autoGenerate(); });
textColorInput.addEventListener('input', autoGenerate);

downloadBtn.addEventListener('click', () => {
    const link   = document.createElement('a');
    link.download = `thingy_${canvas.width}x${canvas.height}.png`;
    link.href     = canvas.toDataURL();
    link.click();
});

shareBtn.addEventListener('click', async () => {
    const params = new URLSearchParams({
        w:       widthSlider.value,
        text:    overlayTextInput.value,
        rounded: roundedCornersCheckbox.checked ? 1 : 0,
        autoW:   autoWidthCheckbox.checked      ? 1 : 0,
        bmode:   borderMode.value,
        bbright: borderBrightness.value,
        bc1:     borderColor1.value,
        bc2:     borderColor2.value,
        gtype:   gradientType.value,
        gblend:  blendMode.value,
        tcmode:  textColorMode.value,
        tc:      textColorInput.value,
        stops:   encodeURIComponent(JSON.stringify(gradientStops))
    });
    const url = `${location.origin}${location.pathname}?${params.toString()}`;
    await navigator.clipboard.writeText(url);
    alert('Share link copied!');
});

/* ---- INIT ---- */

fontImage.onload = () => { autoGenerate(); };

loadFromURL();
updateBorderUI();
updateTextColorUI();
renderStopRows();
autoGenerate();
