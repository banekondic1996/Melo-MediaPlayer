//Video trimming function
function doTrimConvert(filePath,formatOutput,isTrim)
{
 /*  if(processPlatform=='win32'){filePath = filePath.replace(/\\/g, '\\\\');} */
  let duration;
  let options=['-ab', '192k'];
  let codec= 'h264_amf';
  const pendingPromise = new Promise((resolve) => {
    ffmpeg.ffprobe(filePath,function(err, data) {
        duration=data.format.duration;
        console.log(data.format.duration);
        resolve("success")
    })
  });
  pendingPromise.then(function(){
  if(isTrim){
  duration=Math.floor(seekEndDuration-seekStartDuration);
  }
  let lastIndex=filePath.lastIndexOf('.');
  outputFile=filePath.substring(0, lastIndex)+"_converted"+getRandomInt(999)+"."+formatOutput;
  let formatInput=filePath.substring(lastIndex+1,);
  console.log("inputFormat:"+formatInput);
  console.log("outputFile:"+outputFile);
  if(ffmpegOn){
    killFFmpeg();
    doTrimConvert(filePath,formatOutput,isTrim);
  }
  else if(ffmpegOn==false){
    let seek=time_trim_start.innerHTML;
    if(formatOutput.includes("gif")) {options=['-vf', 'scale=640:-1:flags=lanczos,fps=15'];codec='gif';}
    if(duration<0){console.log("in reverse");duration=Math.abs(duration);seek=time_trim_end.innerHTML;options=['-vf reverse','-af areverse'];}
    ffmpegOn=true;
    if (processPlatform == "linux" || processPlatform == "darwin") {fileInProcess=outputFile.substring(6,outputFile.length);}
    else{fileInProcess=outputFile;}
    command = ffmpeg()
    /*  .inputOption([
        "-hwaccel d3d11va",
    ])*/
    /*.videoCodec(codec)*/ //Disabled on Linux in order for conversion to work
    .input(filePath)
    .inputFormat(formatInput)
    .outputFormat(formatOutput)
    .outputOptions(options)
    .seek(seek)
    .duration(duration)
    .output(outputFile)
    .on('progress', (progress) =>
    {
      console.log(progress.timemark);
      let progressCTime=progress.timemark.split(':');
      let progressDuration=parseInt(progressCTime[0]*60)+parseInt(progressCTime[1]*60)+parseInt(progressCTime[2]);
      let progressTime=(parseInt(progressDuration)/duration)*100;
      console.log("Duration fixed:"+duration);
      console.log("Progress duration in sec: "+progressDuration);
      document.getElementById('conversion').style.display="block";
      document.getElementById('conversion').value=progressTime;
    })
    .on('end', (data) =>
    {
      console.log(data);
      console.log('FFmpeg has finished.');
      customAlert('Conversion/Trimming finished');
      ffmpegOn=false;
      document.getElementById('conversion').style.display="none";
    })
    .on('error', (error) =>
    {
      ffmpegOn=false;
      console.error(error);
    });
    console.log(command.run());
  }});
}
console.log("Checkpoint 21");
//Fix broken MP4 function START
function fixMedia(filePath,formatInput,formatOutput)
{
  console.log('Media fix called')
  if(isNaN(audioVideoElement.duration) && VideoErr==0 ){
  if(!filePath.includes('_MeloFixed')) 
  {
    customAlert("Mp4 is broken, and will be fixed. Melo_fixed will be added to the name of the file");
    numberFix+=1;
    console.log("Fix:"+numberFix);
    let outputFile=filePath.substring(0,filePath.lastIndexOf('.')) //File path without extension
    let inputFile=filePath; //Full file path with extension
    const command = ffmpeg()
    .input(inputFile) // inputFile
    .withVideoCodec('copy')
    .withAudioCodec('copy')
    .output(outputFile+'_MeloFixed.mp4') // outputFile+'.mp4'
    .on('progress', (progress) =>
    {
      if (progress) {}
    })
    .on('end', () =>
    {
      if (fs.existsSync(inputFile))
      {
        fs.unlink(inputFile, (err) => 
        { 
          if (err) {console.log(err);} 
          console.log('deleted');
        })
      }
      track_list[track_index].path=outputFile+'_MeloFixed.mp4';
      audioVideoElement.src=track_list[track_index].path;
      /* audioVideoElement.load(); */
      audioVideoElement.play();
      /* renameFile(); */
      customAlert("Mp4 is fixed. _Melofixed is added to the name of the file");
    })
    .on('error', (error) => {customAlert("Failed to fix this mp4");VideoErr=0;});
    console.log(command.run());
    /*   function renameFile(sourcePath, destinationPath) {
        fs.rename(outputFile+'_MeloFixed.mp4', outputFile+'.mp4',
        (error) => {
            if (error) {
                if (error.code === 'EBUSY') {
                  // Retry after a delay
                  setTimeout(() => {
                    console.log("Trying to rename file again");
                    renameFile(outputFile+'_MeloFixed.mp4', outputFile+'.mp4');
                  }, 1000); // 1 second delay, adjust as needed
                }
                else{
                  console.log(error);
                }
            }
            else {
              function setTrack(){audioVideoElement.src="";audioVideoElement.src = track_list[track_index].path;return true;}
              setTimeout(() => {
              console.log("Setting current_track.src  "+ setTrack());
              console.log("Current track source?:  "+audioVideoElement.src);
              console.log("Loading audioVideoElement "+ audioVideoElement.load());
              console.log("Playing audioVideoElement "+ audioVideoElement.play());
              }, 5000);
              VideoErr=0;
            }
          });
      } */
  }
  else {customAlert("This video is broken");VideoErr=1;}
}
}
function killFFmpeg(){
  if(ffmpegOn){
    console.log("Stopping ffmpeg");
    ffmpegOn=false;
    command.kill('SIGKILL'); //SIGKILL works both on windows and linux!
    document.getElementById('conversion').style.display="none";
    document.getElementById('conversion').value=0;
    console.log("Deleting file:"+fileInProcess);
    setTimeout(()=>{fs.unlinkSync(fileInProcess);},1000);
  }
}
//Fix broken MP4 function END