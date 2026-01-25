use std::sync::Arc;
use futures_util::StreamExt;
use serde::{Deserialize, Serialize};
use tauri::Emitter;
use tokio::net::TcpListener;
use tokio::sync::Mutex;
use tokio_tungstenite::accept_async;

#[derive(Clone, Serialize, Deserialize, Debug)]
struct SceneCommand {
    action: String,
    scene_id: Option<String>,
    fade_time: Option<u32>,
}

#[derive(Clone)]
struct AppState {
    clients: Arc<Mutex<Vec<tokio_tungstenite::tungstenite::protocol::Message>>>,
}

#[tauri::command]
async fn start_websocket_server(app: tauri::AppHandle) -> Result<String, String> {
    let addr = "0.0.0.0:8080";
    let listener = TcpListener::bind(addr).await
        .map_err(|e| e.to_string())?;

    println!("WebSocket server listening on: {}", addr);

    // Spawn the server in the background
    tauri::async_runtime::spawn(async move {
        while let Ok((stream, _)) = listener.accept().await {
            let app_handle = app.clone();

            tokio::spawn(async move {
                let ws_stream = accept_async(stream).await
                    .expect("Error during WebSocket handshake");

                println!("New WebSocket connection");

                let (mut write, mut read) = ws_stream.split();

                // Handle incoming messages
                while let Some(msg) = read.next().await {
                    match msg {
                        Ok(msg) => {
                            if msg.is_text() || msg.is_binary() {
                                let text = msg.to_text().unwrap();
                                println!("Received: {}", text);

                                // Parse command and emit to frontend
                                if let Ok(cmd) = serde_json::from_str::<SceneCommand>(text) {
                                    app_handle.emit("scene-change", cmd).unwrap();
                                }
                            }
                        }
                        Err(e) => {
                            println!("WebSocket error: {}", e);
                            break;
                        }
                    }
                }

                println!("Connection closed");
            });
        }
    });

    Ok(format!("Server started on {}", addr))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![start_websocket_server])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
