const { parentPort } = require("worker_threads");
const ffmpeg = require('fluent-ffmpeg');
const ffmpegStatic = require('ffmpeg-static');
const ffprobeStatic=require('ffmpeg-ffprobe-static');
if (process.platform == "linux" || process.platform == "darwin") 
  {
  ffmpeg.setFfmpegPath("/usr/bin/ffmpeg");
  ffmpeg.setFfprobePath("/usr/bin/ffprobe");
  }
  else
  {
  ffmpeg.setFfmpegPath(ffmpegStatic);
  ffmpeg.setFfprobePath(ffprobeStatic.ffprobePath);
  }
  function padZero(num) {
    return num < 10 ? "0" + num : String(num);
  }
// Simulate metadata loading (Replace with actual function)
async function loadMetaData(trackIndex, filePath) {
  return new Promise((resolve) => {
    let duration;
    let durationMinutes;
    let durationSeconds; 
    ffmpeg.ffprobe(filePath,function(err, data) 
    {
      duration=data.format.duration;
      console.log(data.format.duration);
      durationMinutes = Math.floor(duration / 60);
      durationSeconds = Math.floor(duration - durationMinutes * 60);
      durationMinutes = padZero(parseInt(durationMinutes, 10));
      durationSeconds= padZero(parseInt(durationSeconds, 10));
      if(err){
        console.log(err);
      }
      resolve({
        trackIndex,
        duration: durationMinutes+":"+durationSeconds,
        artist: "Unknown",
        filePath,
      });
    });

  });
}
// Listen for messages from the main thread
parentPort.on("message", async (data) => {
  try {
    const trackIndex = data.trackIndex;
    const filePath = data.filePath;
    const metadata = await loadMetaData(trackIndex, filePath);
    parentPort.postMessage({ success: true, metadata });
  } catch (error) {
    parentPort.postMessage({ success: false, error: error.message });
  }
});
