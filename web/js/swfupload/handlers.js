function FileProgress(file, targetID){
    this.id=file.id;
    this.element=null;
    var wrapper=document.getElementById(this.id), html = '';
    if(!wrapper){
        //html='<div class="progressWrapper" id="'+this.id+'">'
        wrapper=document.createElement("div");
        wrapper.className="progressWrapper";
        wrapper.id=this.id;
        wrapper.style.width="100%";
        html='<div class="progressContainer"><a href="#" class="progressCancel">&nbsp;</a><div class="progressName">'+file.name;
        html+='</div><div class="progressBarStatus">&nbsp;</div><div class="progressBarStatik"><span>0</span>%';
        html+='<div class="progressBarInProgress"></div></div></div>';
        wrapper.innerHTML=html;
        this.element=wrapper.firstChild;
        document.getElementById(targetID).appendChild(wrapper)
    }else{
        this.element = wrapper.firstChild;
        this.reset()
    }
    wrapper=null
}

FileProgress.prototype={
    reset:function(){
        var childs=this.element.childNodes;
        this.element.className="progressContainer";
        childs[2].innerHTML = "&nbsp;";
        childs[2].className = "progressBarStatus";
        childs[3].lastChild.style.width = "0%";
        childs=null;

        this.appear()
    },
    setProgress:function(percent){
        var bar=this.element.childNodes[3];
        bar.lastChild.style.width = percent+"%";
        sjs.setText(bar.firstChild,percent);
        bar=null;

        //this.appear()
    },
    setComplete:function(){
        this.element.className = "progressContainer progressComplete";
        this.element.childNodes[3].lastChild.style.width = "";

        this.disappear(.5)
    },
    setError:function(){
        var bar=this.element.childNodes[3];
        this.element.className = "progressContainer progressError";
        bar.lastChild.style.width = "";
        sjs.setText(bar.firstChild,'0');

        var that = this;
        setTimeout(function(){
            that.disappear(.5)
        }, 3000)
    },
    setCancelled:function(){
        var bar=this.element.childNodes[3];
        this.element.className = "progressContainer progressCancelled";
        bar.lastChild.style.width = "0%";
        sjs.setText(bar.firstChild, '0');
    },
    setStatus:function(txt){
        sjs.setText(this.element.childNodes[2],txt)
    },
    toggleCancel:function(show, swfUploadInstance){
        var first=this.element.firstChild;
        first.style.visibility = show ? "visible" : "hidden";
        if(swfUploadInstance){
            sjs(first).data('file_id', this.id).onEvent('click', function() {
                swfUploadInstance.cancelUpload(sjs(this).data('file_id'));
                sjs(this).hide();
                return false
            })
        }
    },
    appear:function(delay){
        sjs(this.element).animate('opacity', {
            start: 0,
            end: 1
        }, delay || .5, true)
    },
    disappear: function(delay){
        sjs(this.element).animate('opacity', {
            start: 1,
            end: 0,
            onEnd:function(dom){
                sjs(dom.parentNode).remove();
            }
        }, delay || .5, true);
    }
};

function fileQueued(file) {
    try {
        var progress = new FileProgress(file, this.customSettings.progressTarget);
        progress.setStatus(FileManage.i18n('File added to queue'));
        progress.toggleCancel(true, this);
    } catch (ex) {
        this.debug(ex);
    }

}

function fileQueueError(file, errorCode, message) {
    try {
        if (errorCode === SWFUpload.QUEUE_ERROR.QUEUE_LIMIT_EXCEEDED) {
            alert("You have attempted to queue too many files.\n" + (message === 0 ? "You have reached the upload limit." : "You may select " + (message > 1 ? "up to " + message + " files." : "one file.")));
            return;
        }

        var progress = new FileProgress(file, this.customSettings.progressTarget);
        progress.setError();
        progress.toggleCancel(false);

        switch (errorCode) {
        case SWFUpload.QUEUE_ERROR.FILE_EXCEEDS_SIZE_LIMIT:
            progress.setStatus(FileManage.i18n("File is too big"));
            this.debug("Error Code: File too big, File name: " + file.name + ", File size: " + file.size + ", Message: " + message);
            break;
        case SWFUpload.QUEUE_ERROR.ZERO_BYTE_FILE:
            progress.setStatus(FileManage.i18n("Cannot upload Zero Byte files"));
            this.debug("Error Code: Zero byte file, File name: " + file.name + ", File size: " + file.size + ", Message: " + message);
            break;
        case SWFUpload.QUEUE_ERROR.INVALID_FILETYPE:
            progress.setStatus(FileManage.i18n("Invalid File Type"));
            this.debug("Error Code: Invalid File Type, File name: " + file.name + ", File size: " + file.size + ", Message: " + message);
            break;
        default:
            if (file !== null) {
                progress.setStatus(FileManage.i18n("Unhandled Error"));
            }
            this.debug("Error Code: " + errorCode + ", File name: " + file.name + ", File size: " + file.size + ", Message: " + message);
            break;
        }
    } catch (ex) {
        this.debug(ex);
    }
}

