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
getMyGraphTab();
getSharedGraphTab();
getClipboard();
getGraph();





function done(){
 console.log("accepted called");
}
//var myjson = '{"name": "flare","children": [{"name": "analytics","children": [{"name": "cluster","children": [{"name": "MergeEdge" }]}]}]}';
function getGraph(){
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
        }
    );
}

//write out the root list
function getMyGraphTab(){
    d3.selectAll("#contentMyGraph .svg-node").remove();
    loadMyGraphTab();
    d3.json("/get_root_list/" + userID, function(result) {
        list = result;
        tabContentSelector = d3.select("#contentMyGraph");
        list.root_list.forEach(function(d){
            //console.log(d);
            nodeData = {"node_text":d.root_name,"node_data":{"name":d.root_name,"msg": String(d.msg), "id": d.rootID}};
            addNodeWithContext(tabContentSelector, nodeData, clickMyTabNode, shareMenu);
        });
        if (list.root_list.length == 1){
            tabContentSelector.selectAll("g").classed("lastNode", true);
        }
    })
}

function getSharedGraphTab(){
    loadSharedGraphTab();
    d3.json("/get_shared_list/" + userID, function(result) {
        list = result;
        //console.log("getting shared list");
        tabSharedSelector =d3.select("#divClipboardNode");
        list.shared_list.forEach(function(d){
            //console.log(d);
            nodeData = {"node_text":d.root_name, "node_data":{"name":d.root_name, "msg": String(d.msg), "id": d.rootID}};
            addSingleNode(tabSharedSelector, nodeData, clickSharedTabNode);
        });
    })
}

function getClipboard(){
    d3.json("/get_clipboard/" + userID, function(result){
    //console.log(result)
    //console.log(result)
    divClipboardChild =d3.select("#divClipboardNode");
    $("#divClipboardNode").empty();
    if (result.children){
        children = result.children;
        children.forEach(function(child){
            var msg = child.name
            if (child.title){
                msg = child.title;
            }
            nodeData = {"node_text":child.name, "node_data":{"msg": msg, "id": child.id.toString(), "child": child}};
            addSingleNodeNoclick(divClipboardChild, nodeData);
        });
    }
    var divClipRef = d3.select("#divClipboardReference");
    if ("thumbnails" in result){
        result.thumbnails.forEach(function(thumb){
            //console.log("adding");
            divClipRef.append("a").attr("class", "thumbnail")
			    .append("img").attr("src", thumb.url)
                .attr("alt", thumb.msg)
                .attr("style", "height:100px")
                .on("mouseover",function(){
                    $("#tooltipContent").empty();
                    pos = $(this).offset();
                    //console.log(pos);
                    placeDivTooltip(pos);
                    d3.select("#tooltipContent").append("h4").text(thumb.msg);
                    $("#divNodeTooltip").attr("style","display:inline");
                    //console.log("Show triggered");
                })
                .on("mouseout",closeMsgCase);
	    });
	    divClipRef.selectAll("a").data(result.reference);
    }
});
}

function shareMenu(e){
    if(shareShowing){
        closeShare();
    }
    var node = e;
    $("#formShareRoot")[0].reset();
    var shareUrl = "/shareroot/" + node.id + '/' + String(userID);
    d3.event.preventDefault();
    d3.select("#btnCancelShareRoot").attr("href", "javascript: closeShare();");
    $("#shareNodeName").text(node.name);

    d3.select("#divShare").style("display","inline")
        .style("top", (e.x + 200)+"px");
    addRootShowing = true;

    $("#divInputEmail .tag-editor").remove();
    $("#inputEmail").empty();
    $("#inputEmail").tagEditor({
        initialTags:[],
        maxTags: 10,
        removeDuplicates: true,
        sortable: false,
        placeholder: "Add email",
        autocomplete: null, // { 'source': '/url/', minLength: 3 }
        onChange: validateTagEmail,
    });
    $("#formShareRoot").validate({
        rules: {
            target_mail: {
                required: true,

            },
            title_name: {
                required: false,
                maxlength: TITLE_MAX_LENGTH,
            }
        },
        errorPlacement: function(error, element) {
            error.insertAfter($("#formShareRoot ul")); // <- the default
        },
        submitHandler:function(){
            $.ajax({
                type: 'post',
                url: shareUrl,
                data: {"target_email": $('#inputEmail').val(), "share_message": $("#shareMessage").val()},
                dataType: "json",
                success: function(response){
                    if(response.status === "success"){
                        closeShare();
                        console.log(response.message);
                    }else if(response.status === "error"){
                        window.alert(response.message);
                    }
                },
                failure: function(){
                    window.alert("ajax error in index sharing");},
            });
        }
    });
}

