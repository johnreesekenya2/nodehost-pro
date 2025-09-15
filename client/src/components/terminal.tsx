import { useEffect, useRef, useState } from "react";
import { useWebSocket } from "@/hooks/use-websocket";
import { Button } from "@/components/ui/button";

interface TerminalProps {
  serverId: string;
}

interface LogMessage {
  type: string;
  timestamp: string;
  message: string;
}

export function Terminal({ serverId }: TerminalProps) {
  const [logs, setLogs] = useState<LogMessage[]>([]);
  const [isUserScrolling, setIsUserScrolling] = useState(false);
  const terminalRef = useRef<HTMLDivElement>(null);
  const { socket, isConnected } = useWebSocket(`/ws?serverId=${serverId}`);

  useEffect(() => {
    if (socket) {
      const handleMessage = (event: MessageEvent) => {
        try {
          const logMessage: LogMessage = JSON.parse(event.data);
          setLogs(prev => [...prev, logMessage]);
        } catch (error) {
          console.error("Failed to parse WebSocket message:", error);
        }
      };

      socket.addEventListener("message", handleMessage);
      return () => socket.removeEventListener("message", handleMessage);
    }
  }, [socket]);

  useEffect(() => {
    if (terminalRef.current && !isUserScrolling) {
      const terminal = terminalRef.current;
      // Auto-scroll to bottom for new logs (like render logs flowing down)
      requestAnimationFrame(() => {
        terminal.scrollTop = terminal.scrollHeight;
      });
    }
  }, [logs, isUserScrolling]);

  const handleScroll = () => {
    if (terminalRef.current) {
      const terminal = terminalRef.current;
      const isAtBottom = terminal.scrollTop + terminal.clientHeight >= terminal.scrollHeight - 10;
      setIsUserScrolling(!isAtBottom);
    }
  };

  const scrollToBottom = () => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
      setIsUserScrolling(false);
    }
  };

  const clearLogs = () => {
    setLogs([]);
  };

  const getLogColor = (message: string) => {
    if (message.includes("[npm]")) return "text-primary";
    if (message.includes("[bot]")) return "text-foreground";
    if (message.includes("error") || message.includes("Error")) return "text-destructive";
    if (message.includes("success") || message.includes("✓")) return "text-success";
    if (message.includes("warning") || message.includes("Warning")) return "text-warning";
    return "text-muted-foreground";
  };

  return (
    <div className="h-full flex flex-col">
      {/* Terminal Header */}
      <div className="bg-card border-b border-border p-2 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className={`w-2 h-2 rounded-full ${isConnected ? "bg-success" : "bg-destructive"}`} />
          <span className="text-sm text-muted-foreground">
            {isConnected ? "Connected" : "Disconnected"}
          </span>
        </div>
        <div className="flex items-center space-x-2">
          {isUserScrolling && (
            <Button
              variant="outline"
              size="sm"
              onClick={scrollToBottom}
              className="text-xs"
            >
              <i className="fas fa-arrow-down mr-1" />
              Scroll to bottom
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={clearLogs}
            data-testid="button-clear-logs"
          >
            <i className="fas fa-trash mr-2" />
            Clear
          </Button>
        </div>
      </div>

      {/* Terminal Output */}
      <div 
        ref={terminalRef}
        onScroll={handleScroll}
        className="flex-1 p-4 terminal-bg overflow-auto font-mono text-sm scroll-smooth"
        data-testid="terminal-output"
        style={{ scrollBehavior: 'smooth' }}
      >
        {logs.length === 0 ? (
          <div className="text-muted-foreground">
            <div>NodeHost Pro Terminal</div>
            <div>Waiting for server activity...</div>
            <div className="inline-flex items-center mt-2">
              <span className="text-primary">bot@nodehost:~$ </span>
              <span className="terminal-cursor ml-1"></span>
            </div>
          </div>
        ) : (
          <div className="space-y-1">
            {logs.map((log, index) => (
              <div 
                key={index} 
                className={getLogColor(log.message)}
                data-testid={`log-message-${index}`}
              >
                [{new Date(log.timestamp).toLocaleTimeString()}] {log.message}
              </div>
            ))}
            <div className="inline-flex items-center">
              <span className="text-primary">bot@nodehost:~$ </span>
              <span className="terminal-cursor ml-1"></span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
