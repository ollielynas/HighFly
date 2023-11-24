const { invoke } = window.__TAURI__.primitives;

let greetInputEl;
let greetMsgEl;

window.addEventListener("DOMContentLoaded", () => {

});


if(window.DeviceMotionEvent){
  window.addEventListener("devicemotion", motion, false);
}else{
  console.log("DeviceMotionEvent is not supported");
}

var g_force = 1;
var jerk = 0;

const GFORCE_THRESHOLD = 1.1;

async function motion(event) {
  let g_force_new = Math.sqrt(Math.pow(event.accelerationIncludingGravity.x,2)+ Math.pow(event.accelerationIncludingGravity.y,2)+Math.pow(event.accelerationIncludingGravity.z,2))/9.8;
  // let g_force_measurement = Math.abs(g_force -1);
  // let jerk_new = Math.abs(g_force_new - g_force);
  // let jerk_change = Math.abs(jerk - jerk_new);
  
  if (g_force > 1.5 && g_force_new < 1.5 ){
    await invoke("leave_tramp");
    console.log("leave_tramp");
  }
  if (g_force < 1.5 && g_force_new > 1.5 ){
    await invoke("hit_tramp");
    console.log("hit tramp");
  }
  
  g_force = g_force_new;
}


function update() {
  invoke("graph_data")
  // `invoke` returns a Promise
  .then((response) => {
    
    var elem = document.getElementById("graph");
    if (typeof(elem) != "undefined") {
      elem.innerHTML = response;
    }
  });
  invoke("number_data")
  // `invoke` returns a Promise
  .then((response) => {
    if (response[0] + response[1] + response[2] == 0) {
      console.log(response);
      return
    }
    var elem1 = document.getElementById("jump-time");
    var elem2 = document.getElementById("total-time");
    var elem3 = document.getElementById("jump-number");
    if (typeof(elem1) != "undefined") {
      elem1.innerHTML = response[0].toFixed(2);
    }
    if (typeof(elem2) != "undefined") {
      elem2.innerHTML = response[0].toFixed(2);
    }
    if (typeof(elem3) != "undefined") {
      elem3.innerHTML = response[0].toFixed(0);
    }
  });
}

document.getElementById("stop").addEventListener("click", async () => {
  document.getElementById("start").style.display = "block";
  document.getElementById("stop").style.display = "none";
  await invoke("stop_timing_early");
  console.log("stop");
});
document.getElementById("start").addEventListener("click", async () => {
  document.getElementById("stop").style.display = "block";
  document.getElementById("start").style.display = "none";
  await invoke("start_timing");
  console.log("start");
});

setInterval(update, 100);