function closeShare(){
    $("#divShare").hide();
    $("#formShareRoot")[0].reset();
    shareShowing = false;
}

d3.select(self.frameElement).style("height", "800px"); //TODO: Change hight according to tree levels

$("#divNodeDetail").draggable({addClasses:false});
$("#divAddRoot").draggable({addClasses:false});
$("#divShare").draggable({addClasses:false});

$(".draggable").draggable({
    start:function(e, ui){
        $(this).data('preventBehavior', true);
    }
});
$("#divClipboard").resizable({
    maxWidth: 450,
    minWidth: 250,
    maxHeight: 600,
    minHeight: 300,
});
//$('.scrollbar-light').scrollbar();
$("#divClipboardReference").sortable({
    tolerance: 'pointer',
    forceHelperSize: true,
    helper: 'original',
    scroll: true,
    appendTo: 'document.body',
    items: '.thumbnail',
    connectWith: "#divReference",
    receive: function (event, ui){
        //ui.sender.sortable('cancel');
    },
    update: function(event, ui){
        var new_reference_list = [];
        d3.selectAll("#divClipboardReference a").each(function(d){
            //console.log(d);        
            new_reference_list.push(d.toString());
        });
        $.ajax({
            type: 'post',
            url: '/api/update_clipboard',
            data: {"userID": userID, "new_reference_list": JSON.stringify(new_reference_list)},
            dataType: "json",
            success: function(response){
                //console.log(response.status);
                if(response.status === "success"){
                }else if(response.status === "error"){
                    window.alert(response.message);
                }},
            failure: function(){
                window.alert("ajax error in updating my node list");},
        });
    },
});
$("#divClipboardNode").sortable({
    tolerance: 'pointer',
    forceHelperSize: true,
    helper: 'original',
    scroll: true,
    appendTo: 'document.body',
    //items: 'svg',
    connectWith: ["#divNodeChild", "#contentMyGraph"],
    receive: function (event, ui){
		var isLastNode = false;
		//var d3selector;
        //console.log(ui);
        console.log("receive");
		$(this).find("g").each(function(){
			console.log($(this));
			d3selector = d3.selectAll($(this).toArray());
			if (d3selector.classed("lastNode")){
				isLastNode = true;
			}
			//isLastNode = true;
		});
		console.log("Clipboard isLastNode: ");
		console.log(isLastNode);
		if (isLastNode){
			ui.sender.sortable('cancel');
		}
	},
    update: function(event, ui){
        var new_child_list = [];
        var new_children = [];

        d3.selectAll("#divClipboardNode .node")
            .each(function(e,i){
            console.log(e);
            new_child_list.push(e.id.toString());
            new_children.push(e.child);
        }).on('click', function(e){});// remove click function for nodes in clipboard

        
        $.ajax({
            type: 'post',
            url: '/api/update_clipboard',
            data: {"userID": userID, "new_child_list": JSON.stringify(new_child_list)},
            dataType: "json",
            success: function(response){
                //console.log(response.status);
                if(response.status === "success"){

                }else if(response.status === "error"){
                    window.alert(response.message);
                }},
            failure: function(){
                window.alert("ajax error in updating my node list");},
        });
    },
});
$("#divClipboard").css({"position": "fixed",
                        "bottom": '200px',
                        "right": '150px'});
