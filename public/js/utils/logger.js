// A simple logger to provide verbose output to the console for debugging.
const Logger = {
    _enabled: true, // Set to false to disable all logging

    log: (message, ...args) => {
        if (Logger._enabled) {
            console.log(`[LOG] ${message}`, ...args);
        }
    },
    
    info: (message, ...args) => {
        if (Logger._enabled) {
            console.info(`[INFO] ${message}`, ...args);
        }
    },

    warn: (message, ...args) => {
        if (Logger._enabled) {
            console.warn(`[WARN] ${message}`, ...args);
        }
    },
    
    error: (message, ...args) => {
        if (Logger._enabled) {
            console.error(`[ERROR] ${message}`, ...args);
        }
    },
    
    group: (label) => {
        if (Logger._enabled) {
            console.group(label);
        }
    },

    groupEnd: () => {
        if (Logger._enabled) {
            console.groupEnd();
        }
    }
};