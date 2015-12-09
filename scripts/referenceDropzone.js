// contain the dropzone.option.uploader for reference dropzone

Dropzone.options.uploader = {
    url: uploadUrl,
    autoProcessQueue: false,
    uploadMultiple: true,
    parallelUploads: true,
    addRemoveLinks: true,
    dictRemoveFile: 'Remove file',
    acceptedFiles: 'image/*, application/pdf',
    maxFiles: 10,

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

        _this = this;
    }
};