$("#btnCloseClipboard").on('click', function(){
    $("#btnClipboard").show();
    $("#divClipboard").toggle();
});
$("#btnCloseShare").click(function(){$("#divShare").toggle()});
$("#btnClipboard").on("mousedown", function(e){
    var mdown = document.createEvent("MouseEvents");
    mdown.initMouseEvent("mousedown", true, true, 
          window, 0, e.screenX, e.screenY, e.clientX, e.clientY,
          true, false, false, true, 0, null);
    $(this).closest(".draggable")[0].dispatchEvent(mdown);
    //$("#divClipboard")[0].dispatchEvent(mdown);
    //console.log('mousedown');
}).on('click', function(e){
    var $_this = $(this);
    var $draggable = $(this).closest('.draggable');
    if ($draggable.data("preventBehavior")){
        //e.stopPropagation();
        //console.log('default prevented?');
        $draggable.data("preventBehavior", false);
    }else {
        console.log('div clipboard show');
        $("#divClipboard").toggle();
        $_this.hide();
        /*changeDisplay({
            "selector": $("#divExpandedClipboard"),
            "showFunction": function(){
                console.log($_this);
                var $div = $("#divClipboard");
                console.log($div.css('bottom'));
                var oldOffset = windowOffset($_this);
                console.log(oldOffset);
                $div.addClass("popup-window clipboard-expanded");
                $div.css('width', '400px');
                var newOffset = windowOffset($_this);
                var divOffset = windowOffset($div);
                $div.css('bottom', divOffset.bottom + oldOffset.bottom-newOffset.bottom +'px');
                $div.css('right', divOffset.right + oldOffset.right - newOffset.right + 'px');
                console.log(newOffset);
                console.log($div.css('bottom'));
                //$div.css({'bottom': +'px',});
                //console.log("show function"+e);
            },
            "hideFunction": function(){
                $div = $("#divClipboard");
                $div.css('width', '45px')
                $("#divClipboard").removeClass("popup-window clipboard-expanded");
                //console.log("hide function"+e);
            },
        });*/
    }
});

function windowOffset(selector){ // return offset relative to current window
    var ans={};
    ans.top = selector.offset().top - $(window).scrollTop();
    ans.bottom = $(window).height() + $(window).scrollTop() - selector.offset().top - selector.height();
    ans.left = selector.offset().left - $(window).scrollLeft();
    ans.right = $(window).width() + $(window).scrollLeft() - selector.offset().left - selector.width();
    return ans;
}

$("#btnEditNodeTitle").tooltip();

