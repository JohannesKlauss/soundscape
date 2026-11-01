use anyhow::{Result};
use diesel::{RunQueryDsl, SelectableHelper};
use diesel::query_dsl::limit_dsl::LimitDsl;
use diesel::query_dsl::methods::SelectDsl;
use crate::db::connect_to_db;
use crate::model::{DbNewScene, DbScene};

#[derive(Debug)]
pub struct NamedScene {
    pub name: String
}

impl From<DbScene> for NamedScene {
    fn from(value: DbScene) -> Self {
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

    pub fn list() -> Result<Vec<NamedScene>> {
        use crate::schema::scenes::dsl::*;

        let conn = &mut connect_to_db();
        let results = scenes.limit(5).select(DbScene::as_select()).load(conn)?;

        Ok(results.into_iter().map(NamedScene::from).collect())
    }

    pub fn persist(&self) -> Result<()> {
        use crate::schema::scenes::dsl::*;

        let conn = &mut connect_to_db();

        let new_scene = DbNewScene {
            name: self.name.to_owned(),
        };

        diesel::insert_into(scenes)
            .values(&new_scene)
            .returning(DbScene::as_returning())
            .get_result(conn)?;

        Ok(())
    }
}