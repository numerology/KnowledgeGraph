var TAG_MAX_SHOW_LENGTH = 20;
var TITLE_MAX_SHOW_LENGTH = 50;
var TITLE_MAX_LENGTH = 100;

var margin = {top: 20, right: 120, bottom: 20, left: 120},
    width = 900 - margin.right - margin.left,
    height = 800 - margin.top - margin.bottom;

var indentStep = 25;
var currentIndent = 0;

var data = [
    {
        label: 'node1',
        id: 45005,
        children: [
            { label: 'child1' },
            { label: 'child2' }
        ]
    },
    {
        label: 'node2',
        id: 15551,
        children: [
            { label: 'child3' }
        ]
    }
];

$(document).ready(function() {
    var cache = {};

    d3.json("/get_index_data/" + userID, function(response) {
        console.log(response);
        if(response.status != "success"){
            console.log(response.message);
            return;
        }
        $("#treeView").tree({
            data: response.myNode,
        });
        flare = response.myNode[0];
  //  if (error) throw error;
        root = flare;
    //  root = JSON.parse(myjson);
        root.x0 = height / 2;
        root.y0 = 0
        root.depth = 0;

        TOBselector = d3.select("#TOB")

        var thisLayer = TOBselector.append("div").attr("class","row").attr("style","border-style:outset");
        thisLayer.append("h2").text(root.name)
            .on('click', function(){
                $('#content').load('/api/index_refresh/'+root.id);
            });

        if(root.children){
            root.children.forEach(function(d){
                d.depth = root.depth + 1;
            });
            root.children.forEach(collapse);
            /* explicit for - loop not working, cause childrenID will be reassigned afterwards
            for (i = 0; i < root.children.length; i++){
                console.log("#"+root.children[i].id);
                var childrenID = "#"+root.children[i].id;
                thisLayer.append("button").attr("type", "button").
                    attr("class", "btn btn-primary").
                    text(root.children[i].name).
                    on("click",function(){

                        $(childrenID).collapse('toggle');
                    });
            }
            */

            root.children.forEach(function(d){
                thisLayer.append("button").attr("type", "button").
                    attr("class", "btn btn-primary").
                    text(d.name).
                    on("click",function(){
                        $('#content').load('/api/index_refresh/'+d.id);
                        $("#"+d.id).collapse('toggle');
                    });

            });
        }

        function collapse(d) {
            var thisLayer;
            currentIndent = currentIndent + indentStep;
            thisLayer = TOBselector.append("div").attr("class","collapse").attr("id",d.id);
            var thisDiv = thisLayer.append("div").attr("style", "border-style:outset; position:relative; left:"+indentStep*d.depth + "px");
            thisDiv.append("h2").text(d.name);


            $('#'+d.id).on('hide.bs.collapse', function(){

                if(d._children){
                    console.log('hiding');
                    d._children.forEach(function(e){
                        $('#'+e.id).collapse('hide');
                    });
                }
            });
            if (d.children) {
                d._children = d.children;
                var i;
                /*
                for (i = 0; i < d._children.length; i++){
                    thisLayer.append("button").attr("type", "button").
                        attr("class", "btn btn-primary").
                        text(d._children[i].name).
                        on("click",function(){
                            $("#"+d._children[i].id).collapse('toggle');
                        });
                }
                */
                d._children.forEach(function(e){
                    e.depth = d.depth + 1;
                });
                d._children.forEach(collapse);
                d._children.forEach(function(d){
                    thisDiv.append("button").attr("type", "button").
                        attr("class", "btn btn-primary").
                        text(d.name).
                        on("click",function(){
                            $('#content').load('/api/index_refresh/'+d.id);
                            $("#"+d.id).collapse('toggle');
                        });

                });

                d.children = null;
            }
            currentIndent = currentIndent - indentStep;
        }



   //     update(root);
   //     loadGraphTab();
    });


});