
//Handler of click
function onClickHandler(info, tab) {
  var image_url = info.srcUrl;
  var url = "upload_popup.html#" + image_url;
  chrome.windows.create({"url": url,
                         "type": "popup",
                         "width": 500,
                         "height": 700});
  //console.log("Image url: " + image_url);
  //console.log("Popup window id: " + popup_window);
};

chrome.contextMenus.onClicked.addListener(onClickHandler);

//setup menu item
chrome.runtime.onInstalled.addListener(function(){
    var Context = "image";
    var Title = "Upload image to Connexus";
    var id = chrome.contextMenus.create({"title": Title,
                                         "contexts":[Context],
                                         "id": "imageitem"});
    console.log("Item added: "+id);
});