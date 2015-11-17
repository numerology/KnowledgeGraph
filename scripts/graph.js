var margin = {top: 20, right: 120, bottom: 20, left: 120},
    width = 960 - margin.right - margin.left,
    height = 800 - margin.top - margin.bottom;

var contextMenuShowing = false;
var currentClass;
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
});

d3.select(self.frameElement).style("height", "800px"); //TODO: Change hight according to tree levels

$("#divNodeDetail").draggable({addClasses:false});

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
    contextMenuShowing = true;
}

function closeContextMenu(){
    d3.select("#divNodeDetail").style("display","none");
    closeDivAddChild();
    contextMenuShowing = false;
}

function loadTag(d){
    divTag = d3.select("#divNodeTag");
    $("#divNodeTag").empty(); //jquery ...
    var myTag = d.name + " tag1";
    var tagUrl;
    divTag.append("a").attr("class", "btn btn-default btn-sm").text(d.name).attr("href", "javascript:clickTag('"+tagUrl+"')"); // or add onclick
    //Button for adding tag
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
