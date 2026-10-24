//Apply saved settings: dark mode (on by default) and volume
darkmode(settings.darkMode);
volume_slider.value=settings.volume;
audioVideoElement.volume=settings.volume/100;
//Arguments on app start
let pathElm=nw.App.argv;
//Focus app window
win.focus();
//Open files given on app start.
//Runs after the window finished loading (all scripts, audio engine, waveform...). Opening them while scripts were still loading
//was the timing problem that made the first video fail to load.
function openStartupFiles()
{
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
}
window.addEventListener('load',function(){setTimeout(openStartupFiles,100);});
//Open file with app START
//While app is opened, opened files via app as arguments
//Media file paths inside the command line text NW.js gives us (quotes are respected, so paths with spaces work)
function mediaPathsFromCommandLine(args)
{
  const text = Array.isArray(args) ? args.map(function(item) {return '"' + item + '"';}).join(' ') : String(args);
  const isMedia = function(path)
  {
    const dot = path.lastIndexOf('.');
    const extension = dot >= 0 ? path.substring(dot).toLowerCase() : '';
    return fileTypes.Audio.includes(extension) || fileTypes.Video.includes(extension);
  };
  const tokens = [];
  const pattern = /"([^"]*)"|'([^']*)'|(\S+)/g;
  let match;
  while ((match = pattern.exec(text)) !== null) {tokens.push(match[1] !== undefined ? match[1] : (match[2] !== undefined ? match[2] : match[3]));}
  let paths = [];
  if (text.indexOf('"') < 0)
  {
    //No quotes: the path may contain spaces. Try the text starting at every "/" (or drive letter) after a space, last first, and use one that is a real file
    const starts = [];
    for (let i = 0; i < text.length; i++) {if ((text[i] === '/' || /^[A-Za-z]:[\\/]/.test(text.substr(i, 3))) && (i === 0 || /\s/.test(text[i - 1]))) {starts.push(i);}}
    let fallback = null;
    for (let k = starts.length - 1; k >= 0; k--)
    {
      const candidate = text.slice(starts[k]).trim().replace(/^file:\/\//, '');
      if (!isMedia(candidate)) {continue;}
      if (fallback === null) {fallback = candidate;}
      try {if (fs.existsSync(candidate)) {paths = [candidate]; break;}} catch (error) {}
    }
    if (paths.length === 0 && fallback !== null) {paths = [fallback];}
  }
  if (paths.length === 0) {paths = tokens.map(function(token) {return token.replace(/^file:\/\//, '');}).filter(isMedia);}
  return paths;
}
nw.App.on('open', (args)=>{
  try
  {
    win.focus();
    console.log("Open while running: " + args);
    const paths = mediaPathsFromCommandLine(args);
    if (paths.length === 0) {console.log("No media file in: " + args); return;}
    paths.forEach(function(pathArg) {processFile(pathArg);});
    const lastPath = paths[paths.length - 1];
    const found = track_list.findIndex(function(track) {return track.path === lastPath || track.path === 'file://' + lastPath;});
    if (found < 0) {return;}
    track_index = found;
    setTimeout(function()
    {
      try
      {
        console.log("App opened via file " + lastPath);
        if (track_list[track_index].type.includes('audio')) {openMusic();}
        if (track_list[track_index].type.includes('video')) {openVideo();}
        loadTrack(track_index);
        playTrack();
        applySelectionHighlightPlaylist(true);
      }
      catch (error) {console.log("Could not open file: " + error.message);}
    }, 300);
  }
  catch (error) {console.log("Open handler failed: " + error.message);}
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
  let widthSeek=document.getElementById('seekSliderContainer').offsetWidth+"px"; //Same width as the seek slider / waveform
  seek_trim_start.style.width=widthSeek;
  seek_trim_end.style.width=widthSeek;
  if(vlcOn){ //If VLC make it follow main window
    spawn2('xdotool', ['windowmove', wid, win.x*1.094, win.y*1.094+80]);
    spawn2('xdotool', ['windowsize', wid, win.width*1.094, win.height*1.094-150]);
    }
}
reSize();
