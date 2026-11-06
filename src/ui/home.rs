use gpui_kit::{div, IntoElement, Window, Styled, ParentElement, RenderOnce, App, Context, AppContext, Entity, Render};
use gpui_kit::component::{ActiveTheme, WindowExt};
use gpui_kit::component::button::{Button, ButtonVariants};
use gpui_kit::component::notification::NotificationType;
use crate::AppSettings;
use crate::domain::creatable_scene::CreatableScene;
use crate::domain::named_scene::NamedScene;
use crate::ui::create_campaign::CreateCampaign;

pub struct Home {
    pub name_input: Entity<CreateCampaign>
}

impl Home {
    pub fn new(window: &mut Window, cx: &mut Context<Self>) -> Self {
        Self {
            name_input: cx.new(|cx| CreateCampaign::new(window, cx))
        }
    }
}

impl Render for Home {
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
            .child(self.name_input.clone())
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