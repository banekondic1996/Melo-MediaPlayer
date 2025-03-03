//Function to draw visualizer

//Canvas script
let canvas
//

//Audio connection
/* const audioContext = new(window.AudioContext || window.webkitAudioContext)().createAnalyser(); */
const analyser= new(window.AudioContext || window.webkitAudioContext)().createAnalyser();
const sourceNode = analyser.context.createMediaElementSource(audioVideoElement);

// Connect audio to analyser
sourceNode.connect(analyser);
analyser.connect(analyser.context.destination);

//Set analyser properties
analyser.fftSize = 256;   // Controls the frequency resolution
const bufferLength = analyser.frequencyBinCount;
const dataArray = new Uint8Array(bufferLength);


//Butter visualizer code
butterchurn=require('butterchurn');
butterchurnPresets=require('butterchurn-presets');
let visualizer;

//Visualizer switch
 visualizerOn=false;
 let complexVisuals=true;
 //Simple or complex visuals switch
 function visualizerTypeSwitch(){
    if(!complexVisuals){complexVisuals=true;visualizerSwitch();}
    else{complexVisuals=false;visualizerSwitch();}
  }
 function visualizerSwitch(){
  if(!visualizerOn){
  visualizerOn=true;
  listaEl.classList.add('listaVisualizerMin');
  canvas = document.createElement("canvas");
  canvas.id='visualizer';
  /* canvas.className="visualizerMin"; */ //Small visualizer
  document.body.appendChild(canvas);
  //Adds events to hides menus when visualizer is on
  addEventsForVisualizer();
  if(complexVisuals){
      visualizer = butterchurn.default.createVisualizer(analyser.context, canvas, {
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
else if(visualizerOn){visualizerOn=false;canvas.remove();listaEl.classList.remove('listaVisualizerMin');unHideElementsForVisual();}
 }
 //Complex visualizer
 let animationID
 function drawComplexVisualizer(){
  if(!visualizerOn){context=null; return;}
  cancelAnimationFrame(animationID-1);
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