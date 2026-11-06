use crate::AppSettings;
use crate::domain::campaign::CreatableCampaign;
use gpui_kit::component::WindowExt;
use gpui_kit::component::button::{Button, ButtonVariants};
use gpui_kit::component::input::{Input, InputState};
use gpui_kit::component::notification::Notification;
use gpui_kit::{
    AppContext, Context, Entity, IntoElement, ParentElement, Render, Styled, Window, div,
};

pub struct CreateCampaign {
    project_name: Entity<InputState>,
}

impl CreateCampaign {
    pub fn new(window: &mut Window, cx: &mut Context<Self>) -> Self {
        Self {
            project_name: cx.new(|cx| {
                InputState::new(window, cx)
                    .placeholder("Enter your campaigns name...")
                    .default_value("test")
            }),
        }
    }
}

impl Render for CreateCampaign {
    fn render(&mut self, _: &mut Window, _: &mut Context<Self>) -> impl IntoElement {
        let project_name = self.project_name.clone();

        div()
            .w_full()
            .flex()
            .gap_2()
            .child(Input::new(&self.project_name).cleanable(true))
            .child(Button::new("create").primary().label("Create").on_click(
                move |_, window, cx| {
                    let name = project_name.read(cx).value();
                    let settings = cx.global_mut::<AppSettings>();
                    let project = CreatableCampaign::new(name.as_str()).persist(&mut settings.db);

                    match project {
                        Ok(_) => window.push_notification(
                            Notification::success(format!("Created campaign {}", name)),
                            cx,
                        ),
                        Err(e) => {
                            println!("{}", e);
                            window.push_notification(
                                Notification::error("Could not create new campaign"),
                                cx,
                            );
                        }
                    }

                    ()
                },
            ))
    }
}
