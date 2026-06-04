let isTauriEnv = false;
try {
  isTauriEnv = typeof window !== 'undefined' && !!(window as any).__TAURI_INTERNALS__;
} catch (e) {}

export const isTauri = () => isTauriEnv;

/**
 * Prompts the user to select a workspace folder using the native OS dialog.
 * @returns {Promise<string | null>} The picked absolute path or null.
 */
export async function selectWorkspaceDir(): Promise<string | null> {
  if (!isTauriEnv) {
    alert("Native file dialog is only available in the API360 Desktop application.");
    return null;
  }
  const { invoke } = await import('@tauri-apps/api/core');
  try {
    return await invoke<string | null>('select_workspace_dir');
  } catch (err: any) {
    console.error("Failed to select folder:", err);
    return null;
  }
}

/**
 * Writes a text file directly to the client's local filesystem in Tauri.
 */
export async function writeTextFile(path: string, content: string): Promise<void> {
  if (!isTauriEnv) return;
  const { invoke } = await import('@tauri-apps/api/core');
  try {
    await invoke('write_text_file', { path, content });
  } catch (err: any) {
    console.error("Failed to write text file:", err);
    throw err;
  }
}

/**
 * Invokes the rust tauri command to run our Node CLI process in a background thread.
 * Streams stdout/stderr events and handles cleanup.
 */
export async function runCliCommand(
  command: string,
  args: string[],
  stdinData: string | null = null,
  onStdout: (line: string) => void,
  onStderr: (line: string) => void
): Promise<string> {
  if (!isTauriEnv) {
    throw new Error("CLI process spawning is only supported in the API360 Desktop app.");
  }
  
  const { invoke } = await import('@tauri-apps/api/core');
  const { listen } = await import('@tauri-apps/api/event');
  
  const eventId = Math.random().toString(36).substring(2, 9);
  
  const unlistenStdout = await listen<string>(`cli-stdout:${eventId}`, (event) => {
    onStdout(event.payload);
  });
  
  const unlistenStderr = await listen<string>(`cli-stderr:${eventId}`, (event) => {
    onStderr(event.payload);
  });
  
  try {
    const result = await invoke<string>('run_api360_cli', {
      command,
      args,
      stdinData,
      eventId
    });
    return result;
  } finally {
    unlistenStdout();
    unlistenStderr();
  }
}
