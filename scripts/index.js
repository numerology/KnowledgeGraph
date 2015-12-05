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
$(".scrollbar-light").scrollbar();
$(document).ready(function() {
    var cache = {};

    d3.json("/get_index_data/" + userID, function(response) {
        console.log(response);
        if(response.status != "success"){
            console.log(response.message);
            return;
        }
        myGraphData = response.myNode.push(response.clipboard);
        console.log(response.clipboard.is_clipboard);
        $("#myGraphIndex").tree({
            data: response.myNode,
            dragAndDrop: true,
            onCanMove: function(node){
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
            }
        });
    });
});