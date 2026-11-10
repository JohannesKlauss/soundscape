use gpui_kit::{div, IntoElement, Window, Styled, ParentElement, Context, AppContext, Entity, Render, px};
use gpui_kit::component::{ActiveTheme, WindowExt};
use gpui_kit::component::button::{Button, ButtonVariants};
use gpui_kit::component::list::{List, ListState};
use gpui_kit::component::notification::NotificationType;
use crate::AppSettings;
use crate::domain::campaign::{CampaignStore, NamedCampaign};
use crate::domain::creatable_scene::CreatableScene;
use crate::domain::named_scene::NamedScene;
use crate::ui::create_campaign::CreateCampaign;
use crate::ui::list_campaigns::ListCampaigns;

pub struct Home {
    name_input: Entity<CreateCampaign>,
    campaigns: Entity<ListState<ListCampaigns>>,
}

impl Home {
    pub fn new(window: &mut Window, cx: &mut Context<Self>) -> Self {
        let store = CampaignStore::global(cx);
        let campaigns = store.read(cx).campaigns().to_vec();

        println!("{:?}", campaigns);

        cx.observe(&store, |home, store, cx| {
            let campaigns = store.read(cx).campaigns().to_vec();

            home.campaigns.update(cx, |list, cx| {
                list.delegate_mut().campaigns = campaigns;
                cx.notify();
            });
        }).detach();

        Self {
            name_input: cx.new(|cx| CreateCampaign::new(window, cx)),
            campaigns: cx.new(|cx| ListState::new(ListCampaigns {
                campaigns
            }, window, cx)),
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
            .child(List::new(&self.campaigns))
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