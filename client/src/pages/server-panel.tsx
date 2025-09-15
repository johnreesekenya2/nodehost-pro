import { useState } from "react";
import { useLocation, useParams } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Terminal } from "@/components/terminal";
import { FileManager } from "@/components/file-manager";
import type { Server } from "@shared/schema";

export default function ServerPanel() {
  const { id: serverId } = useParams();
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState("console");
  const [serverName, setServerName] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: server, isLoading } = useQuery<Server>({
    queryKey: ["/api/servers", serverId],
    enabled: !!serverId,
  });

  const updateServerMutation = useMutation({
    mutationFn: async (updates: Partial<Server>) => {
      return apiRequest("PUT", `/api/servers/${serverId}`, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/servers", serverId] });
      toast({
        title: "Server updated",
        description: "Changes saved successfully",
      });
    },
  });

  const deleteServerMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("DELETE", `/api/servers/${serverId}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/servers"] });
      toast({
        title: "Server deleted",
        description: "Server and all files have been removed",
      });
      navigate("/dashboard");
    },
  });

  const startServerMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", `/api/servers/${serverId}/start`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/servers", serverId] });
    },
  });

  const stopServerMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", `/api/servers/${serverId}/stop`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/servers", serverId] });
    },
  });

  const restartServerMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", `/api/servers/${serverId}/restart`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/servers", serverId] });
    },
  });

  const handleLogout = async () => {
    try {
      await apiRequest("POST", "/api/auth/logout", {});
      navigate("/");
    } catch (error) {
      // Handle error if needed
    }
  };

  const handleSaveSettings = () => {
    if (serverName.trim() && serverName !== server?.name) {
      updateServerMutation.mutate({ name: serverName.trim() });
    }
  };

  const handleDeleteServer = () => {
    if (confirm("Are you sure you want to delete this server? This action cannot be undone.")) {
      deleteServerMutation.mutate();
    }
  };

  if (isLoading || !server) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading server...</p>
        </div>
      </div>
    );
  }

  // Initialize serverName when server data loads
  if (serverName === "" && server?.name) {
    setServerName(server.name);
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center space-x-4">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => navigate("/dashboard")}
              data-testid="button-back-to-dashboard"
            >
              <i className="fas fa-arrow-left" />
            </Button>
            <h1 className="text-xl font-semibold" data-testid="server-title">
              {server.name}
            </h1>
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${
                server.status === "running" ? "bg-success animate-pulse" : "bg-muted"
              }`} />
              <span className={`text-sm font-medium ${
                server.status === "running" ? "text-success" : "text-muted-foreground"
              }`}>
                {server.status === "running" ? "Running" : "Stopped"}
              </span>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <span className="text-sm text-muted-foreground">Node.js v20</span>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={handleLogout}
              data-testid="button-logout"
            >
              <i className="fas fa-sign-out-alt" />
            </Button>
          </div>
        </div>
      </header>

      {/* Facebook-style horizontal tabs */}
      <div className="bg-card border-b border-border">
        <div className="px-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-1">
              <button
                onClick={() => setActiveTab("console")}
                className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors duration-200 ${
                  activeTab === "console"
                    ? "border-primary text-primary bg-primary/5"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
                }`}
                data-testid="tab-console"
              >
                <i className="fas fa-terminal mr-2" />
                Console
              </button>
              <button
                onClick={() => setActiveTab("files")}
                className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors duration-200 ${
                  activeTab === "files"
                    ? "border-primary text-primary bg-primary/5"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
                }`}
                data-testid="tab-files"
              >
                <i className="fas fa-folder mr-2" />
                Files
              </button>
              <button
                onClick={() => setActiveTab("settings")}
                className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors duration-200 ${
                  activeTab === "settings"
                    ? "border-primary text-primary bg-primary/5"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
                }`}
                data-testid="tab-settings"
              >
                <i className="fas fa-cog mr-2" />
                Settings
              </button>
            </div>

            {/* Server Info - moved to top right */}
            <div className="flex items-center space-x-6 text-sm">
              <div className="flex items-center space-x-2">
                <span className="text-muted-foreground">Status:</span>
                <div className="flex items-center space-x-1">
                  <div className={`w-2 h-2 rounded-full ${
                    server.status === "running" ? "bg-success animate-pulse" : "bg-muted"
                  }`} />
                  <span className="capitalize font-medium">{server.status}</span>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-muted-foreground">Created:</span>
                <span>{new Date(server.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden h-[calc(100vh-133px)]">
        {/* Console Tab */}
        {activeTab === "console" && (
            <div className="h-full flex flex-col">
              {/* Console Controls */}
              <div className="bg-card border-b border-border p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Button 
                      className="bg-success hover:bg-success/90 glow-effect"
                      onClick={() => startServerMutation.mutate()}
                      disabled={server.status === "running" || startServerMutation.isPending}
                      data-testid="button-start-server"
                    >
                      <i className="fas fa-play mr-2" />
                      {startServerMutation.isPending ? "Starting..." : "Start"}
                    </Button>
                    <Button 
                      className="bg-destructive hover:bg-destructive/90"
                      onClick={() => stopServerMutation.mutate()}
                      disabled={server.status !== "running" || stopServerMutation.isPending}
                      data-testid="button-stop-server"
                    >
                      <i className="fas fa-stop mr-2" />
                      {stopServerMutation.isPending ? "Stopping..." : "Stop"}
                    </Button>
                    <Button 
                      className="bg-warning hover:bg-warning/90"
                      onClick={() => restartServerMutation.mutate()}
                      disabled={server.status !== "running" || restartServerMutation.isPending}
                      data-testid="button-restart-server"
                    >
                      <i className="fas fa-redo mr-2" />
                      {restartServerMutation.isPending ? "Restarting..." : "Restart"}
                    </Button>
                  </div>
                </div>
              </div>

              {/* Terminal Output */}
              <div className="flex-1">
                <Terminal serverId={serverId!} />
              </div>
            </div>
        )}

        {/* Files Tab */}
        {activeTab === "files" && (
          <FileManager serverId={serverId!} />
        )}

        {/* Settings Tab */}
        {activeTab === "settings" && (
            <div className="h-full p-6 overflow-auto">
              <div className="max-w-2xl">
                <h2 className="text-2xl font-semibold mb-6">Server Settings</h2>
                
                {/* General Settings */}
                <Card className="glass-effect mb-8">
                  <CardContent className="p-6">
                    <h3 className="text-lg font-medium mb-4">General Configuration</h3>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="serverName">Server Name</Label>
                        <Input
                          id="serverName"
                          type="text"
                          value={serverName}
                          onChange={(e) => setServerName(e.target.value)}
                          className="mt-2"
                          data-testid="input-server-name"
                        />
                      </div>
                      
                      <div>
                        <Label>Node.js Version</Label>
                        <div className="flex items-center space-x-3 mt-2">
                          <span className="px-3 py-2 bg-muted rounded-md text-sm">v20.x.x</span>
                          <span className="text-sm text-muted-foreground">(Auto-provisioned)</span>
                        </div>
                      </div>

                      <div>
                        <Label>Server Status</Label>
                        <div className="flex items-center space-x-3 mt-2">
                          <div className={`w-3 h-3 rounded-full ${
                            server.status === "running" ? "bg-success" : "bg-muted"
                          }`} />
                          <span className={`font-medium capitalize ${
                            server.status === "running" ? "text-success" : "text-muted-foreground"
                          }`}>
                            {server.status}
                          </span>
                        </div>
                      </div>

                      <Button 
                        onClick={handleSaveSettings}
                        disabled={updateServerMutation.isPending}
                        className="glow-effect"
                        data-testid="button-save-settings"
                      >
                        <i className="fas fa-save mr-2" />
                        {updateServerMutation.isPending ? "Saving..." : "Save Changes"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Danger Zone */}
                <Card className="glass-effect border-destructive/50">
                  <CardContent className="p-6">
                    <h3 className="text-lg font-medium mb-4 text-destructive">Danger Zone</h3>
                    <div className="p-4 bg-destructive/10 rounded-md border border-destructive/20">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium">Delete Server</h4>
                          <p className="text-sm text-muted-foreground">
                            Permanently delete this server and all its data
                          </p>
                        </div>
                        <Button 
                          className="bg-destructive hover:bg-destructive/90"
                          onClick={handleDeleteServer}
                          disabled={deleteServerMutation.isPending}
                          data-testid="button-delete-server"
                        >
                          <i className="fas fa-trash mr-2" />
                          {deleteServerMutation.isPending ? "Deleting..." : "Delete"}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="text-center mt-8 pt-4 border-t border-border">
          <p className="text-xs text-muted-foreground">
            Powered by 👑 John Reese
          </p>
        </div>
      </div>
    </div>
  );
}
