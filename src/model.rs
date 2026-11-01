pub mod model {
    use native_db::{native_db, ToKey, Key};
    use native_model::{native_model, Model};
    use serde::{Deserialize, Serialize};
    use uuid::Uuid;

    #[derive(Serialize, Deserialize, Eq, PartialEq, Debug, Clone, Hash)]
    pub struct Id(pub Uuid);

    impl ToKey for Id {
        fn to_key(&self) -> Key { Key::new(self.0.as_bytes().to_vec()) }
        fn key_names() -> Vec<String> { vec!["Id".into()] }
    }

    pub(crate) type Scene = v1::Scene;

    pub mod v1 {
        use super::*;

        #[derive(Serialize, Deserialize, Debug)]
        #[native_model(id = 1, version = 1)]
        #[native_db]
        pub struct Scene {
            #[primary_key]
            pub id: Id,
            pub name: String,
        }
    }
}