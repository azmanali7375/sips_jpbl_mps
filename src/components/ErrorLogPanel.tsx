/**
 * Error Log Panel Component
 * Debug panel to view error logs in development
 */

import { useState, useEffect } from "react";
import { errorLogger, type ErrorLog } from "@/services/errorLoggerService";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertCircle, X, Download, Trash2, ChevronDown, ChevronRight } from "lucide-react";

export function ErrorLogPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [logs, setLogs] = useState<ErrorLog[]>([]);
  const [expandedLog, setExpandedLog] = useState<string | null>(null);

  useEffect(() => {
    // Load initial logs
    setLogs(errorLogger.getLogs());

    // Subscribe to new logs
    const unsubscribe = errorLogger.subscribe((newLog) => {
      setLogs(errorLogger.getLogs());
    });

    return unsubscribe;
  }, []);

  function handleClearLogs() {
    errorLogger.clearLogs();
    setLogs([]);
  }

  function handleExportLogs() {
    const dataStr = errorLogger.exportLogs();
    const dataUri = `data:application/json;charset=utf-8,${encodeURIComponent(dataStr)}`;
    const exportFileDefaultName = `sips-error-logs-${Date.now()}.json`;

    const linkElement = document.createElement("a");
    linkElement.setAttribute("href", dataUri);
    linkElement.setAttribute("download", exportFileDefaultName);
    linkElement.click();
  }

  function getTypeColor(type: ErrorLog["type"]) {
    switch (type) {
      case "navigation":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "auth":
        return "bg-red-100 text-red-800 border-red-200";
      case "api":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "rls":
        return "bg-purple-100 text-purple-800 border-purple-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  }

  // Only show in development
  if (process.env.NODE_ENV !== "development") {
    return null;
  }

  return (
    <>
      {/* Floating Error Badge */}
      {logs.length > 0 && !isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-4 right-4 z-50 flex items-center gap-2 bg-red-500 text-white px-4 py-2 rounded-full shadow-lg hover:bg-red-600 transition-colors"
        >
          <AlertCircle className="h-5 w-5" />
          <span className="font-semibold">{logs.length} Errors</span>
        </button>
      )}

      {/* Error Log Panel */}
      {isOpen && (
        <div className="fixed bottom-0 right-0 z-50 w-full md:w-[600px] h-[500px] bg-white border-t-2 border-red-500 shadow-2xl">
          <Card className="h-full border-0 rounded-none">
            <CardHeader className="bg-red-50 border-b flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-red-500" />
                Error Logs ({logs.length})
              </CardTitle>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleExportLogs}
                  disabled={logs.length === 0}
                >
                  <Download className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClearLogs}
                  disabled={logs.length === 0}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setIsOpen(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[400px]">
                {logs.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                    <AlertCircle className="h-12 w-12 text-gray-300 mb-4" />
                    <p className="text-muted-foreground">No errors logged</p>
                  </div>
                ) : (
                  <div className="divide-y">
                    {logs.map((log) => (
                      <div
                        key={log.id}
                        className="p-4 hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <Badge className={getTypeColor(log.type)}>{log.type}</Badge>
                              <span className="text-xs text-muted-foreground">
                                {log.timestamp.toLocaleTimeString()}
                              </span>
                            </div>
                            <p className="font-medium text-sm mb-1">{log.message}</p>
                            {log.url && (
                              <p className="text-xs text-muted-foreground truncate">
                                {log.url}
                              </p>
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              setExpandedLog(expandedLog === log.id ? null : log.id)
                            }
                          >
                            {expandedLog === log.id ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                        {expandedLog === log.id && (
                          <div className="mt-3 space-y-2">
                            {log.context && (
                              <div>
                                <p className="text-xs font-semibold mb-1">Context:</p>
                                <pre className="text-xs bg-gray-100 p-2 rounded overflow-x-auto">
                                  {JSON.stringify(log.context, null, 2)}
                                </pre>
                              </div>
                            )}
                            {log.stack && (
                              <div>
                                <p className="text-xs font-semibold mb-1">Stack Trace:</p>
                                <pre className="text-xs bg-gray-100 p-2 rounded overflow-x-auto">
                                  {log.stack}
                                </pre>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
}