function fileDialogComplete(numFilesSelected, numFilesQueued) {
    try {
        if (numFilesSelected > 0) {
            document.getElementById(this.customSettings.cancelButtonId).disabled = false;
        }

        /* I want auto start the upload and I can do that here */
        //this.startUpload();
    } catch (ex)  {
        this.debug(ex);
    }
}

function uploadStart(file) {
    try {
        var progress = new FileProgress(file, this.customSettings.progressTarget);
        progress.setStatus(FileManage.i18n("Uploading") + '...');
        progress.toggleCancel(true, this);
    }
    catch (ex) {}

    return true;
}

function uploadProgress(file, bytesLoaded, bytesTotal) {
    try {
        var percent = Math.ceil((bytesLoaded / bytesTotal) * 100);

        var progress = new FileProgress(file, this.customSettings.progressTarget);
        progress.setProgress(percent);
        progress.setStatus(FileManage.i18n("Uploading") + '...');
    } catch (ex) {
        this.debug(ex);
    }
}

function uploadSuccess(file, serverData) {
    try {
        var progress = new FileProgress(file, this.customSettings.progressTarget);

        if(serverData){
            progress.setError();
            progress.setStatus(serverData);
        }else{
            progress.setComplete();
            progress.setStatus(FileManage.i18n("Successfully uploaded"));
            queueComplete(++this.customSettings.queue_upload_count);
        }
        progress.toggleCancel(false);
        return true;
    } catch (ex) {
        this.debug(ex);
        return false;
    }
}

function uploadError(file, errorCode, message) {
    try {
        var progress = new FileProgress(file, this.customSettings.progressTarget);
        progress.setError();
        progress.toggleCancel(false);

        switch (errorCode) {
        case SWFUpload.UPLOAD_ERROR.HTTP_ERROR:
            progress.setStatus(FileManage.i18n("Upload Error") + ': ' + FileManage.i18n(message));
            this.debug("Error Code: HTTP Error, File name: " + file.name + ", Message: " + message);
            break;
        case SWFUpload.UPLOAD_ERROR.UPLOAD_FAILED:
            progress.setStatus(FileManage.i18n("Upload Failed"));
            this.debug("Error Code: Upload Failed, File name: " + file.name + ", File size: " + file.size + ", Message: " + message);
            break;
        case SWFUpload.UPLOAD_ERROR.IO_ERROR:
            progress.setStatus(FileManage.i18n("Server (IO) Error"));
            this.debug("Error Code: IO Error, File name: " + file.name + ", Message: " + message);
            break;
        case SWFUpload.UPLOAD_ERROR.SECURITY_ERROR:
            progress.setStatus(FileManage.i18n("Security Error"));
            this.debug("Error Code: Security Error, File name: " + file.name + ", Message: " + message);
            break;
        case SWFUpload.UPLOAD_ERROR.UPLOAD_LIMIT_EXCEEDED:
            progress.setStatus(FileManage.i18n("Upload limit exceeded"));
            this.debug("Error Code: Upload Limit Exceeded, File name: " + file.name + ", File size: " + file.size + ", Message: " + message);
            break;
        case SWFUpload.UPLOAD_ERROR.FILE_VALIDATION_FAILED:
            progress.setStatus(FileManage.i18n("Failed Validation. Upload skipped"));
            this.debug("Error Code: File Validation Failed, File name: " + file.name + ", File size: " + file.size + ", Message: " + message);
            break;
        case SWFUpload.UPLOAD_ERROR.FILE_CANCELLED:
            // If there aren't any files left (they were all cancelled) disable the cancel button
            progress.setStatus(FileManage.i18n("Cancelled"));
            progress.setCancelled();
            if (this.getStats().files_queued===0) {
                var btn = document.getElementById(this.customSettings.cancelButtonId);
                if (btn) {
                    btn.disabled = true;
                }
            }
            break;
        case SWFUpload.UPLOAD_ERROR.UPLOAD_STOPPED:
            progress.setStatus(FileManage.i18n("Stopped"));
            break;
        default:
            progress.setStatus(FileManage.i18n("Unhandled Error") + ': ' + errorCode);
            this.debug("Error Code: " + errorCode + ", File name: " + file.name + ", File size: " + file.size + ", Message: " + message);
            break;
        }
    } catch (ex) {
        this.debug(ex);
    }
}

function uploadComplete(file) {
    if (this.getStats().files_queued === 0) {
        document.getElementById(this.customSettings.cancelButtonId).disabled = true;
    }
}

// This event comes from the Queue Plugin
function queueComplete(numFilesUploaded) {
    var status = document.getElementById("divStatus");
    if (status) {
        status.innerHTML = numFilesUploaded + " file" + (numFilesUploaded === 1 ? "" : "s") + " uploaded.";
    }
}
