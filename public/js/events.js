// VERSION: 1.0.3
const EventHandlers = {
    init(appInstance) {
        this.App = appInstance;
        this.addEventListeners();
    },

    interactionStart(e) { 
        if (e.button !== 0) return; 
        e.preventDefault(); 
        this.App.state.isInteracting = true; 
        window.addEventListener('mousemove', this.interactionMove.bind(this)); 
        window.addEventListener('mouseup', this.interactionEnd.bind(this), { once: true }); 
        if (this.App.state.activeTool !== 'marquee') this.App.clearSelection(); 
        const coords = this.App.getPixelCoords(e); 
        if (!coords) { 
            this.interactionEnd(e); 
            return; 
        } 
        this.App.state.toolState = { 
            startX: coords.x, 
            startY: coords.y, 
            startPanX: this.App.elements.appContainer.scrollLeft, 
            startPanY: this.App.elements.appContainer.scrollTop, 
            startMouseX: e.clientX, 
            startMouseY: e.clientY 
        }; 
        const index = coords.index; 
        const size = parseInt(this.App.elements.gridSizeSelect.value, 10); 
        const activeItem = this.App.managers.layerManager.findItem(this.App.managers.layerManager.activeItemId); 
        const activeLayer = (activeItem && activeItem.item.type === 'layer') ? activeItem.item : null; 
        
        switch (this.App.state.activeTool) { 
            case 'brush': 
            case 'eraser': 
                if(activeLayer) this.App.applyPixelIndices([index], this.App.state.activeTool === 'eraser' ? '' : this.App.state.currentColor); 
                break; 
            case 'dither-brush': 
                if (activeLayer && (coords.x + coords.y) % 2 === 0) { 
                    this.App.applyPixelIndices([index], this.App.state.currentColor); 
                } 
                break; 
            case 'eyedropper': 
                const c = Tools.eyedropper(index, this.App.managers.layerManager.getCompositeGrid()); 
                if (c) {
                    this.App.addNewColorToPalette(c, true);
                    this.App.addToRecentColors(c);
                }
                this.interactionEnd(e); 
                break; 
            case 'fill': 
                if(activeLayer) { 
                    this.App.managers.layerManager.setLayerData(Tools.floodFill(index, this.App.state.currentColor, [...activeLayer.data], size)); 
                    this.App.managers.historyManager.pushState(this.App.managers.layerManager.getSnapshot()); 
                } 
                this.interactionEnd(e); 
                break; 
            case 'magic-wand': 
                if(activeLayer) { 
                    const selected = Tools.magicWand(index, activeLayer.data, size); 
                    let minX = size, minY = size, maxX = -1, maxY = -1; 
                    selected.forEach(i => { 
                        const x = i % size; 
                        const y = Math.floor(i / size); 
                        minX = Math.min(x, minX); 
                        minY = Math.min(y, minY); 
                        maxX = Math.max(x, maxX); 
                        maxY = Math.max(y, maxY); 
                    }); 
                    this.App.state.selection = { isActive: true, x1: minX, y1: minY, x2: maxX, y2: maxY }; 
                    this.App.updateSelectionMarquee(); 
                } 
                this.interactionEnd(e); 
                break; 
            case 'zoom': 
                const zoomFactor = e.altKey ? 0.8 : 1.25;
                const oldScale = this.App.state.view.scale;
                this.App.state.view.scale *= zoomFactor;
                this.App.state.view.scale = Math.max(0.1, Math.min(10, this.App.state.view.scale));
                
                // Zoom to cursor position
                const rect = this.App.elements.pixelGrid.getBoundingClientRect();
                const mouseX = e.clientX - rect.left;
                const mouseY = e.clientY - rect.top;
                const scaleRatio = this.App.state.view.scale / oldScale;
                this.App.state.view.panX = mouseX - (mouseX - this.App.state.view.panX) * scaleRatio;
                this.App.state.view.panY = mouseY - (mouseY - this.App.state.view.panY) * scaleRatio;
                
                this.App.updateView(); 
                this.interactionEnd(e); 
                break; 
            case 'pan': 
                this.App.elements.pixelGrid.style.cursor = 'grabbing'; 
                break; 
        } 
    },

    interactionMove(e) { 
        if (!this.App.state.isInteracting) return; 
        e.preventDefault(); 
        const coords = this.App.getPixelCoords(e); 
        if (!coords) return; 
        const size = parseInt(this.App.elements.gridSizeSelect.value, 10); 
        
        switch (this.App.state.activeTool) { 
            case 'brush': 
            case 'eraser': 
                this.App.applyPixelIndices(
                    Tools.line(
                        this.App.state.toolState.lastX || this.App.state.toolState.startX, 
                        this.App.state.toolState.lastY || this.App.state.toolState.startY, 
                        coords.x, coords.y, size
                    ), 
                    this.App.state.activeTool === 'eraser' ? '' : this.App.state.currentColor
                ); 
                break; 
            case 'dither-brush': { 
                const ditheredIndices = []; 
                const lineIndices = Tools.line(
                    this.App.state.toolState.lastX || this.App.state.toolState.startX, 
                    this.App.state.toolState.lastY || this.App.state.toolState.startY, 
                    coords.x, coords.y, size
                ); 
                lineIndices.forEach(i => { 
                    const x = i % size; 
                    const y = Math.floor(i / size); 
                    if ((x + y) % 2 === 0) { 
                        ditheredIndices.push(i); 
                    } 
                }); 
                this.App.applyPixelIndices(ditheredIndices, this.App.state.currentColor); 
                break; 
            } 
            case 'marquee': 
                this.App.state.selection = { 
                    isActive: true, 
                    x1: this.App.state.toolState.startX, 
                    y1: this.App.state.toolState.startY, 
                    x2: coords.x, 
                    y2: coords.y 
                }; 
                this.App.updateSelectionMarquee(); 
                break; 
            case 'line': 
            case 'shape': 
            case 'circle': { 
                this.App.updateAllVisuals(); 
                let indices; 
                if (this.App.state.activeTool === 'line') { 
                    indices = Tools.line(this.App.state.toolState.startX, this.App.state.toolState.startY, coords.x, coords.y, size); 
                } else if (this.App.state.activeTool === 'shape') { 
                    indices = e.shiftKey ? 
                        Tools.rectangleFilled(this.App.state.toolState.startX, this.App.state.toolState.startY, coords.x, coords.y, size) : 
                        Tools.rectangle(this.App.state.toolState.startX, this.App.state.toolState.startY, coords.x, coords.y, size); 
                } else { 
                    indices = e.shiftKey ? 
                        Tools.circleFilled(this.App.state.toolState.startX, this.App.state.toolState.startY, coords.x, coords.y, size) : 
                        Tools.circle(this.App.state.toolState.startX, this.App.state.toolState.startY, coords.x, coords.y, size); 
                } 
                this.App.applyPixelIndices(indices, 'rgba(255,255,255,0.5)'); 
                break; 
            } 
            case 'pan': 
                const dx = e.clientX - this.App.state.toolState.startMouseX; 
                const dy = e.clientY - this.App.state.toolState.startMouseY; 
                this.App.state.view.panX = this.App.state.toolState.startPanX - dx; 
                this.App.state.view.panY = this.App.state.toolState.startPanY - dy; 
                this.App.elements.appContainer.scrollLeft = this.App.state.view.panX; 
                this.App.elements.appContainer.scrollTop = this.App.state.view.panY; 
                this.App.scheduleRulerUpdate();
                break; 
        } 
        this.App.state.toolState.lastX = coords.x; 
        this.App.state.toolState.lastY = coords.y; 
    },

    interactionEnd(e) { 
        if (!this.App.state.isInteracting) return; 
        this.App.state.isInteracting = false; 
        window.removeEventListener('mousemove', this.interactionMove.bind(this)); 
        e.preventDefault(); 
        const coords = this.App.getPixelCoords(e) || { 
            x: this.App.state.toolState.lastX, 
            y: this.App.state.toolState.lastY 
        }; 
        const size = parseInt(this.App.elements.gridSizeSelect.value, 10); 
        let needsHistoryPush = false; 
        
        switch (this.App.state.activeTool) { 
            case 'brush': 
            case 'eraser': 
            case 'dither-brush': 
                needsHistoryPush = true; 
                if (this.App.state.currentColor) {
                    this.App.addToRecentColors(this.App.state.currentColor);
                }
                break; 
            case 'line': 
            case 'shape': 
            case 'circle': { 
                const activeItem = this.App.managers.layerManager.findItem(this.App.managers.layerManager.activeItemId); 
                if (activeItem && activeItem.item.type === 'layer') { 
                    let indices; 
                    if (this.App.state.activeTool === 'line') { 
                        indices = Tools.line(this.App.state.toolState.startX, this.App.state.toolState.startY, coords.x, coords.y, size); 
                    } else if (this.App.state.activeTool === 'shape') { 
                        indices = e.shiftKey ? 
                            Tools.rectangleFilled(this.App.state.toolState.startX, this.App.state.toolState.startY, coords.x, coords.y, size) : 
                            Tools.rectangle(this.App.state.toolState.startX, this.App.state.toolState.startY, coords.x, coords.y, size); 
                    } else { 
                        indices = e.shiftKey ? 
                            Tools.circleFilled(this.App.state.toolState.startX, this.App.state.toolState.startY, coords.x, coords.y, size) : 
                            Tools.circle(this.App.state.toolState.startX, this.App.state.toolState.startY, coords.x, coords.y, size); 
                    } 
                    const newLayerData = [...activeItem.item.data]; 
                    indices.forEach(i => newLayerData[i] = this.App.state.currentColor); 
                    this.App.managers.layerManager.setLayerData(newLayerData); 
                    needsHistoryPush = true; 
                    if (this.App.state.currentColor) {
                        this.App.addToRecentColors(this.App.state.currentColor);
                    }
                } 
                break; 
            } 
            case 'pan': 
                this.App.elements.pixelGrid.style.cursor = 'grab'; 
                break; 
        } 
        
        if (needsHistoryPush) {
            this.App.managers.historyManager.pushStateDebounced(this.App.managers.layerManager.getSnapshot(), 300);
        }
        this.App.state.toolState = {}; 
    },

    shortcuts(e) { 
        if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA') return; 
        const key = e.key.toLowerCase(); 
        const ctrl = e.ctrlKey || e.metaKey; 
        const shift = e.shiftKey; 
        let handled = true; 
        
        if (ctrl) { 
            switch (key) { 
                case 'z': shift ? this.App.handleRedo() : this.App.handleUndo(); break; 
                case 'y': this.App.handleRedo(); break; 
                case 's': shift ? this.App.elements.menu.saveProjectAs.click() : this.App.saveProject(); break; 
                case 'n': shift ? this.App.elements.menu.newLayer.click() : this.App.elements.menu.newProject.click(); break; 
                case 'o': this.App.elements.menu.openProject.click(); break; 
                case 'e': this.App.elements.menu.downloadPng.click(); break; 
                case 'j': this.App.elements.menu.duplicateLayer.click(); break; 
                case 'm': this.App.elements.menu.mergeDown.click(); break; 
                case '[': this.App.elements.menu.moveLayerDown.click(); break; 
                case ']': this.App.elements.menu.moveLayerUp.click(); break; 
                case '=': 
                case '+': this.App.elements.menu.zoomIn.click(); break; 
                case '-': this.App.elements.menu.zoomOut.click(); break; 
                case '0': this.App.elements.menu.fitScreen.click(); break; 
                case 'c': this.App.handleCopy(); break; 
                case 'x': this.App.handleCut(); break; 
                case 'v': this.App.handlePaste(); break; 
                case "'": this.App.elements.menu.toggleGrid.click(); break; 
                default: handled = false; 
            } 
        } else { 
            switch (key) { 
                case 'b': this.App.activateTool('tool-brush'); break; 
                case 'e': this.App.activateTool('tool-eraser'); break; 
                case 'i': this.App.activateTool('tool-eyedropper'); break; 
                case 'g': this.App.activateTool('tool-fill'); break; 
                case 'm': this.App.activateTool('tool-marquee'); break; 
                case 'w': this.App.activateTool('tool-magic-wand'); break; 
                case 'd': this.App.activateTool('tool-dither-brush'); break; 
                case 'l': this.App.activateTool('tool-line'); break; 
                case 'r': this.App.activateTool('tool-shape'); break; 
                case 'o': this.App.activateTool('tool-circle'); break; 
                case 'z': this.App.activateTool('tool-zoom'); break; 
                case 'h': this.App.activateTool('tool-pan'); break; 
                case ' ': 
                    if (!this.App.state.isInteracting) {
                        this.App.state.tempTool = this.App.state.activeTool;
                        this.App.activateTool('tool-pan');
                    }
                    break;
                case 'delete': 
                case 'backspace': this.App.elements.menu.deleteLayer.click(); break; 
                default: handled = false; 
            } 
        } 
        if (handled) e.preventDefault(); 
    },

    keyup(e) {
        if (e.key === ' ' && this.App.state.tempTool) {
            this.App.activateTool('tool-' + this.App.state.tempTool);
            delete this.App.state.tempTool;
        }
    },
    
    rulerMouseDown(e) { 
        const orientation = e.currentTarget.id === 'ruler-top' ? 'h' : 'v'; 
        const gridRect = this.App.elements.pixelGrid.getBoundingClientRect(); 
        const size = parseInt(this.App.elements.gridSizeSelect.value, 10); 
        const pixelSize = gridRect.width / size; 
        let pos; 
        if (orientation === 'h') { 
            pos = (e.clientY - gridRect.top) / pixelSize; 
        } else { 
            pos = (e.clientX - gridRect.left) / pixelSize; 
        } 
        const newIndex = this.App.state.guides[orientation].push(pos) - 1; 
        this.App.renderGuides(); 
        const guideEl = this.App.elements.guidesContainer.querySelector(`.guide.${orientation === 'h' ? 'horizontal' : 'vertical'}[data-index="${newIndex}"]`); 
        this.guideMouseDown(e, guideEl); 
    },

    guideMouseDown(e, target) { 
        e.preventDefault(); 
        e.stopPropagation(); 
        const guideEl = target || e.currentTarget; 
        const orientation = guideEl.dataset.orientation; 
        const index = parseInt(guideEl.dataset.index, 10); 
        const gridRect = this.App.elements.pixelGrid.getBoundingClientRect(); 
        const size = parseInt(this.App.elements.gridSizeSelect.value, 10); 
        const pixelSize = gridRect.width / size; 
        const appContainer = this.App.elements.appContainer; 
        
        const moveHandler = (moveEvent) => { 
            let pos; 
            if (orientation === 'h') { 
                pos = (moveEvent.clientY - gridRect.top) / pixelSize; 
            } else { 
                pos = (moveEvent.clientX - gridRect.left) / pixelSize; 
            } 
            this.App.state.guides[orientation][index] = pos; 
            this.App.renderGuides(); 
        }; 
        
        const upHandler = (upEvent) => { 
            window.removeEventListener('mousemove', moveHandler); 
            window.removeEventListener('mouseup', upHandler); 
            const isOutside = orientation === 'h' ? 
                (upEvent.clientY < appContainer.offsetTop) : 
                (upEvent.clientX < appContainer.offsetLeft); 
            if (isOutside) { 
                this.App.state.guides[orientation].splice(index, 1); 
                this.App.renderGuides(); 
            } 
        }; 
        
        window.addEventListener('mousemove', moveHandler); 
        window.addEventListener('mouseup', upHandler); 
    },

    addEventListeners() {
        window.addEventListener('keydown', this.shortcuts.bind(this));
        window.addEventListener('keyup', this.keyup.bind(this));
        this.App.elements.appContainer.addEventListener('scroll', () => this.App.scheduleRulerUpdate());
        this.App.elements.pixelGrid.addEventListener('mousemove', (e) => this.App.updatePixelCoordinates(e));
        this.App.elements.pixelGrid.addEventListener('mouseleave', () => {
            if (this.App.elements.coordinatesEl) {
                this.App.elements.coordinatesEl.textContent = '';
            }
        });
        
        const m = this.App.elements.menu;
        m.newProject.addEventListener('click', () => { if (confirm('Are you sure? Unsaved progress will be lost.')) this.App.createGrid(); });
        m.openImage.addEventListener('click', () => { const i=document.createElement('input');i.type='file';i.accept='image/*';i.onchange=this.App.handleImageFileOpen.bind(this.App);i.click();});
        m.openProject.addEventListener('click', () => { const i=document.createElement('input');i.type='file';i.accept='.json,application/json';i.onchange=this.App.handleProjectFileOpen.bind(this.App);i.click();});
        m.saveProject.addEventListener('click', this.App.saveProject.bind(this.App)); 
        m.saveProjectAs.addEventListener('click', this.App.saveProject.bind(this.App));
        m.downloadPng.addEventListener('click', this.App.downloadAsPNG.bind(this.App)); 
        m.downloadSvg.addEventListener('click', this.App.downloadAsSVG.bind(this.App)); 
        m.copySvg.addEventListener('click', this.App.copySVGCode.bind(this.App)); 
        m.downloadIco.addEventListener('click', this.App.downloadAsICO.bind(this.App));
        m.undo.addEventListener('click', this.App.handleUndo.bind(this.App)); 
        m.redo.addEventListener('click', this.App.handleRedo.bind(this.App));
        m.cut.addEventListener('click', this.App.handleCut.bind(this.App)); 
        m.copy.addEventListener('click', this.App.handleCopy.bind(this.App)); 
        m.paste.addEventListener('click', this.App.handlePaste.bind(this.App));
        m.clearLayer.addEventListener('click', () => { 
            this.App.managers.layerManager.clearActiveLayer(); 
            this.App.managers.historyManager.pushState(this.App.managers.layerManager.getSnapshot()); 
            this.App.updateToolStatus('Layer Cleared', true); 
        });
        m.newLayer.addEventListener('click', () => { 
            this.App.managers.layerManager.addLayer(parseInt(this.App.elements.gridSizeSelect.value, 10)); 
            this.App.managers.historyManager.pushState(this.App.managers.layerManager.getSnapshot()); 
        });
        m.deleteLayer.addEventListener('click', () => { 
            if (!this.App.elements.deleteLayerButton.disabled) { 
                this.App.managers.layerManager.deleteActiveItem(); 
                this.App.managers.historyManager.pushState(this.App.managers.layerManager.getSnapshot()); 
            } 
        });
        m.zoomIn.addEventListener('click', () => { 
            this.App.state.view.scale *= 1.2; 
            this.App.updateView(); 
        }); 
        m.zoomOut.addEventListener('click', () => { 
            this.App.state.view.scale *= 0.8; 
            this.App.updateView(); 
        }); 
        m.fitScreen.addEventListener('click', () => { 
            this.App.state.view.scale = 1; 
            this.App.state.view.panX = 0; 
            this.App.state.view.panY = 0; 
            this.App.updateView(); 
        });
        m.toggleGrid.addEventListener('click', () => { 
            this.App.state.isGridVisible = !this.App.state.isGridVisible; 
            this.App.elements.pixelGrid.classList.toggle('no-grid', !this.App.state.isGridVisible); 
            this.App.updateToolStatus(`Grid ${this.App.state.isGridVisible ? 'Shown' : 'Hidden'}`, true); 
        });
        m.toggleTiling.addEventListener('click', () => { 
            this.App.state.isTilingEnabled = !this.App.state.isTilingEnabled; 
            if (this.App.state.isTilingEnabled) { 
                this.App.updateTilingView(); 
                this.App.elements.pixelGrid.style.visibility = 'hidden'; 
                this.App.elements.appContainer.style.backgroundRepeat = 'repeat'; 
            } else { 
                this.App.elements.appContainer.style.backgroundImage = 'none'; 
                this.App.elements.pixelGrid.style.visibility = 'visible'; 
            } 
            this.App.updateToolStatus(`Tiling Mode ${this.App.state.isTilingEnabled ? 'Enabled' : 'Disabled'}`, true); 
        });
        m.showPreview.addEventListener('click', () => { 
            this.App.state.isPreviewVisible = !this.App.state.isPreviewVisible; 
            this.App.elements.previewModal.classList.toggle('visible', this.App.state.isPreviewVisible); 
            if (this.App.state.isPreviewVisible) { 
                this.App.updatePreviewWindow(); 
            } 
        });
        m.preferences.addEventListener('click', () => { 
            this.App.elements.preferencesModal.classList.add('visible'); 
            this.App.elements.canvasBgColorInput.style.backgroundColor = this.App.state.preferences.canvasBg; 
            this.App.elements.gridLineColorInput.style.backgroundColor = this.App.state.preferences.gridColor; 
            this.App.elements.gridLineOpacityInput.value = this.App.state.preferences.gridOpacity; 
        });
        m.toggleLayers.addEventListener('click', () => this.App.managers.rightSidebar.toggle());
        m.toggleHistory.addEventListener('click', () => this.App.managers.rightSidebar.toggle());
        m.toggleTimeline.addEventListener('click', () => alert('Animation timeline not implemented yet.'));
        m.helpReadme.addEventListener('click', () => this.App.elements.readmeModal.classList.add('visible'));
        m.helpShortcuts.addEventListener('click', () => this.App.elements.shortcutsModal.classList.add('visible'));
        m.helpExamples.addEventListener('click', () => this.App.elements.examplesModal.classList.add('visible'));

        this.App.elements.readmeCloseBtn.addEventListener('click', () => this.App.elements.readmeModal.classList.remove('visible'));
        this.App.elements.shortcutsCloseBtn.addEventListener('click', () => this.App.elements.shortcutsModal.classList.remove('visible'));
        this.App.elements.examplesCloseBtn.addEventListener('click', () => this.App.elements.examplesModal.classList.remove('visible'));
        this.App.elements.preferencesCloseBtn.addEventListener('click', () => {
            this.App.elements.preferencesModal.classList.remove('visible');
            this.App.savePreferences();
        });
        
        this.App.elements.canvasBgColorInput.addEventListener('click', async (e) => { 
            try { 
                const newColor = await this.App.managers.colorPicker.open(this.App.state.preferences.canvasBg); 
                this.App.state.preferences.canvasBg = newColor; 
                e.target.style.backgroundColor = newColor; 
                this.App.applyPreferences();
                this.App.savePreferences();
            } catch (err) {} 
        });
        
        this.App.elements.gridLineColorInput.addEventListener('click', async (e) => { 
            try { 
                const newColor = await this.App.managers.colorPicker.open(this.App.state.preferences.gridColor); 
                this.App.state.preferences.gridColor = newColor; 
                e.target.style.backgroundColor = newColor; 
                this.App.applyPreferences();
                this.App.savePreferences();
            } catch (err) {} 
        });
        
        this.App.elements.gridLineOpacityInput.addEventListener('input', (e) => { 
            this.App.state.preferences.gridOpacity = e.target.value; 
            this.App.applyPreferences(); 
        });
        
        this.App.elements.gridLineOpacityInput.addEventListener('change', () => {
            this.App.savePreferences();
        });
        
        this.App.elements.previewCloseBtn.addEventListener('click', () => this.App.elements.menu.showPreview.click());
        this.App.elements.gridSizeSelect.addEventListener('change', this.App.createGrid.bind(this.App));
        this.App.elements.addColorButton.addEventListener('click', async () => { 
            try { 
                const c=await this.App.managers.colorPicker.open(this.App.state.currentColor);
                this.App.addNewColorToPalette(c, true);
                this.App.addToRecentColors(c);
            }catch(err){}
        });
        
        Object.values(this.App.elements.toolButtons).forEach(b => b.addEventListener('click', () => this.App.activateTool(b.id)));
        this.App.elements.pixelGrid.addEventListener('mousedown', this.interactionStart.bind(this));
        this.App.elements.undoButton.addEventListener('click', this.App.handleUndo.bind(this.App)); 
        this.App.elements.redoButton.addEventListener('click', this.App.handleRedo.bind(this.App));
        this.App.elements.historyList.addEventListener('click', e => { 
            if (e.target.tagName === 'LI') this.App.managers.layerManager.loadSnapshot(this.App.managers.historyManager.jumpToState(parseInt(e.target.dataset.index, 10))); 
        });
        this.App.elements.addLayerButton.addEventListener('click', () => this.App.elements.menu.newLayer.click());
        this.App.elements.addGroupButton.addEventListener('click', () => { 
            this.App.managers.layerManager.addGroup(); 
            this.App.managers.historyManager.pushState(this.App.managers.layerManager.getSnapshot()); 
        });
        this.App.elements.deleteLayerButton.addEventListener('click', () => this.App.elements.menu.deleteLayer.click());
        this.App.elements.rulerTop.addEventListener('mousedown', this.rulerMouseDown.bind(this));
        this.App.elements.rulerLeft.addEventListener('mousedown', this.rulerMouseDown.bind(this));
        this.App.elements.guidesContainer.addEventListener('mousedown', e => { 
            if (e.target.classList.contains('guide')) { 
                this.guideMouseDown(e, e.target); 
            } 
        });
        
        this.App.elements.layerList.addEventListener('click', e => {
            if (e.target.closest('.layer-opacity-control')) return;
            
            const itemLi = e.target.closest('.layer-item'); 
            if (!itemLi) return; 
            const id = parseInt(itemLi.dataset.id, 10); 
            
            if (e.target.classList.contains('group-toggle')) { 
                const item = this.App.managers.layerManager.findItem(id).item; 
                this.App.managers.layerManager.setItemProperty(id, 'expanded', !item.expanded); 
            } else if (e.target.classList.contains('layer-visibility')) { 
                const item = this.App.managers.layerManager.findItem(id).item; 
                this.App.managers.layerManager.setItemProperty(id, 'visible', !item.visible); 
                this.App.managers.historyManager.pushState(this.App.managers.layerManager.getSnapshot()); 
            } else if (e.target.closest('.layer-content')) { 
                this.App.managers.layerManager.selectItem(id); 
            } 
        });
        
        this.App.elements.layerList.addEventListener('dblclick', e => { 
            if (!e.target.classList.contains('layer-name')) return; 
            const layerItem = e.target.closest('.layer-item'); 
            const id = parseInt(layerItem.dataset.id, 10); 
            const nameSpan = e.target; 
            const { item } = this.App.managers.layerManager.findItem(id); 
            const oldName = item.name; 
            const input = document.createElement('input'); 
            input.type = 'text'; 
            input.className = 'layer-name-input'; 
            input.value = oldName; 
            nameSpan.replaceWith(input); 
            input.focus(); 
            input.select(); 
            
            const saveName = () => { 
                const newName = input.value.trim() || oldName; 
                if (newName !== oldName) { 
                    this.App.managers.layerManager.setItemProperty(id, 'name', newName); 
                    this.App.managers.historyManager.pushState(this.App.managers.layerManager.getSnapshot()); 
                } else { 
                    this.App.managers.layerManager.onUpdate(this.App.managers.layerManager.getUIState()); 
                } 
            }; 
            
            input.addEventListener('blur', saveName); 
            input.addEventListener('keydown', e => { 
                if (e.key === 'Enter') input.blur(); 
                if (e.key === 'Escape') { 
                    input.value = oldName; 
                    input.blur(); 
                } 
            }); 
        });
    }
};
