/* Firefighter javascript game (AKA Palopeli) */

/*

  Game loop inspired by tutorial at
  https://www.sitepoint.com/quick-tip-game-loop-in-javascript/

*/

$(document).ready(function() {

  // Set up the canvas

  // This is the actual player view
  cnvs = document.getElementById("viewCanvas");
  ctx = cnvs.getContext('2d');

  // The level canvas keeps track of the things outside the view
  // and feeds the actual view canvas.
  levelCnvs = document.getElementById("gameCanvas");
  levelCtx = levelCnvs.getContext('2d');
  levelW = levelCnvs.width;

  // The gradient textures of sky and ground are also stored in canvases
  // for easier access & storage.
  var skyCanvas = document.getElementById("skyCanvas");
  var skyCtx = skyCanvas.getContext('2d');

  var groundCanvas = document.getElementById('groundCanvas');
  var groundCtx = groundCanvas.getContext('2d');

  var groundGrd= groundCtx.createLinearGradient(0,0,800,400);
  groundGrd.addColorStop(0,"green");
  groundGrd.addColorStop(1,"yellow");

  groundCtx.fillStyle=groundGrd;
  groundCtx.fillRect(0,0,800,400);

  var skyGrd= skyCtx.createLinearGradient(0,0,800,400);
  skyGrd.addColorStop(0,"black");
  skyGrd.addColorStop(1,"blue");

  skyCtx.fillStyle=skyGrd;
  skyCtx.fillRect(0,0,800,400);


  /* Class definitions */

  // Classes need to be defined before any instances are created.

  // Shot singleton class.
  class Shot{

    constructor(){
      this.active = false;
      this.vel_x = 0;
      this.vel_y = 0;
      this.pos_x = 0;
      this.pos_y = 0;
      this.size = 10;
    }

    get_x(){
      return this.pos_x;
    }

    get_y(){
      return this.pos_y;
    }

    get_active(){

      return this.active;

    }

    get_size(){

      return this.size;
    }
    blow(){

      this.active = false;

      let index = 0;

      while(index < targetsRemaining.length){

        if(Math.abs(shot.get_x() - targetsRemaining[index].get_x()) < 10  ){

          console.log("hit")
          score += targetsRemaining[index].get_x();
          updateScore(score);
          hitsToLevelup--;
          targetsRemaining.splice(index,1);

        }
        else {

          index++;

        }
      }

    }

    shoot(pos_x, pos_y, vel_x, vel_y){

      this.pos_x = pos_x;
      this.pos_y = pos_y;
      this.vel_x = vel_x;
      this.vel_y = vel_y;
      this.active = true;

    }


    collisionCheck(){
      if(this.pos_y > canvH - groundLevel)
        return true;
      else {
          return false;
      }

    }

    update(step){

      if(this.get_active() == false){

        return;
      }

      else {

        this.pos_x += (this.vel_x*step)/10000;
        this.pos_y += (this.vel_y*step)/10000;
        this.vel_y += gravity*step;

        if(this.collisionCheck()){

          this.blow();
        }
      }
    }
  }

  class Target{

    constructor(pos_x){

      this.pos_x = pos_x;

      targetsRemaining.push(this);

    }
    get_x(){
      return this.pos_x;
    }

    draw(){

      levelCtx.fillStyle="#FF0000";
      levelCtx.fillRect(this.pos_x, canvH - groundLevel, 25, 25);

    }
  }

  class Player{

    constructor(pos_x, pos_y){

      this.pos_x = pos_x;
      this.pos_y = pos_y;
    }

    getTurretX(){

      return this.pos_x + 30*((90-currAngle)/90);

    }

      getTurretY(){

        return this.pos_y - 30*(currAngle/90);
      }
    draw(){

      levelCtx.fillStyle="#FF0000";
      levelCtx.fillRect(this.pos_x, this.pos_y, 25, 25);

      levelCtx.beginPath();

      levelCtx.strokeStyle="#5b0113";
      levelCtx.moveTo(this.pos_x, this.pos_y);
      levelCtx.lineTo(this.getTurretX(), this.getTurretY());
      levelCtx.lineWidth=10;
      levelCtx.stroke();


    }

  }

  // Current Game variables
  var canvW = cnvs.width;
  var canvH = cnvs.height;

  // Camera position for scrolling
  var cameraX = 0;
  var xClickStart = 0;
  var xClickDelta = 0;

  // Mouse drag event functions for monitoring drag on the canvas
  var mouseDown = false;

  cnvs.onmousedown = function(e){

    xClickStart = e.x;
    mouseDown = true;
  }

  cnvs.onmousemove = function(e){
    if(mouseDown){

      xClickDelta =  e.x - xClickStart;
    }
  }

  cnvs.onmouseup = function(e){

    cameraX = cameraX + xClickDelta;
    xClickDelta = 0;
    if( cameraX > 0 ){
      cameraX = 0;
    }
    else if( cameraX < -levelW + canvW){
      cameraX = -levelW + canvW;
    }
    mouseDown = false;
  }

  // Game status variables
  var paused = false;
  var gameOver = false;

  var score = 0;

  var currPower = 0;
  var currAngle = 0;

  // Weapons were initially planned, but deadline left them out
  // var weapons = [];

  // The time difference between last gamestate update and present moment
  var lastUpdate = Date.now();
  var progress = Date.now() - lastUpdate;

  // --------------
  // Game constants
  // --------------
  var gravity = 0.025;
  var groundLevel = 40;
  var targetFramerate = 30;

  // Milliseconds per update
  var timeframe = 1000/targetFramerate;

  var angleMax = 90;
  var angleStep = 5;

  var powerStep = 25;
  var powerMax = 1000;

  var player = new Player(25, canvH - groundLevel - 15);
  var shot = new Shot();

  var targetsRemaining = [];

  // 10 seconds
  var targetInterval = 10000;

  var lastTargetSpawn = 0;
  var targetRangeMax = 750;
  var targetRangeMin = 75;
  var lvlSpawnReduce = 1000;

  var baseLevelHits = 5;
  var hitsPerLevel = 0;
  var level = 1;
  var hitsToLevelup = 5;


  //  ---------------------
  //  Canvas Draw Functions
  //  ---------------------

  // Converts a regular y (ground = 0, greater value --> higher )
  // into a canvas position where top left corner is (0,0)
  function yToCanvPos(y_pos){

    return (canvH - groundLevel - y_pos);
  }

  // Draws images based on the two hidden canvases
  function drawLandscape(){

    levelCtx.drawImage(skyCanvas,0,0);
    levelCtx.drawImage(groundCanvas, 0, yToCanvPos(0));

  }

  function drawPlayer(){

      player.draw();

  }

  function drawTargets(){

    let index = 0;

    while(index < targetsRemaining.length){

      targetsRemaining[index].draw();
      index++;
    }
  }

  function drawShot(){

    levelCtx.fillStyle="#e87612";
    levelCtx.fillRect(shot.get_x(), shot.get_y(),shot.get_size(),shot.get_size());

  }

  // The collection of draws for the next frame. At least for now it seems
  // convenient to simply draw them in order with painter's algorithm rather
  // than chasing a more performance efficient solution.

  function draw(){

    // First draw the whole level
    levelCtx.clearRect(0,0,canvW, canvH);
    drawLandscape();
    drawPlayer();
    drawTargets();
    drawShot();

    // Then draw the player view based on camera positions
    ctx.clearRect(0,0,canvW,canvH);

    if(!mouseDown){

      ctx.drawImage(levelCnvs, cameraX, 0);
    }

    else {
      if(cameraX + xClickDelta > 0){
        ctx.drawImage(levelCnvs, 0, 0);

      }
      else if (cameraX + xClickDelta < -levelW + canvW){

        ctx.drawImage(levelCnvs, -levelW + canvW, 0);
      }
       else {

        ctx.drawImage(levelCnvs, cameraX + xClickDelta, 0);
      }
    }
  }

  // Spawns another target to the map
  function spawnTarget(){

    new Target(getRandomInt(targetRangeMin, targetRangeMax));
    lastTargetSpawn = Date.now();
    console.log("New Target spawned!")
  }

  // Clears all targets
  function clearTargets(){

      targetsRemaining = [];

  }

  // Updates the game difficulty
  function levelUp(){

    level++;
    hitsToLevelup = baseLevelHits + ((level - 1) * hitsPerLevel);
    updateLevel();
  }

  // Status check on targets (too many loses the game),
  // succificient kills for levelup
  function checkTargets(){

    if(hitsToLevelup <= 0){

      levelUp();
    }

    if(targetsRemaining.length > 6){

      gameOver = true;
    }

    if(Date.now() - lastTargetSpawn > (targetInterval - level*(lvlSpawnReduce))){

      spawnTarget();
      }
  }

  // Timestep update on gamestate
  function updateState(){

      checkTargets();
      shot.update(progress);
  }

  function displayMessage(text){

    ctx.font = "30px Arial";
    ctx.strokeStyle = "#e87612";
    ctx.fillText(text,canvW/3,canvH/2);

  }

  function drawGameOverMessage(){

    ctx.font = "30px Arial";
    ctx.strokeStyle = "#e87612";
    ctx.fillText("Game Over!",canvW/3,canvH/2);

  }

  function displayPauseMessage(){

    ctx.font = "30px Arial";
    ctx.strokeStyle = "#e87612";
    ctx.fillText("Paused!",canvW/3,canvH/2);

  }

  // Initializes the game with updates as requested by the fps value
  function initGameLoop(){

      paused = false;

      setInterval(function(){
      progress = Date.now() - lastUpdate;

      if(gameOver){

        drawGameOverMessage();
        paused = true;

      }

      if(paused == false){
        updateState();
        draw();
      }
    }, 1000/targetFramerate)
  }

  // -----------------
  // UI Utility Functions
  // -----------------

  function updateScore(newScore){

    $("#score").text(newScore);
  }

  function updateAngle(newAngle){

    $("#angle").text(newAngle);
  }

  function updatePower(newPower){

    $("#power").text(newPower);
  }
  /*
  function updateWeap(newWeap){

    console.log("Implement me!");
    $("#weapon").text("Implement Me!");
  }
  */

  function updateLevel(){
    $("#levelCounter").text(level);
  }
  // Math utility

  // Direct copy from Mozilla dev random function
  function getRandomInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min)) + min;
}

  // ------------
  // Button binds
  // ------------

  // Power
  $("#powerMinus").click( function(){

    if(currPower > powerStep){

      currPower -= powerStep;
    }

    else {
      currPower = 0;
    }
    updatePower(currPower);
  })

  $("#powerPlus").click(function(){

      console.log("PowerPlus!")
      if(currPower < (powerMax - powerStep)){

        currPower += powerStep;

      }

      else {
        currPower = powerMax;
      }
      updatePower(currPower);
  })


  // Angles
  $("#anglePlus").click(function(){

      console.log("anglePlus!");
      if(currAngle < (angleMax - angleStep)){

        currAngle += angleStep;

      }

      else {
        currAngle = angleMax;
      }

      updateAngle(currAngle);
  })

  $("#angleMinus").click(function(){

    if(currAngle < angleStep){

      currAngle = 0;
    }

    else{

      currAngle -= angleStep;
    }

    updateAngle(currAngle);

  })

  $("#shoot").click(function(){

      if(shot.get_active() === false){

      shot.shoot(player.getTurretX(), player.getTurretY(), currPower*(90-currAngle)/90, -currPower*(currAngle/90));
      lastUpdate = Date.now();
    }
  })

  $("#pause").click(function(){

    paused = !paused;
    displayPauseMessage();
  })

  $("#restart").click(function(){

    level = 1;
    score = 0;

    clearTargets();

    updateLevel();
    updateScore(score);

    cameraX = 0;
    draw();

    paused = false;
    gameOver = false;
  })


  $("#save").click( function() {
    var msg = {
      "messageType": "SAVE",
      "gameState": {
        "score": score,
        "level": level
        }
      }
    window.parent.postMessage(msg, "*");
    })

    $("#load").click( function() {

      var loadMsg = {

        "messageType": "LOAD_REQUEST"
      }

      window.parent.postMessage(loadMsg, "*");
    }
    )

  $("sendScore").click( function() {

    var msg = {
        "messageType": "SCORE",
        "score": parseFloat($("#score").text())
      };
      window.parent.postMessage(msg, "*");
    })

  window.addEventListener("message", receiveMessage, false);

  function receiveMessage(event){

      if(event.data.messageType === "LOAD"){
        
        clearTargets;
        paused = true;

        level = event.data.gameState.level;
        score = event.data.gameState.score;

        updateScore(score);
        updateLevel();


      }

      else if(event.data.messageType === "ERROR"){

        $("#Errormessages").append("ERROR!: " + event.data.info);
        $("#Errormessages").attr("hidden", false);
      }

      else {

        console.log("Unknown messagetype: " + event.data.messageType)
      }
  }

  // Send the iframe dimension request to the parent
  let message =  {
    messageType: "SETTING",
    options: {
      "width": 450, //Integer
      "height": 650 //Integer
      }
    };

  window.parent.postMessage(message, "*");

  // All set up, let's initiate the game
  initGameLoop();

});
