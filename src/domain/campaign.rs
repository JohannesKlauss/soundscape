use crate::model::{DbNewCampaign, DbCampaign};
use diesel::{RunQueryDsl, SelectableHelper, SqliteConnection};
use anyhow::Result;

pub struct NamedCampaign {
    id: i32,
    name: String,
}

impl From<DbCampaign> for NamedCampaign {
    fn from(value: DbCampaign) -> Self {
        Self {
            id: value.id,
            name: value.name,
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
