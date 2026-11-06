use gpui_kit::component::input::{Input, InputState};
use gpui_kit::{App, AppContext, Entity, IntoElement, RenderOnce, Window};

#[derive(IntoElement)]
pub struct CreateProject {
    project_name: Entity<InputState>,
}

impl CreateProject {
    pub fn new(window: &mut Window, cx: &mut App) -> Self {
        let project_name =
            cx.new(|cx| InputState::new(window, cx).placeholder("Enter your projects name...").default_value("test"));

        Self { project_name }
    }
}

impl RenderOnce for CreateProject {
    fn render(self, _: &mut Window, _: &mut App) -> impl IntoElement {
        Input::new(&self.project_name).cleanable(true)
    }
}
