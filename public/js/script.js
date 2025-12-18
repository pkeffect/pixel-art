// VERSION: 1.0.1
const App = {
    elements: {},
    state: {},
    managers: {},

    async init() {
        Logger.log('DOM fully loaded and parsed. Initializing application.');
        
        // Initialize storage first
        await StorageManager.init();
        
        this.mapElements();
        this.initState();
        this.loadPreferences();
        this.loadSession();
        this.initManagers();
        this.initManagerCallbacks();
        this.applyPreferences();
        EventHandlers.init(this);
        
        this.makeDraggable(this.elements.previewWindow.querySelector('.draggable-handle'), this.elements.previewWindow);
        this.makeResizable(this.elements.previewWindow, this.elements.previewResizeHandle);
        this.managers.colorPicker.init();
        this.createPalette();
        this.createGrid();
        this.activateTool('tool-brush');
        
        // Auto-save setup
        this.setupAutoSave();
        
        // Session cleanup
        window.addEventListener('beforeunload', () => this.saveSession());
        
        // Check for autosave recovery
        this.checkAutoSaveRecovery();
    },

    mapElements() {
        this.elements = {
            appContainer: document.getElementById('app-container'),
            gridSizeSelect: document.getElementById('grid-size'),
            colorPaletteContainer: document.getElementById('color-palette'),
            pixelGrid: document.getElementById('pixel-grid'),
            selectionMarquee: document.getElementById('selection-marquee'),
            addColorButton: document.getElementById('add-color-button'),
            toolStatusEl: document.getElementById('tool-status'),
            coordinatesEl: document.getElementById('pixel-coordinates'),
            undoButton: document.getElementById('undo-button'),
            redoButton: document.getElementById('redo-button'),
            historyList: document.getElementById('history-list'),
            layerList: document.getElementById('layer-list'),
            addLayerButton: document.getElementById('add-layer-button'),
            addGroupButton: document.getElementById('add-group-button'),
            deleteLayerButton: document.getElementById('delete-layer-button'),
            recentColorsContainer: document.getElementById('recent-colors'),
            toolButtons: { 
                marquee: document.getElementById('tool-marquee'), 
                magicWand: document.getElementById('tool-magic-wand'), 
                brush: document.getElementById('tool-brush'), 
                eraser: document.getElementById('tool-eraser'), 
                fill: document.getElementById('tool-fill'), 
                line: document.getElementById('tool-line'), 
                shape: document.getElementById('tool-shape'), 
                eyedropper: document.getElementById('tool-eyedropper'), 
                zoom: document.getElementById('tool-zoom'), 
                pan: document.getElementById('tool-pan'), 
                circle: document.getElementById('tool-circle'), 
                ditherBrush: document.getElementById('tool-dither-brush') 
            },
            menu: { 
                newProject: document.getElementById('menu-new-project'), 
                openProject: document.getElementById('menu-open-project'), 
                openImage: document.getElementById('menu-open-image'), 
                saveProject: document.getElementById('menu-save-project'), 
                saveProjectAs: document.getElementById('menu-save-project-as'), 
                downloadPng: document.getElementById('menu-download-png'), 
                downloadSvg: document.getElementById('menu-download-svg'), 
                copySvg: document.getElementById('menu-copy-svg'), 
                downloadIco: document.getElementById('menu-download-ico'), 
                undo: document.getElementById('menu-undo'), 
                redo: document.getElementById('menu-redo'), 
                clearLayer: document.getElementById('menu-clear-layer'), 
                preferences: document.getElementById('menu-preferences'), 
                newLayer: document.getElementById('menu-new-layer'), 
                duplicateLayer: document.getElementById('menu-duplicate-layer'), 
                deleteLayer: document.getElementById('menu-delete-layer'), 
                mergeDown: document.getElementById('menu-merge-down'), 
                moveLayerUp: document.getElementById('menu-move-layer-up'), 
                moveLayerDown: document.getElementById('menu-move-layer-down'), 
                fitScreen: document.getElementById('menu-fit-screen'), 
                zoomIn: document.getElementById('menu-zoom-in'), 
                zoomOut: document.getElementById('menu-zoom-out'), 
                toggleGrid: document.getElementById('menu-toggle-grid'), 
                toggleTiling: document.getElementById('menu-toggle-tiling'), 
                showPreview: document.getElementById('menu-show-preview'), 
                cut: document.getElementById('menu-cut'), 
                copy: document.getElementById('menu-copy'), 
                paste: document.getElementById('menu-paste'), 
                toggleLayers: document.getElementById('menu-toggle-layers'), 
                toggleHistory: document.getElementById('menu-toggle-history'), 
                toggleTimeline: document.getElementById('menu-toggle-timeline'), 
                helpReadme: document.getElementById('menu-help-readme'), 
                helpShortcuts: document.getElementById('menu-help-shortcuts'), 
                helpExamples: document.getElementById('menu-help-examples'),
            },
            previewModal: document.getElementById('preview-modal'),
            previewWindow: document.getElementById('preview-window'),
            previewCanvas: document.getElementById('preview-canvas'),
            previewCloseBtn: document.getElementById('preview-close-btn'),
            previewResizeHandle: document.getElementById('preview-resize-handle'),
            preferencesModal: document.getElementById('preferences-modal'),
            preferencesCloseBtn: document.getElementById('preferences-close-btn'),
            canvasBgColorInput: document.getElementById('canvas-bg-color'),
            gridLineColorInput: document.getElementById('grid-line-color'),
            gridLineOpacityInput: document.getElementById('grid-line-opacity'),
            rulerTop: document.getElementById('ruler-top'),
            rulerLeft: document.getElementById('ruler-left'),
            rulerTopCanvas: document.getElementById('ruler-top-canvas'),
            rulerLeftCanvas: document.getElementById('ruler-left-canvas'),
            guidesContainer: document.getElementById('guides-container'),
            readmeModal: document.getElementById('readme-modal'),
            shortcutsModal: document.getElementById('shortcuts-modal'),
            examplesModal: document.getElementById('examples-modal'),
            readmeCloseBtn: document.getElementById('readme-close-btn'),
            shortcutsCloseBtn: document.getElementById('shortcuts-close-btn'),
            examplesCloseBtn: document.getElementById('examples-close-btn'),
        };
    },

    initState() {
        this.state = {
            DEFAULT_COLORS: [ '#FFFFFF', '#C1C1C1', '#EF130B', '#FF7100', '#FFE400', '#00CC00', '#00B2FF', '#231FD3', '#A300BA', '#FF00A3', '#000000'],
            currentColor: '#000000',
            recentColors: [],
            activeTool: 'brush',
            isInteracting: false,
            toolStatusTimeout: null,
            toolState: {},
            view: { scale: 1, panX: 0, panY: 0 },
            selection: { isActive: false, x1: 0, y1: 0, x2: 0, y2: 0 },
            isGridVisible: true,
            isTilingEnabled: false,
            isPreviewVisible: false,
            clipboard: null,
            guides: { h: [], v: [] },
            preferences: {
                canvasBg: '#3c3c3c',
                gridColor: '#555555',
                gridOpacity: 1.0,
                defaultGridSize: 16,
                lastActiveTool: 'brush',
            },
            lastMousePos: { x: 0, y: 0 },
            rulerUpdatePending: false,
        };
    },

    initManagers() {
        this.managers = {
            colorPicker: new ColorPicker(),
            historyManager: new HistoryManager(),
            layerManager: new LayerManager(),
            rightSidebar: new SidebarManager('right'),
        };
    },

    initManagerCallbacks() {
        this.managers.historyManager.onUpdate = this.updateHistoryUI.bind(this);
        this.managers.layerManager.onUpdate = (state) => this.updateLayersUI(state);
    },

    loadPreferences() {
        const saved = StorageManager.loadPreferences();
        if (saved) {
            this.state.preferences = { ...this.state.preferences, ...saved };
            if (saved.defaultGridSize) {
                this.elements.gridSizeSelect.value = saved.defaultGridSize;
            }
        }
    },

    savePreferences() {
        StorageManager.savePreferences(this.state.preferences);
    },

    loadSession() {
        const session = StorageManager.loadSession();
        if (session) {
            if (session.view) this.state.view = session.view;
            if (session.lastTool) this.state.preferences.lastActiveTool = session.lastTool;
        }
    },

    saveSession() {
        StorageManager.saveSession({
            view: this.state.view,
            lastTool: this.state.activeTool,
            clipboard: this.state.clipboard,
        });
    },

    setupAutoSave() {
        setInterval(() => {
            const projectData = {
                gridSize: parseInt(this.elements.gridSizeSelect.value, 10),
                layerManagerSnapshot: this.managers.layerManager.getSnapshot(),
                timestamp: Date.now()
            };
            StorageManager.saveAutosave(projectData);
            Logger.info('Auto-saved project');
        }, 180000); // Every 3 minutes
    },

    async checkAutoSaveRecovery() {
        try {
            const autosave = await StorageManager.loadLatestAutosave();
            if (autosave && autosave.timestamp > Date.now() - 86400000) { // Within 24 hours
                if (confirm('An auto-saved project was found. Would you like to recover it?')) {
                    this.elements.gridSizeSelect.value = autosave.gridSize;
                    this.createGrid();
                    this.managers.layerManager.loadSnapshot(autosave.layerManagerSnapshot);
                    this.managers.historyManager.clear();
                    this.managers.historyManager.pushState(this.managers.layerManager.getSnapshot());
                    this.updateToolStatus('Project Recovered', true);
                }
            }
        } catch (e) {
            Logger.error('Failed to check autosave:', e);
        }
    },

    addToRecentColors(color) {
        if (!color || color === 'transparent' || color === '') return;
        
        const normalized = color.toLowerCase();
        this.state.recentColors = this.state.recentColors.filter(c => c.toLowerCase() !== normalized);
        this.state.recentColors.unshift(color);
        this.state.recentColors = this.state.recentColors.slice(0, 10);
        
        StorageManager.saveRecentColors(this.state.recentColors);
        this.renderRecentColors();
    },

    renderRecentColors() {
        if (!this.elements.recentColorsContainer) return;
        
        this.elements.recentColorsContainer.innerHTML = '';
        this.state.recentColors.forEach(color => {
            const swatch = document.createElement('div');
            swatch.className = 'color-swatch recent-swatch';
            swatch.style.backgroundColor = color;
            swatch.dataset.color = color;
            swatch.title = `Recent: ${color}`;
            swatch.addEventListener('click', this.selectColor.bind(this));
            this.elements.recentColorsContainer.appendChild(swatch);
        });
    },

    renderMainGrid() { 
        const compositeData = this.managers.layerManager.getCompositeGrid(); 
        Array.from(this.elements.pixelGrid.children).forEach((pixel, i) => { 
            pixel.style.backgroundColor = compositeData[i] || 'transparent'; 
        }); 
    },

    updatePreviewWindow() { 
        if (!this.state.isPreviewVisible) return; 
        const size = parseInt(this.elements.gridSizeSelect.value, 10); 
        const previewCanvas = this.elements.previewCanvas; 
        const container = previewCanvas.parentElement; 
        const containerSize = Math.min(container.clientWidth, container.clientHeight); 
        previewCanvas.width = containerSize; 
        previewCanvas.height = containerSize; 
        const ctx = previewCanvas.getContext('2d'); 
        ctx.imageSmoothingEnabled = false; 
        const sourceCanvas = this.renderGridToCanvas(size); 
        ctx.drawImage(sourceCanvas, 0, 0, containerSize, containerSize); 
    },

    updateTilingView() { 
        if (!this.state.isTilingEnabled) return; 
        const size = parseInt(this.elements.gridSizeSelect.value, 10); 
        const wasHidden = this.elements.pixelGrid.style.visibility === 'hidden'; 
        if (wasHidden) this.elements.pixelGrid.style.visibility = 'visible'; 
        const canvas = this.renderGridToCanvas(size * 2); 
        const dataUrl = canvas.toDataURL(); 
        this.elements.appContainer.style.backgroundImage = `url(${dataUrl})`; 
        this.elements.appContainer.style.backgroundSize = `${this.elements.pixelGrid.clientWidth}px ${this.elements.pixelGrid.clientHeight}px`; 
        if (wasHidden) this.elements.pixelGrid.style.visibility = 'hidden'; 
    },

    updateAllVisuals() { 
        this.renderMainGrid(); 
        if (this.state.isPreviewVisible) this.updatePreviewWindow(); 
        if (this.state.isTilingEnabled) this.updateTilingView(); 
        this.scheduleRulerUpdate();
        this.renderGuides(); 
    },

    scheduleRulerUpdate() {
        if (!this.state.rulerUpdatePending) {
            this.state.rulerUpdatePending = true;
            requestAnimationFrame(() => {
                this.updateRulers();
                this.state.rulerUpdatePending = false;
            });
        }
    },

    updateHistoryUI(state) { 
        const { stackSize, currentIndex, canUndo, canRedo } = state; 
        this.elements.undoButton.disabled = !canUndo; 
        this.elements.redoButton.disabled = !canRedo; 
        this.elements.menu.undo.style.opacity = canUndo ? '1' : '0.5'; 
        this.elements.menu.redo.style.opacity = canRedo ? '1' : '0.5'; 
        this.elements.historyList.innerHTML = ''; 
        for (let i = 0; i < stackSize; i++) { 
            const li = document.createElement('li'); 
            li.textContent = i === 0 ? 'Initial State' : `Action ${i}`; 
            if (i === currentIndex) li.className = 'active'; 
            li.dataset.index = i; 
            this.elements.historyList.appendChild(li); 
        } 
        const activeItem = this.elements.historyList.querySelector('.active'); 
        if (activeItem) activeItem.scrollIntoView({ block: 'nearest' }); 
    },
    
    updateLayersUI({ layers, activeItemId }) {
        this.elements.layerList.innerHTML = '';
        this.elements.deleteLayerButton.disabled = !activeItemId;
        this._renderLayerItems(layers, this.elements.layerList, 0);
        this.updateAllVisuals();
    },

    _renderLayerItems(items, parentElement, level) {
        items.forEach(item => {
            const li = document.createElement('li');
            li.className = 'layer-item';
            li.classList.toggle('group', item.type === 'group');
            li.classList.toggle('active', item.id === this.managers.layerManager.activeItemId);
            li.dataset.id = item.id;
    
            const content = document.createElement('div');
            content.className = 'layer-content';
            content.style.paddingLeft = `${8 + level * 20}px`;
    
            let contentHTML = '';
            if (item.type === 'group') {
                contentHTML += `<span class="group-toggle ${item.expanded ? 'expanded' : ''}" title="Expand/Collapse Group">►</span>`;
            } else {
                contentHTML += `<span class="group-toggle-placeholder" style="width:16px; display:inline-block;"></span>`;
            }
    
            contentHTML += `
                <svg class="layer-visibility ${item.visible ? '' : 'hidden'}" title="Toggle Visibility" viewBox="0 0 24 24"><path fill="currentColor" d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/></svg>
                <span class="layer-name">${item.name}</span>
            `;
            content.innerHTML = contentHTML;
            li.appendChild(content);
    
            if (item.type === 'layer') {
                const opacityControl = document.createElement('div');
                opacityControl.className = 'layer-opacity-control';
                opacityControl.style.paddingLeft = `${8 + level * 20}px`;
                opacityControl.title = 'Layer Opacity';
                
                const opacityHeader = document.createElement('div');
                opacityHeader.className = 'layer-opacity-header';
                opacityHeader.innerHTML = `
                    <span class="label">Opacity</span>
                    <span class="value">${Math.round(item.opacity * 100)}%</span>
                `;
                
                const slider = document.createElement('input');
                slider.type = 'range';
                slider.className = 'opacity-slider';
                slider.min = '0';
                slider.max = '1';
                slider.step = '0.01';
                slider.value = item.opacity;
                
                slider.addEventListener('input', (e) => {
                    const opacity = parseFloat(e.target.value);
                    opacityHeader.querySelector('.value').textContent = `${Math.round(opacity * 100)}%`;
                    this.managers.layerManager.setItemProperty(item.id, 'opacity', opacity);
                    this.updateAllVisuals();
                });
                
                slider.addEventListener('change', () => {
                    this.managers.historyManager.pushState(this.managers.layerManager.getSnapshot());
                });
                
                opacityControl.appendChild(opacityHeader);
                opacityControl.appendChild(slider);
                li.appendChild(opacityControl);
            }
    
            parentElement.appendChild(li);
    
            if (item.type === 'group' && item.expanded) {
                const childrenUl = document.createElement('ul');
                childrenUl.className = 'layer-group-children';
                li.appendChild(childrenUl);
                this._renderLayerItems(item.children, childrenUl, level + 1);
            }
        });
    },

    updateActiveToolUI() { 
        document.querySelectorAll('.tool-button.active').forEach(b => b.classList.remove('active')); 
        document.querySelectorAll('.color-swatch.active').forEach(s => s.classList.remove('active')); 
        const toolId = this.state.activeTool.replace(/-/g, ''); 
        if (this.elements.toolButtons[toolId]) this.elements.toolButtons[toolId].classList.add('active'); 
        if (this.state.activeTool === 'brush') { 
            const currentSwatch = [...this.elements.colorPaletteContainer.querySelectorAll('.color-swatch')].find(s => s.dataset.color.toLowerCase() === this.state.currentColor.toLowerCase()); 
            if (currentSwatch) currentSwatch.classList.add('active'); 
        } 
    },

    getPixelCoords(e) { 
        const rect = this.elements.pixelGrid.getBoundingClientRect(); 
        const x = e.clientX - rect.left; 
        const y = e.clientY - rect.top; 
        const size = parseInt(this.elements.gridSizeSelect.value, 10); 
        const col = Math.floor(x / rect.width * size); 
        const row = Math.floor(y / rect.height * size); 
        if (col < 0 || col >= size || row < 0 || row >= size) return null; 
        return { x: col, y: row, index: row * size + col }; 
    },

    updatePixelCoordinates(e) {
        if (!this.elements.coordinatesEl) return;
        const coords = this.getPixelCoords(e);
        if (coords) {
            this.elements.coordinatesEl.textContent = `X: ${coords.x}, Y: ${coords.y}`;
        } else {
            this.elements.coordinatesEl.textContent = '';
        }
    },

    updateSelectionMarquee() { 
        if (!this.state.selection.isActive) { 
            this.elements.selectionMarquee.style.display = 'none'; 
            return; 
        } 
        const gridRect = this.elements.pixelGrid.getBoundingClientRect(); 
        const size = parseInt(this.elements.gridSizeSelect.value, 10); 
        const pixelWidth = gridRect.width / size; 
        const pixelHeight = gridRect.height / size; 
        const x1 = Math.min(this.state.selection.x1, this.state.selection.x2); 
        const y1 = Math.min(this.state.selection.y1, this.state.selection.y2); 
        const x2 = Math.max(this.state.selection.x1, this.state.selection.x2); 
        const y2 = Math.max(this.state.selection.y1, this.state.selection.y2); 
        this.elements.selectionMarquee.style.display = 'block'; 
        this.elements.selectionMarquee.style.left = `${this.elements.pixelGrid.offsetLeft + x1 * pixelWidth}px`; 
        this.elements.selectionMarquee.style.top = `${this.elements.pixelGrid.offsetTop + y1 * pixelHeight}px`; 
        this.elements.selectionMarquee.style.width = `${(x2 - x1 + 1) * pixelWidth}px`; 
        this.elements.selectionMarquee.style.height = `${(y2 - y1 + 1) * pixelHeight}px`; 
    },

    clearSelection() { 
        this.state.selection.isActive = false; 
        this.updateSelectionMarquee(); 
    },

    updateView() { 
        this.elements.pixelGrid.style.transform = `scale(${this.state.view.scale})`; 
        this.elements.appContainer.scrollLeft = this.state.view.panX; 
        this.elements.appContainer.scrollTop = this.state.view.panY; 
        this.scheduleRulerUpdate();
        this.renderGuides(); 
    },

    applyPreferences() { 
        document.documentElement.style.setProperty('--grid-bg', this.state.preferences.canvasBg); 
        const gridColorRgb = ColorUtils.parseColor(this.state.preferences.gridColor); 
        const gridRgba = `rgba(${gridColorRgb.r}, ${gridColorRgb.g}, ${gridColorRgb.b}, ${this.state.preferences.gridOpacity})`; 
        document.documentElement.style.setProperty('--grid-line', gridRgba); 
    },

    renderGuides() { 
        this.elements.guidesContainer.innerHTML = ''; 
        const gridRect = this.elements.pixelGrid.getBoundingClientRect(); 
        const size = parseInt(this.elements.gridSizeSelect.value, 10); 
        const pixelSize = gridRect.width / size; 
        this.state.guides.h.forEach((pos, i) => { 
            const guide = document.createElement('div'); 
            guide.className = 'guide horizontal'; 
            guide.style.top = `${this.elements.pixelGrid.offsetTop + pos * pixelSize}px`; 
            guide.dataset.index = i; 
            guide.dataset.orientation = 'h'; 
            this.elements.guidesContainer.appendChild(guide); 
        }); 
        this.state.guides.v.forEach((pos, i) => { 
            const guide = document.createElement('div'); 
            guide.className = 'guide vertical'; 
            guide.style.left = `${this.elements.pixelGrid.offsetLeft + pos * pixelSize}px`; 
            guide.dataset.index = i; 
            guide.dataset.orientation = 'v'; 
            this.elements.guidesContainer.appendChild(guide); 
        }); 
    },

    updateRulers() {
        const drawRuler = (canvas, isHorizontal) => {
            const ctx = canvas.getContext('2d');
            const { width, height } = canvas.getBoundingClientRect();
            canvas.width = width * devicePixelRatio;
            canvas.height = height * devicePixelRatio;
            ctx.scale(devicePixelRatio, devicePixelRatio);
            ctx.clearRect(0, 0, width, height);

            const gridRect = this.elements.pixelGrid.getBoundingClientRect();
            const appRect = this.elements.appContainer.getBoundingClientRect();
            const size = parseInt(this.elements.gridSizeSelect.value, 10);
            const scale = this.state.view.scale;
            const pixelSize = (gridRect.width / size) * scale;

            const start = isHorizontal ? (gridRect.left - appRect.left - this.elements.appContainer.scrollLeft) : (gridRect.top - appRect.top - this.elements.appContainer.scrollTop);
            
            ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--ruler-text');
            ctx.font = '10px sans-serif';

            const majorTick = (pixelSize > 5) ? 1 : (pixelSize > 2) ? 5 : 10;
            for (let i = 0; i < size; i++) {
                const pos = start + i * pixelSize;
                const isMajor = (i % majorTick === 0);
                const tickLength = isMajor ? (isHorizontal ? height : width) / 2 : (isHorizontal ? height : width) / 4;
                
                if (isHorizontal) {
                    ctx.fillRect(pos, height - tickLength, 1, tickLength);
                    if (isMajor) {
                        ctx.textAlign = 'center';
                        ctx.fillText(i, pos, height - tickLength - 2);
                    }
                } else {
                    ctx.fillRect(width - tickLength, pos, tickLength, 1);
                     if (isMajor) {
                        ctx.save();
                        ctx.translate(width - tickLength - 2, pos);
                        ctx.rotate(-Math.PI / 2);
                        ctx.textAlign = 'center';
                        ctx.fillText(i, 0, 0);
                        ctx.restore();
                    }
                }
            }
        };
        drawRuler(this.elements.rulerTopCanvas, true);
        drawRuler(this.elements.rulerLeftCanvas, false);
    },

    updateToolStatus(text, temporary = false, duration = 1500) { 
        if (this.state.toolStatusTimeout) clearTimeout(this.state.toolStatusTimeout); 
        this.elements.toolStatusEl.textContent = text; 
        if (temporary) { 
            this.state.toolStatusTimeout = setTimeout(this.revertToolStatus.bind(this), duration); 
        } 
    },

    revertToolStatus() { 
        let s='Unknown'; 
        switch(this.state.activeTool){ 
            case 'brush':s='Paint Brush';break; 
            case 'dither-brush':s='Dithering Brush';break; 
            case 'eraser':s='Eraser';break; 
            case 'eyedropper':s='Eyedropper';break; 
            case 'fill':s='Paint Bucket';break; 
            case 'marquee':s='Marquee Select';break; 
            case 'magic-wand':s='Magic Wand';break; 
            case 'line':s='Line Tool';break; 
            case 'shape':s='Rectangle Tool';break; 
            case 'circle':s='Circle Tool';break; 
            case 'zoom':s='Zoom Tool';break; 
            case 'pan':s='Pan Tool';break; 
        } 
        this.updateToolStatus(`${s} Selected`); 
    },

    createGrid() { 
        this.clearSelection(); 
        const size = parseInt(this.elements.gridSizeSelect.value, 10); 
        this.elements.pixelGrid.innerHTML = ''; 
        this.elements.pixelGrid.style.gridTemplateColumns = `repeat(${size}, 1fr)`; 
        this.elements.pixelGrid.style.gridTemplateRows = `repeat(${size}, 1fr)`; 
        for (let i = 0; i < size * size; i++) this.elements.pixelGrid.appendChild(document.createElement('div')).className = 'pixel'; 
        this.managers.layerManager.init(size); 
        this.managers.historyManager.clear(); 
        this.managers.historyManager.pushState(this.managers.layerManager.getSnapshot()); 
        this.updateToolStatus('New Grid Created', true); 
        this.scheduleRulerUpdate();
        
        // Save grid size preference
        this.state.preferences.defaultGridSize = size;
        this.savePreferences();
    },

    addNewColorToPalette(color, select = false) { 
        const existingSwatch = [...this.elements.colorPaletteContainer.querySelectorAll('.color-swatch')].find(s => s.dataset.color.toLowerCase() === color.toLowerCase()); 
        if (existingSwatch) { 
            if (select) existingSwatch.click(); 
            return; 
        } 
        const swatch = document.createElement('div'); 
        swatch.className = 'color-swatch'; 
        swatch.style.backgroundColor = color; 
        swatch.dataset.color = color; 
        swatch.addEventListener('click', this.selectColor.bind(this)); 
        this.elements.colorPaletteContainer.appendChild(swatch); 
        if (select) swatch.click(); 
    },

    createPalette() { 
        this.elements.colorPaletteContainer.innerHTML = ''; 
        this.state.DEFAULT_COLORS.forEach(color => this.addNewColorToPalette(color)); 
        
        // Load recent colors
        this.state.recentColors = StorageManager.loadRecentColors();
        this.renderRecentColors();
        
        this.updateActiveToolUI(); 
    },

    selectColor(e) { 
        this.state.currentColor = e.target.dataset.color; 
        this.addToRecentColors(this.state.currentColor);
        this.activateTool('brush'); 
    },

    activateTool(toolName) { 
        const toolId = toolName.replace('tool-', ''); 
        this.elements.pixelGrid.style.cursor='default'; 
        if(['brush','dither-brush','eraser','line','shape','circle','fill','eyedropper','magic-wand','marquee'].includes(toolId))
            this.elements.pixelGrid.style.cursor='crosshair';
        else if(toolId==='pan')
            this.elements.pixelGrid.style.cursor='grab';
        else if(toolId==='zoom')
            this.elements.pixelGrid.style.cursor='zoom-in'; 
        
        this.state.activeTool = toolId; 
        this.state.preferences.lastActiveTool = toolId;
        this.savePreferences();
        this.revertToolStatus(); 
        this.updateActiveToolUI(); 
        if (toolId !== 'marquee') this.clearSelection(); 
    },

    applyPixelIndices(indices, color) { 
        const { layerManager } = this.managers; 
        const found = layerManager.findItem(layerManager.activeItemId); 
        if (!found || found.item.type !== 'layer') return; 
        indices.forEach(index => { 
            found.item.data[index] = color; 
        }); 
        layerManager.markDirty();
        this.updateAllVisuals(); 
    },

    handleImageFileOpen(e) { 
        const f=e.target.files[0];
        if(!f)return;
        const r=new FileReader();
        r.onload=e=>{
            const i=new Image();
            i.onload=()=>{
                const s=parseInt(this.elements.gridSizeSelect.value,10),
                    c=document.createElement('canvas');
                c.width=s;c.height=s;
                const x=c.getContext('2d');
                x.imageSmoothingEnabled=false;
                x.drawImage(i,0,0,s,s);
                const d=x.getImageData(0,0,s,s).data,n=[];
                for(let j=0;j<d.length;j+=4){
                    const[r,g,b,a]=[d[j],d[j+1],d[j+2],d[j+3]];
                    n.push(a===0?'':`rgba(${r},${g},${b},${a/255})`);
                }
                this.createGrid();
                this.managers.layerManager.setLayerData(n);
                this.managers.historyManager.pushState(this.managers.layerManager.getSnapshot())
            };
            i.src=e.target.result
        };
        r.readAsDataURL(f);
    },

    handleProjectFileOpen(e) { 
        const f=e.target.files[0];
        if(!f)return;
        const r=new FileReader();
        r.onload=e=>{
            try{
                const d=JSON.parse(e.target.result);
                if(!d.gridSize||!d.layerManagerSnapshot)throw new Error("Invalid format.");
                this.elements.gridSizeSelect.value=d.gridSize;
                this.createGrid();
                this.managers.layerManager.loadSnapshot(d.layerManagerSnapshot);
                this.managers.historyManager.clear();
                this.managers.historyManager.pushState(this.managers.layerManager.getSnapshot());
                this.updateToolStatus('Project Loaded',true)
            }catch(err){
                alert('Error: Could not load project file.')
            }
        };
        r.readAsText(f);
    },

    saveProject() { 
        const s={
            gridSize:parseInt(this.elements.gridSizeSelect.value,10),
            layerManagerSnapshot:this.managers.layerManager.getSnapshot()
        },
        j=JSON.stringify(s,null,2),
        b=new Blob([j],{type:'application/json'});
        this.triggerDownload(URL.createObjectURL(b),'pixel-project.json');
    },

    triggerDownload(href, filename) { 
        const l=document.createElement('a');
        l.download=filename;
        l.href=href;
        l.click();
        if(href.startsWith('blob:'))URL.revokeObjectURL(href);
    },

    renderGridToCanvas(renderSize) { 
        const canvas = document.createElement('canvas'); 
        const size = parseInt(this.elements.gridSizeSelect.value, 10); 
        const pixelSize = renderSize / size; 
        canvas.width = renderSize; 
        canvas.height = renderSize; 
        const ctx = canvas.getContext('2d'); 
        const compositeData = this.managers.layerManager.getCompositeGrid(); 
        for (let i = 0; i < compositeData.length; i++) { 
            if (compositeData[i]) { 
                const x = (i % size) * pixelSize; 
                const y = Math.floor(i / size) * pixelSize; 
                ctx.fillStyle = compositeData[i]; 
                ctx.fillRect(x, y, pixelSize, pixelSize); 
            } 
        } 
        return canvas; 
    },

    downloadAsPNG() { 
        this.triggerDownload(this.renderGridToCanvas(512).toDataURL('image/png'),'pixel-art.png');
    },

    generateSVG() { 
        const s=parseInt(this.elements.gridSizeSelect.value,10);
        let r='';
        this.managers.layerManager.getCompositeGrid().forEach((c,i)=>{
            if(c){
                const o=Math.floor(i/s),l=i%s;
                r+=`\n  <rect x="${l}" y="${o}" width="1" height="1" fill="${c}"/>`;
            }
        });
        return `<svg width="${s}" height="${s}" viewBox="0 0 ${s} ${s}" xmlns="http://www.w3.org/2000/svg" shape-rendering="crispEdges">${r}\n</svg>`;
    },

    downloadAsSVG() { 
        const u=URL.createObjectURL(new Blob([this.generateSVG()],{type:'image/svg+xml'}));
        this.triggerDownload(u,'pixel-art.svg');
    },

    copySVGCode() { 
        navigator.clipboard.writeText(this.generateSVG());
    },

    downloadAsICO() { 
        this.renderGridToCanvas(32).toBlob(async(b)=>{
            const p=await b.arrayBuffer(),i=new ArrayBuffer(22+p.byteLength),d=new DataView(i);
            d.setUint16(2,1,true);d.setUint16(4,1,true);d.setUint8(6,32);d.setUint8(7,32);
            d.setUint16(10,1,true);d.setUint16(12,32,true);d.setUint32(14,p.byteLength,true);
            d.setUint32(18,22,true);new Uint8Array(i).set(new Uint8Array(p),22);
            const u=URL.createObjectURL(new Blob([i],{type:'image/x-icon'}));
            this.triggerDownload(u,'pixel-art.ico')
        },'image/png');
    },

    handleUndo() { 
        !this.elements.undoButton.disabled && this.managers.layerManager.loadSnapshot(this.managers.historyManager.undo()); 
    },

    handleRedo() { 
        !this.elements.redoButton.disabled && this.managers.layerManager.loadSnapshot(this.managers.historyManager.redo()); 
    },

    handleCopy() { 
        if (!this.state.selection.isActive) return; 
        const size = parseInt(this.elements.gridSizeSelect.value, 10); 
        const activeItem = this.managers.layerManager.findItem(this.managers.layerManager.activeItemId); 
        if (!activeItem || activeItem.item.type !== 'layer') return; 
        const {x1, y1, x2, y2} = this.state.selection; 
        const startX = Math.min(x1, x2); 
        const startY = Math.min(y1, y2); 
        const endX = Math.max(x1, x2); 
        const endY = Math.max(y1, y2); 
        const width = endX - startX + 1; 
        const height = endY - startY + 1; 
        const data = []; 
        for (let y = startY; y <= endY; y++) { 
            for (let x = startX; x <= endX; x++) { 
                data.push(activeItem.item.data[y * size + x]); 
            } 
        } 
        this.state.clipboard = { width, height, data }; 
        this.updateToolStatus('Selection Copied', true); 
    },

    handleCut() { 
        if (!this.state.selection.isActive) return; 
        this.handleCopy(); 
        const size = parseInt(this.elements.gridSizeSelect.value, 10); 
        const {x1, y1, x2, y2} = this.state.selection; 
        const startX = Math.min(x1, x2); 
        const startY = Math.min(y1, y2); 
        const endX = Math.max(x1, x2); 
        const endY = Math.max(y1, y2); 
        const indicesToClear = []; 
        for (let y = startY; y <= endY; y++) { 
            for (let x = startX; x <= endX; x++) { 
                indicesToClear.push(y * size + x); 
            } 
        } 
        const activeItem = this.managers.layerManager.findItem(this.managers.layerManager.activeItemId); 
        if (!activeItem || activeItem.item.type !== 'layer') return; 
        indicesToClear.forEach(index => { 
            activeItem.item.data[index] = ''; 
        }); 
        this.clearSelection(); 
        this.managers.historyManager.pushState(this.managers.layerManager.getSnapshot()); 
        this.updateAllVisuals(); 
        this.updateToolStatus('Selection Cut', true); 
    },

    handlePaste() { 
        if (!this.state.clipboard) return; 
        const size = parseInt(this.elements.gridSizeSelect.value, 10); 
        this.managers.layerManager.addLayer(size); 
        this.managers.layerManager.setItemProperty(this.managers.layerManager.activeItemId, 'name', 'Pasted Layer'); 
        const newLayer = this.managers.layerManager.findItem(this.managers.layerManager.activeItemId).item; 
        for (let y = 0; y < this.state.clipboard.height; y++) { 
            for (let x = 0; x < this.state.clipboard.width; x++) { 
                const targetIndex = y * size + x; 
                if (targetIndex < newLayer.data.length) { 
                    newLayer.data[targetIndex] = this.state.clipboard.data[y * this.state.clipboard.width + x]; 
                } 
            } 
        } 
        this.managers.historyManager.pushState(this.managers.layerManager.getSnapshot()); 
        this.updateAllVisuals(); 
        this.updateToolStatus('Pasted to New Layer', true); 
    },

    makeDraggable(handle, container) { 
        let isDragging = false, offsetX, offsetY; 
        const onMouseDown = (e) => { 
            if (e.button !== 0) return; 
            isDragging = true; 
            const rect = container.getBoundingClientRect(); 
            offsetX = e.clientX - rect.left; 
            offsetY = e.clientY - rect.top; 
            container.style.position = 'fixed'; 
            container.style.transform = 'none'; 
            document.addEventListener('mousemove', onMouseMove); 
            document.addEventListener('mouseup', onMouseUp, { once: true }); 
            e.preventDefault(); 
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
    },

    makeResizable(container, handle) { 
        let isResizing = false; 
        const onMouseDown = (e) => { 
            isResizing = true; 
            const startX = e.clientX; 
            const startY = e.clientY; 
            const startWidth = parseInt(document.defaultView.getComputedStyle(container).width, 10); 
            const startHeight = parseInt(document.defaultView.getComputedStyle(container).height, 10); 
            const onMouseMove = (moveEvent) => { 
                if (!isResizing) return; 
                container.style.width = startWidth + moveEvent.clientX - startX + 'px'; 
                container.style.height = startHeight + moveEvent.clientY - startY + 'px'; 
                this.updatePreviewWindow(); 
            }; 
            const onMouseUp = () => { 
                isResizing = false; 
                window.removeEventListener('mousemove', onMouseMove); 
                window.removeEventListener('mouseup', onMouseUp); 
            }; 
            window.addEventListener('mousemove', onMouseMove); 
            window.addEventListener('mouseup', onMouseUp, { once: true }); 
            e.preventDefault(); 
        }; 
        handle.addEventListener('mousedown', onMouseDown); 
    }
};

document.addEventListener('DOMContentLoaded', () => App.init());
