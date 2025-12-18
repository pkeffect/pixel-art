// VERSION: 0.0.1
class ColorPicker {
    constructor() {
        this.modal = null;
        this.elements = {};
        this.currentColor = { h: 0, s: 100, l: 50 };
        this.isUpdating = false;
        this.resolvePromise = null;
        this.rejectPromise = null;
        this.cardBgColor = 'rgb(42, 45, 46)'; // Default fallback
    }

    async init() {
        if (document.getElementById('color-picker-modal')) return;
        
        this.modal = document.createElement('div');
        this.modal.id = 'color-picker-modal';
        this.modal.className = 'component-modal-overlay';
        document.body.appendChild(this.modal);
        
        try {
            const r = await fetch('color-picker.html');
            if (!r.ok) throw new Error('HTML not found');
            this.modal.innerHTML = await r.text();
            
            await new Promise(resolve => setTimeout(resolve, 0));
            
            this._mapElements();
            this._attachEventListeners();
            this._renderBasicColors();
            this._renderCustomColors();
            this._drawColorSlider();
        } catch (e) {
            console.error('Failed to load color picker:', e);
            this.modal.innerHTML = `<div class="component-container" style="padding: 2rem; text-align: center;">Error: Component failed to load.</div>`;
            return;
        }
    }

    _mapElements() {
        const ids = ['basic-colors-grid', 'custom-colors-grid', 'color-spectrum', 'color-spectrum-container', 'spectrum-cursor', 'color-slider', 'color-slider-container', 'slider-cursor', 'color-preview', 'hue', 'sat', 'lum', 'red', 'green', 'blue', 'hex', 'rgb-text', 'hsl-text', 'rgba-text', 'hsla-text', 'add-to-custom-colors', 'clear-custom-colors', 'advanced-toggle', 'advanced-content', 'advanced-toggle-icon', 'alpha-slider', 'alpha-value', 'cyan-slider', 'cyan-value', 'magenta-slider', 'magenta-value', 'yellow-slider', 'yellow-value', 'key-slider', 'key-value', 'picker-close-btn', 'picker-ok-btn', 'picker-cancel-btn'];
        ids.forEach(id => {
            const camelCase = id.replace(/-(\w)/g, (_, c) => c.toUpperCase());
            this.elements[camelCase] = this.modal.querySelector(`#${id}`);
            if (!this.elements[camelCase]) {
                console.warn(`Element not found: #${id}`);
            }
        });
        this.elements.container = this.modal.querySelector('.color-picker-container');
        this.cardBgColor = getComputedStyle(document.documentElement).getPropertyValue('--card-bg').trim() || this.cardBgColor;
    }

    open(initialColor = '#ff0000') {
        return new Promise((resolve, reject) => {
            this.resolvePromise = resolve;
            this.rejectPromise = reject;

            // Reset styles before opening to ensure it's centered by flexbox
            this.elements.container.style.position = '';
            this.elements.container.style.top = '';
            this.elements.container.style.left = '';
            this.elements.container.style.transform = '';

            this.modal.classList.add('visible');
            this._selectColor(initialColor);
        });
    }

    _close() {
        this.modal.classList.remove('visible');
    }

    _handleConfirm() {
        if (this.resolvePromise) {
            const alpha = parseInt(this.elements.alphaSlider.value) / 100;
            if (alpha < 1) {
                const rgb = this._hslToRgb(this.currentColor.h, this.currentColor.s, this.currentColor.l);
                this.resolvePromise(`rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`);
            } else {
                this.resolvePromise(this.elements.hex.value);
            }
        }
        this._close();
    }

    _handleCancel() {
        if (this.rejectPromise) this.rejectPromise(new Error('User cancelled'));
        this._close();
    }

    _attachEventListeners() {
        this.elements.pickerOkBtn.addEventListener('click', () => this._handleConfirm());
        this.elements.pickerCancelBtn.addEventListener('click', () => this._handleCancel());
        this.elements.pickerCloseBtn.addEventListener('click', () => this._handleCancel());
        this.modal.addEventListener('click', (e) => { if (e.target === this.modal) this._handleCancel(); });
        this.elements.colorSpectrumContainer.addEventListener('mousedown', this._handleDrag.bind(this, this._updateFromSpectrum));
        this.elements.colorSliderContainer.addEventListener('mousedown', this._handleDrag.bind(this, this._updateFromSlider));
        ['hue', 'sat', 'lum', 'red', 'green', 'blue', 'hex'].forEach(type => this.elements[type].addEventListener('input', e => this._handleInputChange(type, e.target.value)));
        this.elements.addToCustomColors.addEventListener('click', () => this._addToCustomColors());
        this.elements.clearCustomColors.addEventListener('click', () => this._clearCustomColors());
        
        this.elements.advancedToggle.addEventListener('click', () => {
            this.elements.advancedContent.classList.toggle('expanded');
            this.elements.advancedToggleIcon.classList.toggle('expanded');
        });
        ['alpha', 'cyan', 'magenta', 'yellow', 'key'].forEach(type => this.elements[`${type}Slider`].addEventListener('input', e => {
            this.elements[`${type}Value`].textContent = e.target.value + (type === 'alpha' ? '%' : '%');
            if (type === 'alpha') this._updateUI(); else this._updateFromCMYK();
        }));
        ['rgbText', 'hslText', 'rgbaText', 'hslaText'].forEach(id => this.elements[id].addEventListener('click', e => this._copyToClipboard(e.target.value, e.target)));

        const header = this.modal.querySelector('.color-picker-header');
        if (header) {
            this._makeDraggable(header, this.elements.container);
        }
    }

