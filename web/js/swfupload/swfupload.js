/**
 * SWFUpload: http://www.swfupload.org, http://swfupload.googlecode.com
 *
 * mmSWFUpload 1.0: Flash upload dialog - http://profandesign.se/swfupload/,  http://www.vinterwebb.se/
 *
 * SWFUpload is (c) 2006-2007 Lars Huring, Olov Nilzén and Mammon Media and is released under the MIT License:
 * http://www.opensource.org/licenses/mit-license.php
 *
 * SWFUpload 2 is (c) 2007-2008 Jake Roberts and is released under the MIT License:
 * http://www.opensource.org/licenses/mit-license.php
 *
 * @modifyby Sergiy Stotskiy <serjo@freaksidea.com> 01/2011
 */

/* ******************* */
/* Constructor & Init  */
/* ******************* */
if (SWFUpload == undefined) {
	var SWFUpload = function (cfg) {
		// A container where developers can place their own settings associated with this instance.
		this.customSettings = cfg.custom_settings||{};
		this.customSettings.queue_upload_count = 0;
		this.cfg = cfg;
		this.eventQueue = new Array();
		this.movieName = "SWFUpload_" + arguments.callee.movieCount++;
		arguments.callee.instances[this.movieName] = this; // Setup global control tracking
		this.initSettings(this.cfg);
		this.loadFlash();
		this.displayDebugInfo()
	}
}

SWFUpload.instances = {};
SWFUpload.movieCount = 0;
SWFUpload.version = "2.2.0 Beta 5 2008-01-29";
SWFUpload.QUEUE_ERROR = {
	QUEUE_LIMIT_EXCEEDED:-100,
	FILE_EXCEEDS_SIZE_LIMIT:-110,
	ZERO_BYTE_FILE:-120,
	INVALID_FILETYPE:-130
};
SWFUpload.UPLOAD_ERROR = {
	HTTP_ERROR: -200,
	MISSING_UPLOAD_URL: -210,
	IO_ERROR: -220,
	SECURITY_ERROR: -230,
	UPLOAD_LIMIT_EXCEEDED: -240,
	UPLOAD_FAILED: -250,
	SPECIFIED_FILE_ID_NOT_FOUND: -260,
	FILE_VALIDATION_FAILED: -270,
	FILE_CANCELLED: -280,
	UPLOAD_STOPPED: -290
};
SWFUpload.FILE_STATUS = {
	QUEUED: -1,
	IN_PROGRESS: -2,
	ERROR: -3,
	COMPLETE: -4,
	CANCELLED: -5
};
SWFUpload.BUTTON_ACTION = {
	SELECT_FILE: -100,
	SELECT_FILES: -110,
	START_UPLOAD: -120
};
SWFUpload.CURSOR = {
	ARROW: -1,
	HAND: -2
};
SWFUpload.WINDOW_MODE = {
	WINDOW:"window",
	TRANSPARENT:"transparent",
	OPAQUE:"opaque"
};
SWFUpload.Console = {
	writeLine:function(msg){
		var console=null, documentForm=null;
	
		try {
			console = document.getElementById("SWFUpload_Console");
			if (!console) {
				documentForm = document.createElement("form");
				document.getElementsByTagName("body")[0].appendChild(documentForm);
	
				console = document.createElement("textarea");
				console.id = "SWFUpload_Console";
				console.style.fontFamily = "monospace";
				console.setAttribute("wrap", "off");
				console.wrap = "off";
				console.style.overflow = "auto";
				console.style.width = "700px";
				console.style.height = "350px";
				console.style.margin = "5px";
				documentForm.appendChild(console);
			}
			console.value+=msg+"\n";
			console.scrollTop = console.scrollHeight - console.clientHeight;
		} catch (ex) {
			alert("Exception: " + ex.name + " Message: " + ex.message);
		}
	}
};

