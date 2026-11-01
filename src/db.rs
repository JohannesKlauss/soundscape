use std::env;
use diesel::{Connection, SqliteConnection};
use dotenvy::dotenv;

pub fn connect_to_db() -> SqliteConnection {
    dotenv().ok();
    
    let db_url = env::var("DATABASE_URL").expect("DATABASE_URL must be set");
    
    SqliteConnection::establish(&db_url)
        .expect("Error connecting to database")
}