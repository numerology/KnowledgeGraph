
var margin = {top: 20, right: 120, bottom: 20, left: 120},
    width = 900 - margin.right - margin.left,
    height = 800 - margin.top - margin.bottom;

var indentStep = 25;
var currentIndent = 0;

var original_parent_node_id=0; //record the original parent node
var new_parent_node_id = 0;
var current_node_id = 0;
var moved_node_id;
var selected_node; //default selected node is set to the root node of tree
var root_node;
var currentNode;
var email_list = [];
var email_invalid_list = [];

var currentTab = "#myGraphIndex";

var addElementNode; // record the node that has been added child/reference

var indexTree = $("#myGraphIndexContent");
var sharedIndexTree = $("#sharedGraphIndexContent");
$(".scrollbar-light").scrollbar();
$(".tooltip-btn").tooltip();
$('.index-page').hide();
$('.scrollbar-light').scrollbar();


$(document).ready(function() {
    var cache = {};
    loadMyIndex();
    loadSharedIndex();
});

$('a[data-toggle="tab"]').on('shown.bs.tab', function (e) {
  currentTab = $(e.target).attr("href") // activated tab
  //window.alert(target);
});
function isOnMyTab(){
    return currentTab=="#myGraphIndex";
}

function loadSharedIndex(){

}

function loadMyIndex(){
    d3.json("/get_index_data/" + userID, function(response) {
        //console.log(response);
            if(response.status != "success"){
                console.log(response.message);
                return;
            }
            myGraphData = response.myNode;
            myGraphData.push(response.clipboard); //add clipboard to my node
            //console.log(response.clipboard.is_clipboard);
            if (!indexTree.tree("getTree")){
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
                        if (!node.parent.parent){
                            original_parent_node_id = 0; //record the original parent of the node
                        }else{
                            original_parent_node_id = node.parent.id;
                        }
                        console.log(original_parent_node_id);
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
                },
                onDragStop: function(node, ui){
                    if (!node.parent.parent){
                        new_parent_node_id = 0;
                    }else{
                        new_parent_node_id = node.parent.id;
                    }
                    if (selected_node.parent){
                        if(original_parent_node_id == selected_node.id | new_parent_node_id == selected_node.id){ // show detail of node
                            console.log("parent was selected");
                            if (selected_node.parent){ // if not root node, show index node detail
                                //closeShare();// show index is contained in close share
                            }
                        }
                    }
                    console.log("original parent: " + original_parent_node_id);
                    console.log("post parent: " + new_parent_node_id);
                    //console.log("root id: " + indexTree.tree("getTree").id);
                    if(new_parent_node_id != original_parent_node_id){
                        var original_parent_node;
                        //console.log(original_parent_node_id);
                        if(original_parent_node_id == 0){
                            original_parent_node = indexTree.tree("getTree");
                        }else{
                            original_parent_node = indexTree.tree("getNodeById", original_parent_node_id);
                        }
                        console.log("ORI par name: "+original_parent_node.name);
                        if (!original_parent_node){console.error("original parent not found"); return;}
                        else{
                            var new_children = [];
                            original_parent_node.children.forEach(function(child){
                                if (child.id == node.id){
                                    console.log("Still in original parent");
                                }
                                else{
                                    new_children.push(child);
                                }
                            });
                            original_parent_node.children = new_children;
                        }
                        post_update_node(original_parent_node_id,{"removeId": node.id});
                    }
                    post_update_node(new_parent_node_id,{});
                    //post_update_node(node.id);
                }
            });
        }else{
            indexTree.tree("loadData", myGraphData);
        }
        selected_node = indexTree.tree('getTree');
        root_node = indexTree.tree('getTree');
        closeIndexNodeDetail();
        closeAddRoot();
        closeShare();
        indexTree.bind(
            'tree.click',
            function(event) {
                // The clicked node is 'event.node'
                event.preventDefault();
                var node = event.node;
                if (node.id == selected_node.id){
                    selected_node = root_node;
                    indexTree.tree('selectNode', selected_node);
                    $("#indexNodeDetail").hide();
                }
                else{
                    selected_node = node;
                    indexTree.tree('selectNode', selected_node);
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
                closeShare();
                showDivAddChild();
            }
        });
        $("#btnIndexAddReference").click(function(e){
            if(!selected_node.parent){ // root node is selected
                window.alert("Please select a node to add reference");
            }else{
                closeShare();
                showAddRef();
            }
        });
        $("#btnIndexShare").click(function(e){
            if(!selected_node.parent){ // root node is selected
                window.alert("Please select a node to share");
            }
            else if(selected_node.is_clipboard){
                window.alert("Cannot share your clipboard");
            }
            else{
                showShare();
            }
        });

    });
}


