// VERSION: 0.4.3
const Tools = {
    /**
     * Retrieves the color of a specific pixel from the composite grid data.
     * @param {number} pixelIndex The index of the pixel to check.
     * @param {string[]} compositeGrid The flattened array of colors for the entire grid.
     * @returns {string|null} The color string (e.g., '#FFFFFF' or 'rgba(...)') or null if transparent.
     */
    eyedropper(pixelIndex, compositeGrid) {
        const color = compositeGrid[pixelIndex];
        return color || null;
    },

    /**
     * Fills a contiguous area of a single color with a new color using a non-recursive flood fill.
     * @param {number} pixelIndex The starting index for the fill.
     * @param {string} newColor The color to fill with.
     * @param {string[]} layerData The data of the layer to be modified.
     * @param {number} gridSize The width/height of the grid (e.g., 16 for a 16x16 grid).
     * @returns {string[]} The modified layer data array.
     */
    floodFill(pixelIndex, newColor, layerData, gridSize) {
        const targetColor = layerData[pixelIndex];
        if (targetColor === newColor) {
            return layerData; // No change needed
        }

        const queue = [pixelIndex];
        const visited = new Set([pixelIndex]);
        const size = gridSize * gridSize;

        while (queue.length > 0) {
            const currentIdx = queue.shift();
            
            layerData[currentIdx] = newColor;

            const x = currentIdx % gridSize;
            const y = Math.floor(currentIdx / gridSize);

            // Check neighbors
            const neighbors = [];
            if (y > 0) neighbors.push(currentIdx - gridSize); // Top
            if (y < gridSize - 1) neighbors.push(currentIdx + gridSize); // Bottom
            if (x > 0) neighbors.push(currentIdx - 1); // Left
            if (x < gridSize - 1) neighbors.push(currentIdx + 1); // Right
            
            for (const neighborIdx of neighbors) {
                if (neighborIdx >= 0 && neighborIdx < size && !visited.has(neighborIdx) && layerData[neighborIdx] === targetColor) {
                    visited.add(neighborIdx);
                    queue.push(neighborIdx);
                }
            }
        }
        
        return layerData;
    },

    /**
     * Generates an array of pixel indices for a line using Bresenham's algorithm.
     * @param {number} x1 Starting x-coordinate.
     * @param {number} y1 Starting y-coordinate.
     * @param {number} x2 Ending x-coordinate.
     * @param {number} y2 Ending y-coordinate.
     * @param {number} gridSize The width of the grid.
     * @returns {number[]} Array of pixel indices.
     */
    line(x1, y1, x2, y2, gridSize) {
        const indices = [];
        const dx = Math.abs(x2 - x1);
        const dy = -Math.abs(y2 - y1);
        let sx = x1 < x2 ? 1 : -1;
        let sy = y1 < y2 ? 1 : -1;
        let err = dx + dy;

        while (true) {
            indices.push(y1 * gridSize + x1);
            if (x1 === x2 && y1 === y2) break;
            let e2 = 2 * err;
            if (e2 >= dy) {
                err += dy;
                x1 += sx;
            }
            if (e2 <= dx) {
                err += dx;
                y1 += sy;
            }
        }
        return indices;
    },

    /**
     * Generates an array of pixel indices for a rectangle outline.
     * @param {number} x1 Starting x-coordinate.
     * @param {number} y1 Starting y-coordinate.
     * @param {number} x2 Ending x-coordinate.
     * @param {number} y2 Ending y-coordinate.
     * @param {number} gridSize The width of the grid.
     * @returns {number[]} Array of pixel indices.
     */
    rectangle(x1, y1, x2, y2, gridSize) {
        const indices = new Set();
        const startX = Math.min(x1, x2);
        const endX = Math.max(x1, x2);
        const startY = Math.min(y1, y2);
        const endY = Math.max(y1, y2);

        for (let x = startX; x <= endX; x++) {
            indices.add(startY * gridSize + x);
            indices.add(endY * gridSize + x);
        }
        for (let y = startY; y <= endY; y++) {
            indices.add(y * gridSize + startX);
            indices.add(y * gridSize + endX);
        }
        return Array.from(indices);
    },
    
    /**
     * Generates an array of pixel indices for a filled rectangle.
     * @param {number} x1 Starting x-coordinate.
     * @param {number} y1 Starting y-coordinate.
     * @param {number} x2 Ending x-coordinate.
     * @param {number} y2 Ending y-coordinate.
     * @param {number} gridSize The width of the grid.
     * @returns {number[]} Array of pixel indices.
     */
    rectangleFilled(x1, y1, x2, y2, gridSize) {
        const indices = [];
        const startX = Math.min(x1, x2);
        const endX = Math.max(x1, x2);
        const startY = Math.min(y1, y2);
        const endY = Math.max(y1, y2);

        for (let y = startY; y <= endY; y++) {
            for (let x = startX; x <= endX; x++) {
                indices.push(y * gridSize + x);
            }
        }
        return indices;
    },

    /**
     * Generates an array of pixel indices for a circle outline using a midpoint algorithm.
     * @param {number} x1 Bounding box corner 1 x-coordinate.
     * @param {number} y1 Bounding box corner 1 y-coordinate.
     * @param {number} x2 Bounding box corner 2 x-coordinate.
     * @param {number} y2 Bounding box corner 2 y-coordinate.
     * @param {number} gridSize The width of the grid.
     * @returns {number[]} Array of pixel indices.
     */
    circle(x1, y1, x2, y2, gridSize) {
        const indices = new Set();
        const rx = Math.abs(x2 - x1) / 2;
        const ry = Math.abs(y2 - y1) / 2;
        const cx = Math.round(Math.min(x1, x2) + rx);
        const cy = Math.round(Math.min(y1, y2) + ry);
        let r = Math.round(Math.max(rx, ry));
        
        let x = r, y = 0, err = 1 - r;

        while (x >= y) {
            indices.add((cy + y) * gridSize + (cx + x));
            indices.add((cy + x) * gridSize + (cx + y));
            indices.add((cy - y) * gridSize + (cx + x));
            indices.add((cy - x) * gridSize + (cx + y));
            indices.add((cy + y) * gridSize + (cx - x));
            indices.add((cy + x) * gridSize + (cx - y));
            indices.add((cy - y) * gridSize + (cx - x));
            indices.add((cy - x) * gridSize + (cx - y));
            y++;
            if (err < 0) {
                err += 2 * y + 1;
            } else {
                x--;
                err += 2 * (y - x) + 1;
            }
        }
        return Array.from(indices);
    },

    /**
     * Generates an array of pixel indices for a filled circle.
     * @param {number} x1 Bounding box corner 1 x-coordinate.
     * @param {number} y1 Bounding box corner 1 y-coordinate.
     * @param {number} x2 Bounding box corner 2 x-coordinate.
     * @param {number} y2 Bounding box corner 2 y-coordinate.
     * @param {number} gridSize The width of the grid.
     * @returns {number[]} Array of pixel indices.
     */
    circleFilled(x1, y1, x2, y2, gridSize) {
        const indices = [];
        const rx = Math.abs(x2 - x1) / 2;
        const ry = Math.abs(y2 - y1) / 2;
        const cx = Math.round(Math.min(x1, x2) + rx);
        const cy = Math.round(Math.min(y1, y2) + ry);
        const r = Math.round(Math.max(rx, ry));
        const rSquared = r * r;

        for (let y = cy - r; y <= cy + r; y++) {
            for (let x = cx - r; x <= cx + r; x++) {
                if ((x - cx) * (x - cx) + (y - cy) * (y - cy) <= rSquared) {
                    if (x >= 0 && x < gridSize && y >= 0 && y < gridSize) {
                        indices.push(y * gridSize + x);
                    }
                }
            }
        }
        return indices;
    },

    /**
     * Selects a contiguous area of a single color.
     * @param {number} pixelIndex The starting index for the selection.
     * @param {string[]} layerData The data of the layer to be checked.
     * @param {number} gridSize The width/height of the grid.
     * @returns {Set<number>} A Set containing the indices of all selected pixels.
     */
    magicWand(pixelIndex, layerData, gridSize) {
        const targetColor = layerData[pixelIndex];
        const selectedIndices = new Set();
        const queue = [pixelIndex];
        const visited = new Set([pixelIndex]);
        const size = gridSize * gridSize;

        while (queue.length > 0) {
            const currentIdx = queue.shift();
            selectedIndices.add(currentIdx);

            const x = currentIdx % gridSize;
            const y = Math.floor(currentIdx / gridSize);

            const neighbors = [];
            if (y > 0) neighbors.push(currentIdx - gridSize);
            if (y < gridSize - 1) neighbors.push(currentIdx + gridSize);
            if (x > 0) neighbors.push(currentIdx - 1);
            if (x < gridSize - 1) neighbors.push(currentIdx + 1);

            for (const neighborIdx of neighbors) {
                if (neighborIdx >= 0 && neighborIdx < size && !visited.has(neighborIdx) && layerData[neighborIdx] === targetColor) {
                    visited.add(neighborIdx);
                    queue.push(neighborIdx);
                }
            }
        }
        return selectedIndices;
    }
};