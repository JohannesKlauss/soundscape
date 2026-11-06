use diesel::{RunQueryDsl, SelectableHelper, SqliteConnection};
use crate::model::{DbNewScene, DbScene};

#[derive(Debug)]
pub struct CreatableScene {
    pub name: String
}

impl CreatableScene {
    pub fn new(name: &str) -> Self {
        CreatableScene {
            name: name.to_owned(),
        }
    }

    pub fn persist(&self, conn: &mut SqliteConnection) -> anyhow::Result<()> {
        use crate::schema::scenes::dsl::*;

        let new_db_scene = DbNewScene {
            name: self.name.to_owned(),
        };

        diesel::insert_into(scenes)
            .values(&new_db_scene)
            .returning(DbScene::as_returning())
            .get_result(conn)?;

        Ok(())
    }
}