Version 1.9
<pre>
-Added visualizer
-Code reworks
-Added save/load playlist
-Fixed bug on appearing on Linux (window resizes on window moving due compozitor)
</pre>
Version 2.0
<pre>
-Fixed visualizer not displaying fully
-Added video pip mode
-Fixed bar for window moving
-Added seek bar input to react even when mouse is under it
-Added option to double click on visualizer to maximize
-Added option to move window when holding video or visualizer
-Added selection highlight (ridiculous that it was missing)
</pre>
Version 2.1
<pre>
-Drag player when holding video (code is there, but disabled)
-Visualizer resolution fixed
-Fixed buttons when small window
-Added PIP video
-Added always on top option for virtualizer
-Improved CSS for context menus
</pre>
Version 2.2
<pre>
-Added search for songs
-Fixed file loading when file has special characters
-Reworked the way playlists are populated
-Added duration information for media
-Added loading files from folder
-Changed playlist saving type
-Fixed track not going to next track, cause javascripts 1+1 is 11.....
-Fixed video loading
</pre>
Version 2.3
<pre>
-Fixed bugs for Windows verison of media player (it was missing ffmpeg.exe, cause i built it on Linux)
-Reworked how dark mode is applied
-Added kill button for FFMpeg process
</pre>
Version 2.4
<pre>
-Added casting option
-Added video combine option
-Added option to mute audio on sound icon click
-Added subtitles option
-Added settings menu
-Added frequency generator
-Added frequency analyzer 
-Added equalizer option
-Added playback speed slider for video
-Fixed and added time zone settings for "Unpause at time" option
-Fixed video list and menus auto closing
-Fixed update option
-Fixed settings not being stored anywhere
-Fixed load playlist, load folder not working when video is fullscreen
</pre>
Version 2.5
<pre>
-Added transform video option
-Fixed video casting bugs
-Added option to cast visualizations
-Added support to load m3u8 and rtsp network streams
-Fixed settings modal CSS
-Added option to freeze frequency analyzer graph on video pause
-Added search input for video playlist
-Changes to CSS
-Added developer menu ctrl+shift+d
-Added option to screenshot using keyboard key "s"
</pre>

To fix in next version:
<pre>
-Support more video formats (rebuild nw.js with ffmpeg flag set to ChromeOS or modify the nw.js)
-Fix metadata loading (it's slow)
-Fix CPU usage and slow player when playing m3u8 and rtsp streams
-Add DJ mode to change visualizations with animations and option to display images
-Add 3d sound option
</pre>
