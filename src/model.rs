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
#[diesel(table_name = crate::schema::campaigns)]
#[diesel(check_for_backend(diesel::sqlite::Sqlite))]
pub struct DbCampaign {
    pub id: i32,
    pub name: String,
}

#[derive(Insertable)]
#[diesel(table_name = crate::schema::campaigns)]
#[diesel(check_for_backend(diesel::sqlite::Sqlite))]
pub struct DbNewCampaign {
    pub name: String,
}