function post_update_node(changedNodeId, options){
    var changedNode;
    if (isOnMyTab()){
        if(changedNodeId == 0){ // root node is changed
            postRootList("MY_ROOT", options);
        }else{
            changedNode = indexTree.tree("getNodeById", changedNodeId);
            if(changedNode){
                postChildList(changedNodeId, options);
            }
        }
    }else{ //only support root level movement for shared node
        changedNode = sharedIndexTree.tree("getNodeById", changedNodeId);
        if(!changedNode){return;}
        if(!changedNode.parent){
            postRootList("SHARED_ROOT", options);
        }
    }
}

function postChildList(changedNodeId, options){
    var changedNode;
    if (isOnMyTab()){
        changedNode = indexTree.tree("getNodeById", changedNodeId);
    }else{ //only support root level movement for shared node
        changedNode = sharedIndexTree.tree("getNodeById", changedNodeId);
    }
    if(!changedNode){return;}
    new_child_list = [];
    changedNode.children.forEach(function(child){
        if (child.id != options.removeId){
            new_child_list.push(child.id);
        }

    });
    postUrl = '/api/update_node';
    if (changedNode.is_clipboard){
        postUrl = '/api/update_clipboard';
    }
    console.log("changed node id: " + changedNode.id);
    $.ajax({
        type: 'post',
        url: postUrl,
        data: {"nodeID": changedNode.id, "userID": userID, "new_child_list": JSON.stringify(new_child_list)},
        dataType: "json",
        success: function(response){
            if(response.status === "success"){
                console.log(changedNode.name+"child list updated");
            }else if(response.status === "error"){
                window.alert(response.message);
            }},
        failure: function(){
            window.alert("ajax error in updating my node list");},
    });
}


function postRootList(rootType, options){
    new_root_list = [];
    var temp_tree;
    if(rootType == "MY_ROOT"){
        temp_tree = indexTree.tree("getTree");
        if(!temp_tree){
            console.error("my index tree not available now");
            return;
        }
        temp_tree.children.forEach(function(child){
            if(!child.is_clipboard){
                if (child.id != options.removeId){
                    new_root_list.push(child.id);
                }
            }
        });
    }else if(rootType == "SHARED_ROOT"){
        temp_tree = sharedIndexTree.tree("getTree");
        if(!temp_tree){
            console.error("shared index tree not available now");
        }
        temp_tree.children.forEach(function(child){
            if (child.id != options.removeId){
                new_root_list.push(child.id);
            }

        })
    }
    $.ajax({
        type: 'post',
        url: '/api/update_root',
        data: {"userID": userID,"type": rootType, "new_root_list": JSON.stringify(new_root_list)},
        dataType: "json",
        success: function(response){ //console.log(response.status);
            if(response.status === "success"){
                console.log(response.message);
                console.log("ROOT updated");
            }else if(response.status === "error"){
                window.alert(response.message);
            }},
        failure: function(){
            window.alert("ajax error in updating "+ rootType+" root list");},
    });
}



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
    selected_node = indexTree.tree('getTree');
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
            data: {"nodeID": node.id.toString(), "new_title": e.value},
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
                window.alert("ajax error in index create new root");
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
                    data: {"nodeID": node.id.toString(), "new_tag_list": JSON.stringify(new_tags)},
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
    addElementNode = node;
    btnShowAddChild = d3.select("#btnShowAddChild");
    //currentClass = node.id;
    btnShowAddChild.on("click", showDivAddChild);
    addChildUrl = "/api/addChild/"+node.id
    //d3.select("#formAddChild").attr("action", "/api/addChild/"+currentClass);
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
                        window.alert(response.message);
                        if(selected_node.id == addElementNode.id){ // still on the same node
                            closeDivAddChild();
                            var temp_node = indexTree.tree('getNodeById', addElementNode.id);
                            console.log(temp_node);
                            console.log(response.new_node);
                            indexTree.tree("loadData", response.new_node.children, temp_node);
                            selected_node = indexTree.tree('getNodeById', addElementNode.id);
                            indexTree.tree("selectNode", selected_node);
                            showIndexNodeDetail(selected_node);
                        } else { // has moved to a different node
                            loadMyIndex();
                        }
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