SWFUpload.prototype={
    getName: function(){
        return 'SWFUpload';
    },
	setValue:function(settingName, defaultValue) {
        if (!this.cfg[settingName]) {
            this.cfg[settingName] = defaultValue;
        }
	},
	initSettings:function(){
		this.setValue("upload_url", "");
		this.setValue("file_post_name", "Filedata");
		this.setValue("post_params", {});
		this.setValue("use_query_string", false);
		this.setValue("requeue_on_error", false);
		this.setValue("http_success", []);
		
		this.setValue("file_types", "*.*");
		this.setValue("file_types_description", "All Files");
		this.setValue("file_size_limit", 0);	// Default zero means "unlimited"
		this.setValue("file_upload_limit", 0);
		this.setValue("file_queue_limit", 0);
	
		this.setValue("flash_url", "swfupload.swf");
		this.setValue("prevent_swf_caching", true);
		
		this.setValue("button_image_url", "");
		this.setValue("button_width", 20);
		this.setValue("button_height", 20);
		this.setValue("button_text", "Browse...");
		this.setValue("button_text_style", "color: #000000; font-size: 16pt;");
		this.setValue("button_text_top_padding", 0);
		this.setValue("button_text_left_padding", 0);
		this.setValue("button_action", SWFUpload.BUTTON_ACTION.SELECT_FILES);
		this.setValue("button_disabled", false);
		this.setValue("button_placeholder_id", "");
		this.setValue("button_cursor", SWFUpload.CURSOR.ARROW);
		this.setValue("button_window_mode", SWFUpload.WINDOW_MODE.WINDOW);
		
		this.setValue("debug", false);
		this.cfg.debug_enabled = this.cfg.debug;	// Here to maintain v2 API
		
		this.cfg.return_upload_start_handler = this.returnUploadStart;
		this.setValue("swfupload_loaded_handler", null);
		this.setValue("file_dialog_start_handler", null);
		this.setValue("file_queued_handler", null);
		this.setValue("file_queue_error_handler", null);
		this.setValue("file_dialog_complete_handler", null);
		
		this.setValue("upload_start_handler", null);
		this.setValue("upload_progress_handler", null);
		this.setValue("upload_error_handler", null);
		this.setValue("upload_success_handler", null);
		this.setValue("upload_complete_handler", null);
		this.setValue("debug_handler", this.debugMessage);
	
		if(this.cfg.prevent_swf_caching)
			this.cfg.flash_url=this.cfg.flash_url+(this.cfg.flash_url.indexOf("?")==-1 ? "?" : "&")+"preventswfcaching="+new Date().getTime()
	},
	__destruct:function(){
		var movieElement = this.getMovieElement();

		this.cancelUpload(null, false);
		if (movieElement && typeof(movieElement.CallFunction) === "unknown") try {
			for(var i in movieElement) if (typeof(movieElement[i]) === "function") movieElement[i] = null;
			movieElement.parentNode.removeChild(movieElement)
		} catch(ex){}
		SWFUpload.instances[this.movieName]=document[this.movieName]=window[this.movieName]=null;
		delete SWFUpload.instances[this.movieName];
		this.movieName=this.eventQueue=this.cfg=this.customSettings=null
	},
	loadFlash:function () {
		var targetElement=null, tempParent=null;
	
		if(document.getElementById(this.movieName))
			throw ("ID "+this.movieName+" is already in use. The Flash Object could not be added");
		targetElement = document.getElementById(this.cfg.button_placeholder_id);
		if (!targetElement) {
			throw ("Could not find the placeholder element: " + this.cfg.button_placeholder_id);
        }
		tempParent = document.createElement("div");
		tempParent.innerHTML = this.getFlashHTML();
		targetElement.parentNode.replaceChild(tempParent.firstChild, targetElement);

		// Fix IE Flash/Form bug
		if (window[this.movieName]) window[this.movieName] = this.getMovieElement();
	},
	getFlashHTML:function(){
		return (new Array('<object id="', this.movieName, '" name="',this.movieName,'" type="application/x-shockwave-flash" data="', 
					this.cfg.flash_url, '" width="', this.cfg.button_width, 
					'" height="', this.cfg.button_height, '" class="swfupload">',
					'<param name="wmode" value="', this.cfg.button_window_mode, '" />',
					'<param name="movie" value="', this.cfg.flash_url, '" />',
					'<param name="quality" value="high" />',
					'<param name="menu" value="false" />',
					'<param name="allowScriptAccess" value="always" />',
					'<param name="flashvars" value="' + this.getFlashVars() + '" />',
					'</object>')).join('')
	},
	getFlashVars:function(){
		var paramString = this.buildParamString(), httpSuccessString = this.cfg.http_success.join(","),enc=encodeURIComponent;
		
		return (new Array("movieName=", enc(this.movieName),
				"&amp;uploadURL=", enc(this.cfg.upload_url),
				"&amp;useQueryString=", enc(this.cfg.use_query_string),
				"&amp;requeueOnError=", enc(this.cfg.requeue_on_error),
				"&amp;httpSuccess=", enc(httpSuccessString),
				"&amp;params=", enc(paramString),
				"&amp;filePostName=", enc(this.cfg.file_post_name),
				"&amp;fileTypes=", enc(this.cfg.file_types),
				"&amp;fileTypesDescription=", enc(this.cfg.file_types_description),
				"&amp;fileSizeLimit=", enc(this.cfg.file_size_limit),
				"&amp;fileUploadLimit=", enc(this.cfg.file_upload_limit),
				"&amp;fileQueueLimit=", enc(this.cfg.file_queue_limit),
				"&amp;debugEnabled=", enc(this.cfg.debug_enabled),
				"&amp;buttonImageURL=", enc(this.cfg.button_image_url),
				"&amp;buttonWidth=", enc(this.cfg.button_width),
				"&amp;buttonHeight=", enc(this.cfg.button_height),
				"&amp;buttonText=", enc(this.cfg.button_text),
				"&amp;buttonTextTopPadding=", enc(this.cfg.button_text_top_padding),
				"&amp;buttonTextLeftPadding=", enc(this.cfg.button_text_left_padding),
				"&amp;buttonTextStyle=", enc(this.cfg.button_text_style),
				"&amp;buttonAction=", enc(this.cfg.button_action),
				"&amp;buttonDisabled=", enc(this.cfg.button_disabled),
				"&amp;buttonCursor=", enc(this.cfg.button_cursor)
			)).join('')
	},
	getMovieElement:function(){
		//if(!this.movieElement) this.movieElement=document[this.movieName]||window[this.movieName];
		var movie=document[this.movieName]||window[this.movieName];
		if(!movie) throw "Could not find Flash element";
		
		return movie
	},
	buildParamString:function(){
		var postParams = this.cfg.post_params, paramStringPairs=new Array();
	
		if (typeof postParams == "object")	for(var name in postParams) if(postParams.hasOwnProperty(name))
			paramStringPairs.push(encodeURIComponent(name.toString()) + "=" + encodeURIComponent(postParams[name].toString()));
	
		return paramStringPairs.join("&amp;")
	},
	callFlash:function(functionName, argumentArray){
		var movieElement=this.getMovieElement(), returnValue=null, returnString=null;
	
		argumentArray =argumentArray||(new Array());
		try{
			returnString=movieElement.CallFunction(
				'<invoke name="'+functionName+'" returntype="javascript">'+__flash__argumentsToXML(argumentArray,0)+'</invoke>'
			);
			returnValue=eval(returnString)
		}catch(ex){
			throw "Call to "+functionName+" failed"
		}
		if(returnValue && typeof returnValue.post === "object") returnValue=this.unescapeFilePostParams(returnValue);
	
		return returnValue
	},
	selectFile:function(){
		this.callFlash("SelectFile")
	},
	selectFiles:function () {
		this.callFlash("SelectFiles")
	},
	startUpload:function(fileID){
		this.callFlash("StartUpload", [fileID])
	},
	cancelUpload:function(fileID, triggerErrorEvent){
		if (triggerErrorEvent !== false) triggerErrorEvent = true;
		this.callFlash("CancelUpload", [fileID, triggerErrorEvent])
	},
	stopUpload:function(){
		this.callFlash("StopUpload")
	},
	getStats:function(){
		return this.callFlash("GetStats")
	},
	setStats:function(statsObject){
		this.callFlash("SetStats", [statsObject])
	},
	getFile:function(fileID){
		return this.callFlash((typeof(fileID)==="number") ? "GetFileByIndex" : "GetFile", [fileID])
	},
	addFileParam:function (fileID,name,value){
		return this.callFlash("AddFileParam", [fileID, name, value])
	},
	removeFileParam:function(fileID, name){
		this.callFlash("RemoveFileParam", [fileID, name])
	},
	setUploadURL:function(url){
		this.cfg.upload_url=url.toString();
		this.callFlash("SetUploadURL", [url])
	},
	setPostParams:function(params){
		this.cfg.post_params=params;
		this.callFlash("SetPostParams", [params])
	},
	queueEvent:function (handlerName, argumentArray) {
		// Warning: Don't call this.debug inside here or you'll create an infinite loop
		var self = this;
	
		argumentArray=argumentArray||(new Array());
		if(!(argumentArray instanceof Array)) argumentArray = [argumentArray];
		if (typeof this.cfg[handlerName]==="function"){
			this.eventQueue.push(function(){ this.cfg[handlerName].apply(this,argumentArray) });
			window.setTimeout(function(){ self.executeNextEvent()}, 0)
		}else {
			throw "Event handler "+(handlerName||'emptyNameFunction')+" is unknown or is not a function"
		}
	},
	executeNextEvent:function(){
		// Warning: Don't call this.debug inside here or you'll create an infinite loop
		var  f = this.eventQueue ? this.eventQueue.shift() : null;
		if (typeof(f) === "function") f.call(this)
	},
	unescapeFilePostParams:function(file){
		var reg=/[$]([0-9a-f]{4})/i, unescapedPost={}, uk=null,match=null;
	
		if(file){
			for(var k in file.post) if(file.post.hasOwnProperty(k)) {
				uk = k;
				while ((match = reg.exec(uk)) !== null)
					uk=uk.replace(match[0], String.fromCharCode(parseInt("0x" + match[1], 16)));
				unescapedPost[uk] = file.post[k]
			}
			file.post=unescapedPost;
		}
	
		return file
	},
	testExternalInterface:function(){
		try{
			return this.callFlash("TestExternalInterface")
		}catch(e){
			return false
		}
	},
	flashReady:function(){
		var movieElement=this.getMovieElement();
	
		if (!movieElement) {
			this.debug("Flash called back ready but the flash movie can't be found.");
			return;
		}
		this.cleanUp(movieElement);
		this.queueEvent("swfupload_loaded_handler")
	},
	cleanUp:function(movieElement){
		if(this.getMovieElement() && typeof(movieElement.CallFunction) === "unknown") { // We only want to do this in IE
			this.debug("Removing Flash functions hooks (this should only run in IE and should prevent memory leaks)");
			try{
				for(var key in movieElement) if (typeof(movieElement[key]) === "function")
					movieElement[key] = null;
			}catch(e){}
		}
		// Fix Flashes own cleanup code so if the SWFMovie was removed from the page
		// it doesn't display errors.
		window["__flash__removeCallback"]=function(instance, name) {
			try{
				if(instance) instance[name] = null;
			}catch(e){}
		};//*/
	},
	fileDialogStart:function(){
		this.queueEvent("file_dialog_start_handler")
	},
	fileQueued:function(file){
		file = this.unescapeFilePostParams(file);
		this.queueEvent("file_queued_handler", file)
	},
	fileQueueError:function(file,errorCode,message){
		file = this.unescapeFilePostParams(file);
		this.queueEvent("file_queue_error_handler", [file, errorCode, message])
	},
	fileDialogComplete:function (numFilesSelected, numFilesQueued) {
		/* Called after the file dialog has closed and the selected files have been queued.
			You could call startUpload here if you want the queued files to begin uploading immediately. */
		this.queueEvent("file_dialog_complete_handler", [numFilesSelected, numFilesQueued])
	},
	uploadStart:function(file){
		file = this.unescapeFilePostParams(file);
		this.queueEvent("return_upload_start_handler", file)
	},
	returnUploadStart:function(file){
		var returnValue=null;
		if (typeof this.cfg.upload_start_handler === "function") {
			file = this.unescapeFilePostParams(file);
			returnValue = this.cfg.upload_start_handler.call(this, file)
		} else
			throw "upload_start_handler must be a function";
	
		if(returnValue === undefined) returnValue = true;
		this.callFlash("ReturnUploadStart", [!!returnValue]);
	},
	uploadProgress:function(file, bytesComplete, bytesTotal){
		file = this.unescapeFilePostParams(file);
		this.queueEvent("upload_progress_handler", [file, bytesComplete, bytesTotal])
	},
	uploadError:function(file, errorCode, message){
		file = this.unescapeFilePostParams(file);
		this.queueEvent("upload_error_handler", [file, errorCode, message])
	},
	uploadSuccess:function(file, serverData){
		file = this.unescapeFilePostParams(file);
		this.queueEvent("upload_success_handler", [file, serverData])
	},
	uploadComplete:function(file){
		file = this.unescapeFilePostParams(file);
		this.queueEvent("upload_complete_handler", file)
	},
	debug:function(msg){
		this.queueEvent("debug_handler", msg);
	},
	displayDebugInfo:function () {
		this.debug(
		[	"---SWFUpload Instance Info---\n",
			"Version: ", SWFUpload.version, "\n",
			"Movie Name: ", this.movieName, "\n",
			"Settings:\n",
			"\t", "upload_url:               ", this.cfg.upload_url, "\n",
			"\t", "flash_url:                ", this.cfg.flash_url, "\n",
			"\t", "use_query_string:         ", this.cfg.use_query_string.toString(), "\n",
			"\t", "requeue_on_error:         ", this.cfg.requeue_on_error.toString(), "\n",
			"\t", "http_success:             ", this.cfg.http_success.join(", "), "\n",
			"\t", "file_post_name:           ", this.cfg.file_post_name, "\n",
			"\t", "post_params:              ", this.cfg.post_params.toString(), "\n",
			"\t", "file_types:               ", this.cfg.file_types, "\n",
			"\t", "file_types_description:   ", this.cfg.file_types_description, "\n",
			"\t", "file_size_limit:          ", this.cfg.file_size_limit, "\n",
			"\t", "file_upload_limit:        ", this.cfg.file_upload_limit, "\n",
			"\t", "file_queue_limit:         ", this.cfg.file_queue_limit, "\n",
			"\t", "debug:                    ", this.cfg.debug.toString(), "\n",

			"\t", "prevent_swf_caching:      ", this.cfg.prevent_swf_caching.toString(), "\n",

			"\t", "button_placeholder_id:    ", this.cfg.button_placeholder_id.toString(), "\n",
			"\t", "button_image_url:         ", this.cfg.button_image_url.toString(), "\n",
			"\t", "button_width:             ", this.cfg.button_width.toString(), "\n",
			"\t", "button_height:            ", this.cfg.button_height.toString(), "\n",
			"\t", "button_text:              ", this.cfg.button_text.toString(), "\n",
			"\t", "button_text_style:        ", this.cfg.button_text_style.toString(), "\n",
			"\t", "button_text_top_padding:  ", this.cfg.button_text_top_padding.toString(), "\n",
			"\t", "button_text_left_padding: ", this.cfg.button_text_left_padding.toString(), "\n",
			"\t", "button_action:            ", this.cfg.button_action.toString(), "\n",
			"\t", "button_disabled:          ", this.cfg.button_disabled.toString(), "\n",

			"\t", "custom_settings:          ", this.cfg.custom_settings.toString(), "\n",
			"Event Handlers:",
			"\n\t", "swfupload_loaded_handler assigned: ",(typeof this.cfg.swfupload_loaded_handler==="function").toString(),
			"\n\t", "file_dialog_start_handler assigned:",(typeof this.cfg.file_dialog_start_handler==="function").toString(),
			"\n\t", "file_queued_handler assigned:      ",(typeof this.cfg.file_queued_handler === "function").toString(),
			"\n\t", "file_queue_error_handler assigned:  ", (typeof this.cfg.file_queue_error_handler === "function").toString(),
			"\n\t", "upload_start_handler assigned:      ", (typeof this.cfg.upload_start_handler === "function").toString(),
			"\n\t", "upload_progress_handler assigned:   ", (typeof this.cfg.upload_progress_handler === "function").toString(), 
			"\n\t", "upload_error_handler assigned:      ", (typeof this.cfg.upload_error_handler === "function").toString(),
			"\n\t", "upload_success_handler assigned:    ", (typeof this.cfg.upload_success_handler === "function").toString(),
			"\n\t", "upload_complete_handler assigned:   ", (typeof this.cfg.upload_complete_handler === "function").toString(),
			"\n\t", "debug_handler assigned:             ", (typeof this.cfg.debug_handler === "function").toString()
		].join(""))
	},
	debugMessage:function(msg){
		if (this.cfg.debug) {
			var exceptionMessage=null, exceptionValues = new Array();
	
			// Check for an exception object and print it nicely
			if (typeof msg === "object" && typeof msg.name === "string" && typeof msg.message === "string") {
				for (var key in msg) if(msg.hasOwnProperty(key))
					exceptionValues.push(key+": "+msg[key]);
				exceptionMessage = exceptionValues.join("\n") || "";
				exceptionValues = exceptionMessage.split("\n");
				exceptionMessage = "EXCEPTION: " + exceptionValues.join("\nEXCEPTION: ");
				SWFUpload.Console.writeLine(exceptionMessage);
			} else {
				SWFUpload.Console.writeLine(msg);
			}
		}
	}	
};

