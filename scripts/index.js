var TAG_MAX_SHOW_LENGTH = 20;
var TITLE_MAX_SHOW_LENGTH = 50;
var TITLE_MAX_LENGTH = 100;

var margin = {top: 20, right: 120, bottom: 20, left: 120},
    width = 900 - margin.right - margin.left,
    height = 800 - margin.top - margin.bottom;

var indentStep = 25;
var currentIndent = 0;

var original_parent_node = {}; //record the original parent node

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
$(".scrollbar-light").scrollbar();
$(".tooltip-btn").tooltip();
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
        $("#myGraphIndexContent").tree({
            data: response.myNode,
            dragAndDrop: true,
            onCanMove: function(node){ // define what node can be moved
                if (node.is_clipboard){ // clipboard can not be moved
                    return false;
                }
                else{
                    return true;
                }
            },
            onCanMoveTo: function(moved_node, target_node, position) {
                if (target_node.is_clipboard) {
                    // Example: can move inside menu, not before or after
                    return (position == 'before');
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
        $('.scrollbar-light').scrollbar();
    });

});