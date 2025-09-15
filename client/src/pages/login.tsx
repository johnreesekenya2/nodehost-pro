import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/components/auth-provider";
import { apiRequest } from "@/lib/queryClient";

export default function Login() {
  const [, navigate] = useLocation();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { refreshAuth } = useAuth();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await apiRequest("POST", "/api/auth/login", { username, password });
      toast({
        title: "Login successful",
        description: "Welcome to NodeHost Pro",
      });
      // Refresh auth state to update user context
      await refreshAuth();
      // Router will automatically redirect to dashboard via AuthProvider
    } catch (error) {
      toast({
        title: "Login failed",
        description: "Invalid credentials. Use JOHN/REESE",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted">
      {/* Animated background grid */}
      <div className="absolute inset-0 opacity-10">
        <div 
          className="absolute inset-0" 
          style={{
            backgroundImage: "radial-gradient(circle at 1px 1px, rgba(0,212,255,0.5) 1px, transparent 0)",
            backgroundSize: "50px 50px"
          }}
        />
      </div>
      
      <div className="relative z-10 w-full max-w-md">
        <Card className="glass-effect glow-effect">
          <CardContent className="p-8">
            <div className="text-center mb-8">
              <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent mb-2">
                NodeHost Pro
              </h1>
              <p className="text-muted-foreground">Bot Hosting Platform</p>
            </div>
            
            <form onSubmit={handleLogin} className="space-y-6" data-testid="login-form">
              <div>
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  type="text"
                  placeholder="Enter username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="mt-2"
                  data-testid="input-username"
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-2"
                  data-testid="input-password"
                  required
                />
              </div>
              
              <Button 
                type="submit" 
                className="w-full glow-effect"
                disabled={isLoading}
                data-testid="button-login"
              >
                <i className="fas fa-sign-in-alt mr-2" />
                {isLoading ? "Accessing..." : "Access Platform"}
              </Button>
            </form>
            
            <div className="text-center mt-6 pt-4 border-t border-border">
              <p className="text-xs text-muted-foreground">
                Powered by 👑 John Reese
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
