import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/components/auth-provider";
import { apiRequest } from "@/lib/queryClient";
import type { Server } from "@shared/schema";

export default function Dashboard() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { logout } = useAuth();
  const queryClient = useQueryClient();

  const { data: servers = [], isLoading } = useQuery<Server[]>({
    queryKey: ["/api/servers"],
  });

  const createServerMutation = useMutation({
    mutationFn: async (name: string) => {
      return apiRequest("POST", "/api/servers", { name, status: "stopped", envVars: {} });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/servers"] });
      toast({
        title: "Server created",
        description: "Your new Node.js server is ready",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to create server",
        description: error.message || "Maximum 3 servers allowed",
        variant: "destructive",
      });
    },
  });

  const handleLogout = () => {
    logout();
  };

  const handleCreateServer = () => {
    if (servers.length >= 3) {
      toast({
        title: "Server limit reached",
        description: "Maximum 3 servers allowed",
        variant: "destructive",
      });
      return;
    }

    const serverName = `Node Bot #${servers.length + 1}`;
    createServerMutation.mutate(serverName);
  };

  const activeServers = servers.filter(s => s.status === "running").length;
  const availableSlots = 3 - servers.length;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center space-x-4">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              NodeHost Pro
            </h1>
            <span className="text-muted-foreground">Dashboard</span>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="text-sm text-muted-foreground">
              Logged in as <span className="text-primary font-medium">JOHN</span>
            </div>
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

      {/* Dashboard Content */}
      <div className="p-6">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="glass-effect">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm">Active Servers</p>
                  <p className="text-2xl font-bold text-success" data-testid="stat-active-servers">
                    {activeServers}
                  </p>
                </div>
                <i className="fas fa-server text-success text-2xl" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="glass-effect">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm">Total Servers</p>
                  <p className="text-2xl font-bold text-primary" data-testid="stat-total-servers">
                    {servers.length}
                  </p>
                </div>
                <i className="fas fa-database text-primary text-2xl" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="glass-effect">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm">Available Slots</p>
                  <p className="text-2xl font-bold text-warning" data-testid="stat-available-slots">
                    {availableSlots}
                  </p>
                </div>
                <i className="fas fa-plus-circle text-warning text-2xl" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="glass-effect">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm">Platform</p>
                  <p className="text-2xl font-bold text-secondary">Node.js</p>
                </div>
                <i className="fab fa-node-js text-secondary text-2xl" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Server Management */}
        <Card className="glass-effect">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-semibold">Server Management</h2>
                <p className="text-muted-foreground mt-2">Manage your Node.js bot hosting servers (Limit: 3 servers)</p>
              </div>
              <Button 
                onClick={handleCreateServer}
                disabled={servers.length >= 3 || createServerMutation.isPending}
                className="glow-effect"
                data-testid="button-create-server"
              >
                <i className="fas fa-plus mr-2" />
                {createServerMutation.isPending ? "Creating..." : "Create Server"}
              </Button>
            </div>

            {/* Server List */}
            <div className="space-y-4">
              {servers.length === 0 ? (
                <div className="text-center py-12" data-testid="empty-servers-state">
                  <i className="fas fa-server text-6xl text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">No Servers Created</h3>
                  <p className="text-muted-foreground mb-6">Create your first Node.js bot server to get started</p>
                  <Button 
                    onClick={handleCreateServer} 
                    className="glow-effect"
                    data-testid="button-create-first-server"
                  >
                    <i className="fas fa-plus mr-2" />
                    Create First Server
                  </Button>
                </div>
              ) : (
                servers.map((server) => (
                  <Card 
                    key={server.id} 
                    className="bg-muted/50 border-border hover:border-primary/50 transition-all cursor-pointer"
                    onClick={() => navigate(`/server/${server.id}`)}
                    data-testid={`server-card-${server.id}`}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className={`w-3 h-3 rounded-full ${
                            server.status === "running" ? "bg-success animate-pulse" : "bg-muted"
                          }`} />
                          <div>
                            <h3 className="font-medium" data-testid={`server-name-${server.id}`}>
                              {server.name}
                            </h3>
                            <p className="text-sm text-muted-foreground">
                              Node.js v20 • <span className="capitalize">{server.status}</span> • 
                              Created {new Date(server.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-3">
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            server.status === "running" 
                              ? "bg-success/20 text-success" 
                              : "bg-muted text-muted-foreground"
                          }`}>
                            {server.status === "running" ? "ONLINE" : "OFFLINE"}
                          </span>
                          <i className="fas fa-chevron-right text-muted-foreground" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </CardContent>
        </Card>

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
