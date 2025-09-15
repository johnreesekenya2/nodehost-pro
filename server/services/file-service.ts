
import fs from "fs-extra";
import path from "path";
import AdmZip from "adm-zip";

class FileService {
  private readonly serversRoot = path.join(process.cwd(), "servers");

  constructor() {
    // Ensure servers directory exists
    fs.ensureDirSync(this.serversRoot);
  }

  async createServerDirectory(): Promise<string> {
    const serverId = `server-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const serverPath = path.join(this.serversRoot, serverId);
    
    await fs.ensureDir(serverPath);
    return serverPath;
  }

  async deleteServerDirectory(serverPath: string): Promise<void> {
    if (await fs.pathExists(serverPath)) {
      await fs.remove(serverPath);
    }
  }

  async uploadAndExtractZip(zipPath: string, targetPath: string): Promise<{ extractedFiles: string[] }> {
    try {
      const zip = new AdmZip(zipPath);
      const zipEntries = zip.getEntries();
      const extractedFiles: string[] = [];

      // Extract directly to target path preserving folder structure
      zip.extractAllTo(targetPath, true);

      // Get list of extracted files and folders
      zipEntries.forEach(entry => {
        if (!entry.isDirectory) {
          extractedFiles.push(entry.entryName);
        }
      });
      
      // Clean up uploaded zip file
      await fs.remove(zipPath);

      return { extractedFiles };
    } catch (error) {
      throw new Error(`Failed to extract ZIP file: ${error}`);
    }
  }

  async listFiles(directoryPath: string, subPath: string = ''): Promise<any[]> {
    try {
      // Special case for ROOT_ONLY view - show only files that have been moved to root
      if (subPath === 'ROOT_ONLY') {
        return this.listRootOnlyFiles(directoryPath);
      }

      const targetPath = path.join(directoryPath, subPath);
      
      if (!(await fs.pathExists(targetPath))) {
        return [];
      }

      const items = await fs.readdir(targetPath);
      const fileList = [];

      for (const item of items) {
        const itemPath = path.join(targetPath, item);
        const relativePath = path.join(subPath, item);
        const stats = await fs.stat(itemPath);
        
        fileList.push({
          name: item,
          path: relativePath,
          type: stats.isDirectory() ? 'directory' : 'file',
          size: stats.isFile() ? stats.size : 0,
          modified: stats.mtime.toISOString()
        });
      }

      return fileList;
    } catch (error) {
      throw new Error(`Failed to list files: ${error}`);
    }
  }

  async listRootOnlyFiles(directoryPath: string): Promise<any[]> {
    try {
      const rootMovedPath = path.join(directoryPath, '.root_moved');
      
      if (!(await fs.pathExists(rootMovedPath))) {
        return [];
      }

      const items = await fs.readdir(rootMovedPath);
      const fileList = [];

      for (const item of items) {
        const itemPath = path.join(rootMovedPath, item);
        const stats = await fs.stat(itemPath);
        
        fileList.push({
          name: item,
          path: `.root_moved/${item}`,
          type: stats.isDirectory() ? 'directory' : 'file',
          size: stats.isFile() ? stats.size : 0,
          modified: stats.mtime.toISOString()
        });
      }

      return fileList;
    } catch (error) {
      throw new Error(`Failed to list root files: ${error}`);
    }
  }

  async moveFilesToRoot(serverPath: string, filePaths: string[]): Promise<{ movedFiles: string[] }> {
    try {
      const rootMovedPath = path.join(serverPath, '.root_moved');
      await fs.ensureDir(rootMovedPath);
      
      const movedFiles: string[] = [];

      for (const filePath of filePaths) {
        const sourcePath = path.join(serverPath, filePath);
        const fileName = path.basename(filePath);
        const targetPath = path.join(rootMovedPath, fileName);

        if (await fs.pathExists(sourcePath)) {
          // If target already exists, add timestamp to make it unique
          let finalTargetPath = targetPath;
          if (await fs.pathExists(targetPath)) {
            const timestamp = Date.now();
            const ext = path.extname(fileName);
            const nameWithoutExt = path.basename(fileName, ext);
            finalTargetPath = path.join(rootMovedPath, `${nameWithoutExt}_${timestamp}${ext}`);
          }

          await fs.move(sourcePath, finalTargetPath);
          movedFiles.push(path.basename(finalTargetPath));
        }
      }

      return { movedFiles };
    } catch (error) {
      throw new Error(`Failed to move files to root: ${error}`);
    }
  }

  async deleteFile(filePath: string): Promise<void> {
    // Get the filename from the full path
    const fileName = path.basename(filePath);
    
    // For root moved files, allow deletion of any file
    const isRootMovedFile = filePath.includes('.root_moved');
    
    if (!isRootMovedFile) {
      // Protect core files from deletion in main directories
      const protectedFiles = [
        'package.json',
        'package-lock.json',
        'yarn.lock',
        'index.js',
        'main.js',
        'app.js',
        'server.js',
        'bot.js',
        'config.js',
        'command.js'
      ];
      
      if (protectedFiles.includes(fileName)) {
        throw new Error(`Cannot delete protected file: ${fileName}`);
      }
    }
    
    if (await fs.pathExists(filePath)) {
      await fs.remove(filePath);
    }
  }

  async readFile(filePath: string): Promise<string> {
    return await fs.readFile(filePath, 'utf8');
  }

  async writeFile(filePath: string, content: string): Promise<void> {
    await fs.ensureDir(path.dirname(filePath));
    await fs.writeFile(filePath, content, 'utf8');
  }
}

export const fileService = new FileService();
