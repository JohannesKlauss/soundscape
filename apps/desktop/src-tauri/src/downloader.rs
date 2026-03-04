use std::path::PathBuf;
use std::sync::Arc;

use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Emitter, Manager, State};
use tokio::sync::Mutex;
use yt_dlp::model::selector::{AudioCodecPreference, AudioQuality};
use yt_dlp::Downloader;

// -- State --

pub struct DownloaderState {
    pub downloader: Arc<Mutex<Option<Downloader>>>,
}

impl Default for DownloaderState {
    fn default() -> Self {
        Self {
            downloader: Arc::new(Mutex::new(None)),
        }
    }
}

// -- Serializable types --

#[derive(Clone, Serialize, Deserialize, Debug)]
pub struct DependencyStatus {
    pub yt_dlp_ready: bool,
    pub ffmpeg_ready: bool,
    pub downloading: bool,
    pub error: Option<String>,
}

#[derive(Clone, Serialize, Deserialize, Debug)]
pub struct AudioInfo {
    pub title: String,
    pub duration: f64,
    pub tags: Vec<String>,
}

#[derive(Clone, Serialize, Deserialize, Debug)]
pub struct DownloadProgress {
    pub status: String,
    pub percent: Option<f64>,
}

#[derive(Clone, Serialize, Deserialize, Debug)]
pub struct DownloadResult {
    pub file_path: String,
    pub content_type: String,
    pub duration: f64,
    pub title: String,
    pub tags: Vec<String>,
}

// -- Helper: get dirs under app data --

fn get_dirs(app: &AppHandle) -> Result<(PathBuf, PathBuf), String> {
    let app_data = app.path().app_data_dir().map_err(|e| e.to_string())?;
    let libs_dir = app_data.join("libs");
    let output_dir = app_data.join("downloads");

    std::fs::create_dir_all(&libs_dir).map_err(|e| e.to_string())?;
    std::fs::create_dir_all(&output_dir).map_err(|e| e.to_string())?;

    Ok((libs_dir, output_dir))
}

fn emit_progress(app: &AppHandle, status: &str, percent: Option<f64>) {
    let _ = app.emit(
        "download-progress",
        DownloadProgress {
            status: status.into(),
            percent,
        },
    );
}

// -- Commands --

/// Check for / download the yt-dlp and ffmpeg binaries.
/// Emits `dependency-status` events while working.
#[tauri::command]
pub async fn ensure_dependencies(
    app: AppHandle,
    state: State<'_, DownloaderState>,
) -> Result<DependencyStatus, String> {
    // Check if already initialised
    {
        let guard = state.downloader.lock().await;
        if guard.is_some() {
            let ready = DependencyStatus {
                yt_dlp_ready: true,
                ffmpeg_ready: true,
                downloading: false,
                error: None,
            };
            let _ = app.emit("dependency-status", ready.clone());
            return Ok(ready);
        }
    }

    let _ = app.emit(
        "dependency-status",
        DependencyStatus {
            yt_dlp_ready: false,
            ffmpeg_ready: false,
            downloading: true,
            error: None,
        },
    );

    let (libs_dir, output_dir) = get_dirs(&app)?;

    // `with_new_binaries` downloads missing binaries automatically.
    // If they already exist on disk the call is essentially a no-op.
    let downloader = Downloader::with_new_binaries(libs_dir, &output_dir)
        .await
        .map_err(|e| format!("Failed to install binaries: {e}"))?
        .build()
        .await
        .map_err(|e| format!("Failed to build downloader: {e}"))?;

    *state.downloader.lock().await = Some(downloader);

    let status = DependencyStatus {
        yt_dlp_ready: true,
        ffmpeg_ready: true,
        downloading: false,
        error: None,
    };
    let _ = app.emit("dependency-status", status.clone());

    Ok(status)
}

/// Fetch metadata for a URL (title, duration, tags) without downloading.
#[tauri::command]
pub async fn fetch_audio_info(
    url: String,
    state: State<'_, DownloaderState>,
) -> Result<AudioInfo, String> {
    let guard = state.downloader.lock().await;
    let downloader = guard
        .as_ref()
        .ok_or("Dependencies not ready. Please wait for download to complete.")?;

    let video = downloader
        .fetch_video_infos(&url)
        .await
        .map_err(|e| format!("Failed to fetch info: {e}"))?;

    Ok(AudioInfo {
        title: video.title.clone(),
        duration: video.duration.unwrap_or(0) as f64,
        tags: video
            .tags
            .iter()
            .take(5)
            .map(|t: &String| t.to_lowercase())
            .collect(),
    })
}

/// Download the audio stream for the given URL as MP3.
/// Emits `download-progress` events with status and percentage.
/// Returns the path to the resulting file on the real filesystem.
#[tauri::command]
pub async fn download_audio(
    url: String,
    app: AppHandle,
    state: State<'_, DownloaderState>,
) -> Result<DownloadResult, String> {
    emit_progress(&app, "Fetching video info...", Some(0.0));

    // Clone the downloader so we release the lock before the long download
    let downloader = {
        let guard = state.downloader.lock().await;
        guard
            .as_ref()
            .ok_or("Dependencies not ready.")?
            .clone()
    };

    let video = downloader
        .fetch_video_infos(&url)
        .await
        .map_err(|e| format!("Failed to fetch info: {e}"))?;

    let title = video.title.clone();
    let duration = video.duration.unwrap_or(0) as f64;
    let tags: Vec<String> = video
        .tags
        .iter()
        .take(5)
        .map(|t: &String| t.to_lowercase())
        .collect();

    emit_progress(&app, "Downloading audio...", Some(10.0));

    let filename = format!(
        "dl-{}.mp3",
        std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_millis()
    );

    // Use quality-aware download for best MP3 output
    let audio_path = downloader
        .download_audio_stream_with_quality(
            &video,
            &filename,
            AudioQuality::Best,
            AudioCodecPreference::MP3,
        )
        .await
        .map_err(|e| format!("Failed to download audio: {e}"))?;

    emit_progress(
        &app,
        "Download complete",
        Some(100.0),
    );

    Ok(DownloadResult {
        file_path: audio_path.to_string_lossy().to_string(),
        content_type: "audio/mpeg".into(),
        duration,
        title,
        tags,
    })
}
