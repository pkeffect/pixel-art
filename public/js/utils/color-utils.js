// VERSION: 1.0.0
// Shared color conversion utilities with caching
const ColorUtils = {
    cache: new Map(),
    maxCacheSize: 1000,

    parseColor(str) {
        if (!str) return { r: 0, g: 0, b: 0, a: 0 };
        if (this.cache.has(str)) return this.cache.get(str);

        let result;
        let match;

        if ((match = str.match(/^#([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i))) {
            result = { r: parseInt(match[1], 16), g: parseInt(match[2], 16), b: parseInt(match[3], 16), a: 1 };
        } else if ((match = str.match(/^#([a-f\d])([a-f\d])([a-f\d])$/i))) {
            result = { r: parseInt(match[1] + match[1], 16), g: parseInt(match[2] + match[2], 16), b: parseInt(match[3] + match[3], 16), a: 1 };
        } else if ((match = str.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)$/))) {
            result = { r: parseInt(match[1]), g: parseInt(match[2]), b: parseInt(match[3]), a: match[4] !== undefined ? parseFloat(match[4]) : 1 };
        } else {
            result = { r: 0, g: 0, b: 0, a: 0 };
        }

        this.cacheColor(str, result);
        return result;
    },

    cacheColor(key, value) {
        if (this.cache.size >= this.maxCacheSize) {
            const firstKey = this.cache.keys().next().value;
            this.cache.delete(firstKey);
        }
        this.cache.set(key, value);
    },

    blend(topColorStr, bottomColorStr, topLayerOpacity) {
        const top = this.parseColor(topColorStr);
        const bottom = this.parseColor(bottomColorStr);
        const topA = top.a * topLayerOpacity;
        
        if (topA >= 1) return `rgba(${top.r}, ${top.g}, ${top.b}, 1)`;
        
        const outA = topA + bottom.a * (1 - topA);
        if (outA === 0) return '';
        
        const outR = Math.round((top.r * topA + bottom.r * bottom.a * (1 - topA)) / outA);
        const outG = Math.round((top.g * topA + bottom.g * bottom.a * (1 - topA)) / outA);
        const outB = Math.round((top.b * topA + bottom.b * bottom.a * (1 - topA)) / outA);
        
        return `rgba(${outR}, ${outG}, ${outB}, ${outA})`;
    },

    rgbToHex(r, g, b) {
        return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase();
    },

    clearCache() {
        this.cache.clear();
    }
};
