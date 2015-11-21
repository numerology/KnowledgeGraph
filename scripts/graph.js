// Constants
var TAG_MAX_SHOW_LENGTH = 20;
var TITLE_MAX_SHOW_LENGTH = 50;

var margin = {top: 20, right: 120, bottom: 20, left: 120},
    width = 900 - margin.right - margin.left,
    height = 800 - margin.top - margin.bottom;

var contextMenuShowing = false;
var currentClass;
var currentNode;

var i = 0,
    duration = 750,
    root;

var tree = d3.layout.tree()
    .size([height, width]);

var diagonal = d3.svg.diagonal()
    .projection(function(d) { return [d.y, d.x]; });

var svg = d3.select("#graphcanvas").append("svg")
    .attr("style","outline: thin solid black;") //YW: copied from Stack Overflow
    .attr("width", width + margin.right + margin.left)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

var key_dict = [];
var _this = null;
var flag = true;
var uploaded = []

function sleep(milliseconds) {
    var start = new Date().getTime();
    for (var i = 0; i < 1e7; i++) {
        if ((new Date().getTime() - start) > milliseconds){
            break;
        }
    }
}

$(document).ready(function() {
    var cache = {};

    $("#uploadBtn").click(function() {
        flag = false;
        console.log('refreshing');
        sleep(200);
        if(this!=null){
            _this.removeAllFiles();
        }
        uploaded = [];
        key_dict = [];
        $('#content').load('/refresh/{{stream.key.id()}}/1');
        flag = true; //the flag is used to prevent the backend actually deleting my img
    });
});

Dropzone.options.uploader = {
    url: uploadUrl,
    autoProcessQueue: true,
    uploadMultiple: true,
    parallelUploads: 1,
    addRemoveLinks: true,
    dictRemoveFile: 'Remove file',
    acceptedFiles: 'image/*, application/pdf',
    maxFiles: 10,
    accept: function(file){
        var ext = file.name.substr((fileName.lastIndexOf('.') + 1));
        if (ext == "pdf"){
            $("#typeInput").attr("value","PDF");
        }
        else{
            $("#typeInput").attr("value","IMG");
        }
    },
    init: function() {
        flag = true;
        this.on("complete", function(file) {
            var upurl = '0';
            console.log('Triggering');
            $.ajax({
                type: 'get',
                url: '/generate_upload_url/' + currentNode.name,
                async: false,
                success: function(data) {
                    console.log(data['upload_url']);
                    //$('#uploader').attr("action",data);
                    var jsdata = JSON.parse(data);
                    upurl = jsdata['upload_url'];
                    console.log("set");
                    console.log(jsdata['blob_key']);
                    uploaded.push(file);
                    key_dict.push(jsdata['blob_key']);
                },
            });
            this.options.url = upurl;
        });
        this.on("removedfile", function(file) {
            console.log('removing');
            var index = 0;
            for (i=0; i<uploaded.length;i++){
                if(uploaded[i] == file){
                        index = i;
                        break;
                }

            }
            console.log(index);
            console.log(flag);
            if(flag==true){
                $.ajax({
                    type: 'get',
                    url: '/api/delete_fig_partial/{{stream.key.id()}}/'+key_dict[index],
                    async: false,
                    success: function(data) {

                    },
                });
                }
            });

        _this = this;
    }
};


//var myjson = '{"name": "flare","children": [{"name": "analytics","children": [{"name": "cluster","children": [{"name": "MergeEdge" }]}]}]}';
d3.json("/getJSON/" + userID, function(flare) {

  //  if (error) throw error;
    root = flare;
    //  root = JSON.parse(myjson);
    root.x0 = height / 2;
    root.y0 = 0;

    function collapse(d) {
    if (d.children) {
      d._children = d.children;
      d._children.forEach(collapse);
      d.children = null;
    }
    }
    if(root.children){
    root.children.forEach(collapse);
    }
    update(root);

    loadGraphTab();
});

d3.select(self.frameElement).style("height", "800px"); //TODO: Change hight according to tree levels

$("#divNodeDetail").draggable({addClasses:false});

