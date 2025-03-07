console.log("Error 15");
populateMusic();
populateVideo();
openMusic();
//Watch out for animation start, and add certain class to mark it
document.addEventListener('animationstart', function (e)
{
if (e.animationName === 'fade-in') {e.target.classList.add('did-fade-in');}
});
//Watch out for animations end, and add certain class to mark it
document.addEventListener('animationend', function (e)
{
if (e.animationName === 'fade-out') {volumeb.style.display="none";menuListElement.style.display="none";}
});

console.log("Checkpoint 16");

//Eventlistner for doubleclik on video to maximize the window
videoContainerElement.addEventListener('dblclick', function (e)
{
  if(win.isKioskMode==false){win.enterKioskMode();isMax=1;win.setResizable(false);}
  else if(win.isKioskMode==true){win.leaveKioskMode();isMax=0;win.setResizable(true);}
});
//Track mouse position for window dragging function START
function trackMousePosition()
{
  let titleBar=document.getElementById('titleBarId');
  let isMouseDownTitleBar = false;
  let cX=0;
  let cY=0;
  function handleMouseMove(event)
  {
    if (isMouseDownTitleBar && isMax!=1)
    {
      const xM = event.screenX-cX;
      const yM = event.screenY-cY;
      win.moveTo(xM, yM);
      if(vlcOn){ //If VLC make it follow main window, works on linux
      spawn2('xdotool', ['windowmove', wid, xM*1.094, yM*1.094+80]);
      spawn2('xdotool', ['windowsize', wid, win.width*1.094, win.height*1.094-150]);
      }
    }
    else if (holdingVideo && isMax!=1){
      console.log("holding video")
      const xM = event.screenX-cX;
      const yM = event.screenY-cY;
      win.moveTo(xM, yM);
    }
  }
  titleBar.addEventListener('mousedown', function ()
  {
    cX=event.clientX+5;
    cY=event.clientY+30;
    isMouseDownTitleBar = true;
    win.setResizable(false);
  });
  if(dragByHoldingVideo){
  //Function to play/pause video when dragging window by grabing video START
      audioVideoElement.addEventListener('mousedown', function (event)
      {
      if(event.which==1)
      {
      cX=event.clientX+5;
      cY=event.clientY+30;
      holdingVideo=true;
      win.setResizable(false);
      }
      });
    //END
  }
  document.addEventListener('mouseup', function (){isMouseDownTitleBar = false; holdingVideo=false;win.setResizable(true);});
  document.addEventListener('mousemove', handleMouseMove);
}
if(dragByHoldingVideo){
//Function to play/pause video when dragging window by grabing video, needs enabling other things too
audioVideoElement.addEventListener('mousedown', function (event)
{console.log(event);setTimeout(()=>{if(!holdingVideo && event.which==1){playpauseTrack()}},200)});
}
else{audioVideoElement.addEventListener('click', function (){playpauseTrack()});}
//Track mouse position for window dragging function END
console.log("Checkpoint 17");

// Call the function to start tracking mouse position
trackMousePosition();