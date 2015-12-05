//functions for div reference in node detail

function loadDivRef(d){
    $("#divReference").empty();
    closeDivAddRef();
    d3.select("#btnAddReference").attr("href", "javascript: showAddRef()");
    d3.select("#btnCancelUpload").on("click", closeDivAddRef);
    d3.select("#nodeNameInput").attr("value", d.name);
    divRef = d3.select("#divReference");
    d.thumbnails.forEach(function(thumb){
        divRef.append("a").attr("class", "thumbnail")
            .attr("style", "height:100px")
            .on("mouseover",function(){
                $("#RefTipContent").empty();
                pos = $(this).offset();
                console.log(pos);
                $("#divReftip").css({"top": pos.top + 20 , "left": pos.left +20 });
                d3.select("#RefTipContent").append("h4").text(thumb.msg);
                $("#divReftip").css("display","inline");
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

function closeDivAddRef(){
    
    d3.select("#btnAddReference").style("display", "inline");
    d3.select("#divUploadReference").style("display","none");
}

function showAddRef(){
    d3.select("#divUploadReference").style("display", "inline");
    d3.select("#btnAddReference").style("display","none");
}