function loadGraphTab(){ // call the json function to load the roots for graph tab
    addRootData = {"msg":"MSG: ADD"}; // cannot use jquery on d3 object ...
    nodeaddroot = d3.select("#nodeAddRoot")
                    .on("click", addRoot)
                    .on("mouseover", showBriefNodeInfo);
    nodeaddroot.data([addRootData], 0);
    console.log("Log: nodeaddroot data: " + d3.select(nodeaddroot).__data__);
    
    //$("#nodeAddRoot").click(addRoot);
    //$("#nodeAddRoot").hover(showBriefNodeInfo,closeBriefNodeInfo);
    // generate graph for each node
    myData = {"title":"Data - Title", "msg": "Data Msg"};
    tempNode = d3.select("#contentMyGraph").append("svg").attr({"width":"110px", "height": "110px"}).append("g")
             .attr("class", "node")
             .style("cursor", "pointer")
             .on("click", updateGraph)
             .on("mouseover", showBriefNodeInfo);
    tempNode.data([myData], 0);   
    console.log(myData);   
    console.log(tempNode.__data__);
    tempNode.append("circle").attr({"cx": 50, "cy": 50, "r": 50})
             .style({"fill":"#fff", "stroke": "steelblue", "stroke-width":"1.5px"});
    tempNode.append("text").attr({"x":50, "y":50, "dy":"0.35em", "text-anchor":"middle"})
             .text("Node1")
             .style({"font":"20px sans-serif"});
    console.log("data of node"+d3.select("#contentMyGraph g .node").data);
}

function addRoot(e){
    console.log(e);
    console.log(e.data);
    console.log(e.type);
    console.log(e.target);
//    window.alert(e);
}

function updateGraph(e){ // TODO:retrieve content from server
    console.log(e.title);
}

function showBriefNodeInfo(e){
    console.log(e);
    console.log(e.type);
    console.log(e.target);
//    console.log(d3.mouse());
//    window.alert("show brief info about node" + d);
}

function closeBriefNodeInfo(e){
    console.log(e.data);
    console.log(e.type);
    console.log(e.target);
}

function update(source) {

  // Compute the new tree layout.
  var nodes = tree.nodes(root).reverse(),
      links = tree.links(nodes);

  // Normalize for fixed-depth.
  nodes.forEach(function(d) { d.y = d.depth * 180; });

  // Update the nodes¡­
  var node = svg.selectAll("g.node")
      .data(nodes, function(d) { return d.id || (d.id = ++i); });

  // Enter any new nodes at the parent's previous position.
  var nodeEnter = node.enter().append("g")
      .attr("class", "node")
      .attr("transform", function(d) { return "translate(" + source.y0 + "," + source.x0 + ")"; })
      .on("click", click)
      .on("contextmenu", contextmenu);

  nodeEnter.append("circle")
      .attr("r", 1e-6)
      .style("fill", function(d) { return d._children ? "lightsteelblue" : "#fff"; });

  nodeEnter.append("text")
      .attr("x", function(d) { return d.children || d._children ? -0 : 0; })
      .attr("dy", ".35em")
      .attr("text-anchor", function(d) { return d.children || d._children ? "middle" : "middle"; })
      .text(function(d) { return d.name; })
      .style("fill-opacity", 1e-6);

  // Transition nodes to their new position.
  var nodeUpdate = node.transition()
      .duration(duration)
      .attr("transform", function(d) { return "translate(" + d.y + "," + d.x + ")"; });

  nodeUpdate.select("circle")
      .attr("r", 50)
      .style("fill", function(d) { return d._children ? "lightsteelblue" : "#fff"; });

  nodeUpdate.select("text")
      .style("fill-opacity", 1);

  // Transition exiting nodes to the parent's new position.
  var nodeExit = node.exit().transition()
      .duration(duration)
      .attr("transform", function(d) { return "translate(" + source.y + "," + source.x + ")"; })
      .remove();

  nodeExit.select("circle")
      .attr("r", 1e-6);

  nodeExit.select("text")
      .style("fill-opacity", 1e-6);

  // Update the links¡­
  var link = svg.selectAll("path.link")
      .data(links, function(d) { return d.target.id; });

  // Enter any new links at the parent's previous position.
  link.enter().insert("path", "g")
      .attr("class", "link")
      .attr("d", function(d) {
        var o = {x: source.x0, y: source.y0};
        return diagonal({source: o, target: o});
      });

  // Transition links to their new position.
  link.transition()
      .duration(duration)
      .attr("d", diagonal);

  // Transition exiting nodes to the parent's new position.
  link.exit().transition()
      .duration(duration)
      .attr("d", function(d) {
        var o = {x: source.x, y: source.y};
        return diagonal({source: o, target: o});
      })
      .remove();

  // Stash the old positions for transition.
  nodes.forEach(function(d) {
    d.x0 = d.x;
    d.y0 = d.y;
  });
}

// Toggle children on click.
function click(d) {
  if (d.children) {
    d._children = d.children;
    d.children = null;
  } else {
    d.children = d._children;
    d._children = null;
  }
  update(d);
  closeContextMenu();
}

