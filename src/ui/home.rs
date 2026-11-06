use gpui_kit::{div, IntoElement, Window, Styled, ParentElement, RenderOnce, App};
use gpui_kit::component::{ActiveTheme, WindowExt};
use gpui_kit::component::button::{Button, ButtonVariants};
use gpui_kit::component::notification::NotificationType;
use crate::AppSettings;
use crate::domain::creatable_scene::CreatableScene;
use crate::domain::named_scene::NamedScene;
use crate::ui::create_project::CreateProject;

#[derive(IntoElement)]
pub struct Home {
    pub name_input: CreateProject
}

impl Home {
    pub fn new(window: &mut Window, cx: &mut App) -> Self {
        Self {
            name_input: CreateProject::new(window, cx)
        }
    }
}

impl RenderOnce for Home {
    fn render(self, window: &mut Window, cx: &mut App) -> impl IntoElement {
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
            .child(self.name_input)
            .child(
                Button::new("db-list")
                    .primary()
                    .label("List from db")
                    .on_click(|_, window, cx| {
                        let settings = cx.global_mut::<AppSettings>();
                        
                        if let Ok(list) = NamedScene::list(&mut settings.db) {
                            println!("Scenes: {:?}", list);

                            let l: Vec<String> = list.iter().map(|el| el.name.to_owned()).collect();

                            window.push_notification((NotificationType::Info, format!("Entries: {}", l.join("; "))), cx)
                        }
                    }),
            )
            .child(
                Button::new("db")
                    .primary()
                    .label("Insert into db")
                    .on_click(|_, window, cx| {
                        let settings = cx.global_mut::<AppSettings>();

                        if let Err(e) = CreatableScene::new("test").persist(&mut settings.db) {
                            println!("Error creating scene: {:?}", e);

                            window.push_notification((NotificationType::Error, "Could not create scene."), cx)
                        }
                    }),
            )
    }
}