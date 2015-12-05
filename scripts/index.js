
var margin = {top: 20, right: 120, bottom: 20, left: 120},
    width = 900 - margin.right - margin.left,
    height = 800 - margin.top - margin.bottom;

var indentStep = 25;
var currentIndent = 0;

var original_parent_node = {}; //record the original parent node
var selected_node; //default selected node is set to the root node of tree
var root_node;
var currentNode;

var indexTree = $("#myGraphIndexContent");
$(".scrollbar-light").scrollbar();
$(".tooltip-btn").tooltip();
$('.index-page').hide();
$('.scrollbar-light').scrollbar();


$(document).ready(function() {
    var cache = {};

    d3.json("/get_index_data/" + userID, function(response) {
        console.log(response);
        if(response.status != "success"){
            console.log(response.message);
            return;
        }
        myGraphData = response.myNode;
        myGraphData.push(response.clipboard); //add clipboard to my node
        //console.log(response.clipboard.is_clipboard);
        indexTree.tree({
            data: response.myNode,
            dragAndDrop: true,
            onCreateLi: function(node, $li) {
                // Add 'icon' span before clipboard
                if (node.is_clipboard){
                    $li.find('.jqtree-title').css({"color":"blue", "font-weight":"bold"} );
                }
            },
            onCanMove: function(node){ // define what node can be moved
                var root = $('#myGraphIndexContent').tree('getTree');
                if (node.is_clipboard){ // clipboard can not be moved
                    return false;
                }//TODO: return false if the node is the last node not on clipboard
                else{
                    return true;
                }
            },
            onCanMoveTo: function(moved_node, target_node, position) {
                var root = $('#myGraphIndexContent').tree('getTree');
                if(root.children.length<=2 & !moved_node.parent.parent){ //the last root node cannot be moved
                    return false;
                }
                if (target_node.is_clipboard) {
                    // Example: can move inside or  before, not after
                    return (position == 'before' || position=='inside');
                }
                else {
                    return true;
                }
            },
            onDragMove: function(node, ui){
                original_parent_node = node.parent; //record the original parent of the node
            },
            onDragStop: function(node, ui){

            }
        });
        selected_node = indexTree.tree('getTree');
        root_node = indexTree.tree('getTree');
        indexTree.bind(
            'tree.click',
            function(event) {
                // The clicked node is 'event.node'
                var node = event.node;
                if (node.id == selected_node.id){
                    selected_node = root_node;
                    $("#indexNodeDetail").hide();
                }
                else{
                    selected_node = node;
                    $('.index-page').hide();
                    $("#indexNodeDetail").show();
                    showIndexNodeDetail(node);
                }
            }
        );
        $("#btnIndexAddChild").click(function(e){
            if(!selected_node.parent){ // no node selected
                showAddRoot();
            }else{
                showDivAddChild();
            }
            //console.log(e);
            //console.log(selected_node);
        });
        $("#btnIndexAddReference").click(function(e){
            if(!selected_node.parent){ // root node is selected

                window.alert("Please select a node to add reference");
            }else{
                showDivAddChild();
            }
        });

    });
});

function showIndexNodeDetail(node) {
    currentNode = node;
    d3.select("#btnCloseNodeDetail").attr("href", "javascript: closeIndexNodeDetail();");
    loadTitle(node);
    loadTag(node); // load the Tags of node
    loadChild(node);
    loadDivAddChild(node);
    loadDivRef(node);
}

function closeIndexNodeDetail(){
    $("#indexNodeDetail").hide();
    closeDivAddChild();
    indexTree.tree('selectNode', indexTree.tree('getTree')); // select root node if detail window is closed
}

