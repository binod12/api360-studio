use std::process::{Command, Stdio};
use std::io::{BufRead, BufReader, Write};
use tauri::{AppHandle, Emitter};

#[tauri::command]
fn select_workspace_dir() -> Result<Option<String>, String> {
    let dir = rfd::FileDialog::new()
        .pick_folder();
    Ok(dir.map(|p| p.to_string_lossy().into_owned()))
}

#[tauri::command]
fn write_text_file(path: String, content: String) -> Result<(), String> {
    if let Some(parent) = std::path::Path::new(&path).parent() {
        std::fs::create_dir_all(parent).map_err(|e| format!("Failed to create directories: {}", e))?;
    }
    std::fs::write(path, content).map_err(|e| format!("Failed to write file: {}", e))
}

#[tauri::command]
fn run_api360_cli(app: AppHandle, command: String, args: Vec<String>, stdin_data: Option<String>, event_id: String) -> Result<String, String> {
    let mut child = Command::new("node")
        .arg("bin/api360-cli.js")
        .arg(&command)
        .args(&args)
        .stdin(if stdin_data.is_some() { Stdio::piped() } else { Stdio::inherit() })
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|e| format!("Failed to spawn node CLI process: {}", e))?;

    if let Some(stdin_str) = stdin_data {
        if let Some(mut stdin) = child.stdin.take() {
            stdin.write_all(stdin_str.as_bytes())
                .map_err(|e| format!("Failed to write to stdin: {}", e))?;
        }
    }

    let stdout = child.stdout.take().ok_or("Failed to capture stdout")?;
    let stderr = child.stderr.take().ok_or("Failed to capture stderr")?;

    let app_clone = app.clone();
    let event_id_clone = event_id.clone();
    
    // Read stdout
    std::thread::spawn(move || {
        let reader = BufReader::new(stdout);
        for line in reader.lines() {
            if let Ok(l) = line {
                let _ = app_clone.emit(&format!("cli-stdout:{}", event_id_clone), l);
            }
        }
    });

    let app_clone2 = app.clone();
    let event_id_clone2 = event_id.clone();
    // Read stderr
    std::thread::spawn(move || {
        let reader = BufReader::new(stderr);
        for line in reader.lines() {
            if let Ok(l) = line {
                let _ = app_clone2.emit(&format!("cli-stderr:{}", event_id_clone2), l);
            }
        }
    });

    // Wait for process exit
    let status = child.wait().map_err(|e| format!("Failed to wait for process: {}", e))?;
    if status.success() {
        Ok("Success".to_string())
    } else {
        Err(format!("Process exited with status code: {:?}", status.code()))
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_websocket::init())
        .plugin(tauri_plugin_http::init())
        .invoke_handler(tauri::generate_handler![run_api360_cli, select_workspace_dir, write_text_file])
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
