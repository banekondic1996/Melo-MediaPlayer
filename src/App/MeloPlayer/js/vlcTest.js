let vlcPID
var x11 = require('x11');
var spawn = require('child_process').spawn;
var spawn2 = require('child_process').spawn;
x11.createClient(function(err, display) 
{
    vlcOn=true;
    const vlcplayer = spawn('sh', ['-c', 'vlc --qt-minimal-view --video-on-top& echo $!']); 
    var scriptOutput = "";
    vlcplayer.stdout.setEncoding('utf8');
    vlcplayer.stdout.on('data', function(data) {
    //Here is where the output goes
    console.log('stdout: ' + data);
    vlcPID=Number(data.substring(0,data.length-1));
    setTimeout(()=>{  const VLCWindowID = spawn2('xdotool', ['search','-pid', vlcPID]); 
    VLCWindowID.stdout.on('data', function(data) {
    //Here is where the output goes
    console.log('stdout: ' + data);
    wid=data;
    spawn2('xdotool', ['windowmove', wid, win.x*1.094, win.y*1.094+80]);
    spawn2('xdotool', ['windowsize', wid, win.width*1.094, win.height*1.094-150]);
    });},1000)
    })
});