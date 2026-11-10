use gpui_kit::{App, Context, ParentElement, Window};
use gpui_kit::base::IndexPath;
use gpui_kit::component::label::Label;
use gpui_kit::component::list::{ListDelegate, ListItem, ListState};
use crate::domain::campaign::NamedCampaign;

pub struct ListCampaigns {
    pub campaigns: Vec<NamedCampaign>
}

impl ListDelegate for ListCampaigns {
    type Item = ListItem;

    fn items_count(&self, _: usize, _: &App) -> usize {
        self.campaigns.len()
    }

    fn render_item(&mut self, ix: IndexPath, _: &mut Window, _: &mut Context<ListState<Self>>) -> Option<Self::Item> {
        self.campaigns.get(ix.row).map(|list_item| {
            ListItem::new(ix)
                .child(Label::new(list_item.name.clone()))
        })
    }

    

    fn set_selected_index(&mut self, _: Option<IndexPath>, _: &mut Window, _: &mut Context<ListState<Self>>) {
        todo!()
    }
}