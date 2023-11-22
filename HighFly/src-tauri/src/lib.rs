use std::time::{Duration, Instant};

use tauri::async_runtime::RwLock;


pub struct AppState(pub RwLock<InnerAppState>);

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
            .manage(AppState(RwLock::new(InnerAppState::default())))
        .plugin(tauri_plugin_window::init())
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![
            start_timing, 
            stop_timing_early, 
            hit_tramp, 
            leave_tramp
            ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}


pub struct InnerAppState {
    pub timing_data: Vec<Duration>,
    pub jump_number: i32,
    pub is_timing: bool,
    pub last_left_tramp: Instant,
    pub last_hit_tramp: Instant,
    
}

impl InnerAppState {
    pub fn is_in_air(&self) -> bool {self.last_hit_tramp.saturating_duration_since(self.last_left_tramp).is_zero()}
    
    pub fn timer_value(&self) -> Duration {
        self.last_hit_tramp.saturating_duration_since(self.last_left_tramp)
    }

}
impl Default for InnerAppState {
    fn default() -> Self {
        InnerAppState {
            last_left_tramp: Instant::now(),
            timing_data: vec![],
            jump_number:0,
            is_timing: false,
            last_hit_tramp: Instant::now(),
        }
        }
}



#[tauri::command]
fn start_timing() {
}
#[tauri::command]
fn stop_timing_early() {
}
#[tauri::command]
fn hit_tramp() {
}
#[tauri::command]
fn leave_tramp() {
}
