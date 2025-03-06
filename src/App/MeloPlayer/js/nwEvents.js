//Toggle dark mode
darkmode();
//Arguments on app start
let pathElm=nw.App.argv;
//Focus app window
win.focus();
//If arguments are passed on app start
if(pathElm)
{
  (pathElm).forEach(function(pathArg,index)
  {
    processFile(pathArg);
    console.log("launch arguments"+pathArg);
    if(fileTypes.Video.some(format=>pathArg.includes(format)))
    {
      console.log("pathElm lenght is:"+pathArg.length+"index is: "+index);
      if(pathElm.length-1==index) //On last loaded file open video
      {
        if(track_list.length>0){
        track_index=track_list.length-1;
        }
        openVideo();
        loadTrack(track_index);
        playTrack();
      }
    }
    if(fileTypes.Audio.some(format=>pathArg.includes(format)))
    {
      if(pathElm.length-1==index)
      {
        if(track_list.length>0){
        track_index=track_list.length-1;
        }
        loadTrack(track_index);
        playTrack();
      }
    }
  });
}
//Open file with app START
//While app is opened, opened files via app as arguments
nw.App.on('open', (args)=>{
  win.focus();
  let textArg=args.toString();
  console.log("textArg "+textArg);
  let pathArg=textArg.split('"')[5]
  console.log("pathArg while running:"+pathArg);
  processFile(pathArg);
  setTimeout(()=>
  {
    console.log("App opened via file" + args);
    //If last track is audio, open music view
    if(track_list[track_index].type.includes('audio')){openMusic();}
    //If last track is video, open video view
    if(track_list[track_index].type.includes('video')){openVideo();}
    //Load and play last track
    loadTrack(track_index);
    playTrack();
    },550);
  
});
//Open file with app END
//On app maximize and minimize events to stop CPU/GPU from processing visualizations when not needed START
win.on('minimize', function () {
    if(visualizerOn){
      cancelAnimationFrame(animationID);
    }
  });
win.on('restore', function () {
  if(visualizerOn){
    drawComplexVisualizer();
}
});
//On app maximize and minimize events to stop CPU/GPU from processing visualizations when not needed END
//On window resize, call reSize function to fix trim bar size
window.onresize = reSize;
function reSize()
{
  let widthSeek=seeksliderEl.offsetWidth+"px";
  seek_trim_start.style.width=widthSeek;
  seek_trim_end.style.width=widthSeek;
}
reSize();
