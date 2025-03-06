//Dark mode function
function darkmode()
{
  var imgs = document.getElementsByClassName("lMode");
  var elements = document.querySelectorAll("div.list>tr:nth-child(even)");
  switch(document.body.style.backgroundColor)
  {
  case 'white':
    document.documentElement.style.setProperty('--selected', '#0000004a');
    document.getElementById('choiceMenuId').style.color="white";
    document.getElementById('choiceMenuId2').style.color="white";
    document.getElementById('floatdetailsId').style.color="white";
    document.body.style.backgroundColor = "black";
    document.getElementById('slider_container_Id').style.background="#08080870";
    document.getElementById('homeButtonsId').style.background="#08080870";
    volumeb.style.background="#08080870";
    document.getElementById('durationCId').style.color="white";
    document.getElementById('durationEId').style.color="white";
    menuListElement.style.color="white";
    menuListElement.style.background="#2c2c2c";
    for (let item of imgs) {item.classList.add("darkMe");}
    seeksliderEl.classList.add('darkMeSlider');
    volumeEl.classList.add('darkMeSlider');
    playlistContainerEl.classList.add("darkMe2");
    infoEl.classList.add("darkMe2");
    videoPlaylistElement.classList.add("darkMe");
    for (i = 0; i < elements.length; i++) {elements[i].style.background = "#838383";}
    break;

  case 'black':
    document.documentElement.style.setProperty('--selected', '#c3c3c34a');
    document.getElementById('choiceMenuId').style.color="black";
    document.getElementById('choiceMenuId2').style.color="black";
    document.getElementById('floatdetailsId').style.color="black";
    document.getElementById('slider_container_Id').style.background="#dddddd70";
    document.getElementById('homeButtonsId').style.background="#dddddd70";
    volumeb.style.background="#dddddd70";
    document.getElementById('durationCId').style.color="black";
    document.getElementById('durationEId').style.color="black";
    document.body.style.backgroundColor = "white";
    menuListElement.style.color="black";
    menuListElement.style.background="rgb(228, 228, 228)";
    for (let item of imgs) {item.classList.remove("darkMe");}
    seeksliderEl.classList.remove('darkMeSlider');
    volumeEl.classList.remove('darkMeSlider');
    playlistContainerEl.classList.remove("darkMe2");
    infoEl.classList.remove("darkMe2");
    videoPlaylistElement.classList.remove("darkMe");
    break;

  default:
    document.documentElement.style.setProperty('--selected', '#0000004a');
    document.getElementById('choiceMenuId').style.color="white";
    document.getElementById('choiceMenuId2').style.color="white";
    document.getElementById('floatdetailsId').style.color="white";
    document.body.style.backgroundColor = "black";
    document.getElementById('slider_container_Id').style.background="#08080870";
    document.getElementById('homeButtonsId').style.background="#08080870";
    volumeb.style.background="#08080870";
    document.getElementById('durationCId').style.color="white";
    document.getElementById('durationEId').style.color="white";
    menuListElement.style.color="white";
    menuListElement.style.background="#2c2c2c";
    for (let item of imgs) {item.classList.add("darkMe");}
    seeksliderEl.classList.add('darkMeSlider');
    volumeEl.classList.add('darkMeSlider');
    playlistContainerEl.classList.add("darkMe2");
    infoEl.classList.add("darkMe2");
    videoPlaylistElement.classList.add("darkMe");
    for (i = 0; i < elements.length; i++) { elements[i].style.background = "#838383";}
  }
}