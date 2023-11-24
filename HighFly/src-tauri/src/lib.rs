use std::time::{Duration, Instant};

use parking_lot::RwLock;

pub enum InputType {
    PhoneAccelerometer
}

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
            leave_tramp,
            graph_data,
            number_data,
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
    pub input_type: InputType,
    
}

impl InnerAppState {
    pub fn is_in_air(&self) -> bool {self.last_hit_tramp.saturating_duration_since(self.last_left_tramp).is_zero()}
    
    pub fn timer_value(&self) -> Duration {
        self.last_hit_tramp.saturating_duration_since(self.last_left_tramp)
    }
    pub fn total_time(&self) -> Duration {
        let mut total = self.timer_value();
        for i in &self.timing_data {
            total += *i;
        }
        return total;
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
            input_type: InputType::PhoneAccelerometer,
        }
    }
}



#[tauri::command]
fn graph_data(state: tauri::State<AppState>) -> String {
    let state_guard = state.0.read();
    return state_guard.timing_data.iter().map(|x| format!("{:.2}, ", x.as_secs_f32())).collect();
    
}
#[tauri::command]
fn number_data(state: tauri::State<AppState>) -> [f32;3] {
    let state_guard = state.0.read();
    return [
        state_guard.timer_value().as_secs_f32(),
        state_guard.total_time().as_secs_f32(),
        state_guard.jump_number as f32,

    ];
}

#[tauri::command]
fn start_timing(state: tauri::State<AppState>) {
    let mut state_guard = state.0.write();
    state_guard.timing_data = vec![];
    state_guard.is_timing = true;
    state_guard.jump_number = 0;
}

#[tauri::command]
fn stop_timing_early(state: tauri::State<AppState>) {
    let mut state_guard = state.0.write();
    state_guard.is_timing = false;

}

#[tauri::command]
fn hit_tramp(state: tauri::State<'_, AppState>) {
    let mut state_guard = state.0.write();
    state_guard.last_hit_tramp = Instant::now();
    if state_guard.is_timing {
        let jump_duration = state_guard.timer_value();
        state_guard.jump_number += 1;
        state_guard.timing_data.push(jump_duration);
        if state_guard.jump_number >= 10 {
            drop(state_guard);
            stop_timing_early(state);
        }
    }
}

#[tauri::command]
fn leave_tramp(state: tauri::State<AppState>) {
    let mut state_guard = state.0.write();
    state_guard.last_left_tramp = Instant::now();
}
