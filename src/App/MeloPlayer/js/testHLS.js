let video=document.createElement('video');
  video.id=('video');
  video.style="height: 100%;width: 100%;top: 0px;z-index: 999999;position: absolute;display: block;background: black;";
  video.setAttribute("controls","controls");
  video.setAttribute("autoplay","autoplay");
  document.body.append(video);
  let videoSrc = 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8';
  if (Hls.isSupported()) {
    var hls = new Hls();
    hls.loadSource(videoSrc);
    hls.attachMedia(video);
  }
  // HLS.js is not supported on platforms that do not have Media Source
  // Extensions (MSE) enabled.
  //
  // When the browser has built-in HLS support (check using `canPlayType`),
  // we can provide an HLS manifest (i.e. .m3u8 URL) directly to the video
  // element through the `src` property. This is using the built-in support
  // of the plain video element, without using HLS.js.
  else if (video.canPlayType('application/vnd.apple.mpegurl')) {
    video.src = videoSrc;
  }
  function playHLS(filePath,isTrim)
{
  let timeHLS=0;
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
  pendingPromise.then(function()
  {
    if(isTrim){duration=Math.floor(seekEndDuration-seekStartDuration);}
    let lastIndex=filePath.lastIndexOf('.');
    outputFile=filePath.substring(0, lastIndex)+"_hls"+".";
    let formatInput=filePath.substring(lastIndex+1,);
    console.log("inputFormat:"+formatInput);
    console.log("outputFile:"+outputFile+"m3u8");
      if(ffmpegOn)
      {
        ffmpegOn=false;
        command.kill('SIGSTOP');
        console.log(fileInProcess);
        fs.unlinkSync(fileInProcess);
      }
      if(ffmpegOn==false)
      {
        ffmpegOn=true;
        fileInProcess=outputFile+"m3u8";
        command = ffmpeg()
        /*  .inputOption([
            "-hwaccel d3d11va",
        ])*/
        /*.videoCodec(codec)*/ //Disabled on Linux in order to conversion to work
        .input(filePath)
        .inputFormat(formatInput)
        .inputOptions(['-re'])
        .outputFormat('hls')
        .outputOptions(['-ab', '192k','-preset superfast',
        ,'-hls_flags single_file','-hls_list_size 0','-hls_playlist_type vod','-f hls'])
        .seek(timeHLS)
        /*  .seek(time_trim_start.innerHTML) */
        .duration(40)
        .output(outputFile+'m3u8')
        .on('data',(data)=>console.log(data))
        .on('progress', (progress) =>
        {
        if (progress.percent){console.log(`Processing: ${Math.floor(progress.percent)}% done`);}
        })
        .on('end', (data) =>
        {
          console.log('FFmpeg has finished.');
          customAlert('HLS conversion finished');
          ffmpegOn=false;
          document.getElementById('conversion').style.display="none";
        })
        .on('error', (error) =>
        {
          console.error(error);
        });
        console.log(command.run());
        timeHLS++;
        hls.loadSource(outputFile+'m3u8');
        hls.attachMedia(video); 
      }

  });
}

function transcodeAndStream(inputPath) {
    const mediaSource = new MediaSource();
    video.src = URL.createObjectURL(mediaSource);
    mediaSource.addEventListener('sourceopen', () => {
        const mimeType = 'video/mp4; codecs="avc1.42001e, mp4a.40.2"'; // H.264 + AAC
        if (!MediaSource.isTypeSupported(mimeType)) {
            console.error('MIME type not supported:', mimeType);
            return;
        }

        const sourceBuffer = mediaSource.addSourceBuffer(mimeType);
        const chunkQueue = []; // Queue to hold chunks
        let isProcessing = false;

        // Function to process the next chunk in the queue
        function processNextChunk() {
            if (chunkQueue.length === 0 || isProcessing) return;

            isProcessing = true;
            const chunk = chunkQueue.shift();

            try {
                sourceBuffer.appendBuffer(chunk);
            } catch (err) {
                console.error('Error appending buffer:', err);
                isProcessing = false;
            }
        }

        // Listen for when the buffer is ready for the next append
        sourceBuffer.addEventListener('updateend', () => {
            isProcessing = false;
            if (mediaSource.readyState === 'open') {
                processNextChunk(); // Process the next chunk if available
            }
        });

        sourceBuffer.addEventListener('error', (e) => {
            console.error('SourceBuffer error:', e);
        });

        // Start FFmpeg transcoding and streaming
        ffmpeg(inputPath)
            .videoCodec('libx264')
            .audioCodec('aac')
            .format('hls')
            .outputOptions([
                '-movflags frag_keyframe+empty_moov', // Enable streaming
                '-preset ultrafast', // Faster encoding for real-time
                '-bsf:v h264_mp4toannexb', // H.264 Annex B
                '-dash_segment_type mp4', // Ensure MP4 fragments
            ])
            .pipe() // Stream output
            .on('data', (chunk) => {
                // Convert chunk to Uint8Array if needed
                const data = chunk instanceof Uint8Array ? chunk : new Uint8Array(chunk);
                chunkQueue.push(data);

                // Start processing if not already doing so
                if (!isProcessing && mediaSource.readyState === 'open') {
                    processNextChunk();
                }
            })
            .on('end', () => {
                console.log('FFmpeg streaming finished');
                // Wait for all chunks to be processed before ending the stream
                const checkQueue = setInterval(() => {
                    if (chunkQueue.length === 0 && !isProcessing) {
                        clearInterval(checkQueue);
                        if (mediaSource.readyState === 'open') {
                            mediaSource.endOfStream();
                        }
                    }
                }, 100);
            })
            .on('error', (err) => {
                console.error('FFmpeg error:', err);
                if (mediaSource.readyState === 'open') {
                    mediaSource.endOfStream('decode');
                }
            });
    });
    mediaSource.addEventListener('sourceended', () => {
        console.log('MediaSource ended');
    });
    hls.loadSource(video.src);
    hls.attachMedia(video);
}