// TODO: edit for Knowledge graph
$(document).ready(function(){
    var cache = {};

    $("#search_keywords").autocomplete({
        minLength: 1,
        //source: [ "c++", "java", "php", "coldfusion", "javascript", "asp", "ruby" ],
	    source: function(request, response){
            var cache = {};
            var KeywordSet = [];
            var term = $.ui.autocomplete.escapeRegex(request.term);
            console.log(term);
            if(term in cache){
                response(cache[term]);
                return;
            }
            $.getJSON("/api/autocomplete", {"keywords": term}, function(data, status, xhr){
                cache[term] = data;
                response(data);
            })
        }
    });
    $('#build_completion_index').on("submit", function(e){
        e.preventDefault();
        $.ajax({
            url: '/api/build_completion_index',
            type: 'GET',
            data: [],
            success: function(data){
                alert("Build autocomplete index succeed!")
            }
        });
    });
});
