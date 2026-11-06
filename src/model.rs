use diesel::{Insertable, Queryable, Selectable};

#[derive(Queryable, Selectable)]
#[diesel(table_name = crate::schema::scenes)]
#[diesel(check_for_backend(diesel::sqlite::Sqlite))]
pub struct DbScene {
    pub id: i32,
    pub name: String,
}

#[derive(Insertable)]
#[diesel(table_name = crate::schema::scenes)]
#[diesel(check_for_backend(diesel::sqlite::Sqlite))]
pub struct DbNewScene {
    pub name: String,
}

#[derive(Queryable, Selectable)]
#[diesel(table_name = crate::schema::projects)]
#[diesel(check_for_backend(diesel::sqlite::Sqlite))]
pub struct DbProject {
    pub id: i32,
    pub name: String,
}

#[derive(Insertable)]
#[diesel(table_name = crate::schema::projects)]
#[diesel(check_for_backend(diesel::sqlite::Sqlite))]
pub struct DbNewProject {
    pub name: String,
}