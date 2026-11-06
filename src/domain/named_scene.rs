use anyhow::{Result};
use diesel::{ExpressionMethods, QueryDsl, RunQueryDsl, SelectableHelper, SqliteConnection};
use crate::model::{DbScene};

#[derive(Debug, thiserror::Error)]
pub enum NamedSceneError {
    #[error("Can't find Scene in Database")]
    NotFound,
    #[error(transparent)]
    DatabaseError(#[from] diesel::result::Error)
}

#[derive(Debug)]
pub struct NamedScene {
    pub id: i32,
    pub name: String,
}

impl From<DbScene> for NamedScene {
    fn from(value: DbScene) -> Self {
        Self {
            id: value.id,
            name: value.name,
        }
    }
}

impl NamedScene {
    pub fn list(conn: &mut SqliteConnection) -> Result<Vec<NamedScene>> {
        use crate::schema::scenes::dsl::*;

        let results = QueryDsl::select(scenes, DbScene::as_select()).load(conn)?;

        Ok(results.into_iter().map(NamedScene::from).collect())
    }

    pub fn delete(&self, conn: &mut SqliteConnection) -> Result<(), NamedSceneError> {
        use crate::schema::scenes::dsl::*;

        let rows_affected = diesel::delete(scenes.filter(id.eq(self.id))).execute(conn)?;

        match rows_affected {
            0 => Err(NamedSceneError::NotFound),
            _ => Ok(()),
        }
    }
}
