
import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

interface FileManagerProps {
  serverId: string;
}

interface FileItem {
  name: string;
  path: string;
  type: "file" | "directory";
  size: number;
  modified: string;
}

export function FileManager({ serverId }: FileManagerProps) {
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [currentPath, setCurrentPath] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: files = [], isLoading } = useQuery<FileItem[]>({
    queryKey: ["/api/servers", serverId, "files", currentPath],
    queryFn: async () => {
      const response = await fetch(`/api/servers/${serverId}/files?path=${encodeURIComponent(currentPath)}`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch files");
      return response.json();
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("zip", file);

      const response = await fetch(`/api/servers/${serverId}/upload`, {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Upload failed");
      }

      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/servers", serverId, "files"] });
      toast({
        title: "Upload successful",
        description: `Extracted ${data.extractedFiles.length} files`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (filePath: string) => {
      const response = await fetch(`/api/servers/${serverId}/files`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filePath }),
        credentials: "include",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Delete failed");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/servers", serverId, "files", currentPath] });
      setSelectedFiles([]);
      toast({
        title: "File deleted",
        description: "File removed successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Delete failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const moveToRootMutation = useMutation({
    mutationFn: async (filePaths: string[]) => {
      const response = await fetch(`/api/servers/${serverId}/move-to-root`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filePaths }),
        credentials: "include",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Move failed");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/servers", serverId, "files"] });
      setSelectedFiles([]);
      toast({
        title: "Files moved",
        description: "Files moved to root directory successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Move failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!file.name.endsWith('.zip')) {
        toast({
          title: "Invalid file type",
          description: "Please upload a ZIP file",
          variant: "destructive",
        });
        return;
      }
      uploadMutation.mutate(file);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSelectFile = (filePath: string) => {
    setSelectedFiles(prev => 
      prev.includes(filePath)
        ? prev.filter(f => f !== filePath)
        : [...prev, filePath]
    );
  };

  const handleSelectAll = () => {
    if (selectedFiles.length === files.length) {
      setSelectedFiles([]);
    } else {
      setSelectedFiles(files.map(f => f.path));
    }
  };

  const handleDeleteSelected = () => {
    if (selectedFiles.length === 0) return;
    
    const fileNames = selectedFiles.map(path => path.split('/').pop()).join(', ');
    if (confirm(`Are you sure you want to delete ${selectedFiles.length} file(s): ${fileNames}?`)) {
      selectedFiles.forEach(filePath => {
        deleteMutation.mutate(filePath);
      });
    }
  };

  const handleDeleteFile = (filePath: string) => {
    const fileName = filePath.split('/').pop();
    if (confirm(`Are you sure you want to delete ${fileName}?`)) {
      deleteMutation.mutate(filePath);
    }
  };

  const handleMoveToRoot = () => {
    if (selectedFiles.length === 0) return;
    moveToRootMutation.mutate(selectedFiles);
  };

  const handleNavigate = (path: string) => {
    if (path === "../") {
      // Go to parent directory
      const pathParts = currentPath.split('/').filter(p => p);
      pathParts.pop();
      setCurrentPath(pathParts.join('/'));
    } else if (path === "ROOT_ONLY") {
      // Special view for root-only files
      setCurrentPath("ROOT_ONLY");
    } else {
      // Navigate to subdirectory
      const newPath = currentPath ? `${currentPath}/${path}` : path;
      setCurrentPath(newPath);
    }
    setSelectedFiles([]);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const getFileIcon = (file: FileItem) => {
    if (file.type === "directory") return "fas fa-folder text-blue-500";
    if (file.name.endsWith('.js')) return "fab fa-js-square text-yellow-500";
    if (file.name.endsWith('.json')) return "fas fa-file-code text-orange-500";
    if (file.name.endsWith('.md')) return "fas fa-file-alt text-gray-500";
    if (file.name.endsWith('.txt')) return "fas fa-file-alt text-gray-400";
    if (file.name.endsWith('.zip')) return "fas fa-file-archive text-purple-500";
    return "fas fa-file text-gray-400";
  };

  const getBreadcrumb = () => {
    if (currentPath === "ROOT_ONLY") return "Root Files Only";
    if (!currentPath) return "Project Root";
    return currentPath.split('/').join(' / ');
  };

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading files...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* File Manager Header */}
      <div className="bg-card border-b border-border p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">File Manager</h2>
          <div className="flex items-center space-x-3">
            <input 
              ref={fileInputRef}
              type="file" 
              accept=".zip" 
              onChange={handleFileUpload}
              className="hidden"
              data-testid="file-upload-input"
            />
            <Button 
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadMutation.isPending}
              className="glow-effect"
              data-testid="button-upload-zip"
            >
              <i className="fas fa-upload mr-2" />
              {uploadMutation.isPending ? "Uploading..." : "Upload ZIP"}
            </Button>
          </div>
        </div>

        {/* Navigation Bar */}
        <div className="flex items-center space-x-2 mb-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPath("")}
            className={currentPath === "" ? "bg-primary text-primary-foreground" : ""}
          >
            <i className="fas fa-home mr-2" />
            Project Root
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleNavigate("ROOT_ONLY")}
            className={currentPath === "ROOT_ONLY" ? "bg-primary text-primary-foreground" : ""}
          >
            <i className="fas fa-folder-open mr-2" />
            Root Files Only
          </Button>
        </div>

        {/* Breadcrumb */}
        <div className="text-sm text-muted-foreground">
          <i className="fas fa-folder mr-2" />
          {getBreadcrumb()}
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4">
        {/* Navigation Controls */}
        {currentPath && currentPath !== "ROOT_ONLY" && (
          <div className="mb-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleNavigate("../")}
              className="hover:bg-muted"
            >
              <i className="fas fa-arrow-left mr-2" />
              Back to Parent Directory
            </Button>
          </div>
        )}

        {files.length === 0 ? (
          <div className="text-center py-12" data-testid="empty-files-state">
            <i className="fas fa-folder-open text-6xl text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">
              {currentPath === "ROOT_ONLY" ? "No Files in Root" : "No Files Found"}
            </h3>
            <p className="text-muted-foreground mb-6">
              {currentPath === "ROOT_ONLY" ? 
                "No files have been moved to root directory yet" : 
                "Upload a ZIP file to get started"
              }
            </p>
          </div>
        ) : (
          <>
            {/* File List */}
            <div className="space-y-1 mb-6">
              {files.map((file) => (
                <div 
                  key={file.path}
                  className="flex items-center justify-between py-3 px-4 rounded-md hover:bg-muted/50 transition-all border border-transparent hover:border-border"
                  data-testid={`file-item-${file.name}`}
                >
                  <div className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={selectedFiles.includes(file.path)}
                      onChange={() => handleSelectFile(file.path)}
                      className="rounded border-border"
                    />
                    <i className={getFileIcon(file)} />
                    <div className="flex flex-col">
                      <span 
                        className={file.type === "directory" ? "font-medium cursor-pointer hover:text-primary" : ""}
                        onClick={() => file.type === "directory" ? handleNavigate(file.name) : null}
                      >
                        {file.name}
                      </span>
                      {file.type === "file" && (
                        <span className="text-xs text-muted-foreground">
                          {formatFileSize(file.size)} • Modified {new Date(file.modified).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {file.type === "directory" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleNavigate(file.name)}
                      >
                        <i className="fas fa-folder-open text-blue-500" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteFile(file.path)}
                      disabled={deleteMutation.isPending}
                      data-testid={`button-delete-${file.name}`}
                    >
                      <i className="fas fa-trash text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            {/* File Operations */}
            <Card className="bg-muted/30 border-border">
              <CardContent className="p-4">
                <h3 className="font-medium mb-3">Bulk Operations</h3>
                <div className="flex flex-wrap gap-2">
                  <Button 
                    variant="secondary"
                    size="sm"
                    onClick={handleSelectAll}
                    data-testid="button-select-all"
                  >
                    <i className="fas fa-check-square mr-2" />
                    {selectedFiles.length === files.length ? "Deselect All" : "Select All"}
                  </Button>
                  
                  {currentPath !== "ROOT_ONLY" && (
                    <Button 
                      variant="secondary"
                      size="sm"
                      disabled={selectedFiles.length === 0 || moveToRootMutation.isPending}
                      onClick={handleMoveToRoot}
                      data-testid="button-move-to-root"
                    >
                      <i className="fas fa-home mr-2" />
                      Move to Root ({selectedFiles.length})
                    </Button>
                  )}
                  
                  <Button 
                    variant="destructive"
                    size="sm"
                    disabled={selectedFiles.length === 0 || deleteMutation.isPending}
                    onClick={handleDeleteSelected}
                    data-testid="button-delete-selected"
                  >
                    <i className="fas fa-trash mr-2" />
                    Delete Selected ({selectedFiles.length})
                  </Button>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
