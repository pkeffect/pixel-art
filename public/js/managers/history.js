// VERSION: 1.0.0
class HistoryManager {
    constructor(maxSize = 50) {
        this.historyStack = [];
        this.historyIndex = -1;
        this.maxSize = maxSize;
        this.onUpdate = () => {};
        this.pendingSnapshot = null;
        this.snapshotTimeout = null;
    }

    // Debounced push for rapid tool usage
    pushStateDebounced(gridState, delay = 100) {
        this.pendingSnapshot = gridState;
        
        if (this.snapshotTimeout) {
            clearTimeout(this.snapshotTimeout);
        }
        
        this.snapshotTimeout = setTimeout(() => {
            if (this.pendingSnapshot) {
                this.pushState(this.pendingSnapshot);
                this.pendingSnapshot = null;
            }
        }, delay);
    }

    pushState(gridState) {
        if (this.historyIndex < this.historyStack.length - 1) {
            this.historyStack = this.historyStack.slice(0, this.historyIndex + 1);
        }

        this.historyStack.push(gridState);

        if (this.historyStack.length > this.maxSize) {
            this.historyStack.shift();
        }

        this.historyIndex = this.historyStack.length - 1;

        if (this.onUpdate) {
            this.onUpdate(this.getStateForUI());
        }
    }

    undo() {
        if (this.canUndo()) {
            this.historyIndex--;
            if (this.onUpdate) {
                this.onUpdate(this.getStateForUI());
            }
            return this.getCurrentState();
        }
        return null;
    }

    redo() {
        if (this.canRedo()) {
            this.historyIndex++;
            if (this.onUpdate) {
                this.onUpdate(this.getStateForUI());
            }
            return this.getCurrentState();
        }
        return null;
    }
    
    jumpToState(index) {
        if (index >= 0 && index < this.historyStack.length) {
            this.historyIndex = index;
            if (this.onUpdate) {
                this.onUpdate(this.getStateForUI());
            }
            return this.getCurrentState();
        }
        return null;
    }

    getCurrentState() {
        if (this.historyIndex >= 0 && this.historyIndex < this.historyStack.length) {
            return this.historyStack[this.historyIndex];
        }
        return null;
    }

    canUndo() {
        return this.historyIndex > 0;
    }

    canRedo() {
        return this.historyIndex < this.historyStack.length - 1;
    }

    getStateForUI() {
        return {
            stackSize: this.historyStack.length,
            currentIndex: this.historyIndex,
            canUndo: this.canUndo(),
            canRedo: this.canRedo(),
        };
    }
    
    clear() {
        this.historyStack = [];
        this.historyIndex = -1;
        if (this.onUpdate) {
            this.onUpdate(this.getStateForUI());
        }
    }
}
