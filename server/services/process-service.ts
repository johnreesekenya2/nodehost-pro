
import { spawn, ChildProcess } from "child_process";
import path from "path";
import fs from "fs-extra";

class ProcessService {
  private processes: Map<string, ChildProcess> = new Map();

  async startProcess(
    serverId: string,
    rootPath: string,
    envVars: Record<string, string>,
    onLog: (message: string) => void
  ): Promise<string> {
    try {
      onLog("Analyzing project structure...");
      
      // Check for files in both root directory and .root_moved directory
      let files = [];
      let actualRootPath = rootPath;
      const rootMovedPath = path.join(rootPath, ".root_moved");
      
      if (await fs.pathExists(rootMovedPath)) {
        // Use .root_moved directory as the actual root for execution
        files = await fs.readdir(rootMovedPath);
        actualRootPath = rootMovedPath;
        onLog(`Found files in .root_moved directory: ${files.join(", ")}`);
      } else {
        // Fallback to original root directory
        files = await fs.readdir(rootPath);
        onLog(`Found files in root directory: ${files.join(", ")}`);
      }
      
      let startScript = "node index.js";
      const packageJsonPath = path.join(actualRootPath, "package.json");
      
      // Check for package.json first as priority
      if (await fs.pathExists(packageJsonPath)) {
        const packageJson = await fs.readJson(packageJsonPath);
        onLog(`Found package.json with main: ${packageJson.main || "not specified"}`);
        
        // Always prefer npm start if available
        if (packageJson.scripts && packageJson.scripts.start) {
          startScript = "npm start";
          onLog("Using npm start script from package.json");
        } else if (packageJson.main && files.includes(packageJson.main)) {
          startScript = `node ${packageJson.main}`;
          onLog(`Using main entry from package.json: ${packageJson.main}`);
        } else {
          // Fallback to common entry points if package.json main is not found
          const commonEntries = ["index.js", "main.js", "app.js", "server.js", "bot.js"];
          const entryFile = commonEntries.find(file => files.includes(file));
          if (entryFile) {
            startScript = `node ${entryFile}`;
            onLog(`Using fallback entry file: ${entryFile}`);
          } else {
            throw new Error("No valid entry point found. Please ensure your project has a main file or start script.");
          }
        }
      } else {
        // No package.json found, check for common entry points
        onLog("No package.json found, looking for common entry points");
        const commonEntries = ["index.js", "main.js", "app.js", "server.js", "bot.js"];
        const entryFile = commonEntries.find(file => files.includes(file));
        
        if (entryFile) {
          startScript = `node ${entryFile}`;
          onLog(`Using entry file: ${entryFile}`);
        } else {
          throw new Error("No valid entry point found. Please ensure you have index.js, main.js, app.js, server.js, or bot.js in your project.");
        }
      }

      onLog("Checking for package.json and dependencies...");
      
      // Install dependencies if package.json exists
      if (await fs.pathExists(packageJsonPath)) {
        onLog("Running npm install...");
        
        await new Promise<void>((resolve, reject) => {
          const npmInstall = spawn("npm", ["install"], {
            cwd: actualRootPath,
            stdio: "pipe",
          });

          npmInstall.stdout?.on("data", (data) => {
            onLog(`[npm] ${data.toString().trim()}`);
          });

          npmInstall.stderr?.on("data", (data) => {
            onLog(`[npm] ${data.toString().trim()}`);
          });

          npmInstall.on("close", (code) => {
            if (code === 0) {
              resolve();
            } else {
              reject(new Error(`npm install failed with code ${code}`));
            }
          });

          npmInstall.on("error", reject);
        });
      }

      onLog(`Starting process: ${startScript}`);
      
      // Parse the start script
      const scriptParts = startScript.split(" ");
      const command = scriptParts[0];
      const args = scriptParts.slice(1);

      const childProcess = spawn(command, args, {
        cwd: actualRootPath,
        env: { ...process.env, ...envVars },
        stdio: "pipe",
      });

      const processId = `${serverId}-${Date.now()}`;
      this.processes.set(processId, childProcess);

      childProcess.stdout?.on("data", (data) => {
        onLog(`[stdout] ${data.toString().trim()}`);
      });

      childProcess.stderr?.on("data", (data) => {
        onLog(`[stderr] ${data.toString().trim()}`);
      });

      childProcess.on("close", (code) => {
        onLog(`Process exited with code ${code}`);
        this.processes.delete(processId);
      });

      childProcess.on("error", (error) => {
        onLog(`Process error: ${error.message}`);
        this.processes.delete(processId);
      });

      return processId;
    } catch (error) {
      throw new Error(`Failed to start process: ${error}`);
    }
  }

  async stopProcess(processId: string): Promise<void> {
    const process = this.processes.get(processId);
    if (process) {
      process.kill();
      this.processes.delete(processId);
    }
  }

  getProcess(processId: string): ChildProcess | undefined {
    return this.processes.get(processId);
  }

  getAllProcesses(): Map<string, ChildProcess> {
    return new Map(this.processes);
  }
}

export const processService = new ProcessService();
