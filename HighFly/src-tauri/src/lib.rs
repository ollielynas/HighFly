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
    let millis: Vec<_> = state_guard.timing_data.iter().map(|x| x.as_millis()).collect();

    let max = *millis.iter().max().unwrap_or(&0) as f32 / 1000.0;
    let min = *millis.iter().min().unwrap_or(&0) as f32 / 1000.0;

    const BASE_SMALL_SCALE: f32 = 0.1;
    const PER_LARGE_TICK: u32 = 5;
    
    let mut small_scale = BASE_SMALL_SCALE;
    let mut large_scale = small_scale * PER_LARGE_TICK as f32;

    while max / large_scale > 5.0 {
        small_scale *= 2.0;
        large_scale *= 2.0;
    }

    let num_large_ticks = 2.max(1 + (max / large_scale).ceil() as u32);

    let num_ticks = PER_LARGE_TICK * (num_large_ticks - 1);
    let scale_max = (num_large_ticks - 1) as f32 * large_scale;

    let mut svg = String::new();

    svg.push_str("<svg class='bar-graph' viewBox='0 0 370 190'>");

    for i in 0..=num_ticks {
        let y = 180.0 - (170.0 / num_ticks as f32) * i as f32;

        if i % PER_LARGE_TICK == 0 {
            let val = i as f32 * small_scale;

            svg.push_str(&format!("<line x1='35' y1='{y}' x2='51' y2='{y}' style='stroke:black;stroke-width:1px;'/>"));
            svg.push_str(&format!("<text x='30' y='{y}' fill='black' text-anchor='end' dominant-baseline='middle'>{val:.1}</text>"));
        } else {
            svg.push_str(&format!("<line x1='50' y1='{y}' x2='40' y2='{y}' style='stroke:gray;stroke-width:1px;' />"));
        }
    }

    svg.push_str("<polyline points='50,10 50,180 370,180' style='stroke:black;stroke-width:2px;fill:none;'/>");

    let y_min = 180.0 - 170.0 * (min / scale_max);
    let y_max = 180.0 - 170.0 * (max / scale_max);

    svg.push_str(&format!("<line x1='50' y1='{y_min}' x2='370' y2='{y_min}' stroke='gray' stroke-width='1px' stroke-dasharray='5,5'/>"));
    svg.push_str(&format!("<line x1='50' y1='{y_max}' x2='370' y2='{y_max}' stroke='gray' stroke-width='1px' stroke-dasharray='5,5'/>"));

    let mut points = vec![];

    for (i, millis) in millis.iter().enumerate() {
        let x = 60.0 + (300.0 / 9.0) * i as f32;
        let y = 180.0 - 170.0 * (*millis as f32 / 1000.0 / scale_max);

        points.push((x, y));
    }

    for (x, y) in &points {
        svg.push_str(&format!("<circle cx='{x}' cy = '{y}' r='4' class='datapoint'/>"));
    }

    svg.push_str(&format!(
        "<polyline fill='none' stroke='#0074d9' stroke-width='2' points='{}'",
        points.iter().map(|(x, y)| format!("{x},{y}")).collect::<Vec<_>>().join(" ")
    ));

    svg.push_str("</svg>");
    
    return svg;
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
