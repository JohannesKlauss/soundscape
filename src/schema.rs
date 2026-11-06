// @generated automatically by Diesel CLI.

diesel::table! {
    campaigns (id) {
        id -> Integer,
        name -> Text,
    }
}

diesel::table! {
    scenes (id) {
        id -> Integer,
        name -> Text,
    }
}

diesel::allow_tables_to_appear_in_same_query!(campaigns, scenes,);