function loadMyGraphTab(){ // call the json function to load the roots for graph tab
    addRootData = {"msg": "Click to add new Root"}; // cannot use jquery on d3 object ...
    nodeaddroot = d3.select("#nodeAddRoot")
                    .on("click", addRoot)
                    .on("mouseover", showBriefNodeInfo)
                    .on("mouseout", closeBriefNodeInfo);
    nodeaddroot.data([addRootData], 0);
    //console.log("Log: nodeaddroot data: " + d3.select(nodeaddroot).__data__);
    
    // generate graph for each node
  //  nodeData = {"node_text":"Node1", "node_data":{"title":"Data - Title", "msg": "Data Msg"}};
    tabContentSelector = d3.select("#contentMyGraph");
 //   addSingleNode(tabContentSelector, nodeData);
   // nodeData.node_text="Testtttttttt  for aaaaaaaaaaaaa aaaa vvvvvvvery long Title";
  //  addSingleNode(d3.select("#contentSharedGraph"), nodeData);
    //console.log(helperTspan.node().textContent);
    //console.log(helperTspan.node().getComputedTextLength());
    $("#contentMyGraph").sortable({
        tolerance: 'pointer',
        forceHelperSize: true,
        helper: 'original',
        scroll: true,
        appendTo: 'document.body',
        cancel: "#nodeAddRoot", //exclude add root node
        connectWith: "#divClipboardNode",
        update: function(event, ui){
            var temp_node_list = [];
            //console.log(event);
            //console.log(ui);
			var nodeNum = 0;
            d3.selectAll("#contentMyGraph .node")
              .filter(function(d,i){return i!=0;}) // do not include first node, i.e., add root node
              .each(function(e){
				nodeNum++;
                temp_node_list.push(e.id.toString());
                //console.log(e);
              }).on("click", clickMyTabNode);// add click function to node in my graph tab
			//console.log("my graph update: nodeNum is " + nodeNum);
			// IMPORTANT: YW: 11/28/2015 dont use $(this) inside other functions....
					// jquery does not add class to d3 element ...
			if (nodeNum == 1){ //only one node left in my graph
				d3.selectAll("#contentMyGraph g")
				  .classed("lastNode", true);
				 $("#contentMyGraph .node").each(function(){
					var $g = $(this);
					console.log($g.attr("class"));
				});
			}else { //only one node left in my graph
				d3.selectAll("#contentMyGraph g")
				  .classed("lastNode", false);
			}
			console.log("temp node list: "+temp_node_list );
			if(nodeNum == 0){
				console.log("sortable has no root now, does not update my roots");
			} else{$.ajax({
					type: 'post',
					url: '/api/update_root',
					data: {"userID": userID,"type": "MY_ROOT", "new_root_list": JSON.stringify(temp_node_list)},
					dataType: "json",
					success: function(response){
						//console.log(response.status);
						if(response.status === "success"){
						    if (response.current_root_changed){ //update graph if current root changed
						        getGraph();
						    }
						}else if(response.status === "error"){
							window.alert(response.message);
						}},
					failure: function(){
						window.alert("ajax error in updating my node list");},
				});
			}
        }
    });
}
function loadSharedGraphTab(){
	var nodeData = {"node_text":"Node1", "node_data":{"title":"Shared Node Test", "msg": "Shared node test"}};
    nodeData.node_text="Testtttttttt  for aaaaaaaaaaaaa aaaa vvvvvvvery long Title";
    addSingleNode(d3.select("#contentSharedGraph"), nodeData, clickSharedTabNode);
    $("#contentSharedGraph").sortable({
        tolerance: 'pointer',
        forceHelperSize: true,
        helper: 'original',
        scroll: true,
        appendTo: 'document.body',
        //connectWith: "#divClipboardNode",
        update: function(event, ui){
            var temp_node_list = [];
            //console.log(event);
            //console.log(ui);
            d3.selectAll("#contentSharedGraph .node")
              .each(function(e){
                temp_node_list.push(e.id);
                console.log(e);
              });
            console.log("temp node list: "+JSON.stringify(temp_node_list) );
            $.ajax({
                type: 'post',
                url: '/api/update_root',
                data: {"userID": userID,"type": "SHARED_ROOT", "new_root_list": JSON.stringify(temp_node_list)},
                dataType: "json",
                success: function(response){
                    //console.log(response.status);
                    if(response.status === "success"){
                    }else if(response.status === "error"){
                        window.alert(response.message);
                    }},
                failure: function(){
                    window.alert("ajax error in updating shared node list");},
            });
        }
    });
}





