/*
 * This file is part of the SJS package.
 * (c) 2010-2011 Stotskiy Sergiy <serjo@freaksidea.com>
 *
 * For the full copyright and license information, please view the licenses/LICENSE.JsHttpRequest
 * file that was distributed with this source code.
 */
/**
 * SJS AJAX data loader
 * 
 * @package   SJS
 * @license   LGPL
 * @author    Dmitry Koterov http://en.dklab.ru
 * @modifyby  Stotskiy Sergiy <serjo@freaksidea.com> 2010-2011
 * @version   5.x $Id$
 */
sjs.query=function(url,data,onload,nocache,args,cfg){
	var req=new $_Request();
	req.caching=!nocache;
    req.watchCaching = true;
	req.onload=onload;
    
    cfg = cfg || {};
	if(sjs.isFn(cfg.onerror)){
        req.onerror=cfg.onerror;
    }
    if(args) {
        req.args = args;
    }
    if(cfg.loader) {
        this.loader = cfg.loader;
    }
	
	req.onreadystatechange=function(){
		if(this.readyState==4 && sjs.isFn(this.onload)){
         this.onload(this.responseJS,this.responseText);
         this.args = null;
        }
	};
   
	req.open(cfg.method||null,url,true);
	req.send(data);
	return req
};

var $_Request = new sjs.plugin({
    onreadystatechange:null,
	onload:null,
	readyState:0,
    responseText:null,
   // responseXML:null,
    responseJS:null,
    status:200,
    statusText:'OK',

    caching:false,
    watchCaching: false,
    loader:null,
    session_name:'PHPSESSID',

    // Internals.
    load:null,
    headers:[],
    attr:null,
    _errors:{
        inv_form_el:        'Invalid FORM element detected: name=%, tag=%',
        must_be_single_el:  'If used, <form> must be a single HTML element in the list.',
        js_invalid:         "JavaScript code generated by backend is invalid!\n%",
        url_too_long:       'Cannot use so long query with GET request (URL is larger than % bytes)',
        unk_loader:         'Unknown loader: %',
        no_loaders:         'No loaders registered at all, please check Request.LOADERS array',
        no_loader_matched:  "Cannot find a loader which may process the request. Notices are:\n%",
		script_only_get:    'Cannot use SCRIPT loader: it supports only GET method',
		script_no_form:     'Cannot use SCRIPT loader: direct form elements using and uploading are not implemented',
		xml_no:        		'Cannot use XMLHttpRequest or ActiveX loader: not supported',
		xml_no_diffdom:		'Cannot use XMLHttpRequest to load data from different domain %',
		xml_no_headers:		'Cannot use XMLHttpRequest loader or ActiveX loader, POST method: headers setting is not supported, needed to work with encodings correctly',
		xml_no_form_upl:	'Cannot use XMLHttpRequest loader: direct form elements using and uploading are not implemented',
		form_el_not_belong: 'Element "%" does not belong to any form!',
		form_el_belong_diff:'Element "%" belongs to a different form. All elements must belong to the same form!',
		form_el_inv_enctype:'Attribute "enctype" of the form must be "%" (for IE), "%" given.'
    },
    getSession: function(){
        var u = document.location.search.match(new RegExp('[&?]' + this.session_name + '=([^&?]*)')),
			c = document.cookie.match(new RegExp('(?:;|^)\\s*' + this.session_name + '=([^;]*)'));
        
        return (u || c) ? RegExp.$1 : '';
    },
	onerror:function(txt,js){// if xmlHttpRequest and server don't response
		alert("Error request [status = "+this.status+"]:\n\n"+this.getAllResponseHeaders()+"\n\nurl: "+this.load.url);
	},
    abort:function(){
        if (this.load && this.load.abort) this.load.abort();
        this._cleanup();
        if(this.readyState==0) return;
        if(this.readyState==1 && !this.load){
            this.readyState = 0;
            return;
        }
        this._changeReadyState(4, true) // 4 in IE & FF on abort() call; Opera does not change to 4.
    },
    open:function(method,url,async,user,pass){
        if (url.match(/^((\w+)\.)?(GET|POST)\s+(.*)/i)) {
            this.loader = RegExp.$2? RegExp.$2 : null;
            method = RegExp.$3;
            url = RegExp.$4; 
        }
        // Append SID to original URL. Use try...catch for security problems.
        try{
            var sess = this.getSession();
			if(sess) url += (url.indexOf('?') >= 0? '&' : '?') + this.session_name + "=" + this.escape(sess);
        }catch(e){}
        // Store open arguments to hash.
        this.attr={
            method:   (method || '').toUpperCase(),
            url:      url,
            asyncFlag:async,
            username: user != null? user : '',
            password: pass != null? pass : ''
        };
        this.loader = null;
        this._changeReadyState(1, true); // compatibility with XMLHttpRequest
        return true
    },
    send:function(data){
        if(!this.readyState)return;
        this._changeReadyState(1, true); // compatibility with XMLHttpRequest
        this.load=null;
        
        // Prepare to build QUERY_STRING from query hash.
        var text=[],el=[],hash=null;
        if(!this.hash2query(data,null,text,el)) return;
        hash=this.attr.user+':'+this.attr.pass+'@'+this.attr.url+'|'+text+"#"+this.attr.method;
        
        // Solve the query hashcode & return on cache hit.
        if(this.caching && !el.length){
            var cache = $_Request.CACHE[hash];

            if(cache){
                this._dataReady(cache[0], cache[1]);
                return false;
            }
        } else if (this.watchCaching && $_Request.CACHE[hash]) {
           $_Request.CACHE[hash]=null;
           delete $_Request.CACHE[hash];
        }
        var loader = (this.loader || '').toLowerCase(),errors=[];
        if (loader && !$_Request.LOADERS[loader]) return this._error('unk_loader', loader);
        var lds = $_Request.LOADERS,cur=null;
        for (cur in lds) {
            var ldr = lds[cur];
            if (!ldr) continue; // exclude possibly derived prototype properties from "for .. in".
            if (loader && cur!=loader) continue;
            // Create sending context.
            var ld = new ldr(this,{
                queryText:  text.join('&'),
                queryElem:  el,
                id:         (new Date().getTime())+''+$_Request.COUNT++,
                hash:       hash,
                span:       null
            });
			var err=ld.load(this);
            if (!err){
                // Save loading script.
                this.load = ld;
                $_Request.PENDING[ld.id]=this;
                return true;
            }
            if (!loader) errors.push('- '+cur.toUpperCase()+': '+this._l(err));
            else  return this._error(err);
        }
        return cur? this._error('no_loader_matched', errors.join('\n')) : this._error('no_loaders')
    },
    getAllResponseHeaders:function(){
        return (this.load && this.load.getAllResponseHeaders)? this.load.getAllResponseHeaders() : []
    },    
	getResponseHeader:function(label){
        return (this.load && this.load.getResponseHeader)? this.load.getResponseHeader(label) : null
    },
	setRequestHeader:function(label,value){
        this.headers.push([label,value])
    },
	_dataReady:function(text, js){
		var t=this;
        if (t.caching && t.load) {
           $_Request.CACHE[t.load.hash] = [text, js];
        }
        t.responseText=text;
        t.responseJS = js;
        if (js !== null) {
            t.status = 200;
            t.statusText = "OK";
        } else {
            t.status = 500;
            t.statusText = "Internal Server Error";
        }
        t._changeReadyState(2);
        t._changeReadyState(3);
        t._changeReadyState(4);
        t._cleanup();t=null
    },
	_l:function(args) {
        var i = 0, p = 0, msg = this._errors[args[0]];
        // Cannot use replace() with a callback, because it is incompatible with IE5.
        while ((p = msg.indexOf('%', p)) >= 0) {
            var a = args[++i] + "";
            msg = msg.substring(0, p) + a + msg.substring(p + 1, msg.length);
            p += 1 + a.length;
        }
        return msg
    },
	_error:function(msg) {
        msg = this._l(typeof(msg)=='string'? arguments : msg);
		sjs.newError("Request: "+msg);
    },
	hash2query:function(content, prefix, queryText, queryElem) {
        if (prefix==null) prefix='';
        if((''+typeof(content)).toLowerCase()=='object'){
            var formAdded = false, v;
            if (sjs.nodeName(content,'form')) content={ form: content };
            for (var k in content) {
                v = content[k];
                if (sjs.isFn(v)) continue;
                var curPrefix = prefix ? prefix + '[' + this.escape(k) + ']' : this.escape(k),
					isFormElement = v && v.parentNode && v.parentNode.appendChild && v.tagName;

                if (isFormElement){
                    var tn = v.tagName.toUpperCase();
                    if (tn == 'FORM') formAdded = true;
					else if(tn == 'INPUT' || tn == 'TEXTAREA' || tn == 'SELECT');
                    else return this._error('inv_form_el', (v.name||''), v.tagName);
                    queryElem[queryElem.length] = { name: curPrefix, e: v };
                } else if (v instanceof Object) {
                    this.hash2query(v, curPrefix, queryText, queryElem)
                } else {
                    if (v === null) continue;
                    else if (v === true) v = 1; 
                    else if (v === false || v===undefined) v = '';
                    queryText[queryText.length] = curPrefix + "=" + this.escape(''+v)
                }
                if(formAdded && queryElem.length > 1) return this._error('must_be_single_el');
				formAdded = false
            }
        }else{
            queryText[queryText.length] = content
        }
        return true
    },
	_cleanup:function() {
        var ld = this.load;
        if (!ld) return;
        // Mark this loading as aborted.
        $_Request.PENDING[ld.id] = false;
        var span = ld.span;
        if (!span) return;
        // Do NOT use iframe.contentWindow.back() - it is incompatible with Opera 9!
        ld.span = null;
		span.parentNode.removeChild(span)
    },
	_changeReadyState:function(s,reset){
        if (reset){
            this.status=this.statusText=this.responseJS=null;
            this.responseText=''
        }
        this.readyState=s;
        if(this.onreadystatechange) this.onreadystatechange()
    },
	escape:function(s){
        return escape(s).replace(new RegExp('\\+','g'), '%2B');
    },
	isSucess:function(){
		return (this.status>=200 && this.status<300)//(this.status==0)||
	}	
});
// Global library variables.
$_Request.COUNT = 0;              // unique ID; used while loading IDs generation
$_Request.MAX_URL_LEN = 2000;     // maximum URL length
$_Request.CACHE = {};             // cached data
$_Request.PENDING = {};           // pending loadings
//$_Request.LOADERS = {};           list of supported data loaders (filled at the bottom of the file)