function loadTitle(node){
    var temp_title = node.title;
    if(!temp_title){temp_title = node.name;}
    d3.select("#spanNodeTitle").text(temp_title);
    $("#spanNodeTitle").editable({trigger: $("#btnEditNodeTitle"), action:"click"},
    function(e){
        //console.log(node);
        //console.log(e);
        if (e.value === node.title){
            //window.alert(e.value+"=="+node.name);
            return;
        }
        if (e.value.length==0){
            window.alert("New title empty");
            e.target.html(e.old_value);
            return;
        }
        if (e.value.length > TITLE_MAX_LENGTH){
            window.alert("New title is too long, length >"+TITLE_MAX_LENGTH);
            e.target.html(e.old_value);
            return;
        }
        $.ajax({
            type: 'post',
            url: '/api/update_node',
            data: {"nodeID": node.id, "new_title": e.value},
            dataType: "json",
            success: function(response){
                //console.log(response.status);
                if(response.status === "success"){
                    node.name = e.value;
                }else if(response.status === "error"){
                    window.alert(response.message);
                    $("#spanNodeTitle").value(node.name);
                }},
            failure: function(){
                window.alert("ajax error in updating title");
                $("#spanNodeTitle").value(node.name);},
        });
        window.alert(e.value);
    });
}

function loadTag(node){
    // New tag editor to display tags
    $("#nodeTag .tag-editor").remove();
    $("#tagEditor").empty();
    $("#tagEditor").tagEditor({
        initialTags:node.tags,
        maxTags: 10,
        removeDuplicates: true,
        placeholder: "Add a tag",
        autocomplete: null, // { 'source': '/url/', minLength: 3 }
        onChange: function(original_field, current_editor, new_tags){
            //console.log(new_tags);
            $.ajax({
                    type: 'post',
                    url: '/api/update_node',
                    data: {"nodeID": node.id, "new_tag_list": JSON.stringify(new_tags)},
                    dataType: "json",
                    success: function(response){
                        //console.log(response.status);
                        if(response.status === "success"){
                            //node.tags = new_tags;
                        }else if(response.status === "error"){
                            window.alert(response.message);
                        }},
                    failure: function(){window.alert("ajax error in updating tags")},
            }); //TODO: show alert if failed? sequence of ajax?
        },
    });
}

function loadChild(node){ // load children in ContextMenu
    divNodeChild =d3.select("#divNodeChild");
    $("#divNodeChild").empty();
    children = node.children;
	if (children){
        children.forEach(function(child){
            var msg = child.name
            if (child.title){
                msg = child.title;
            }
            nodeData = {"node_text":child.name, "node_data":{"msg": msg, "id": child.id.toString(), "child": child}};
            addSingleNodeNoclick(divNodeChild, nodeData);
        });
    }
}

function loadDivAddChild(node){
    closeDivAddChild();
    btnShowAddChild = d3.select("#btnShowAddChild");
    currentClass = node.id;
    btnShowAddChild.on("click", showDivAddChild);
    d3.select("#formAddChild").attr("action", "/api/addChild/"+currentClass);
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
    });
}





function addSingleNodeNoclick(div_selector, data){ // add single node to selected div
    tempNode = div_selector.append("svg").attr({"width":"110px", "height": "110px"}).append("g")
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

function showDivAddChild(){
    d3.select("#btnShowAddChild").style("display", "none");
    d3.select("#divAddChild").style("display","inline");
}

function closeDivAddChild(){
    d3.select("#btnShowAddChild").style("display", "inline");
    d3.select("#divAddChild").style("display","none");
    d3.select("#inputAddChild").property("value","");
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
    console.log("Show triggered");
}

function closeBriefNodeInfo(e){
    $("#divNodeTooltip").css("display", "none");
    //console.log("Close triggered");
}
function placeDivTooltip(position){ // move divNodeTooltip pointer to new location
    var y = position.top - 25;
    var x = position.left + 15;
    //console.log("x = " + x + " y = " +y);
    $("#divNodeTooltip").css({"top": y , "left": x });
}

function showAddRoot(){
    console.log("show add root");
    $('.index-page').hide();
    $('#indexAddRoot').show();
    var addRootUrl = "/addroot/" + String(userID);
    d3.select("#btnCloseAddRoot").attr("href", "javascript: closeAddRoot();");
    d3.select("#createRootForm").attr("action", addRootUrl);
    $("#createRootForm").validate({
        rules: {
            root_name: {
                required: true,
                maxlength: NODE_NAME_LENGTH,
            },
            title: {
                required: false,
                maxlength: TITLE_MAX_LENGTH,
            }
        }
    });
}
function closeAddRoot(){
    $('#indexAddRoot').hide();
}

