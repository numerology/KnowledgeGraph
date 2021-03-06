// contain the dropzone.option.uploader for reference dropzone

var uploaded = [];
var key_dict = [];

function sleep(milliseconds) {
    var start = new Date().getTime();
    for (var i = 0; i < 1e7; i++) {
        if ((new Date().getTime() - start) > milliseconds){
            break;
        }
    }
}

Dropzone.options.uploader = {
    url: uploadUrl,
    autoProcessQueue: false,
    uploadMultiple: true,
    parallelUploads: true,
    addRemoveLinks: true,
    dictRemoveFile: 'Remove file',
    acceptedFiles: 'image/*, application/pdf',
    maxFiles: 1,

    accept: function(file, done){
        var ext = file.name.substr((file.name.lastIndexOf('.') + 1));
        if (ext == "pdf"){
            $("#typeInput").attr("value","PDF");
        }
        else{
            $("#typeInput").attr("value","IMG");
        }
        done();
    },

    init: function() {
        flag = true;
        myDropzone = this;
        $("#uploadBtn").click(function() {
            flag = false;
            console.log('refreshing');
            sleep(200);

            console.log(uploadUrl);
            myDropzone.processQueue();
            flag = true; //the flag is used to prevent the backend actually deleting my img
        });
        this.on("complete", function(file) {
            var upurl = '0';
            var ref_owner_id = d3.select("#nodeIDInput").attr("value");
    //        var ref_id = d3.select("#refIDInput").attr("value");
            //console.log('Triggering');
            $.ajax({
                type: 'get',
                url: '/generate_upload_url/' + currentNode.id,
                async: false,
                success: function(data) {
                    console.log(data['upload_url']);
                    //$('#uploader').attr("action",data);
                    var jsdata = JSON.parse(data);
                    upurl = jsdata['upload_url'];
                    console.log("set");
                 //   this.options.url = upurl;
                },
            });
            $.ajax({
                type: 'post',
                url: "/update_ref",
                data: {"node_ID": ref_owner_id},
                dataType: "json",
                success: function(response){
                    if(response.status === "success"){
                        console.log(response.message);

                        original_nodes = d3.selectAll("#graphcanvas svg g.node")
                            .filter(function(d){
                                console.log(d.id + " "+ref_owner_id);
                                return d.id == ref_owner_id;
                            });
                        //console.log(original_nodes)[0];
                        if (original_nodes.length >0){
                            original_nodes.each(function(d){
                                d.reference = response.new_data.reference;
                                d.thumbnails = response.new_data.thumbnails;
                                if (currentNode.id == ref_owner_id){
                                    console.log("reload div on update");
                                    loadDivRef(d);
                                }
                            });
                        }
                        original_nodes = d3.selectAll("#graphcanvas svg g.node")
                            .filter(function(d){
                                console.log(d.id + " "+ref_owner_id);
                                return d.id == ref_owner_id;
                            }).each(function(d){console.log(d.reference);});


                    }else if(response.status === "error"){
                        window.alert(response.message);
                    }

                },
                failure: function(){
                    window.alert("ajax error in index sharing");
                },
            });
            this.options.url = upurl;
            myDropzone.removeFile(file);
        });
        this.on("sending", function(file, xhr, formData){
            console.log("sending");
            console.log($("#descriptionInput").val());
            formData.append("description", $("#descriptionInput").val());
        });
        this.on("addedFile", function(file) {
            var ext = file.name.substr((file.name.lastIndexOf('.') + 1));
            console.log("accepted");
            if (ext == "pdf"){
                $("#typeInput").attr("value","PDF");
            }
            else{
                $("#typeInput").attr("value","IMG");
                console.log(ext);
            }
        });
        /*
        this.on("removedfile", function(file) {
            console.log('removing');
            var index = 0;
            for (i=0; i<uploaded.length;i++){
                if(uploaded[i] == file){
                        index = i;
                        break;
                }

            }
            console.log(index);
            console.log(flag);
            if(flag==true){
                $.ajax({
                    type: 'get',
                    url: '/api/delete_fig_partial/{{stream.key.id()}}/'+key_dict[index],
                    async: false,
                    success: function(data) {

                    },
                });
                }
            });
        */
        _this = this;
    }
};