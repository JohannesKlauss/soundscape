use crate::model::{DbNewProject, DbProject};
use diesel::{RunQueryDsl, SelectableHelper, SqliteConnection};
use anyhow::Result;

struct CreatableProject {
    name: String,
}

struct NamedProject {
    id: i32,
    name: String,
}

impl From<DbProject> for NamedProject {
    fn from(value: DbProject) -> Self {
        Self {
            id: value.id,
            name: value.name,
        }
    }
}

impl CreatableProject {
    pub fn new(name: &str) -> Self {
        Self { name: name.into() }
    }

    pub fn persist(&self, conn: &mut SqliteConnection) -> Result<NamedProject> {
        use crate::schema::projects::dsl::*;

        let new_db_project = DbNewProject { name: self.name.to_owned() };

        let project = diesel::insert_into(projects)
            .values(&new_db_project)
            .returning(DbProject::as_returning())
            .get_result(conn)?;

        Ok(project.into())
    }
}
