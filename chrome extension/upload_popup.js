var _marker = 0;
var _map;
var austin = {lat: 30.25, lng: -97.75};
//var STREAM_AUTOCOMPLETE_URL = "http://localhost:8080/api/stream_autocomplete";
var STREAM_AUTOCOMPLETE_URL = "http://just-plate-107116.appspot.com/api/stream_autocomplete";
//var UPLOAD_URL = "http://localhost:8080/api/upload_image_from_extension";
var UPLOAD_URL = "http://just-plate-107116.appspot.com/api/upload_image_from_extension";

function showLocation(location){ // show the location of current Marker
   console.log("Show location changes")
   $("#geo_location").val(location.toString());
    //$("#geo_location").placeholder = location.toString();
    //use getPosition().lat() and getPosition().lng() to get location in degrees
}

function renderUrl(url){
    var divloader = document.querySelector("#loader");
    divloader.style.display = "none";
    var divoutput = document.querySelector("#output");
    divoutput.style.display = "block";
    var divurl = document.querySelector("#url");
    var urltext = (url.length<45) ? url: url.substr(0,42) + "...";
    var anchor = document.createElement('a');
    anchor.href = url;
    anchor.innerText = urltext;
    anchor.id = "imageLinkUrl";
    divurl.innerHTML += "URL: ";
    divurl.appendChild(anchor);
}

function renderThumbnail(url){
    var canvas = document.querySelector("#thumbnail");
    var context = canvas.getContext("2d");
    canvas.height = 200;
    canvas.width = 200;
    var image = new Image();
    image.addEventListener('load', function(){
        var src_w = image.width;
        var src_h = image.height;
        var new_w = canvas.width;
        var new_h = canvas. height;
        var ratio = src_w / src_h;
        if (src_w > src_h){
            new_h /=ratio;
        }else{
            new_w *= ratio;
        }
        canvas.width = new_w;
        canvas.height = new_h;
        context.drawImage(image, 0, 0, src_w, src_h, 0, 0, new_w, new_h);
    });
    image.src = url;
}

document.addEventListener("DOMContentLoaded", function(){
    var imageUrl = window.location.hash.substring(1);
    if (imageUrl){
        renderUrl(imageUrl);
        renderThumbnail(imageUrl);
        //resizeWindow();
    }
});

$(document).ready(function(){
    console.log("Page ready");
    var cache = {};
    $("#stream_name").autocomplete({
        minLength: 1,
        /*source: [ "c++", "java", "php", "coldfusion", "javascript", "asp", "ruby" ]*/
	    source: function(request, response){
            var cache = {};
            var KeywordSet = [];
            var term = $.ui.autocomplete.escapeRegex(request.term);
            console.log(term);
            if(term in cache){
                response(cache[term]);
                return;
            }
            $.getJSON(STREAM_AUTOCOMPLETE_URL, {"keywords": term}, function(data, status, xhr){
                cache[term] = data;
                response(data);
            })
        }
    });
    $("#upload_form").on("submit", function(e){
        e.preventDefault();
        var streamName = $("#stream_name").val();
        var comment = $("#comment").val();
        var imageUrl = $("#imageLinkUrl").attr("href");
        var geoLocation = $("#geo_location").val();
        console.log("Submit image url: "+imageUrl);
        $.ajax({
            url: UPLOAD_URL,
            type: "POST",
            data: {"streamName": streamName,
                   "comment": comment,
                   "imageUrl": imageUrl,
                   "geoLocation": geoLocation},
            success: function(data){
                var msg = JSON.parse(data);
                alert(msg.message);
                if (msg.added=="true"){
                    console.log("Added");
                    window.close();
                }
            }
        });
    });
    $("#map_canvas").gmap({
            zoom: 2,
            /*center: austin,*/
            mapTypeId: google.maps.MapTypeId.TERRAN
        }, function(){
            $("#map_canvas").gmap("get","map").setOptions({"center":austin});
        }).bind('init', function(event, map){
            _map = map;
            console.log("Bind functions to map");
            //_marker = 0;
            $(map).click(function(event){
                if (_marker == 0){
                    $("#map_canvas").gmap('addMarker', {
                            'position': new google.maps.LatLng(event.latLng.lat(), event.latLng.lng()),
                            'draggable': true,
                            'center': austin,
                            'map': map
                        }, function(map, marker){
                            _marker = marker;
                            showLocation(marker.getPosition());
                            console.log("New Marker generated");
                        }).dragend(function(event){
                            console.log("Marker dragged");
                            $("#map_canvas").gmap("get","map").setOptions({"center":event.latLng});
                            showLocation(event.latLng);
                        });
                }else{
                    _marker.setPosition(event.latLng);
                    showLocation(event.latLng);
                }
            });
        }); // end of adding gmap
}); // end of ready()

