// validate tag email and change css
function validateTagEmail(original_field, current_editor, new_emails){ // validate emails
    email_invalid_list = [];
    email_list = [];
    $('li', current_editor).each(function(){
        var current_li = $(this);
        temp_email = $.trim(current_li.find('.tag-editor-tag').html());
        //console.log(isValidEmailAddress(temp_email));
        if ( !isValidEmailAddress(temp_email)){
            current_li.addClass('red-tag');
            email_invalid_list.push(temp_email);
        }else{
            current_li.removeClass('red-tag');
            email_list.push(temp_email);
        }
    });
    email_string = ""
    if (email_list.length>0){
        email_string = email_list+";";
    }
    console.log("email string is: "+email_string);
    console.log(original_field[0]);
    $(original_field).val(email_string);
    //console.log($("#inputEmail").val());
}