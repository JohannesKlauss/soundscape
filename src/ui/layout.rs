use gpui_kit::{div, IntoElement, Window, ParentElement, Render, Context};
use gpui_navigator::{router_view};

pub struct Layout;

impl Render for Layout {
    fn render(&mut self, window: &mut Window, cx: &mut Context<Self>) -> impl IntoElement {
        div()
            .child(router_view(window, cx))
    }
}