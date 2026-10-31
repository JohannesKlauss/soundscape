pub mod audio_engine;

use std::path::PathBuf;

use gpui_kit::component::button::{Button, ButtonVariants};
use gpui_kit::component::{ActiveTheme, Theme, ThemeRegistry, WindowExt};
use gpui_kit::*;
use gpui_kit::component::notification::NotificationType;
use crate::audio_engine::AudioEngine;

pub struct HelloWorld;

impl Render for HelloWorld {
    fn render(&mut self, _: &mut Window, cx: &mut Context<Self>) -> impl IntoElement {
        div()
            .flex()
            .flex_col()
            .gap_2()
            .size_full()
            .items_center()
            .justify_center()
            .bg(cx.theme().background)
            .text_color(cx.theme().foreground)
            .child("Hello, World")
            .child(
                Button::new("ok")
                    .primary()
                    .label("Play Sound 1")
                    .on_click(|_, window, cx| {
                        if let Err(e) = cx.global_mut::<AppSettings>().audio_engine.play() {
                            println!("Error while playing: {:?}", e);

                            window.push_notification((NotificationType::Error, "Could not play sound."), cx)
                        }
                    }),
            )
            .child(
                Button::new("ok2")
                    .primary()
                    .label("Play Sound 2")
                    .on_click(|_, window, cx| {
                        if let Err(e) = cx.global_mut::<AppSettings>().audio_engine.play_other() {
                            println!("Error while playing: {:?}", e);

                            window.push_notification((NotificationType::Error, "Could not play sound."), cx)
                        }
                    }),
            )
            .child(
                Button::new("ok3")
                    .primary()
                    .label("Stop all sounds")
                    .on_click(|_, window, cx| {
                        cx.global_mut::<AppSettings>().audio_engine.stop_all()
                    }),
            )
    }
}

struct AppSettings {
    audio_engine: AudioEngine
}

impl Global for AppSettings {}

fn main() {
    application().with_assets(assets::Assets).run(|cx| {
        init_app_settings(cx);
        init(cx);
        set_theme(cx);

        open_window(WindowOptions::default(), cx, |_, cx| cx.new(|_| HelloWorld))
            .expect("Failed to open window");
    });
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
    });
}