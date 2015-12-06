var _this = null;

var helperTspan = d3.select(".helper").append("div").attr("class", "divActions")
                  .append("svg").attr({"height": 100, "width": 100})
                  .append("g").attr("class","node").append("text").append("tspan");



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

d3.json("/get_action_list/" + userID, function(result) {
    list = result;
    //console.log("getting shared list");
    divActionSelector =d3.select("#divActions");
    list.forEach(function(d){
        //console.log(d);
        itemData = {"node_text":d.node_name, "time":d.time, "name":d.user_name, "plusid":d.plusID, "fig":d.user_figure, "node_data":{"id": d.node_id}};
        addActionItem(divActionSelector, itemData, d.node_id); //TODO: using node_id is danger
    });
})

function addActionItem(divSelector, data, id){
    // add single node to selected div

    tempTextRow = d3.select("#divText").append("div").attr("class","row")
        .attr("align", "center")
        .attr("id", id + "text")
        .attr("style", "height:113px");
    paragraph = tempTextRow.append("p");
    paragraph.append("a").attr("href","/social_individual/"+data.plusid).text(data.name);
    paragraph.append("p").text(" has updated one node at" + data.time);
    tempTextRow.append("img").attr("src", data.fig);


    tempNode = divSelector.append("svg").attr({"width":"110px", "height": "110px"}).append("g")
             .attr("class", "node")
             .style("cursor", "pointer");
//    divSelector.append("br");
    tempNode.data([data.node_data], 0);
    //console.log(tempNode.data());
    //console.log(data.node_data);
    //console.log(tempNode.__data__);
    tempNode.append("circle").attr({"cx": 50, "cy": 50, "r": 50})
             .style({"fill":"#fff", "stroke": "steelblue", "stroke-width":"1.5px"});
    console.log(data.node_data);
    tempNode.append("text").attr({"x":50, "y":50, "dy":"0.35em", "text-anchor":"middle"})
             .text(data.node_text)
             .style({"font":"20px sans-serif"})
             .call(wrap, 80);
    //console.log("data of node"+d3.select("#contentMyGraph g .node").data);
}


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


$("#divClipboard").css({"position": "fixed",
                        "bottom": '200px',
                        "right": '150px'});
$("#btnCloseClipboard").on('click', function(){
    $("#btnClipboard").show();
    $("#divClipboard").toggle();
});

$("#divActions").sortable({
        connectWith: "#divClipboardNode",
        update: function(event, ui){
            var temp_node_list = [];
            //console.log(event);
            //console.log(ui);
            d3.selectAll("#divActions .node")
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

$("#divClipboardNode").sortable({
    appendTo: $("#divClipboardNode"),
    //items: 'svg',
   // connectWith: "#divActions",
    receive: function (event, ui){
		$("#"+ui.item[0].childNodes[0].__data__.id+"text").remove();

	},
    update: function(event, ui){
        var new_child_list = [];
        var new_children = [];
        console.log("updating cb");
        d3.selectAll("#divClipboardNode .node")
          .each(function(e){
            console.log(e);
            new_child_list.push(e.id.toString());
            new_children.push(e.child);
            //
          });

        $.ajax({
            type: 'post',
            url: '/api/update_clipboard_social',
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


function placeDivTooltip(position){ // move divNodeTooltip pointer to new location
    var y = position.top - 25;
    var x = position.left + 15;
    //console.log("x = " + x + " y = " +y);
    $("#divNodeTooltip").css({"top": y , "left": x });
    //console.log("changed");
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
    $("#divNodeTooltip").css("display", "none");
    //console.log("Close triggered");
}