function addSingleNodeNoclick(div_selector, data){ // add single node to selected div
    tempNode = div_selector.append("svg").attr({"width":"110px", "height": "110px"}).append("g")
             .attr("class", "node")
             //.attr("transform", function(d){return "translate("+source.x0+","+source.y0+")";})
             .style("cursor", "pointer")
             .on("mouseover", showBriefNodeInfo)
             .on("mouseout", closeBriefNodeInfo);
    tempNode.data([data.node_data], 0);
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
    $('#createRootForm')[0].reset();
    $('#indexAddRoot').show();
    var addRootUrl = "/addroot/" + String(userID);
    d3.select("#btnCloseAddRoot").attr("href", "javascript: closeAddRoot();");
    //d3.select("#createRootForm").attr("action", addRootUrl);
    $("#createRootForm").validate({
        rules: {
            root_name: {
                required: true,
                maxlength: NODE_NAME_LENGTH,
            },
            title_name: {
                required: false,
                maxlength: TITLE_MAX_LENGTH,
            }
        },
        submitHandler: function(form){
            $.ajax({
                type: 'post',
                url: addRootUrl,
                data: {"root_name": $('#rootName').val(), "title_name": $("#rootTitle").val()},
                dataType: "json",
                success: function(response){
                    if(response.status === "success"){
                        closeAddRoot();
                        loadMyIndex();
                        window.alert(response.message);
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
    $('#createRootForm')[0].reset();
    $('#indexAddRoot').hide();
}

function showShare(){
    var node = currentNode;
    console.log("show share");
    $('.index-page').hide();
    $('#shareRootForm')[0].reset();
    $('#indexShare').show();
    $("#shareNodeName").text(node.name);
    var shareUrl = "/shareroot/" + node.id + '/' + String(userID);
    d3.select("#btnCloseShare").attr("href", "javascript: closeShare();");
    //d3.select("#shareRootForm").attr("action", shareUrl);
    $("#divInputEmail .tag-editor").remove();
    $("#inputEmail").empty();
    $("#inputEmail").tagEditor({
        initialTags:node.tags,
        maxTags: 10,
        removeDuplicates: true,
        sortable: false,
        placeholder: "Add email",
        autocomplete: null, // { 'source': '/url/', minLength: 3 }
        onChange: validateTagEmail,
    });
    $("#shareRootForm").validate({
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
            error.insertAfter($("#shareRootForm ul")); // <- the default
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
                        window.alert(response.message);
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
    $('#shareRootForm')[0].reset();
    $('#indexShare').hide();
    if (selected_node.parent){
        $('.index-page').hide();
        $("#indexNodeDetail").show();
        showIndexNodeDetail(selected_node);
    }
}
