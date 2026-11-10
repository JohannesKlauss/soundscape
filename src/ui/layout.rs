use gpui_kit::{div, IntoElement, Window, ParentElement, Render, Context, Styled};
use gpui_navigator::{router_view};

pub struct Layout;

impl Render for Layout {
    fn render(&mut self, window: &mut Window, cx: &mut Context<Self>) -> impl IntoElement {
        div()
            .w_full()
            .h_full()
            .child(router_view(window, cx))
    }
}