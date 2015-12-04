var TAG_MAX_SHOW_LENGTH = 20;
var TITLE_MAX_SHOW_LENGTH = 50;
var TITLE_MAX_LENGTH = 100;
var NODE_NAME_LENGTH = 25;
$(document).ready(function(){
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
        }
    });
});