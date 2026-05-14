const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

const widthSlider = document.getElementById('widthSlider');
const widthLabel = document.getElementById('widthLabel');
const color1Input = document.getElementById('color1');
const color2Input = document.getElementById('color2');
const roundedCornersCheckbox = document.getElementById('roundedCorners');
const autoWidthCheckbox = document.getElementById('autoWidth');
const overlayTextInput = document.getElementById('overlayText');
const downloadBtn = document.getElementById('download');

const FONT_FILE = 'rolefont.png';
const FONT_COLS = 9;
const FONT_ROWS = 10;
const CHAR_WIDTH = 5;
const CHAR_HEIGHT = 5;
const SPACE_WIDTH = 1;

const FONT_CHARS = [
    'A','B','C','D','E','F','G','H','I','J','K','L','M','N',
'Ñ',
'O','P','Q','R','S','T','U','V','W','X','Y','Z',
'0','1','2','3','4','5','6','7','8','9',
',', "'", '`', '"', '/', '\\', '<', '>', '.', '!', '?',
'🙂','😐','☹','😡','😏','😃','😮','😕','❤','🛸','🐶','✅','⚔','⛏','🪓','🔨','👜',
'+','−','―','_','=', '→','←','↓','↑','▪','■','🎯','❌','⏸','▶','🐱','👤','✎',
' ', ':'
];

const fontImage = new Image();
fontImage.src = FONT_FILE;

function hexToRgb(hex) {
    hex = hex.replace('#','');
    if(hex.length === 3) hex = hex.split('').map(c => c+c).join('');
    const num = parseInt(hex,16);
    return { r: (num>>16)&255, g: (num>>8)&255, b: num&255 };
}

function darkenColor(rgb, amount=0.5){
    return {
        r: Math.floor(rgb.r * amount),
        g: Math.floor(rgb.g * amount),
        b: Math.floor(rgb.b * amount)
    };
}

function generateGradientImage(width, color1, color2, rounded=false, text=''){
    const height = 9;
    canvas.width = width;
    canvas.height = height;

    const imageData = ctx.createImageData(width, height);

    // Gradient + border
    for(let y=0; y<height; y++){
        for(let x=0; x<width; x++){

            if(rounded && (
                (x===0 && y===0) ||
                (x===width-1 && y===0) ||
                (x===0 && y===height-1) ||
                (x===width-1 && y===height-1)
            )) continue;

            const t = width > 1 ? x/(width-1) : 0;

            const baseColor = {
                r: Math.floor(color1.r*(1-t) + color2.r*t),
                g: Math.floor(color1.g*(1-t) + color2.g*t),
                b: Math.floor(color1.b*(1-t) + color2.b*t)
            };

            const idx = (y*width + x)*4;
            const isBorder = x===0 || x===width-1 || y===0 || y===height-1;
            const finalColor = isBorder ? darkenColor(baseColor,0.5) : baseColor;

            imageData.data[idx] = finalColor.r;
            imageData.data[idx+1] = finalColor.g;
            imageData.data[idx+2] = finalColor.b;
            imageData.data[idx+3] = 255;
        }
    }

    // Rounded inner border pixels
    if(rounded){
        const height = 9;
        const corners = [
            { x:1, y:1 },
            { x:width-2, y:1 },
            { x:1, y:height-2 },
            { x:width-2, y:height-2 }
        ];

        corners.forEach(corner => {
            if(corner.x < 0 || corner.x >= width) return;

            const t = width > 1 ? corner.x/(width-1) : 0;
            const baseColor = {
                r: Math.floor(color1.r*(1-t) + color2.r*t),
                        g: Math.floor(color1.g*(1-t) + color2.g*t),
                        b: Math.floor(color1.b*(1-t) + color2.b*t)
            };

            const finalColor = darkenColor(baseColor,0.5);
            const idx = (corner.y*width + corner.x)*4;

            imageData.data[idx] = finalColor.r;
            imageData.data[idx+1] = finalColor.g;
            imageData.data[idx+2] = finalColor.b;
            imageData.data[idx+3] = 255;
        });
    }

    ctx.putImageData(imageData,0,0);

    // Draw text
    if(text && fontImage.complete){
        let xOffset = 2;
        const yOffset = 2;

        for(let rawChar of text){

            let c = rawChar === ' ' ? ' ' : rawChar.toUpperCase();

            let charWidth = CHAR_WIDTH;

            if(c === ' '){
                charWidth = SPACE_WIDTH;
            } else {
                const idx = FONT_CHARS.indexOf(c);
                if(idx === -1) continue;

                const col = idx % FONT_COLS;
                const row = Math.floor(idx / FONT_COLS);
                const sx = col * CHAR_WIDTH;
                const sy = row * CHAR_HEIGHT;

                ctx.drawImage(
                    fontImage,
                    sx, sy, CHAR_WIDTH, CHAR_HEIGHT,
                    xOffset, yOffset, CHAR_WIDTH, CHAR_HEIGHT
                );
            }

            xOffset += charWidth + 1;

            if(xOffset > width-2) break;
        }
    }
}

function autoGenerate(){
    let width = parseInt(widthSlider.value) || 40;

    const color1 = hexToRgb(color1Input.value);
    const color2 = hexToRgb(color2Input.value);
    const rounded = roundedCornersCheckbox.checked;
    const text = overlayTextInput.value;

    if(autoWidthCheckbox.checked && text){
        let textWidth = 0;

        for(let rawChar of text){
            const c = rawChar === ' ' ? ' ' : rawChar.toUpperCase();

            if(c === ' '){
                textWidth += SPACE_WIDTH;
            } else {
                textWidth += CHAR_WIDTH;
            }

            textWidth += 1;
        }

        if(textWidth > 0) textWidth -= 1;

        width = 2 + textWidth + 2;

        widthSlider.value = width;
        widthSlider.disabled = true;
    } else {
        widthSlider.disabled = false;
    }

    widthLabel.textContent = width;
    generateGradientImage(width, color1, color2, rounded, text);
}

widthSlider.addEventListener('input', autoGenerate);
color1Input.addEventListener('input', autoGenerate);
color2Input.addEventListener('input', autoGenerate);
roundedCornersCheckbox.addEventListener('change', autoGenerate);
autoWidthCheckbox.addEventListener('change', autoGenerate);
overlayTextInput.addEventListener('input', autoGenerate);

downloadBtn.addEventListener('click', ()=>{
    const link = document.createElement('a');
    link.download = `gradient_${canvas.width}x${canvas.height}.png`;
    link.href = canvas.toDataURL();
    link.click();
});

fontImage.onload = ()=> autoGenerate();
