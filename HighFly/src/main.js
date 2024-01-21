
const { invoke } = window.__TAURI__.primitives;

let greetInputEl;
let greetMsgEl;

var elem1;
var elem2;
var elem3;
var dialog;

var has_bluetooth = false;

let body;


function gained_bluetooth() {
  document.getElementById("bluetooth-button").innerHTML = '<svg id="has-bluetooth" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256"><rect width="256" height="256" fill="none"/><polygon points="120 32 184 80 120 128 120 32" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="16"/><polygon points="120 128 184 176 120 224 120 128" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="16"/><line x1="56" y1="80" x2="120" y2="128" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="16"/><line x1="56" y1="176" x2="120" y2="128" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="16"/></svg>'
}
function lost_bluetooth() {
  document.getElementById("bluetooth-button").innerHTML = '<svg id="has-no-bluetooth" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256"><rect width="256" height="256" fill="none"/><polygon points="120 128 184 176 120 224 120 128" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="16"/><line x1="56" y1="80" x2="120" y2="128" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="16"/><line x1="56" y1="176" x2="120" y2="128" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="16"/><line x1="232" y1="56" x2="184" y2="104" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="16"/><line x1="232" y1="104" x2="184" y2="56" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="16"/><polyline points="152 104 120 128 120 32 152 56" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="16"/></svg>'

}
window.gained_bluetooth = gained_bluetooth;
window.lost_bluetooth = lost_bluetooth;



window.addEventListener("DOMContentLoaded", () => {

  body = document.body;

  lost_bluetooth();
  elem1 = document.getElementById("jump-time");
  elem2 = document.getElementById("total-time");
  elem3 = document.getElementById("jump-number");

  document
    .getElementById("timer-input-box")
    .addEventListener("click", async () => {
      let value = parseInt(document.getElementById("timer-value").value);
      if (typeof value == "undefined") {
        value = 0;
      }
      await invoke("set_timer", {
        timerValue: value,
      });
    });
  document
    .getElementById("connect-to-bluetooth")
    .addEventListener("click", async () => {
      navigator.bluetooth
        .requestDevice({ filters: [{ services: ["battery_service"] }] })
        .then(async (device) => {
          /* … */
          await device.gatt.connect();
          let primaryService = await device.gatt.getPrimaryService("0000180f-0000-1000-8000-00805f9b34fb")
          let characteristic = await primaryService.getCharacteristic("00002a56-0000-1000-8000-00805f9b34fb")
          console.log(characteristic);

          device.gatt.addEventListener(
            "gattserverdisconnected",
            async (event) => {
              lost_bluetooth();
            }
          );
          characteristic.addEventListener("characteristicvaluechanged", async (event) => {
            let value = event.target.value;
            let on_tramp = value.getUint8(0);
            let timestamp = value.getInt32(4, true);

            console.log(on_tramp, timestamp);

            if (on_tramp == 1) {
              await hit_tramp();
            }else {
              await leave_tramp();
            }
            
          });

          await characteristic.startNotifications();
        })
        .catch((error) => {
          console.error(error);
        });

    });
    dialog = document.querySelector('dialog');
    dialog.addEventListener("click", (e) => {
      console.log(e.target);
      const dialogDimensions = dialog.getBoundingClientRect();
      if (
        e.clientX < dialogDimensions.left ||
        e.clientX > dialogDimensions.right ||
        e.clientY < dialogDimensions.top ||
        e.clientY > dialogDimensions.bottom
      ) {
        dialog.close();
      }
    });
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
  return;
  let g_force_new =
    Math.sqrt(
      Math.pow(event.accelerationIncludingGravity.x, 2) +
        Math.pow(event.accelerationIncludingGravity.y, 2) +
        Math.pow(event.accelerationIncludingGravity.z, 2)
    ) / 9.8;
  // let g_force_measurement = Math.abs(g_force -1);
  // let jerk_new = Math.abs(g_force_new - g_force);
  // let jerk_change = Math.abs(jerk - jerk_new);

  // g_force_readout.innerText = g_force_new;
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

window.hit_tramp = hit_tramp;
window.leave_tramp = leave_tramp;


async function update_graph() {
  invoke("graph_data")
    // `invoke` returns a Promise
    .then((response) => {
      var elem = document.getElementById("graph");
      if (
        typeof elem != "undefined" &&
        (document.getElementById("start").style.display == "none" ||
          elem.innerHTML=="...")
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
      if (response[0].toFixed(2) < 5) {
        elem1.innerHTML = response[0].toFixed(2);
      }else {
        elem1.innerHTML = "- . - -";
        if (document.getElementById("stop").style.display == "block") {
          document.getElementById("stop").click();
          dialog.showModal();

        }
      }
    }
    if (typeof elem2 != "undefined") {
      if (response[0].toFixed(2) < 100) {
        elem2.innerHTML = response[1].toFixed(2);
      }else {
        elem2.innerHTML = "- . - -";
      }
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

setInterval(update, 50);
setInterval(update_graph, 1000);
await update_graph();



await invoke("fs_test")

function switch_ui(self, name) {
  console.log("xxx");
  let hide = document.querySelectorAll(".hideable");
  let button = document.querySelectorAll(".nav-buttons > a");
  for (let i = 0; i < hide.length; i++) {
    hide[i].style.display = "none";
  }
  console.log(button);
  for (let i = 0; i < button.length; i++) {
    // document.querySelector("#"+button[i].id+ " svg").className = "black-svg";
  }
  document.querySelector("#"+name).style.display = "flex";

  body.setAttribute("state", name);

  // document.querySelector("#" + self.id + " svg").s = "orange-svg";
}

window.switch_ui = switch_ui;



