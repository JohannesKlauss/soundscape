use gpui_kit::{div, Context, IntoElement, Render, Window, Styled, ParentElement, RenderOnce, App};
use gpui_kit::component::{ActiveTheme, WindowExt};
use gpui_kit::component::button::{Button, ButtonVariants};
use gpui_kit::component::notification::NotificationType;
use crate::AppSettings;

#[derive(IntoElement)]
pub struct HelloWorld;

impl RenderOnce for HelloWorld {
    fn render(self, _: &mut Window, cx: &mut App) -> impl IntoElement {
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