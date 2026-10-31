use gpui_kit::{div, IntoElement, Window, Styled, ParentElement, Render, Context};
use gpui_kit::assets::IconName;
use gpui_kit::component::sidebar::{Sidebar, SidebarGroup, SidebarMenu, SidebarMenuItem};
use gpui_navigator::{router_view};

pub struct Layout;

impl Render for Layout {
    fn render(&mut self, window: &mut Window, cx: &mut Context<Self>) -> impl IntoElement {
        div()
            .flex()
            .flex_row()
            .size_full()
            .child(Sidebar::new("menu").child(
                SidebarGroup::new("Navigation")
                    .child(
                        SidebarMenu::new()
                            .child(
                                SidebarMenuItem::new("Dashboard")
                                    .icon(IconName::LayoutDashboard)
                                    .on_click(|_, _, _| println!("Dashboard clicked"))
                            )
                            .child(
                                SidebarMenuItem::new("Settings")
                                    .icon(IconName::Settings)
                                    .on_click(|_, _, _| println!("Settings clicked"))
                            )
                    )
            ))
            .child(router_view(window, cx))
    }
}