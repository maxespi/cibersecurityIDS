// src/utils/logger.js
const fs = require('fs');
const path = require('path');

class Logger {
    constructor() {
        this.logDir = null;
        this.initialized = false;
    }

    initialize(logDirectory) {
        this.logDir = logDirectory;
        this.ensureLogDirectory();
        this.initialized = true;
    }

    ensureLogDirectory() {
        if (!fs.existsSync(this.logDir)) {
            fs.mkdirSync(this.logDir, { recursive: true });
        }
    }

    formatMessage(level, message, context = {}) {
        const timestamp = new Date().toISOString();
        const contextStr = Object.keys(context).length > 0 ?
            ` | Context: ${JSON.stringify(context)}` : '';

        return `[${timestamp}] [${level.toUpperCase()}] ${message}${contextStr}`;
    }

    writeToFile(level, message, context = {}) {
        if (!this.initialized) {
            console.warn('Logger not initialized, using console fallback');
            console.log(`[${level.toUpperCase()}] ${message}`);
            return;
        }

        try {
            const formattedMessage = this.formatMessage(level, message, context);
            const logFile = path.join(this.logDir, `${level}.log`);

            fs.appendFileSync(logFile, formattedMessage + '\n');

            // Also write to general log
            const generalLogFile = path.join(this.logDir, 'application.log');
            fs.appendFileSync(generalLogFile, formattedMessage + '\n');

        } catch (error) {
            console.error('Failed to write to log file:', error);
            console.log(`[${level.toUpperCase()}] ${message}`); // Fallback
        }
    }

    info(message, context = {}) {
        this.writeToFile('info', message, context);
        console.log(`ℹ️ ${message}`);
    }

    warn(message, context = {}) {
        this.writeToFile('warn', message, context);
        console.warn(`⚠️ ${message}`);
    }

    error(message, context = {}) {
        this.writeToFile('error', message, context);
        console.error(`❌ ${message}`);
    }

    debug(message, context = {}) {
        if (process.env.NODE_ENV === 'development') {
            this.writeToFile('debug', message, context);
            console.log(`🔧 ${message}`);
        }
    }

    security(message, context = {}) {
        this.writeToFile('security', message, context);
        console.log(`🛡️ [SECURITY] ${message}`);
    }

    firewall(message, context = {}) {
        this.writeToFile('firewall', message, context);
        console.log(`🔥 [FIREWALL] ${message}`);
    }
}

// Singleton instance
const logger = new Logger();

module.exports = logger;