use native_db::Database;
use crate::model::model;
use anyhow::{Result};
use uuid::Uuid;

#[derive(Debug)]
pub struct NamedScene {
    pub name: String
}

impl From<model::Scene> for NamedScene {
    fn from(value: model::Scene) -> Self {
        Self {
            name: value.name,
        }
    }
}

impl NamedScene {
    pub fn new(name: &str) -> Self {
        Self {
            name: name.to_owned(),
        }
    }

    pub fn list(db: &Database) -> Result<Vec<NamedScene>> {
        let r = db.r_transaction()?;

        let scenes: Vec<model::Scene> = r.scan().primary()?.all()?.collect::<Result<Vec<_>, _>>()?;

        Ok(scenes.into_iter().map(NamedScene::from).collect())
    }

    pub fn persist(&self, db: &Database) -> Result<()> {
        let rw = db.rw_transaction()?;
        rw.insert(model::Scene {
            id: model::Id(Uuid::new_v4()),
            name: "Alice".to_string()
        })?;

        rw.commit()?;

        Ok(())
    }
}