function addSingleNode(div_selector, data, clickFunction){ // add single node to selected div
    tempNode = div_selector.append("svg").attr({"width":"110px", "height": "110px"})
             .attr("class", "svg-node")
             .append("g")
             .attr("class", "node")
             //.attr("transform", function(d){return "translate("+source.x0+","+source.y0+")";})
             .style("cursor", "pointer")
             .on("click", clickFunction)
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

function addSingleNodeNoclick(div_selector, data){ // add single node to selected div
    tempNode = div_selector.append("svg").attr({"width":"110px", "height": "110px"})
             .attr("class", "svg-node")
             .append("g")
             .attr("class", "node")
             //.attr("transform", function(d){return "translate("+source.x0+","+source.y0+")";})
             .style("cursor", "pointer")
             .on("mouseover", showBriefNodeInfo)
             .on("mouseout", closeBriefNodeInfo);
    tempNode.data([data.node_data], 0);
    //console.log(tempNode.data());
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

function addNodeWithContext(div_selector, data, clickFunction, contextFunction){ // add single node to selected div
    tempNode = div_selector.append("svg").attr({"width":"110px", "height": "110px"})
             .attr("class", "svg-node")
             .append("g")
             .attr("class", "node")
             //.attr("transform", function(d){return "translate("+source.x0+","+source.y0+")";})
             .style("cursor", "pointer")
             .on("click", clickFunction)
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


function clickMyTabNode(e){
    console.log("Click node of my tab");
    closeContextMenu();
    updateGraph(e);
}

function clickSharedTabNode(e){
    //TODO: some behavior of shared node
    closeContextMenu();
    updateGraph(e);
}


function addRoot(e){

    var addRootUrl = "/addroot/" + String(userID);
    //console.log(e);
    if(addRootShowing){
        closeAddRoot();
    }

    d3.select("#divAddRoot").style("display","inline")
        .style("top", (e.x + 200)+"px");
    //console.log(e);
    d3.select("#btnCloseAddRoot").attr("href", "javascript: closeAddRoot();");
    //Load tag section
    d3.select("#formAddRoot").attr("action", addRootUrl);
    addRootShowing = true;
    $("#formAddRoot").validate({
        rules: {
            root_name: {
                required: true,
                maxlength: NODE_NAME_LENGTH,
            },
            title: {
                required: false,
                maxlength: TITLE_MAX_LENGTH,
            }
        },
        submitHandler: function(form){
            $.ajax({
                type: 'post',
                url: addRootUrl,
                data: {"root_name": $('#inputRootName').val(), "title_name": $("#inputRootTitle").val()},
                dataType: "json",
                success: function(response){
                    if(response.status === "success"){
                        closeAddRoot();
                        getMyGraphTab();
                        console.log(response.message);
                    }else if(response.status === "error"){
                        window.alert(response.message);
                    }
                },
                failure: function(){
                    window.alert("ajax error in updating my node list");},
            });
        },
    });
}

function closeAddRoot(){
    $("#formAddRoot")[0].reset();
    d3.select("#divAddRoot").style("display","none");
    addRootShowing = false;
}

function updateGraph(e){ // TODO:retrieve content from server
    //console.log(e);
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
    //console.log(e);
    $("#tooltipContent").empty();
    offs = $(this).offset();
    pos = $(this)[0].getBoundingClientRect();
    new_pos = {"top": offs.top+pos.width/2, "left": offs.left + pos.width}
    placeDivTooltip(new_pos);
    d3.select("#tooltipContent").append("h4").text(e.msg);
    //console.log(pos);   
    $("#divNodeTooltip").css("display","inline");
    //console.log("Show triggered");
}

function closeBriefNodeInfo(e){
    $("#divNodeTooltip").hide();
    //console.log("Close triggered");
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
    if (d3.event){
        d3.event.preventDefault();
    }
    currentNode = d;
    var _currentClass = d.name;
    if(contextMenuShowing){
        closeContextMenu();
        d3.select("#divNodeDetail").style("display","inline");
    }else{
        d3.select("#divNodeDetail").style("display","inline")
            .style("top", (d.x+200)+"px")
            .style("left", (d.y+400)+"px");
    }
    d3.select("#btnCloseNodeDetail").attr("href", "javascript: closeContextMenu();");
    loadTitle(d);
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

function loadTitle(d){
    var temp_title = d.title;
    if(!temp_title){temp_title = d.name;};
    d3.select("#spanNodeTitle").text(temp_title);
    $("#spanNodeTitle").editable({trigger: $("#btnEditNodeTitle"), action:"click"},
        function(e){
            //console.log(d);
            //console.log(e);
            if (e.value === d.title){
                //window.alert(e.value+"=="+d.name);
                return;
            }
            if (e.value.length==0){
                window.alert("New title empty");
                e.target.html(e.old_value);
                return;
            }
            if (e.value.length > TITLE_MAX_LENGTH){
                window.alert("New title is too long, length >"+TITLE_MAX_LENGTH);
                return;
            }
            $.ajax({
                type: 'post',
                url: '/api/update_node',
                data: {"nodeID": d.id, "new_title": e.value},
                dataType: "json",
                success: function(response){
                    //console.log(response.status);
                    if(response.status === "success"){
                        d.name = e.value;
                    }else if(response.status === "error"){
                        window.alert(response.message);
                        $("#spanNodeTitle").value(d.name);
                    }},
                failure: function(){
                    window.alert("ajax error in updating title");
                    $("#spanNodeTitle").value(d.name);},
            });
            window.alert(e.value);
        });
}

function loadTag(d){
    // New tag editor to display tags
    //console.log(d.tags);
    //var initTags = d.tags;
    //console.log($("#nodeTag ul"));
    //$("#nodeTag .tag-editor").empty();
    //$("#nodeTag .tag-editor").remove();
    //init = null;
    $("#tagEditor").empty();
    $('#tagEditor').tagEditor('destroy');
    $("#tagEditor").tagEditor({
        initialTags: d.tags,
        maxTags: 10,
        removeDuplicates: true,
        placeholder: "Add a tag",
        autocomplete: null, // { 'source': '/url/', minLength: 3 }
        onChange: function(original_field, current_editor, new_tags){
            //console.log(new_tags);
            $.ajax({
                    type: 'post',
                    url: '/api/update_node',
                    data: {"nodeID": d.id, "new_tag_list": JSON.stringify(new_tags)},
                    dataType: "json",
                    success: function(response){
                        //console.log(response.status);
                        if(response.status === "success"){
                            d.tags = new_tags;
                        }else if(response.status === "error"){
                            window.alert(response.message);
                        }},
                    failure: function(){window.alert("ajax error in updating tags")},
            });
        },
    });
}

function loadChild(d){ // load children in ContextMenu
    divNodeChild =d3.select("#divNodeChild");
    $("#divNodeChild").empty();
    //console.log("Load child :");
    //console.log(d.children);
	children = d.children;
	if (d._children){
		children = d._children;
	}
    if (children){
        children.forEach(function(child){
            //console.log(child);
            //console.log(child.id);
            var msg = child.name
            if (child.title){
                msg = child.title;
            }
            nodeData = {"node_text":child.name, "node_data":{"msg": msg, "id": child.id.toString(), "child": child}};
            addSingleNodeNoclick(divNodeChild, nodeData);
        });
    }    
    $("#divNodeChild").sortable({
        tolerance: 'pointer',
        forceHelperSize: true,
        helper: 'original',
        scroll: true,
        appendTo: 'document.body',
        //zIndex: 1000,
        connectWith: "#divClipboardNode",
        receive: function (event, ui){ // TODO: check whether the current node is in the graph
        },
        update: function(event, ui){
            var new_child_list = [];
            var new_children = [];
            d3.selectAll("#divNodeChild .node").each(function(e, i){
                new_child_list.push(e.id.toString());
                new_children.push(e.child);
                //console.log("update children list:");
                //console.log(e);
            });
            d.children = new_children;
            $.ajax({
                type: 'post',
                url: '/api/update_node',
                data: {"nodeID": d.id, "new_child_list": JSON.stringify(new_child_list)},
                dataType: "json",
                success: function(response){
                    //console.log(response.status);
                    if(response.status === "success"){
                    }else if(response.status === "error"){
                        window.alert(response.message);
                    }},
                failure: function(){
                    window.alert("ajax error in updating my node list");},
            });
        }});
}

function showDivAddChild(){
    d3.select("#btnShowAddChild").style("display", "none");
    d3.select("#divAddChild").style("display","inline");
}

function loadDivAddChild(d){
    $_this = d3.select(this);
    btnShowAddChild = d3.select("#btnShowAddChild");
    currentClass = d.id;
    btnShowAddChild.on("click", showDivAddChild);
    addChildUrl = "/api/addChild/"+currentClass;
//    d3.select("#formAddChild").attr("action", "/api/addChild/"+currentClass);
    d3.select("#btnCancelAddChild").on("click", closeDivAddChild);
    $("#formAddChild").validate({
        rules: {
            childName: {
                required: true,
                maxlength: NODE_NAME_LENGTH,
            },
        },
        errorPlacement: function(error, element) {
            error.insertAfter($("#btnCancelAddChild")); // <- the default
        },
        submitHandler: function(form){
            $.ajax({
                type: 'post',
                url: addChildUrl,
                data: {"childName": $('#inputAddChild').val()},
                dataType: "json",
                success: function(response){
                    if(response.status === "success"){
                        console.log(response.message);
                        //old_node = d3.selectAll("#graphcanvas svg g.node").filter(function(d){return d.id == response.new_node.id;});
                        //console.log(old_node);
                        //old_node.data([response.new_node], 0);
                        //update(old_node[0]); //TODO: HOW TO UPDATE graph here?
                        getGraph();
                        contextmenu(response.new_node);
                    }else if(response.status === "error"){
                        window.alert(response.message);
                    }
                },
                failure: function(){
                    window.alert("ajax error in updating my node list");},
            });
        },
    });
}


function closeDivAddChild(){
    d3.select("#btnShowAddChild").style("display", "inline");
    d3.select("#divAddChild").style("display","none");
    d3.select("#inputAddChild").property("value","");
}

function loadDivRef(d){
    $("#divReference").empty(); //TODO: 
    d3.select("#btnAddReference").attr("href", "javascript: showAddRef()");
    d3.select("#btnCancelUpload").on("click", closeDivAddRef);
    d3.select("#nodeIDInput").attr("value", d.id);
    divRef = d3.select("#divReference");
    /*divRef.append("a").attr("class", "thumbnail")
            .append("img").attr("src", "src1")
            .attr("style", "height:100px");
            divRef.append("a").attr("class", "thumbnail")
            .append("img").attr("src", "src2")
            .attr("style", "height:100px");*/
    d.thumbnails.forEach(function(thumb){
        //console.log("adding");
        divRef.append("a").attr("class", "thumbnail")
			//.data([{"src": thumb.url}],0)
            .attr("style", "height:100px")
            .attr("href", "/serve_reference/"+thumb.blob)
            .on("mouseover",function(){
                $("#RefTipContent").empty();
                pos = $(this).offset();
                console.log(pos);
                $("#divReftip").css({"top": pos.top + 20 , "left": pos.left +20 });
                d3.select("#RefTipContent").append("h4").text(thumb.msg);
    //console.log(pos);
                $("#divReftip").css("display","inline");
                console.log("Show triggered");
            })
            .on("mouseout",function(){
                $("#divReftip").css("display", "none");
                console.log("Close triggered");
            }).append("img").attr("src", thumb.url)
            .attr("alt", thumb.msg)
            .attr("style", "height:100px");

	});
	divRef.selectAll("a").data(d.reference);
    $("#divReference").sortable({
        //cancel: "#nodeAddRoot", //exclude add root node
        tolerance: 'pointer',
        forceHelperSize: true,
        helper: 'original',
        scroll: true,
        appendTo: 'document.body',
        connectWith: "#divClipboardReference",
        receive: function (event, ui){
        },
        update: function(event, ui){
            var new_reference_list = [];
            //console.log(event);
            //console.log(ui);
            d3.selectAll("#divReference .thumbnail").each(function(d, i){
                //console.log(d);
                new_reference_list.push(d.toString());
            });
            $.ajax({
                type: 'post',
                url: '/api/update_node',
                data: {"nodeID": d.id, "new_reference_list": JSON.stringify(new_reference_list)},
                dataType: "json",
                success: function(response){
                    //console.log(response.status);
                    if(response.status === "success"){
                    }else if(response.status === "error"){
                        window.alert(response.message);
                    }},
                failure: function(){
                    window.alert("ajax error in updating my node list");},
            });
        }

    });
}

function showMsgCase(e){
    //console.log(e);
    $("#tooltipContent").empty();
    offs = $(this).offset();
    pos = $(this)[0].getBoundingClientRect();
    new_pos = {"top": offs.top+pos.width/2, "left": offs.left + pos.width}

    d3.select("#tooltipContent").append("h4").text(e.attr("alt"));
    //console.log(pos);
    placeDivTooltip(new_pos);
    $("#divNodeTooltip").css("display","inline");
    //console.log("Show triggered");
}

function closeMsgCase(e){
    $("#divNodeTooltip").css("display", "none");
    //console.log("Close triggered");
}

function closeDivRef(){
    $("#divReference").empty();
    //console.log(d3.select("#divReference"));
    //console.log("cleaning");
}





function placeDivTooltip(position){ // move divNodeTooltip pointer to new location
    var y = position.top - 25;
    var x = position.left + 15;
    //console.log("x = " + x + " y = " +y);
    $("#divNodeTooltip").css({"top": y , "left": x });
}

function changeDisplay(d){ //display or hide the selected element using jquery
    $selector = d.selector;
    //console.log("Change display");
    if ($selector.css('display') === "none"){
        //console.log('Show');
        $("#divClipboard").css('height', 'auto');
        $selector.css("display", "inline-block");
        if ('showFunction' in d){ // Callback function of show activity
            d.showFunction();
        }
    }else{
        $selector.css("display", "none");
        if ('hideFunction' in d){ // Callback function
            d.hideFunction();
        }
    }
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