/**
 * Global static function.
 * Called by server backend script on data load.
 */
$_Request.dataReady = function(d) {
    var th = this.PENDING[d.id];
    delete this.PENDING[d.id];
	//alert(th.status)
    if(th) th._dataReady(d.text,d.js);
    else if (th !== false) sjs.newError("dataReady(): unknown pending id: "+d.id);
};

$_Request.get=function(){
	if(!window.XMLHttpRequest){
		$_Request.get=function(){var tr=null; try{tr=new ActiveXObject("Microsoft.XMLHTTP")}catch(e){try{
			tr=new ActiveXObject("Msxml2.XMLHTTP")}catch(e){}}return tr}
	}else{
		$_Request.get=function(){return new window.XMLHttpRequest()}
	}
	return $_Request.get();
};

$_Request.attr=function(obj,atr,v){
	this.attr = (sjs.browser.msie) ? sjs.setAttrNode : sjs.setAttr;
	return this.attr(obj,atr,v)
};

// Loader: XMLHttpRequest or ActiveX.
// [+] GET and POST methods are supported.
// [+] Most native and memory-cheap method.
// [+] Backend data can be browser-cached.
// [-] Cannot work in IE without ActiveX. 
// [-] No support for loading from different domains.
// [-] No uploading support.
$_Request.LOADERS={
	xml:new sjs.plugin({
		__construct:function(req,_2){
			/*sjs.extend(req._errors,{
				xml_no:        'Cannot use XMLHttpRequest or ActiveX loader: not supported',
				xml_no_diffdom:'Cannot use XMLHttpRequest to load data from different domain %',
				xml_no_headers:'Cannot use XMLHttpRequest loader or ActiveX loader, POST method: headers setting is not supported, needed to work with encodings correctly',
				xml_no_form_upl:'Cannot use XMLHttpRequest loader: direct form elements using and uploading are not implemented'
			});//*/
			sjs.extend(this,_2,req.attr)
		},
   		load:function(req){
        	if(this.queryElem.length) return ['xml_no_form_upl'];
			if(/^([a-z]+:\/\/[^\\\/]+)(.*)/i.test(this.url))
				if (RegExp.$1.toLowerCase()!= document.location.protocol+'//'+ document.location.hostname.toLowerCase())
					return ['xml_no_diffdom', RegExp.$1];
			var tr=$_Request.get(), canSetHeaders;
			if(!tr) return ['xml_no'];
			canSetHeaders = !!(window.ActiveXObject||tr.setRequestHeader);
			if (!this.method) this.method = canSetHeaders && this.queryText.length ? 'POST' : 'GET';
			
			// Build & validate the full URL.
			if(this.method=='GET'){
				if(this.queryText) this.url+=(this.url.indexOf('?') >=0? '&' : '?') + this.queryText;
				this.queryText='';
				if(this.url.length>$_Request.MAX_URL_LEN) return ['url_too_long', $_Request.MAX_URL_LEN];
			}else if(this.method=='POST' && !canSetHeaders)return ['xml_no_headers'];
			this.url+=(this.url.indexOf('?')>=0? '&' : '?')+'_JsRequest='+(req.caching? '0' : this.id) + '-xml';  
			var id = this.id;
			tr.onreadystatechange=function(){
				if(tr.readyState!=4) return;
				
				// Avoid memory leak by removing the closure.
				tr.onreadystatechange=sjs.$empty;
				req.status = null;
				try{ 
					req.status = tr.status;
					req.responseText=tr.responseText;
				}catch(e){}
				//if(!req.status) return;
				if(!req.isSucess()) return req.onerror();
				try {
					// Prepare generator function & catch syntax errors on this stage.
					if(sjs.trim(req.responseText).charAt(0)!='{'||req.withoutBackEnd){
						$_Request._tmp=function(id){
							var d=arguments.callee.data; arguments.callee.data=null; d.id=id; 
							$_Request.dataReady(d)
						};
						$_Request._tmp.data={js:tr.responseXML,text:req.responseText}
					}else{
						$_Request._tmp=new Function('id','var d='+req.responseText+'; d.id = id; $_Request.dataReady(d)')
					}
				} catch (e) {
					// Note that FF 2.0 does not throw any error from onreadystatechange handler.
					return req._error(['js_invalid'])
				}
				$_Request._tmp(id);
				$_Request._tmp = null
			};
			tr.open(this.method, this.url, true, this.username, this.password);
			if (canSetHeaders) {
				for (var i=0,count=req.headers.length;i<count;i++) tr.setRequestHeader(req.headers[i][0], req.headers[i][1]);
				tr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');//'application/octet-stream'
			}
			tr.send(this.queryText);
			this.span=null;
			this.tr = tr; // save for later usage on abort()
			// Success.
			return null
		},
		getAllResponseHeaders:function(){
			return this.tr.getAllResponseHeaders()
		},
		getResponseHeader:function(label){
			return this.tr.getResponseHeader(label)
		},
		abort:function() {
			this.tr.abort();
			this.tr=null
		}
	}),
	// Loader: SCRIPT tag.
	// [+] Most cross-browser. 
	// [+] Supports loading from different domains.
	// [-] Only GET method is supported.
	// [-] No uploading support.
	// [-] Backend data cannot be browser-cached.
	script:new sjs.plugin({
		__construct:function(req,_2){
			/*sjs.extend(req._errors, {
				script_only_get:   'Cannot use SCRIPT loader: it supports only GET method',
				script_no_form:    'Cannot use SCRIPT loader: direct form elements using and uploading are not implemented'
			});//*/
			sjs.extend(this,_2,req.attr)
		},
		load:function(){
			if(this.queryText) this.url += (this.url.indexOf('?') >= 0? '&' : '?') + this.queryText;
			this.url += (this.url.indexOf('?') >= 0? '&' : '?')+'_JsRequest='+this.id+'-'+'script';        
			this.queryText = '';
			
			if (!this.method) this.method = 'GET';
			if (this.method !== 'GET') return ['script_only_get'];
			if (this.queryElem.length) return ['script_no_form'];
			if (this.url.length > $_Request.MAX_URL_LEN) return ['url_too_long', $_Request.MAX_URL_LEN];
			
			this.span=sjs.newTag('script');
			this.span.setAttribute('type','text/javascript');
			document.body.appendChild(this.span);
			var fn=function(span,url){span.setAttribute('src',url);};
			fn.delay(0.01,this.span,this.url);
			// Success.
			return null
		}
	}),
// Loader: FORM & IFRAME.
// [+] Supports file uploading.
// [+] GET and POST methods are supported.
// [+] Supports loading from different domains.
// [-] Uses a lot of system resources.
// [-] Backend data cannot be browser-cached.
// [-] Pollutes browser history on some old browsers.
	form:new sjs.plugin({
		__construct:function(req,_2){
			/*sjs.extend(req._errors, {
				form_el_not_belong:  'Element "%" does not belong to any form!',
				form_el_belong_diff: 'Element "%" belongs to a different form. All elements must belong to the same form!',
				form_el_inv_enctype: 'Attribute "enctype" of the form must be "%" (for IE), "%" given.'
			});//*/
			sjs.extend(this,req.attr,_2)
		},
		load:function() {
			var th = this;
			th.url +=(th.url.indexOf('?') >= 0? '&' : '?')+'_JsRequest='+th.id+'-'+'form';
			// If GET, build full URL. Then copy QUERY_STRING to queryText.
			if(th.method=='GET'){
				if (th.queryText) th.url +='&'+th.queryText;
				if (th.url.length > $_Request.MAX_URL_LEN) return ['url_too_long', $_Request.MAX_URL_LEN];
				var p = th.url.split('?', 2);
				th.url = p[0];
				th.queryText = p[1] || '';
			}
			var form = null;
			if(th.queryElem.length) if(sjs.nodeName(th.queryElem[0].e,'form')){
				form=th.queryElem[0].e;
				th.queryElem=[];
			}else{
				var i=th.queryElem.length,e;
				form=th.queryElem[0].e.form;
				while(i--){
					e = th.queryElem[i].e;
					if (!e.form) return ['form_el_not_belong', e.name];
					if (e.form != form) return ['form_el_belong_diff', e.name]
				}
			}
			if(!th.method){
				var enctype=sjs.getAttrNode(form,'encType');
				th.method='POST';
				if(enctype!='multipart/form-data') return ['form_el_inv_enctype','multipart/form-data',enctype]
			}
			// Create invisible IFRAME with temporary form (form is used on empty queryElem).
			// We ALWAYS create th IFRAME in the document of the form - for Opera 7.20.
			//d = form&&(form.ownerDocument||form.document)||document,
			var ifname='sjs_load_'+th.id,txt;
			th.span=sjs.newTag('div');
			sjs.extend(th.span.style,{
				position:'absolute',
				display:'none'
			});
			txt='<iframe name="'+ifname+'" id="'+ifname+'" style="width:0; height:0;display:none"></iframe>';
			if(!form){
				th.span.innerHTML=txt+'<form'+(th.method=='POST' ? ' enctype="multipart/form-data" method="post"':'')+'></form>';
				form=th.span.firstChild
			}else th.span.innerHTML=txt;
			txt=null;
			document.body.appendChild(th.span);
			var ajax=function(){
				var d=arguments.callee.data, qt=d[1].split('&'), form=d[0], qe=d[2], name=new Array(), attr={}, inputs=new Array(),
					i=qe.length&&form.elements.length, pair=form.elements, e;
				// Insert data as hidden fields to the form.
				this.data=null;
				while(i--) if(!pair[i].disabled){
					pair[i].disabled=true;
					inputs[inputs.length]=pair[i]
				}
				i=qt[0]&&qt.length;
				while(i--){
					pair = qt[i].split('=',2); e=sjs.newTag('input');
					e.type='hidden';
					e.name=unescape(pair[0]);
					e.value=(pair[1] != null) ? unescape(pair[1]) : '';
					form.appendChild(e)
				}
				// Change names of along user-passed form elements.
				i=qe.length;
				while(i--){
					pair=qe[i];
					name.push(pair.e.name);
					pair.e.name=pair.name;
					pair.e.disabled=false
				}
				pair={action:d[3], method:d[4], target:d[5]};
				for(i in pair){
					attr[i]=sjs.getAttrNode(form,i)||'';
					$_Request.attr(form,i,pair[i])
				}
				form.submit();
				i=inputs.length;
				while(i--) inputs[i].disabled=false;
				i=qe.length;
				while(i--) qe[i].e.name=name[i];
				for(i in attr) $_Request.attr(form,i,attr[i]);
				i=qt[0]&&qt.length;
				while(i--) form.removeChild(form.lastChild);
				qt.length=inputs.length=0;
				d=e=pair=inputs=attr=name=last=qt=form=qe=null
			};
			ajax.data=[form, th.queryText, th.queryElem, th.url, th.method, ifname];
			// Run submit with delay - for old Opera: it needs some time to create IFRAME.
			ajax.delay(0.1);
			th=null;
			// Success.
			return null
		}    
	})
}
