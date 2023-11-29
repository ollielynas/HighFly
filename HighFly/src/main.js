const { invoke } = window.__TAURI__.primitives;

let greetInputEl;
let greetMsgEl;

var elem1;
var elem2;
var elem3;

window.addEventListener("DOMContentLoaded", () => {
  elem1 = document.getElementById("jump-time");
  elem2 = document.getElementById("total-time");
  elem3 = document.getElementById("jump-number");
});

if (window.DeviceMotionEvent) {
  window.addEventListener("devicemotion", motion, false);
} else {
  console.log("DeviceMotionEvent is not supported");
}

var g_force = 1;
var jerk = 0;

const GFORCE_THRESHOLD = 1.1;

var g_force_readout = document.getElementById("g_force_readout");

async function motion(event) {
  let g_force_new =
    Math.sqrt(
      Math.pow(event.accelerationIncludingGravity.x, 2) +
        Math.pow(event.accelerationIncludingGravity.y, 2) +
        Math.pow(event.accelerationIncludingGravity.z, 2)
    ) / 9.8;
  // let g_force_measurement = Math.abs(g_force -1);
  // let jerk_new = Math.abs(g_force_new - g_force);
  // let jerk_change = Math.abs(jerk - jerk_new);

  g_force_readout.innerText = g_force_new;
  // console.log(g_force_readout);

  if (g_force > 1.5 && g_force_new < 1.5) {
    await leave_tramp();
    console.log("leave_tramp");
  }
  if (g_force < 1.5 && g_force_new > 1.5) {
    await hit_tramp();
    console.log("hit tramp");
  }

  g_force = g_force_new;
}

var button = document.getElementById("placeholder-button");

async function hit_tramp() {
  await invoke("hit_tramp");
  await update_graph();
  elem1.style.color = "red";
}
async function leave_tramp() {
  await invoke("leave_tramp");
  elem1.style.color = "gray";
}

button.addEventListener("mousedown", async () => {
  await hit_tramp();
});
button.addEventListener("mouseup", async () => {
  await leave_tramp();
});

async function update_graph() {
  invoke("graph_data")
    // `invoke` returns a Promise
    .then((response) => {
      var elem = document.getElementById("graph");
      if (
        typeof elem != "undefined" &&
        document.getElementById("start").style.display == "none"
      ) {
        elem.innerHTML = response;
      }
    });
}
async function update() {
  invoke("number_data").then(async (response) => {
    if (response[0] + response[1] + response[2] == 0) {
      return;
    }

    if (typeof elem1 != "undefined") {
      elem1.innerHTML = response[0].toFixed(2);
    }
    if (typeof elem2 != "undefined") {
      elem2.innerHTML = response[1].toFixed(2);
    }
    if (typeof elem3 != "undefined") {
      elem3.innerHTML = response[2].toFixed(0);
      if (response[2] == 10.0) {
        document.getElementById("start").style.display = "block";
        document.getElementById("stop").style.display = "none";
        // await invoke("stop_timing_early");
        console.log("stop");
      }
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

setInterval(update, 200);
setInterval(update_graph, 1000);
