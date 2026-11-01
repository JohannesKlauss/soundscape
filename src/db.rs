use std::path::Path;
use native_db::{Builder, Database, Models};
use once_cell::sync::Lazy;
use crate::model::model;

static MODELS: Lazy<Models> = Lazy::new(|| {
    let mut models = Models::new();

    models.define::<model::v1::Scene>().unwrap();

    models
});

pub fn create_db() -> Database<'static> {
    Builder::new().create(&MODELS, Path::new("test.db")).expect("Could not open db connection")
}