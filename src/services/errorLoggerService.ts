/**
 * Client-Side Error Logger Service
 * Captures navigation failures, auth errors, and API errors
 */

export interface ErrorLog {
  id: string;
  timestamp: Date;
  type: "navigation" | "auth" | "api" | "rls" | "unknown";
  message: string;
  context?: Record<string, any>;
  stack?: string;
  url?: string;
}

class ErrorLoggerService {
  private logs: ErrorLog[] = [];
  private maxLogs = 50;
  private listeners: ((log: ErrorLog) => void)[] = [];

  /**
   * Log an error
   */
  log(
    type: ErrorLog["type"],
    message: string,
    context?: Record<string, any>,
    error?: Error
  ): void {
    const log: ErrorLog = {
      id: `${Date.now()}-${Math.random()}`,
      timestamp: new Date(),
      type,
      message,
      context: {
        ...context,
        userAgent: typeof window !== "undefined" ? window.navigator.userAgent : "unknown",
        url: typeof window !== "undefined" ? window.location.href : "unknown",
      },
      stack: error?.stack,
      url: typeof window !== "undefined" ? window.location.href : undefined,
    };

    // Add to logs array
    this.logs.unshift(log);
    
    // Keep only recent logs
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(0, this.maxLogs);
    }

    // Store in localStorage for persistence
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("sips_error_logs", JSON.stringify(this.logs));
      } catch (e) {
        console.error("Failed to store error logs:", e);
      }
    }

    // Notify listeners
    this.listeners.forEach((listener) => listener(log));

    // Console log in development
    if (process.env.NODE_ENV === "development") {
      console.error(`[${type.toUpperCase()}]`, message, context, error);
    }
  }

  /**
   * Log navigation error
   */
  logNavigation(message: string, context?: Record<string, any>): void {
    this.log("navigation", message, context);
  }

  /**
   * Log authentication error
   */
  logAuth(message: string, context?: Record<string, any>, error?: Error): void {
    this.log("auth", message, context, error);
  }

  /**
   * Log API error
   */
  logApi(message: string, context?: Record<string, any>, error?: Error): void {
    this.log("api", message, context, error);
  }

  /**
   * Log RLS policy error
   */
  logRLS(message: string, context?: Record<string, any>, error?: Error): void {
    this.log("rls", message, context, error);
  }

  /**
   * Get all logs
   */
  getLogs(): ErrorLog[] {
    return [...this.logs];
  }

  /**
   * Get logs by type
   */
  getLogsByType(type: ErrorLog["type"]): ErrorLog[] {
    return this.logs.filter((log) => log.type === type);
  }

  /**
   * Clear all logs
   */
  clearLogs(): void {
    this.logs = [];
    if (typeof window !== "undefined") {
      localStorage.removeItem("sips_error_logs");
    }
  }

  /**
   * Subscribe to new error logs
   */
  subscribe(listener: (log: ErrorLog) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  /**
   * Load logs from localStorage
   */
  loadFromStorage(): void {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem("sips_error_logs");
        if (stored) {
          const parsed = JSON.parse(stored);
          this.logs = parsed.map((log: any) => ({
            ...log,
            timestamp: new Date(log.timestamp),
          }));
        }
      } catch (e) {
        console.error("Failed to load error logs:", e);
      }
    }
  }

  /**
   * Export logs as JSON
   */
  exportLogs(): string {
    return JSON.stringify(this.logs, null, 2);
  }
}

export const errorLogger = new ErrorLoggerService();

// Initialize on client-side
if (typeof window !== "undefined") {
  errorLogger.loadFromStorage();

  // Capture unhandled errors
  window.addEventListener("error", (event) => {
    errorLogger.log(
      "unknown",
      event.message,
      {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      },
      event.error
    );
  });

  // Capture unhandled promise rejections
  window.addEventListener("unhandledrejection", (event) => {
    errorLogger.log(
      "unknown",
      "Unhandled promise rejection",
      {
        reason: event.reason?.toString(),
      }
    );
  });
}