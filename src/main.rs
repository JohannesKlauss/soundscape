pub mod audio_engine;
pub mod ui;
pub mod db;
pub mod domain;
mod schema;
mod model;

use std::path::PathBuf;
use diesel::SqliteConnection;
use gpui_kit::component::{Theme, ThemeRegistry};
use gpui_kit::*;
use gpui_navigator::{init_router, Route};
use crate::audio_engine::AudioEngine;
use crate::db::connect_to_db;
use crate::ui::home::Home;

struct AppSettings {
    audio_engine: AudioEngine,
    db: SqliteConnection,
}

impl Global for AppSettings {}

fn main() {
    application().with_assets(assets::Assets).run(|cx| {
        init_app_settings(cx);
        init(cx);
        set_theme(cx);
        create_router(cx);

        open_window(WindowOptions::default(), cx, |_, cx| cx.new(|_| ui::layout::Layout))
            .expect("Failed to open window");
    });
}

fn create_router(cx: &mut App) {
    init_router(cx, |router| {
        router.add_route(
            Route::new("/", |window, app, _| Home::new(window, app).into_any_element())
        )
    })
}

fn set_theme(cx: &mut App) {
    ThemeRegistry::watch_dir(PathBuf::from("./themes"), cx, |cx| {
        let config = ThemeRegistry::global(cx)
            .themes()
            .get("Soundscape Dark")
            .cloned();

        if let Some(config) = config {
            Theme::update(cx, |theme| theme.apply_config(&config));
        }
    })
        .expect("failed to watch themes directory");
}

fn init_app_settings(cx: &mut App) {
    cx.set_global(AppSettings {
        audio_engine: AudioEngine::new().expect("Failed to open default audio sink"),
        db: connect_to_db(),
    });
}