// Return the html for a list of tags in the same style as tagEditor
function getTagHtml(tags){ // return the html for tag display
    ulPrefix = '<ul class="tag-editor ui-sortable"><li style="width:1px" class="ui-sortable-handle">&nbsp;</li>';
    ulAppendix = '</ul>';
    liPrefix = '<li class="ui-sortable-handle"><div class="tag-editor-spacer">&nbsp;,</div><div class="tag-editor-tag" style="border-radius:2px;">';
    liAppendix = '</div></li>';
    tagHtml = ulPrefix;
    tags.forEach(function(tag){
        tag.replace("'","\x27");
        tag.replace('"','\x22');
        tagHtml = tagHtml + liPrefix + tag + liAppendix;
    });
    if (tags.length == 0){
        tagHtml = tagHtml + '<li class="placeholder"><div>'+'No tag defined'+'</div></li>'
    }
    tagHtml = tagHtml + ulAppendix;
    return tagHtml;
}