function contextmenu(d) {
    d3.event.preventDefault();
    if(contextMenuShowing){
        closeContextMenu();
    }
    currentNode = d;
    var _currentClass = d.name;
    d3.select("#divNodeDetail").style("display","inline")
        .style("top", (d.x+200)+"px");
    d3.select("#nodeTitle").text(d.name);
    d3.select("#btnCloseNodeDetail").attr("href", "javascript: closeContextMenu();");
    //Load tag section
    loadTag(d); // load the Tags of d
    loadDivAddTag(d);
    //Show children
    loadChild(d);
    loadDivAddChild(d);
    loadDivRef(d);
    contextMenuShowing = true;
}

function closeContextMenu(){
    d3.select("#divNodeDetail").style("display","none");
    closeDivAddChild();
    closeDivRef();
    contextMenuShowing = false;
}

function loadTag(d){
    divTag = d3.select("#divNodeTag");
    $("#divNodeTag").empty(); //jquery ...
    var myTag = d.name + " tag1";
    var tagUrl;
    divTag.append("a").attr("class", "btn btn-default btn-sm").text(d.name).attr("href", "javascript:clickTag('"+tagUrl+"')"); // or add onclick
    //Button for adding tag
    d.tags.forEach(function(tag){
        divTag.append("a")
            .attr("class", "btn btn-primary btn-sm")
            .text(tag);
    });

    divTag.append("a")
        .attr("class", "btn btn-primary btn-sm")
        .text("Add Tag")
        .attr("id", "btnShowAddTag")
        .attr("href", "javascript: showDivAddTag()");
}
function loadDivAddTag(d){ // load the add Tag Div
    var addTagUrl = "/api/addtag/"+d.name; //some encoding here?
    d3.select("#formAddTag").attr("action", addTagUrl);
    //d3.select("#btnAddTag").on("click", );//TODO: add action to add tag button
    d3.select("#btnCancelAddTag").on("click", closeDivAddTag);
}
function clickTag(url){ //action when tag is clicked
    // open window for searching ?
}
function showDivAddTag(){
    d3.select("#divAddTag").style("display", "inline");
    d3.select("#inputAddTag").property("value", "");
    d3.select("#btnShowAddTag").remove();
}
function closeDivAddTag(){
    d3.select("#divAddTag").style("display", "none");
    d3.select("#inputAddTag").property("value", "");
    d3.select("#divNodeTag").append("a")
        .attr("class", "btn btn-primary btn-sm")
        .text("Add Tag")
        .attr("id", "btnShowAddTag")
        .attr("href", "javascript: showDivAddTag()");
}
function loadChild(d){ // load children
}
function loadDivAddChild(d){
    btnShowAddChild = d3.select("#btnShowAddChild");
    currentClass = d.name;
    btnShowAddChild.on("click", function(){
            d3.select("#btnShowAddChild").style("display", "none");
            d3.select("#divAddChild").style("display","inline");
        });
    d3.select("#formAddChild").attr("action", "/api/addChild/"+currentClass);
    d3.select("#btnCancelAddChild").on("click", closeDivAddChild);
}
function closeDivAddChild(){
    d3.select("#btnShowAddChild").style("display", "inline");
    d3.select("#divAddChild").style("display","none");
    d3.select("#inputAddChild").property("value","");
}

function loadDivRef(d){
    d3.select("#btnAddReference").attr("href", "javascript: showAddRef()");
    d3.select("#btnCancelUpload").on("click", closeDivAddRef);
    d3.select("#nodeNameInput").attr("value", d.name);
    divRef = d3.select("#divReference");
    d.thumbnails.forEach(function(thumb){
        console.log("adding");
        divRef.append("a").attr("class", "thumbnail")
            .append("img").attr("src", thumb)
            .attr("style", "height:100px");
    });

}

function closeDivRef(){
    d3.select("#divReference").empty();
    console.log("cleaning");
}

function closeDivAddRef(){
    d3.select("#btnAddReference").style("display", "inline");
    d3.select("#divUploadReference").style("display","none");
}

function showAddRef(){
    d3.select("#divUploadReference").style("display", "inline");
    d3.select("#btnAddReference").style("display","none");
}

function trimString(str, len){ // shorten
    if(str.length <= len){
        return str;
    }
    var trimmed = str.substring(0, len-3)+"...";
    return trimmed;
}

// Hide Node div if clicking outside of the div
/*$(document).mousedown(function (e) //Copied from Stack Overflow
{
    var container = $("#divNodeDetail");

    if (!container.is(e.target) // if the target of the click isn't the container...
        && container.has(e.target).length === 0 // ... nor a descendant of the container
        && contextMenuShowing == true) // ... check if the menu is already shown
    {
        container.hide();
    }
});*/