/*
	Queue Plug-in
	
	Features:
		cancelQueue method for cancelling the entire queue.
		All queued files are uploaded when startUpload() is called.
		If false is returned from uploadComplete then the queue upload is stopped.  If false is not returned (strict comparison) then the queue upload is continued.
		
	*/

var SWFUpload;
if (typeof(SWFUpload) === "function") {
	SWFUpload.queue = {};
	
	SWFUpload.prototype.initSettings = function (old_initSettings) {
		return function (init_settings) {
			if (typeof(old_initSettings) === "function") {
				old_initSettings.call(this, init_settings);
			}
			
			this.customSettings.queue_cancelled_flag = false;
			
			this.setValue("user_upload_complete_handler", init_settings.upload_complete_handler);
			this.cfg.upload_complete_handler = SWFUpload.queue.uploadComplete;
		};
	}(SWFUpload.prototype.initSettings);

	SWFUpload.prototype.cancelQueue = function () {
		var stats = this.getStats();
		this.customSettings.queue_cancelled_flag = false;

		if (stats.in_progress > 0) {
			this.customSettings.queue_cancelled_flag = true;
		}
		
		while(stats.files_queued > 0) {
			this.cancelUpload();
			stats = this.getStats();
		}
	};
	
	SWFUpload.queue.uploadComplete = function (file) {
		var user_upload_complete_handler = this.cfg.user_upload_complete_handler;
		var continue_upload = true;
		if (typeof(user_upload_complete_handler) === "function") {
			continue_upload = user_upload_complete_handler.call(this, file) === false;
		}
		
		if (continue_upload) {
			var stats = this.getStats();
			if (stats.files_queued > 0 && this.customSettings.queue_cancelled_flag === false) {
				this.startUpload();
			} else {
				this.customSettings.queue_cancelled_flag = false;
			}
		}
	};
}
