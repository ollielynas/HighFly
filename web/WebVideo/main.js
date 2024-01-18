const videoSrc = document.querySelector("#video-source");
const videoTag = document.querySelector("#video-tag");
const inputTag = document.querySelector("#input-tag");
const timeBar = document.querySelector(".timestamp");
const totalTimeElm = document.querySelector("#total-time");
const slider = document.querySelector(".slider");
const videoTime = document.querySelector("#video-time");
const jumps = document.querySelector(".on-off-indecator");
const del = document.querySelector(".del");






const scale = 4;

let timestamp = 0;
let duration = 0;
let newJumpStart = -1;
let totalTime = 0;

let jumpData = [];




videoTag.preload = "auto";

slider.addEventListener("scroll", () => {
    timestamp = (slider.scrollLeft / timeBar.clientWidth) * duration;
    if (timestamp < 10000) {
    videoTag.currentTime = timestamp;
    videoTime.innerHTML = timestamp.toPrecision(3);
    }

});

videoTag.onloadedmetadata = function () {
  window.URL.revokeObjectURL(videoTag.src);
  duration = videoTag.duration;
  console.log(duration)
  timeBar.style.width = (duration * scale).toString() + "em";
  totalTime = 0;
  jumpData = [];
    updateJumpHTML();
};


function clickJump() {
    if (newJumpStart < 0) {
        startJump()
    }else {
        endJump()
    }
}


function startJump() {
    if (timestamp < 100) { 
    newJumpStart = timestamp;
    }

        updateJumpHTML();


}
function endJump() {
    var newData = [newJumpStart, timestamp];
    if (newJumpStart > timestamp) {
        newData = [timestamp, newJumpStart];
    }
    jumpData.push(newData)
    newJumpStart = -1;
    console.log(jumpData)

    updateJumpHTML()
}

function delButton() {
    var newData = [];
    for (i of jumpData) {
        if (i[0] > timestamp || i[1] < timestamp) {
            newData.push(i)
        }
    }
    console.log(newData)
    jumpData = newData;
    updateJumpHTML();
}

window.delButton = delButton;

function updateJumpHTML() {
    var newHtml = ""
    totalTime = 0;
    
    if (newJumpStart >= 0) {
            newHtml += "<div class='start-pointer' style='position: relative; left:"+newJumpStart*scale+"em; width:0'></div>"
        }
    let last = 0;
    for (i of jumpData) {
        var margin = ((i[0]-last)*scale).toString();
        var width = ((i[1]-i[0])*scale).toString();
        console.log(i)
        totalTime += i[1] - i[0];
        newHtml += "<div class='jump' style='margin-left:"+margin+"em; width:"+width+"em'></div>"
        last = i[1]
    }


    console.log(totalTime)
    totalTimeElm.innerHTML = "TOF: " + totalTime.toPrecision(3).toString()
    jumps.innerHTML = newHtml;
}

window.clickJump = clickJump;

inputTag.addEventListener("change", readVideo);

function readVideo(event) {
  console.log(event.target.files);
  if (event.target.files && event.target.files[0]) {
    var reader = new FileReader();

    reader.onload = function (e) {
      console.log("loaded");
      videoSrc.src = e.target.result;
      videoTag.load();
      duration = videoTag.duration;
    }.bind(this);

    reader.readAsDataURL(event.target.files[0]);
  }
}
