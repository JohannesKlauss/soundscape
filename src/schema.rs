// @generated automatically by Diesel CLI.

diesel::table! {
    scenes (id) {
        id -> Integer,
        name -> Text,
    }
}

diesel::table! {
    projects (id) {
        id -> Integer,
        name -> Text,
    }
}