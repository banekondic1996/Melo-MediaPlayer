//Decleration  START
let isDeveloper=false; //Add's test tracks into playlist

let customAlertElement=document.getElementById("alertID")
let now_playing = document.querySelector(".now-playing");
let track_art = document.querySelector(".track-art");
let track_name = document.querySelector(".track-name");
let track_artist = document.querySelector(".track-artist");
let contextMenuVideo=document.getElementById("contextMenuVideoId");
let contextMenuCanvas=document.getElementById("contextMenuCanvasId");
let playpause = document.getElementById("playpause");
let unPauseAtTimeEl = document.getElementById("unPauseAtTimeId");
let next_btn = document.querySelector(".next-track");
let prev_btn = document.querySelector(".prev-track");
let convertDialog=document.getElementById('convertId');
let seek_slider = document.getElementById("seeksliderId");
let seek_trim_start=document.getElementById("seeksliderTrimStartId");
let seek_trim_end=document.getElementById("seeksliderTrimEndId");
let time_trim_start=document.getElementById("timeTrimStartId");
let time_trim_end=document.getElementById("timeTrimEndId");
let slider_container_trim=document.getElementById("slider_container_trim_Id");
let volume_slider = document.querySelector(".volume_slider");
let playerGEl=document.getElementById("playerId");
let curr_time = document.querySelector(".current-time");
let total_duration = document.querySelector(".total-duration");
let menuListElement=document.getElementById('menuID');
let playlistSearchEl=document.getElementById('playlistSearchId');
let repeatEl=document.getElementById('repeatId');
let shuffleEl=document.getElementById('shuffleId');
let playlistContainerEl=document.getElementById('playlistContainerId');
let videoPlaylistElement=document.getElementById('videoPlaylistID');
let volumeb=document.getElementById('volume2');
let infoEl=document.getElementById('infoId');
let seeksliderEl=document.getElementById('seeksliderId');
let volumeEl=document.getElementById('volumesliderId');
let audioVideoElement = document.getElementById('audioVideoElementID');
let playlistMusic=document.getElementById('playlistMusicId');
let playlistVideo=document.getElementById('playlistVideoId');
let playlistMusicTable=document.getElementById('playlistMusicTableId');
let playlistVideoTable=document.getElementById('playlistVideoTableId');
let tabelaVideoBarLista=document.getElementById('videoBarLista');
var overleyment = document.getElementById('overleyId');
let choiceMenuEl=document.getElementById('choiceMenuId');
let choiceMenuEl2=document.getElementById('choiceMenuId2');
let videoContainerElement=document.getElementById('videoContainerID');
let videoPlaylistSideButtonElement=document.getElementById('videoPlaylistSideButtonID');
let choiceMenuContainer=document.getElementById('choiceMenuContainerID');
let listaContainterEl=document.getElementById('listaContainerID');
let unPause_time=document.getElementById("unPause-time");
let track_index = 0; //Starting track index
let shufferN=0; //Shuffle on?
let repeatN=0; //Repeat on?
let isPlaying = false;
let vlcOn = false;
let fileInProcess;
let updateTimer;
let response;
let command;
let wid;
let scaleValue=1;
let seekStartDuration=0;
let seekEndDuration=0;
var videoWasOpened=0; 
let prevThumbnail=0;
let numberFix=0;
let VideoErr=0; //Times video has been tried to get fixed
let error_track_src="";
let oldFolderPath="";
let pos = { top: 0, left: 0, x: 0, y: 0 }; 
var isMax=0; //Is window maximized?
let overVideoElements=false; //Is over elements in video mode (bottom bar)
let dragByHoldingVideo=true; //Drag window by holding video
let overChoiceMenu=false; //Over left side menus 
let visualizerOn=false; //Is visualizer on?
let holdingVideo=false; //Is holding video?
let alwaysOnTop=false; //Is alwaysOnTop?
let isOverList=false; 
let ffmpegOn=false;
let darkMode;
let processPlatform=process.platform;
let track_list = []; //The track list
let style = window.getComputedStyle(document.body);
const ffmpeg = require('fluent-ffmpeg');
const ffmpegStatic = require('ffmpeg-static');
const ffprobeStatic=require('ffmpeg-ffprobe-static');
if (processPlatform == "linux" || processPlatform == "darwin") 
{
ffmpeg.setFfmpegPath("/usr/bin/ffmpeg");
ffmpeg.setFfprobePath("/usr/bin/ffprobe");
}
else
{
ffmpeg.setFfmpegPath(ffmpegStatic);
ffmpeg.setFfprobePath(ffprobeStatic.ffprobePath);
}
const fs = require ('fs');
let listOfPaths=[];
const fileObj={
    name: "Object",
    artist: "Object",
    image: "set/default.jpg",
    path: "",
    duration: "",
    type:"",
}
//File types
const fileTypes={
  Audio:['.mp3','.m4a','flac','wav','aac'],
  Video:['.mp4','.mov','.avi','webm','.ogg','.m4v','.mkv','.flv']
}
if(isDeveloper)
  {
    track_list.push(
      {
      name: "Mr. Plenty – Part Time AI cover",
      artist: "Mr. Plenty",
      image: "set/default.jpg",
      path: "media/Mr. Plenty – Part Time AI cover.mp3",
      duration: "3:23",
      type:"audio/mpeg",
    },
    {
      name: "Shipping Lanes",
      artist: "Chad Crouch",
      image: "set/default.jpg",
      path: "http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
      duration:"2:19",
      type:"video/mp4",
    });
  }
