// Constants
var TAG_MAX_SHOW_LENGTH = 20;
var TITLE_MAX_SHOW_LENGTH = 50;

var margin = {top: 20, right: 120, bottom: 20, left: 120},
    width = 900 - margin.right - margin.left,
    height = 800 - margin.top - margin.bottom;

var contextMenuShowing = false;
var addRootShowing = false;
var shareShowing = false;
var currentClass;
var currentNode;

var i = 0,
    duration = 750,
    list,
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

//YW: used to place tspan and measure text width
var helperTspan = d3.select(".helper").append("div").attr("class", "myTabContent")
                  .append("svg").attr({"height": 100, "width": 100})
                  .append("g").attr("class","node").append("text").append("tspan");

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


    $('#backTop').backTop({
        'position': 400, // min distance scrolled before btn is shown
        'speed': 800, // animation speed, not scroll speed ...
        'color': 'blue', // configured for light steel blue
        'duration': 800, // total time of scrolling
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
    accept: function(file, done){
        var ext = file.name.substr((file.name.lastIndexOf('.') + 1));
        if (ext == "pdf"){
            $("#typeInput").attr("value","PDF");
        }
        else{
            $("#typeInput").attr("value","IMG");
        }
        done();
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

function done(){
 console.log("accepted called");
}
//var myjson = '{"name": "flare","children": [{"name": "analytics","children": [{"name": "cluster","children": [{"name": "MergeEdge" }]}]}]}';
d3.json("/get_rooted_data/" + userID, function(flare) {

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

//write out the root list
d3.json("/get_root_list/" + userID, function(result) {
    list = result;

    tabContentSelector =d3.select("#contentMyGraph");
    list.root_list.forEach(function(d){
        console.log(d);
        nodeData = {"node_text":d.root_name,"node_data":{"msg": String(d.msg), "id": d.rootID}};
        addNodeWithContext(tabContentSelector, nodeData, shareMenu);
    });
})

d3.json("/get_shared_list/" + userID, function(result) {
    list = result;
    console.log("getting shared list");
    tabContentSelector =d3.select("#contentSharedGraph");
    list.shared_list.forEach(function(d){
        console.log(d);
        nodeData = {"node_text":d.root_name,"node_data":{"msg": String(d.msg), "id": d.rootID}};
        addSingleNode(tabContentSelector, nodeData);
    });
})

function shareMenu(e){
    var shareUrl = "/shareroot/" + e.id + '/' + String(userID);
    d3.event.preventDefault();
    console.log(e);
    if(shareShowing){
        closeShare();
    }

    d3.select("#divShare").style("display","inline")
        .style("top", (e.x + 200)+"px");

    d3.select("#btnCancelShareRoot").attr("href", "javascript: closeShare();");
    //Load tag section
    d3.select("#formShareRoot").attr("action", shareUrl);
    addRootShowing = true;
}

function closeShare(){
    d3.select("#divShare").style("display","none");
    shareShowing = false;
}

d3.select(self.frameElement).style("height", "800px"); //TODO: Change hight according to tree levels

$("#divNodeDetail").draggable({addClasses:false});
$("#divAddRoot").draggable({addClasses:false});
$("#divShare").draggable({addClasses:false});

function loadGraphTab(){ // call the json function to load the roots for graph tab
    addRootData = {"msg": "Click to add new Root"}; // cannot use jquery on d3 object ...
    nodeaddroot = d3.select("#nodeAddRoot")
                    .on("click", addRoot)
                    .on("mouseover", showBriefNodeInfo)
                    .on("mouseout", closeBriefNodeInfo);
    nodeaddroot.data([addRootData], 0);
    //console.log("Log: nodeaddroot data: " + d3.select(nodeaddroot).__data__);
    
    // generate graph for each node
    nodeData = {"node_text":"Node1", "node_data":{"title":"Data - Title", "msg": "Data Msg"}};
    tabContentSelector = d3.select("#contentMyGraph");
 //   addSingleNode(tabContentSelector, nodeData);
    nodeData.node_text="Testtttttttt  for aaaaaaaaaaaaa aaaa vvvvvvvery long Title";
    addSingleNode(d3.select("#contentSharedGraph"), nodeData);
    //console.log(helperTspan.node().textContent);
    //console.log(helperTspan.node().getComputedTextLength());
}


function wrap(text, width) { // function copied from bl.ocks.org/mbostock/7555321
    //TODO: apply this to all node text
    //TODO: place this function somewhere else in the graph.js file
    var MAX_LINE_NUM = 3; // allow most 3 lines
    var MAX_WORD_WIDTH = 0.9*width; // max width of a word
    var TRIMMED_WORD_LENGTH = 8; // length of word for trimed word, point inclued in length "FOO."
    text.each(function(){
        var text = d3.select(this),
            words = text.text().split(/\s+/).reverse(),
            word,
            line = [],
            lineNumber = 0,
            lineHeight = 1.1,
            y = text.attr("y"),
            dy = parseFloat(text.attr("dy")),
            tspan = text.text(null).append("tspan")
                        .attr("x", 50)
                        .attr("text-anchor", "middle")
                        .attr("y", y)
                        .attr("dy", dy + "em"),
            dy_set = [dy];
        helperTspan.text(tspan.node().textContent);
        //console.log("words: "+words);
        while (word = words.pop()) {
            helperTspan.text(word);
            if (helperTspan.node().getComputedTextLength()> MAX_WORD_WIDTH){
                word = trimString(word, TRIMMED_WORD_LENGTH, ".");
            }
            line.push(word);
            tspan.text(line.join(" "));
            helperTspan.text(tspan.node().textContent);
            //console.log(tspan);
            //console.log(tspan.node());
            //console.log(tspan.node().textContent);
            //console.log("span width: "+helperTspan.node().getComputedTextLength());
            if (helperTspan.node().getComputedTextLength() > width) {
                line.pop();
                tspan.text(line.join(" "));
                lineNumber++;
                if (lineNumber == MAX_LINE_NUM){
                   tspan.text(trimString(line.join(" ")+"...", 8, "..."));
                   lineNumber--;
                   break;
                }
                line = [word];
                tspan = text.append("tspan").attr("x", 50).attr("y", y).attr("text-anchor", "middle")
                            .attr("dy", lineNumber*lineHeight + dy + "em").text(word);
                helperTspan.text(tspan.node().textContent);
                dy_set.push(parseFloat(tspan.attr("dy")));
            }
        }
        //console.log("dy set: "+ dy_set);
        var dy_offset = - (dy_set[dy_set.length-1] - dy_set[0])/2;
        //console.log(dy_offset);
        d3.select(this).selectAll("tspan").each(function(){
            var my_dy = parseFloat(d3.select(this).attr("dy"));
            //console.log(my_dy);
            d3.select(this).attr("dy", my_dy + dy_offset + "em");
            //console.log(my_dy + dy_offset);
        }); 
    });
}

function addSingleNode(div_selector, data){ // add single node to selected div
    tempNode = div_selector.append("svg").attr({"width":"110px", "height": "110px"}).append("g")
             .attr("class", "node")
             //.attr("transform", function(d){return "translate("+source.x0+","+source.y0+")";})
             .style("cursor", "pointer")
             .on("click", updateGraph)
             .on("mouseover", showBriefNodeInfo)
             .on("mouseout", closeBriefNodeInfo);
    tempNode.data([data.node_data], 0);   
    //console.log(data.node_data);   
    //console.log(tempNode.__data__);
    tempNode.append("circle").attr({"cx": 50, "cy": 50, "r": 50})
             .style({"fill":"#fff", "stroke": "steelblue", "stroke-width":"1.5px"});
    tempNode.append("text").attr({"x":50, "y":50, "dy":"0.35em", "text-anchor":"middle"})
             .text(data.node_text)
             .style({"font":"20px sans-serif"})
             .call(wrap, 80);
    //console.log("data of node"+d3.select("#contentMyGraph g .node").data);
}

function addNodeWithContext(div_selector, data, contextFunction){ // add single node to selected div
    tempNode = div_selector.append("svg").attr({"width":"110px", "height": "110px"}).append("g")
             .attr("class", "node")
             //.attr("transform", function(d){return "translate("+source.x0+","+source.y0+")";})
             .style("cursor", "pointer")
             .on("click", updateGraph)
             .on("mouseover", showBriefNodeInfo)
             .on("mouseout", closeBriefNodeInfo)
             .on("contextmenu", contextFunction);
    tempNode.data([data.node_data], 0);
    //console.log(data.node_data);
    //console.log(tempNode.__data__);
    tempNode.append("circle").attr({"cx": 50, "cy": 50, "r": 50})
             .style({"fill":"#fff", "stroke": "steelblue", "stroke-width":"1.5px"});
    tempNode.append("text").attr({"x":50, "y":50, "dy":"0.35em", "text-anchor":"middle"})
             .text(data.node_text)
             .style({"font":"20px sans-serif"})
             .call(wrap, 80);
    //console.log("data of node"+d3.select("#contentMyGraph g .node").data);
}


function addRoot(e){

    var addRootUrl = "/addroot/" + String(userID);
    console.log(e);
    if(addRootShowing){
        closeAddRoot();
    }

    d3.select("#divAddRoot").style("display","inline")
        .style("top", (e.x + 200)+"px");
    console.log(e);
    d3.select("#btnCloseAddRoot").attr("href", "javascript: closeAddRoot();");
    //Load tag section
    d3.select("#formAddRoot").attr("action", addRootUrl);
    addRootShowing = true;

}

function closeAddRoot(){
    d3.select("#divAddRoot").style("display","none");
    addRootShowing = false;
}

function updateGraph(e){ // TODO:retrieve content from server
    console.log(e);
    //update graph with new root
    d3.json("/update_rooted_data/" + e.id + "/" + userID, function(result){
        root = result;
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

    });


}

function showBriefNodeInfo(e){
    $("#tooltipContent").empty();
    offs = $(this).offset();
    pos = $(this)[0].getBoundingClientRect();
    new_pos = {"top": offs.top+pos.width/2, "left": offs.left + pos.width}
    placeDivTooltip(new_pos);
    d3.select("#tooltipContent").append("h4").text(e.msg);
    //console.log(pos);   
    $("#divNodeTooltip").css("display","inline");
    console.log("Show triggered");
}

function closeBriefNodeInfo(e){
    $("#divNodeTooltip").css("display", "none");
    console.log("Close triggered");
}

function update(source) {

  // Compute the new tree layout.
  var nodes = tree.nodes(root).reverse(),
      links = tree.links(nodes);

  // Normalize for fixed-depth.
  nodes.forEach(function(d) { d.y = d.depth * 180; });

  // Update the nodes
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

  // Update the links
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
    //loadDivAddTag(d);
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
    // New tag editor to display tags
    $("#nodeTag .tag-editor").remove();
    $("#tagEditor").empty();
    $("#tagEditor").tagEditor({
        initialTags:d.tags,
        maxTags: 10,
        removeDuplicates: true,
        placeholder: "Add a tag",
        autocomplete: null, // { 'source': '/url/', minLength: 3 }
        onChange: function(original_field, current_editor, new_tags){
            console.log(new_tags);
            $.ajax({
                    type: 'post',
                    url: '/api/update_tag',
                    data: {"name": d.name, "new_tags": JSON.stringify(new_tags)},
                    dataType: "json",
                    success: function(response){
                        //console.log(response.status);
                        if(response.status === "success"){
                            d.tags = new_tags;
                        }else if(response.status === "error"){
                            window.alert(response.message);
                        }},
                    failure: function(){window.alert("ajax error in updating tags")},
            }); //TODO: show alert if failed? sequence of ajax?
        },
    });
    /*
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
        .attr("href", "javascript: showDivAddTag()");*/
}
/*function loadDivAddTag(d){ // load the add Tag Div
    var addTagUrl = "/api/addtag/"+d.name; //some encoding here?
    d3.select("#formAddTag").attr("action", addTagUrl);
    //d3.select("#btnAddTag").on("click", );//TODO: add action to add tag button
    d3.select("#btnCancelAddTag").on("click", closeDivAddTag);
}*/
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
            .append("img").attr("src", thumb.url)
            .attr("alt", thumb.msg)
            .attr("style", "height:100px")
            .on("mouseover",function(){
                $("#tooltipContent").empty();
                pos = $(this).offset();
                console.log(pos);
                placeDivTooltip(pos);
                d3.select("#tooltipContent").append("h4").text(thumb.msg);
    //console.log(pos);
                $("#divNodeTooltip").attr("style","display:inline");
                console.log("Show triggered");
            })
            .on("mouseout",closeMsgCase);
    });

}

function showMsgCase(e){
    console.log(e);
    $("#tooltipContent").empty();
    offs = $(this).offset();
    pos = $(this)[0].getBoundingClientRect();
    new_pos = {"top": offs.top+pos.width/2, "left": offs.left + pos.width}

    d3.select("#tooltipContent").append("h4").text(e.attr("alt"));
    //console.log(pos);
    placeDivTooltip(new_pos);
    $("#divNodeTooltip").css("display","inline");
    console.log("Show triggered");
}

function closeMsgCase(e){
    $("#divNodeTooltip").css("display", "none");
    console.log("Close triggered");
}

function closeDivRef(){
    $("#divReference").empty();
    console.log(d3.select("#divReference"));
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

function trimString(str, len, str_omit_sign){ // shorten
    if(str.length <= len){
        return str;
    }
    var trimmed = str.substring(0, len-str_omit_sign.length)+str_omit_sign;
    return trimmed;
}

function placeDivTooltip(position){ // move divNodeTooltip pointer to new location
    var y = position.top - 25;
    var x = position.left + 15;
    console.log("x = " + x + " y = " +y);
    $("#divNodeTooltip").css({"top": y , "left": x });
    console.log("changed");
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
