//Function to draw visualizer

//Canvas script
let canvas
//

//Audio connection: the visualizer uses the shared audio graph from audioEngine.js (audioCtx, analyser, bufferLength, dataArray),
//the audio can only be connected to the media element once, so nothing is created here.


//Butter visualizer code
butterchurn=require('butterchurn');
butterchurnPresets=require('butterchurn-presets');
let visualizer;

//Visualizer switch
 visualizerOn=false;
 let complexVisuals=settings.complexVisuals; //Saved choice
 //Simple or complex visuals switch
 function visualizerTypeSwitch(){
    if(!complexVisuals){complexVisuals=true;visualizerSwitch();}
    else{complexVisuals=false;visualizerSwitch();}
    setSetting('complexVisuals',complexVisuals);
  }
 function visualizerSwitch(){
  if(!visualizerOn){
  visualizerOn=true;
  playlistContainerEl.classList.add('listaVisualizerMin');
  playlistSearchEl.classList.add('searchVisualizerMin')
  infoEl.style.backgroundColor="transparent"
  canvas = document.createElement("canvas");
  canvas.id='visualizer';
  /* canvas.className="visualizerMin"; */ //Small visualizer
  document.body.appendChild(canvas);
  //Adds events to hides menus when visualizer is on
  addEventsForVisualizer();
  if(complexVisuals){
      visualizer = butterchurn.default.createVisualizer(audioCtx, canvas, {
        width: window.screen.width,
        height: window.screen.height,
        pixelRatio: window.devicePixelRatio || 1,
        textureRatio: 1,
      });
      visualizer.connectAudio(analyser);
      // load a preset
      const presets = butterchurnPresets.getPresets();
     /*  const preset = presets['Flexi, martin + geiss - dedicated to the sherwin maxawow']; */
      visualizer.loadPreset(presets[presetKeys[presetSelectEl.value]], 1) // 2nd argument is the number of seconds to blend presets
      // resize visualizer
      /* visualizer.setRendererSize(1300, 600); */
      drawComplexVisualizer();
      canvas.height=window.screen.height;
      canvas.width=window.screen.width;
  }
  else{
    drawSimpleVisualizer();
  }
}
else if(visualizerOn){visualizerOn=false;if(visualizer){try{visualizer.disconnectAudio(analyser);}catch(error){}}canvas.remove();playlistContainerEl.classList.remove('listaVisualizerMin');playlistSearchEl.classList.remove('searchVisualizerMin');infoEl.style.backgroundColor='rgb(224 224 224 / 37%)';unHideElementsForVisual();}
 }
 //Complex visualizer
 let animationID
 function drawComplexVisualizer(){
  if(!visualizerOn){context=null; return;}
  //(removed cancelAnimationFrame(animationID-1): frame ids are shared by the whole page, so it also cancelled the frequency analyser's frame)
  animationID=requestAnimationFrame(() => drawComplexVisualizer());
  // render a frame
  visualizer.render();
 }
 //Simple visualizer (for test)
 function drawSimpleVisualizer() {
  if(!visualizerOn){context=null; return;}
  requestAnimationFrame(() => drawSimpleVisualizer());
  const ctx = canvas.getContext('2d');
  analyser.getByteFrequencyData(dataArray);
  // Clear canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  // Create dynamic visualizer (waveform-like)
  const barWidth = (canvas.width / bufferLength) * 2.5;
  let x = 0;
  for (let i = 0; i < bufferLength; i++) {
      const barHeight = dataArray[i];
      const red = barHeight + (25 * (i / bufferLength));
      const green = 250 * (i / bufferLength);
      const blue = 50;
      ctx.fillStyle = `rgb(${red},${green},${blue})`;
      ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
      x += barWidth + 1;
  }
  }