
use std::{time::{Duration, Instant}, path::PathBuf};

// use tauri::{Wry, App, Manager};
// use tauri_plugin_store::{with_store, StoreCollection};


pub struct UserData {
    pub names: Vec<String>,
}

impl UserData {

}

pub struct SavedData {
    pub name: String,
    pub date: Instant,
    pub timing_data: Vec<Duration>,
}


// impl SavedData {
//     pub fn save(&self, app: &mut App) {
//         let stores = app.state::<StoreCollection<Wry>>();
//         let path = PathBuf::from("save.bin");
//         with_store(app_handle, stores, path, |store| store.insert("a".to_string(), json!("b")));
//     }
// }