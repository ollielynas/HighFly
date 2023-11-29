use std::time::{Duration, Instant};

use parking_lot::RwLock;

pub enum InputType {
    PhoneAccelerometer,
    None,
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
            set_timer,
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
    pub timer: i32,
    
}

impl InnerAppState {
    pub fn is_in_air(&self) -> bool {self.last_hit_tramp.saturating_duration_since(self.last_left_tramp).is_zero()}
    
    /// value of timer for current jump
    pub fn timer_value(&self) -> Duration {
        Instant::now().saturating_duration_since(self.last_left_tramp)
    }
    pub fn total_time(&self) -> Duration {
        let mut total = Duration::default();
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
            timer: 0,
        }
    }
}



#[tauri::command]
fn graph_data(state: tauri::State<AppState>) -> String {
    let state_guard = state.0.read();
    let max = state_guard.timing_data.iter().map(|x| x.as_millis()).max().unwrap_or(0) as f32 / 1000.0;
    match state_guard.input_type {
        _ => {
            return format!(
                "<svg class='bar-graph' viewBox='0 0 370 190'>
                <g class='data' data-setname='Our first data set'>{}</g>
                <polyline
     fill='none'
     stroke='#0074d9'
     stroke-width='2'
     points='{}'/>
                </svg>",
                state_guard.timing_data.iter().enumerate().map(|(i,x)| {
                    format!("
                    <circle cx='{}' cy='{}' data-value='{}' r='4'></circle>
                    "
                    ,
                    (i+1)*37,
                    190.0 -  (x.as_secs_f32()/max) * 100.0, x.as_secs_f32())

            }).collect::<String>(),
                state_guard.timing_data.iter().enumerate().map(|(i,x)| {
                    format!("{},{} "
                    ,
                    (i+1)*37,
                    190.0 -  (x.as_secs_f32()/max) * 100.0)

            }).collect::<String>(),
            );
        }
    }
    
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
fn set_timer(state: tauri::State<AppState>, timer_value: i32) {
    let mut state_guard = state.0.write();
    state_guard.timer = timer_value;
}
#[tauri::command]
fn start_timing(state: tauri::State<AppState>) {
    let mut state_guard = state.0.write();
    state_guard.timing_data = vec![];
    state_guard.is_timing = true;
    state_guard.jump_number = -state_guard.timer;
}

#[tauri::command]
fn stop_timing_early(state: tauri::State<AppState>) {
    let mut state_guard = state.0.write();
    state_guard.is_timing = false;
}

#[tauri::command]
fn hit_tramp(state: tauri::State<'_, AppState>) {
    let mut state_guard = state.0.write();
    let jump_duration = Instant::now().saturating_duration_since(state_guard.last_left_tramp);
    if jump_duration.as_secs_f32() <= 0.8 {
        return;
    }
    state_guard.last_hit_tramp = Instant::now();
    if state_guard.is_timing {
        state_guard.jump_number += 1;
        if state_guard.jump_number > 0 {
            state_guard.timing_data.push(jump_duration);
        }
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
