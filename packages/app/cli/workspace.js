import fs from 'fs';
import path from 'path';

/**
 * Reads an API360 Git-native workspace from a local directory.
 * @param {string} dirPath - Absolute path to the workspace directory.
 * @returns {object} The parsed workspace object { name, collections, requests, environments }
 */
export function readWorkspace(dirPath) {
  const configPath = path.join(dirPath, 'api360.config.json');
  if (!fs.existsSync(configPath)) {
    throw new Error(`Workspace config file api360.config.json not found at: ${dirPath}`);
  }
  
  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  
  const collectionsDir = path.join(dirPath, 'collections');
  const collections = [];
  const requests = [];
  
  if (fs.existsSync(collectionsDir)) {
    const files = fs.readdirSync(collectionsDir);
    for (const file of files) {
      if (file.endsWith('.json')) {
        const filePath = path.join(collectionsDir, file);
        try {
          const colData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
          collections.push({ id: colData.id, name: colData.name });
          if (Array.isArray(colData.requests)) {
            colData.requests.forEach(r => {
              r.collectionId = colData.id;
              requests.push(r);
            });
          }
        } catch (e) {
          console.error(`Failed to parse collection file ${file}:`, e.message);
        }
      }
    }
  }
  
  const environmentsDir = path.join(dirPath, 'environments');
  const environments = [];
  if (fs.existsSync(environmentsDir)) {
    const files = fs.readdirSync(environmentsDir);
    for (const file of files) {
      if (file.endsWith('.json')) {
        const filePath = path.join(environmentsDir, file);
        try {
          environments.push(JSON.parse(fs.readFileSync(filePath, 'utf8')));
        } catch (e) {
          console.error(`Failed to parse environment file ${file}:`, e.message);
        }
      }
    }
  }
  
  return {
    name: config.name || path.basename(dirPath),
    collections,
    requests,
    environments
  };
}

/**
 * Writes/Syncs workspace data back to a local Git-native directory structure.
 * @param {string} dirPath - Absolute path to the workspace directory.
 * @param {object} workspaceData - The workspace object { name, collections, requests, environments }
 */
export function writeWorkspace(dirPath, workspaceData) {
  const { name, collections, requests, environments } = workspaceData;
  
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
  
  // Write root config metadata
  const config = { name };
  fs.writeFileSync(path.join(dirPath, 'api360.config.json'), JSON.stringify(config, null, 2));
  
  // Re-create subdirectories
  const collectionsDir = path.join(dirPath, 'collections');
  if (fs.existsSync(collectionsDir)) {
    fs.rmSync(collectionsDir, { recursive: true, force: true });
  }
  fs.mkdirSync(collectionsDir, { recursive: true });
  
  const environmentsDir = path.join(dirPath, 'environments');
  if (fs.existsSync(environmentsDir)) {
    fs.rmSync(environmentsDir, { recursive: true, force: true });
  }
  fs.mkdirSync(environmentsDir, { recursive: true });
  
  // Save collections with their requests embedded inside
  for (const col of collections) {
    const colRequests = requests.filter(r => r.collectionId === col.id);
    const colData = {
      id: col.id,
      name: col.name,
      requests: colRequests
    };
    const safeName = col.name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    fs.writeFileSync(
      path.join(collectionsDir, `${safeName}.json`),
      JSON.stringify(colData, null, 2)
    );
  }
  
  // Save environments
  for (const env of environments) {
    const safeName = env.name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    fs.writeFileSync(
      path.join(environmentsDir, `${safeName}.json`),
      JSON.stringify(env, null, 2)
    );
  }
}