    _makeDraggable(handle, container) {
        let isDragging = false;
        let offsetX, offsetY;

        const onMouseDown = (e) => {
            if (e.button !== 0) return; // Only drag with left mouse button

            isDragging = true;
            
            const rect = container.getBoundingClientRect();
            offsetX = e.clientX - rect.left;
            offsetY = e.clientY - rect.top;

            // Take the element out of the flex centering to allow absolute positioning
            container.style.position = 'absolute';
            container.style.top = `${rect.top}px`;
            container.style.left = `${rect.left}px`;
            container.style.transform = 'none'; // Disable scale transform while dragging

            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp, { once: true });
            
            e.preventDefault(); // Prevent text selection
        };

        const onMouseMove = (e) => {
            if (!isDragging) return;
            
            const newX = e.clientX - offsetX;
            const newY = e.clientY - offsetY;

            container.style.left = `${newX}px`;
            container.style.top = `${newY}px`;
        };

        const onMouseUp = () => {
            isDragging = false;
            document.removeEventListener('mousemove', onMouseMove);
        };

        handle.addEventListener('mousedown', onMouseDown);
    }

    _handleDrag(updateFunction, e) {
        e.preventDefault();
        const moveHandler = (me) => { updateFunction.call(this, me); };
        moveHandler(e);
        const upHandler = () => {
            document.removeEventListener('mousemove', moveHandler);
            document.removeEventListener('mouseup', upHandler);
        };
        document.addEventListener('mousemove', moveHandler);
        document.addEventListener('mouseup', upHandler);
    }

    _updateFromSpectrum(e) {
        const rect = this.elements.colorSpectrumContainer.getBoundingClientRect();
        const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
        const y = Math.max(0, Math.min(e.clientY - rect.top, rect.height));
        this._setColorFromHSL(this.currentColor.h, (x / rect.width) * 100, (1 - y / rect.height) * 100);
    }

    _updateFromSlider(e) {
        const rect = this.elements.colorSliderContainer.getBoundingClientRect();
        const y = Math.max(0, Math.min(e.clientY - rect.top, rect.height));
        this._setColorFromHSL((y / rect.height) * 360, this.currentColor.s, this.currentColor.l);
    }

    _handleInputChange(type, value) {
        if (this.isUpdating) return;
        const val = parseInt(value);
        switch (type) {
            case 'hex': if (/^#([0-9A-F]{3}){1,2}$/i.test(value)) this._selectColor(value); break;
            case 'hue': this._setColorFromHSL(val, this.currentColor.s, this.currentColor.l); break;
            case 'sat': this._setColorFromHSL(this.currentColor.h, val, this.currentColor.l); break;
            case 'lum': this._setColorFromHSL(this.currentColor.h, this.currentColor.s, val); break;
            case 'red': this._setColorFromRGB(val, parseInt(this.elements.green.value), parseInt(this.elements.blue.value)); break;
            case 'green': this._setColorFromRGB(parseInt(this.elements.red.value), val, parseInt(this.elements.blue.value)); break;
            case 'blue': this._setColorFromRGB(parseInt(this.elements.red.value), parseInt(this.elements.green.value), val); break;
        }
    }

    _updateFromCMYK() {
        const c = parseInt(this.elements.cyanSlider.value);
        const m = parseInt(this.elements.magentaSlider.value);
        const y = parseInt(this.elements.yellowSlider.value);
        const k = parseInt(this.elements.keySlider.value);
        const rgb = this._cmykToRgb(c, m, y, k);
        this._setColorFromRGB(rgb.r, rgb.g, rgb.b);
    }

    _renderBasicColors() {
        const colors = ['#ff0000', '#ff4000', '#ff8000', '#ffbf00', '#ffff00', '#bfff00', '#80ff00', '#40ff00', '#00ff00', '#00ff40', '#00ff80', '#00ffbf', '#00ffff', '#00bfff', '#0080ff', '#0040ff', '#0000ff', '#4000ff', '#8000ff', '#bf00ff', '#ff00ff', '#ff00bf', '#ff0080', '#ff0040', '#800000', '#804000', '#808000', '#408000', '#008000', '#008040', '#008080', '#004080', '#000080', '#400080', '#800080', '#800040', '#ffffff', '#e0e0e0', '#c0c0c0', '#a0a0a0', '#808080', '#606060', '#404040', '#000000'];
        this.elements.basicColorsGrid.innerHTML = '';
        colors.forEach(c => {
            const box = document.createElement('div');
            box.className = 'color-box';
            box.style.backgroundColor = c;
            box.addEventListener('click', () => this._selectColor(c));
            this.elements.basicColorsGrid.appendChild(box);
        });
    }

    _renderCustomColors() {
        try {
            const saved = JSON.parse(localStorage.getItem('customColors') || '[]');
            this.elements.customColorsGrid.innerHTML = '';
            for (let i = 0; i < 16; i++) {
                const box = document.createElement('div');
                box.className = 'color-box';
                box.style.backgroundColor = saved[i] || this.cardBgColor;
                box.dataset.index = i;
                box.addEventListener('click', e => { if (e.target.style.backgroundColor !== this.cardBgColor) this._selectColor(e.target.style.backgroundColor); });
                box.addEventListener('contextmenu', e => { e.preventDefault(); e.target.style.backgroundColor = this.cardBgColor; this._saveCustomColors(); });
                this.elements.customColorsGrid.appendChild(box);
            }
        } catch (e) {
            console.error("Could not read custom colors from localStorage:", e);
        }
    }

    _saveCustomColors() {
        try {
            const boxes = this.elements.customColorsGrid.children;
            localStorage.setItem('customColors', JSON.stringify(Array.from(boxes).map(b => window.getComputedStyle(b).backgroundColor)));
        } catch (e) {
            console.error("Could not save custom colors to localStorage:", e);
        }
    }

    _addToCustomColors() {
        for (let box of this.elements.customColorsGrid.children) {
            if (window.getComputedStyle(box).backgroundColor === this.cardBgColor) {
                box.style.backgroundColor = this.elements.hex.value;
                break;
            }
        }
        this._saveCustomColors();
    }

    _clearCustomColors() {
        Array.from(this.elements.customColorsGrid.children).forEach(b => b.style.backgroundColor = this.cardBgColor);
        this._saveCustomColors();
    }

    _selectColor(c) {
        const rgb = this._parseColor(c);
        this._setColorFromRGB(rgb.r, rgb.g, rgb.b);
    }

    _parseColor(c) {
        const d = document.createElement("div");
        d.style.color = c;
        document.body.appendChild(d);
        const [r, g, b] = window.getComputedStyle(d).color.match(/\d+/g).map(Number);
        document.body.removeChild(d);
        return { r, g, b };
    }

    _setColorFromRGB(r, g, b) {
        this.currentColor = this._rgbToHsl(r, g, b);
        this._updateUI();
    }

    _setColorFromHSL(h, s, l) {
        this.currentColor = { h, s, l };
        this._updateUI();
    }

    _updateUI() {
        if (this.isUpdating) return;
        this.isUpdating = true;
        const rgb = this._hslToRgb(this.currentColor.h, this.currentColor.s, this.currentColor.l);
        const hex = this._rgbToHex(rgb.r, rgb.g, rgb.b);
        const cmyk = this._rgbToCmyk(rgb.r, rgb.g, rgb.b);
        const alpha = parseInt(this.elements.alphaSlider.value) / 100;
        this.elements.hex.value = hex;
        this.elements.hue.value = Math.round(this.currentColor.h);
        this.elements.sat.value = Math.round(this.currentColor.s);
        this.elements.lum.value = Math.round(this.currentColor.l);
        this.elements.red.value = rgb.r;
        this.elements.green.value = rgb.g;
        this.elements.blue.value = rgb.b;
        this.elements.rgbText.value = `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;
        this.elements.hslText.value = `hsl(${Math.round(this.currentColor.h)}, ${Math.round(this.currentColor.s)}%, ${Math.round(this.currentColor.l)}%)`;
        this.elements.rgbaText.value = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
        this.elements.hslaText.value = `hsla(${Math.round(this.currentColor.h)}, ${Math.round(this.currentColor.s)}%, ${Math.round(this.currentColor.l)}%, ${alpha})`;
        ['cyan', 'magenta', 'yellow', 'key'].forEach(k => {
            this.elements[`${k}Slider`].value = cmyk[k.charAt(0)];
            this.elements[`${k}Value`].textContent = cmyk[k.charAt(0)] + '%';
        });
        this.elements.colorPreview.style.backgroundColor = hex;
        this.elements.spectrumCursor.style.left = `${(this.currentColor.s / 100) * 200}px`;
        this.elements.spectrumCursor.style.top = `${(1 - this.currentColor.l / 100) * 200}px`;
        this.elements.sliderCursor.style.top = `${(this.currentColor.h / 360) * 200}px`;
        this._drawColorSpectrum();
        this.isUpdating = false;
    }

    _drawColorSpectrum() {
        const ctx = this.elements.colorSpectrum.getContext('2d'), w = 200, h = 200;
        ctx.fillStyle = `hsl(${this.currentColor.h}, 100%, 50%)`;
        ctx.fillRect(0, 0, w, h);
        const gW = ctx.createLinearGradient(0, 0, w, 0);
        gW.addColorStop(0, '#FFF');
        gW.addColorStop(1, 'transparent');
        ctx.fillStyle = gW;
        ctx.fillRect(0, 0, w, h);
        const gB = ctx.createLinearGradient(0, 0, 0, h);
        gB.addColorStop(0, 'transparent');
        gB.addColorStop(1, '#000');
        ctx.fillStyle = gB;
        ctx.fillRect(0, 0, w, h);
    }

    _drawColorSlider() {
        const ctx = this.elements.colorSlider.getContext('2d'), g = ctx.createLinearGradient(0, 0, 0, 200);
        for (let i = 0; i <= 6; i++) g.addColorStop(i / 6, `hsl(${i * 60},100%,50%)`);
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, 20, 200);
    }

    _copyToClipboard(text, targetElement) {
        navigator.clipboard.writeText(text).then(() => {
            this._showCopiedTooltip(targetElement);
        });
    }

    _showCopiedTooltip(targetElement) {
        let tooltip = this.modal.querySelector('.copied-tooltip');
        if (!tooltip) {
            tooltip = document.createElement('div');
            tooltip.className = 'copied-tooltip';
            tooltip.textContent = 'Copied!';
            this.elements.container.appendChild(tooltip);
        }
        
        const targetRect = targetElement.getBoundingClientRect();
        const containerRect = this.elements.container.getBoundingClientRect();
    
        tooltip.style.left = `${targetRect.left - containerRect.left + targetRect.width / 2}px`;
        tooltip.style.top = `${targetRect.top - containerRect.top}px`;
        
        tooltip.classList.add('visible');
    
        setTimeout(() => {
            tooltip.classList.remove('visible');
        }, 1200);
    }

    _rgbToHsl(r, g, b) {
        r /= 255; g /= 255; b /= 255;
        let max = Math.max(r, g, b), min = Math.min(r, g, b), h, s, l = (max + min) / 2;
        if (max === min) h = s = 0;
        else {
            let d = max - min;
            s = l > .5 ? d / (2 - max - min) : d / (max + min);
            switch (max) {
                case r: h = (g - b) / d + (g < b ? 6 : 0); break;
                case g: h = (b - r) / d + 2; break;
                case b: h = (r - g) / d + 4;
            }
            h /= 6
        }
        return { h: h * 360, s: s * 100, l: l * 100 }
    }

    _hslToRgb(h, s, l) {
        let r, g, b;
        h /= 360; s /= 100; l /= 100;
        if (s === 0) r = g = b = l;
        else {
            const hue2rgb = (p, q, t) => {
                if (t < 0) t += 1; if (t > 1) t -= 1;
                if (t < 1 / 6) return p + (q - p) * 6 * t;
                if (t < .5) return q;
                if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
                return p
            };
            const q = l < .5 ? l * (1 + s) : l + s - l * s;
            const p = 2 * l - q;
            r = hue2rgb(p, q, h + 1 / 3);
            g = hue2rgb(p, q, h);
            b = hue2rgb(p, q, h - 1 / 3)
        }
        return { r: Math.round(r * 255), g: Math.round(g * 255), b: Math.round(b * 255) }
    }

    _rgbToHex(r, g, b) {
        return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase()
    }

    _cmykToRgb(c, m, y, k) {
        c /= 100; m /= 100; y /= 100; k /= 100;
        return { r: Math.round(255 * (1 - c) * (1 - k)), g: Math.round(255 * (1 - m) * (1 - k)), b: Math.round(255 * (1 - y) * (1 - k)) }
    }

    _rgbToCmyk(r, g, b) {
        let c = 1 - (r / 255), m = 1 - (g / 255), y = 1 - (b / 255), k = Math.min(c, m, y);
        if (k === 1) return { c: 0, m: 0, y: 0, k: 100 };
        c = (c - k) / (1 - k); m = (m - k) / (1 - k); y = (y - k) / (1 - k);
        return { c: Math.round(c * 100), m: Math.round(m * 100), y: Math.round(y * 100), k: Math.round(k * 100) }
    }
}