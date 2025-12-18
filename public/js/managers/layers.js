// VERSION: 1.0.0
class LayerManager {
    constructor() {
        this.layers = [];
        this.activeItemId = null;
        this.onUpdate = () => {};
        this._nextId = 1;
        this.compositeCache = null;
        this.compositeCacheDirty = true;
        this.dirtyRegion = null;
    }

    _getNewId() {
        return this._nextId++;
    }

    _findItemRecursive(id, items, parent) {
        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            if (item.id === id) return { item, parent, index: i };
            if (item.type === 'group') {
                const found = this._findItemRecursive(id, item.children, item);
                if (found) return found;
            }
        }
        return null;
    }

    findItem(id) {
        return this._findItemRecursive(id, this.layers, this.layers);
    }

    markDirty(region = null) {
        this.compositeCacheDirty = true;
        if (region) {
            if (!this.dirtyRegion) {
                this.dirtyRegion = { ...region };
            } else {
                this.dirtyRegion.minX = Math.min(this.dirtyRegion.minX, region.minX);
                this.dirtyRegion.minY = Math.min(this.dirtyRegion.minY, region.minY);
                this.dirtyRegion.maxX = Math.max(this.dirtyRegion.maxX, region.maxX);
                this.dirtyRegion.maxY = Math.max(this.dirtyRegion.maxY, region.maxY);
            }
        } else {
            this.dirtyRegion = null;
        }
    }

    init(size) {
        this.layers = [];
        this.activeItemId = null;
        this._nextId = 1;
        this.markDirty();
        this.addLayer(size);
    }

    addLayer(size) {
        const newLayer = { id: this._getNewId(), type: 'layer', name: `Layer ${this._nextId - 1}`, data: new Array(size * size).fill(''), visible: true, opacity: 1 };
        const active = this.activeItemId ? this.findItem(this.activeItemId) : null;
        if (active && active.item.type === 'group' && active.item.expanded) {
            active.item.children.unshift(newLayer);
        } else if (active) {
            const parentArray = Array.isArray(active.parent) ? active.parent : active.parent.children;
            parentArray.splice(active.index + 1, 0, newLayer);
        } else {
            this.layers.unshift(newLayer);
        }
        this.activeItemId = newLayer.id;
        this.markDirty();
        this.onUpdate(this.getUIState());
    }

    addGroup() {
        const newGroup = { id: this._getNewId(), type: 'group', name: `Group ${this._nextId - 1}`, children: [], visible: true, opacity: 1, expanded: true };
        const active = this.activeItemId ? this.findItem(this.activeItemId) : null;
        if (active) {
            const parentArray = Array.isArray(active.parent) ? active.parent : active.parent.children;
            parentArray.splice(active.index + 1, 0, newGroup);
        } else {
            this.layers.unshift(newGroup);
        }
        this.activeItemId = newGroup.id;
        this.markDirty();
        this.onUpdate(this.getUIState());
    }

    deleteActiveItem() {
        if (!this.activeItemId) return;
        const found = this.findItem(this.activeItemId);
        if (!found) return;

        const parentArray = Array.isArray(found.parent) ? found.parent : found.parent.children;
        parentArray.splice(found.index, 1);
        
        this.activeItemId = null;
        if (parentArray.length > 0) {
            const newActiveItem = parentArray[found.index] || parentArray[found.index - 1];
            if (newActiveItem) this.activeItemId = newActiveItem.id;
        } else if (found.parent !== this.layers) {
            this.activeItemId = found.parent.id;
        }

        if (this.layers.length === 0) {
            this.addLayer(Math.sqrt(this.compositeCache?.length || 256));
        }
        
        this.markDirty();
        this.onUpdate(this.getUIState());
    }

    selectItem(id) {
        this.activeItemId = id;
        this.onUpdate(this.getUIState());
    }

    setItemProperty(id, prop, value) {
        const found = this.findItem(id);
        if (found) {
            found.item[prop] = value;
            if (prop === 'visible' || prop === 'opacity') {
                this.markDirty();
            }
            this.onUpdate(this.getUIState());
        }
    }

    _getFlattenedLayers(items = this.layers, parentVisible = true, parentOpacity = 1) {
        let flat = [];
        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            const isVisible = parentVisible && item.visible;
            if (!isVisible) continue;
            
            const currentOpacity = parentOpacity * item.opacity;

            if (item.type === 'layer') {
                flat.push({ ...item, effectiveOpacity: currentOpacity });
            } else if (item.type === 'group') {
                flat.push(...this._getFlattenedLayers(item.children, isVisible, currentOpacity));
            }
        }
        return flat.reverse();
    }
    
    getCompositeGrid() {
        if (!this.compositeCacheDirty && this.compositeCache) {
            return this.compositeCache;
        }

        const flattenedLayers = this._getFlattenedLayers();
        const firstLayer = this.layers.flat(Infinity).find(l => l.type === 'layer');
        const gridSize = firstLayer ? firstLayer.data.length : 0;
        const composite = new Array(gridSize).fill('');
    
        for (const layer of flattenedLayers) {
            if (!layer.data) continue;
            if (layer.effectiveOpacity >= 1) {
                for (let j = 0; j < gridSize; j++) {
                    if (layer.data[j]) composite[j] = layer.data[j];
                }
            } else {
                for (let j = 0; j < gridSize; j++) {
                    if (layer.data[j]) {
                        composite[j] = ColorUtils.blend(layer.data[j], composite[j], layer.effectiveOpacity);
                    }
                }
            }
        }
        
        this.compositeCache = composite;
        this.compositeCacheDirty = false;
        this.dirtyRegion = null;
        
        return composite;
    }

    updatePixel(pixelIndex, color) {
        if (this.activeItemId) {
            const found = this.findItem(this.activeItemId);
            if (found && found.item.type === 'layer') {
                found.item.data[pixelIndex] = color;
                this.markDirty();
            }
        }
    }
    
    clearActiveLayer() {
        if (!this.activeItemId) return;
        const found = this.findItem(this.activeItemId);
        if (found && found.item.type === 'layer') {
            const size = found.item.data.length;
            found.item.data = new Array(size).fill('');
            this.markDirty();
            this.onUpdate(this.getUIState());
        }
    }
    
    setLayerData(data) {
        if (!this.activeItemId) return;
        const found = this.findItem(this.activeItemId);
        if (found && found.item.type === 'layer') {
            found.item.data = data;
            this.markDirty();
        }
    }

    getSnapshot() {
        return JSON.parse(JSON.stringify({ layers: this.layers, activeItemId: this.activeItemId, nextId: this._nextId }));
    }

    loadSnapshot(snapshot) {
        this.layers = snapshot.layers;
        this.activeItemId = snapshot.activeItemId;
        this._nextId = snapshot.nextId || this.findMaxId(this.layers) + 1;
        this.markDirty();
        this.onUpdate(this.getUIState());
    }
    
    findMaxId(items) {
        return items.reduce((max, item) => {
            const currentMax = item.type === 'group'
                ? Math.max(item.id, this.findMaxId(item.children))
                : item.id;
            return Math.max(max, currentMax);
        }, 0);
    }
    
    getUIState() {
        return { layers: this.layers, activeItemId: this.activeItemId };
    }
}
