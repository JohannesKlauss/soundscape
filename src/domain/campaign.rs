use crate::model::{DbNewCampaign, DbCampaign};
use diesel::{QueryDsl, RunQueryDsl, SelectableHelper, SqliteConnection};
use anyhow::Result;
use gpui_kit::{App, AppContext, Context, Entity, Global};
use crate::AppSettings;

#[derive(Debug, Clone)]
pub struct NamedCampaign {
    id: i32,
    pub name: String,
}

impl From<DbCampaign> for NamedCampaign {
    fn from(value: DbCampaign) -> Self {
        Self {
            id: value.id,
            name: value.name,
        }
    }
}

impl NamedCampaign {
    pub fn list(conn: &mut SqliteConnection) -> Vec<Self> {
        use crate::schema::campaigns::dsl::*;

        let campaign_result = QueryDsl::select(campaigns, DbCampaign::as_select()).load(conn);

        match campaign_result {
            Ok(c) => c.into_iter().map(NamedCampaign::from).collect(),
            Err(_) => vec![]
        }
    }
}

pub struct CreatableCampaign {
    name: String,
}

impl From<&CreatableCampaign> for DbNewCampaign {
    fn from(value: &CreatableCampaign) -> Self {
        DbNewCampaign {
            name: value.name.to_owned()
        }
    }
}

impl CreatableCampaign {
    pub fn new(name: &str) -> Self {
        Self { name: name.to_owned() }
    }

    pub fn persist(self, conn: &mut SqliteConnection) -> Result<NamedCampaign> {
        use crate::schema::campaigns::dsl::*;

        let project = diesel::insert_into(campaigns)
            .values(DbNewCampaign::from(&self))
            .returning(DbCampaign::as_returning())
            .get_result(conn)?;

        Ok(project.into())
    }
}

pub struct CampaignStore {
    campaigns: Vec<NamedCampaign>,
}

struct GlobalCampaignStore(Entity<CampaignStore>);

impl Global for GlobalCampaignStore {}

impl CampaignStore {
    fn new(campaigns: Vec<NamedCampaign>) -> Self {
        Self {
            campaigns,
        }
    }

    pub fn init(cx: &mut App) {
        let campaigns = NamedCampaign::list(&mut cx.global_mut::<AppSettings>().db);
        let store = cx.new(|_| Self::new(campaigns));
        
        cx.set_global(GlobalCampaignStore(store))
    }
    
    pub fn global(cx: &App) -> Entity<Self> {
        cx.global::<GlobalCampaignStore>().0.clone()
    }
    
    pub fn campaigns(&self) -> &[NamedCampaign] {
        &self.campaigns
    }
    
    pub fn create(
        &mut self,
        name: &str,
        cx: &mut Context<Self>,
    ) -> Result<()> {
        let settings = cx.global_mut::<AppSettings>();
        let campaign = CreatableCampaign::new(name).persist(&mut settings.db)?;
        
        self.campaigns.push(campaign);
        cx.notify();
        
        Ok(())
    }
}