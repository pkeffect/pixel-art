// VERSION: 1.0.0
// Comprehensive browser storage manager for persistence
const StorageManager = {
    db: null,
    dbName: 'PixelArtDB',
    dbVersion: 1,

    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.dbVersion);
            
            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                this.db = request.result;
                resolve();
            };
            
            request.onupgradeneeded = (e) => {
                const db = e.target.result;
                
                if (!db.objectStoreNames.contains('projects')) {
                    db.createObjectStore('projects', { keyPath: 'id', autoIncrement: true });
                }
                
                if (!db.objectStoreNames.contains('autosaves')) {
                    const autosaveStore = db.createObjectStore('autosaves', { keyPath: 'id', autoIncrement: true });
                    autosaveStore.createIndex('timestamp', 'timestamp', { unique: false });
                }
            };
        });
    },

    // LocalStorage - Preferences
    savePreferences(prefs) {
        try {
            localStorage.setItem('pixelart_preferences', JSON.stringify(prefs));
        } catch (e) {
            Logger.error('Failed to save preferences:', e);
        }
    },

    loadPreferences() {
        try {
            const data = localStorage.getItem('pixelart_preferences');
            return data ? JSON.parse(data) : null;
        } catch (e) {
            Logger.error('Failed to load preferences:', e);
            return null;
        }
    },

    // SessionStorage - Temporary state
    saveSession(data) {
        try {
            sessionStorage.setItem('pixelart_session', JSON.stringify(data));
        } catch (e) {
            Logger.error('Failed to save session:', e);
        }
    },

    loadSession() {
        try {
            const data = sessionStorage.getItem('pixelart_session');
            return data ? JSON.parse(data) : null;
        } catch (e) {
            Logger.error('Failed to load session:', e);
            return null;
        }
    },

    clearSession() {
        try {
            sessionStorage.removeItem('pixelart_session');
        } catch (e) {
            Logger.error('Failed to clear session:', e);
        }
    },

    // IndexedDB - Auto-save
    async saveAutosave(projectData) {
        if (!this.db) await this.init();
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['autosaves'], 'readwrite');
            const store = transaction.objectStore('autosaves');
            
            const data = {
                timestamp: Date.now(),
                data: projectData
            };
            
            const request = store.add(data);
            request.onsuccess = () => {
                this.cleanOldAutosaves();
                resolve(request.result);
            };
            request.onerror = () => reject(request.error);
        });
    },

    async loadLatestAutosave() {
        if (!this.db) await this.init();
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['autosaves'], 'readonly');
            const store = transaction.objectStore('autosaves');
            const index = store.index('timestamp');
            
            const request = index.openCursor(null, 'prev');
            request.onsuccess = () => {
                const cursor = request.result;
                resolve(cursor ? cursor.value.data : null);
            };
            request.onerror = () => reject(request.error);
        });
    },

    async cleanOldAutosaves() {
        if (!this.db) return;
        
        const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
        
        const transaction = this.db.transaction(['autosaves'], 'readwrite');
        const store = transaction.objectStore('autosaves');
        const index = store.index('timestamp');
        
        const range = IDBKeyRange.upperBound(sevenDaysAgo);
        const request = index.openCursor(range);
        
        request.onsuccess = (e) => {
            const cursor = e.target.result;
            if (cursor) {
                cursor.delete();
                cursor.continue();
            }
        };
    },

    // Recent colors tracking
    saveRecentColors(colors) {
        try {
            localStorage.setItem('pixelart_recent_colors', JSON.stringify(colors));
        } catch (e) {
            Logger.error('Failed to save recent colors:', e);
        }
    },

    loadRecentColors() {
        try {
            const data = localStorage.getItem('pixelart_recent_colors');
            return data ? JSON.parse(data) : [];
        } catch (e) {
            Logger.error('Failed to load recent colors:', e);
            return [];
        }
    }
};
