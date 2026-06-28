const Sound = (() => {

  const sounds = {
    bgm: new Audio("sounds/bgm.mp3"),
    button: new Audio("sounds/button.mp3"),

    tag: new Audio("sounds/tag.mp3"),
    win: new Audio("sounds/win.mp3"),
    lose: new Audio("sounds/lose.mp3"),
     countdown: new Audio("sounds/countdown.mp3")
  };

  // Background music loop
  sounds.bgm.loop = true;
  sounds.bgm.volume = 0.3;

  // Sound effects volume
  sounds.button.volume = 0.8;

  sounds.tag.volume = 1.0;
  sounds.win.volume = 1.0;

 
  sounds.lose.volume = 1.0;

  function play(name) {
  if (!sounds[name]) return;

  console.log("Playing:", name);

  sounds[name].currentTime = 0;
  sounds[name].volume = 1.0;

  sounds[name].play()
    .then(() => {
      console.log("Success:", name);
    })
    .catch(err => {
      console.error("Failed:", name, err);
    });
}

function playBGM() {
  sounds.bgm.play();
}

function stopBGM() {
  sounds.bgm.pause();
  sounds.bgm.currentTime = 0;
}

return {
  play,
  playBGM,
  stopBGM
};

})();
let countdownPlayed = false;