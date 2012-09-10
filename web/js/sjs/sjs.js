/**
 * This file is part of the SJS package.
 * (c) 2010-2011 Stotskiy Sergiy <serjo@freaksidea.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */
/**
 * SJS core
 *
 * @package    SJS
 * @author     Stotskiy Sergiy <serjo@freaksidea.com>
 * @version    SVN: $Id$
 */
window.undefined=window.undefined;
(function(){
    var fn=Array.prototype;
    fn.forEach=fn.forEach||(function(fn,thisObj){sjs.forEach(this,fn,thisObj)});
    fn.indexOf=fn.indexOf||(function(el){return sjs.indexOf(this,el)});
    fn.in_array=function(b){return this.indexOf(b)!=-1};
    fn.unique=function(){return sjs.unique(this)};
    fn.rgb2hex=function(){
        if(this.length<=0 || this.length>3) return false;
        var i = this.length, hex='', cur;

        while(i--){
            cur=Number(this[i]).toString(16);
            cur.length==1 && (cur='0'+cur);
            hex = cur + hex
        }

        return '#'+hex
    };
    fn.range=function(a,b){
        for(var i=a, j=0;i<=b;i++, j++) this[j] = i;
        return this
    };
    fn.iterate=function(fn){
        for(var i=0,l=this.length;i<l;i++) fn.call(this,this[i],i,this)
    };

    fn=Function.prototype;
    fn.delay=function(time){
        var __method=this, args=Array.prototype.slice.call(arguments,1);
        return window.setTimeout(function(){ return __method.apply(__method,args)},time*1000)
    };
    fn.periodically=function(time){
        var __method=this, args=Array.prototype.slice.call(arguments,1);
        return window.setInterval(function(){ return __method.apply(__method, args)},time*1000)
    };
    if (!fn.bind) {
        fn.bind = function (ctx) {
            var __method=this, args=Array.prototype.slice.call(arguments,1);
            return function(){ return __method.apply(ctx, args) };
        };
    }

    fn=String.prototype;
    fn.hex2rgb=function(){
        var hex=this;
        if(hex.length==4){
            var c1=hex.charAt(1), c2=hex.charAt(2), c3 = hex.charAt(3);
            hex=[parseInt(c1+c1,16),parseInt(c2+c2,16),parseInt(c3+c3,16)]
        }else{
            hex=[parseInt(hex.substr(1,2),16),parseInt(hex.substr(3,2),16),parseInt(hex.substr(5,2),16)];
        }

        return hex
    };
    fn.trim=function(){ return sjs.trim(this)};
    fn.space=function(){ return sjs.space(this)};
    fn.rSplit=function(reg){
        var r = new Array(), j = 0, str = this;

        while(reg.test(str)){
            r[j++] = RegExp.leftContext;
            str = RegExp.rightContext
        }
        j && (r[j++] = RegExp.leftContext);

        return r
    };
    fn.ucfirst = function() {
        var str = this.trim().toLowerCase();

        return str.substr(0, 1).toUpperCase() + str.substr(1);
    };

    fn=null;

    Math.rand=function(m,n){
        m=parseInt(m); n=parseInt(n);
        return Math.floor(Math.random()*(n-m+1))+m
    };

    Number.prototype.round=function(fx){ return Number(this.toFixed(fx||0)) };
    Boolean.xor=function(x,y){ return (!(x && y) && (x || y)) };
})();
function sjs(selector,root){
    return selector&&(new sjs).create(selector,root)
}
sjs.prototype={
    sjs: true,
    selector: '',
    getObjectId: function(){ return this[0] && this[0].sjsEventId },
    toString:function(){return '[object SJSObject]'},
    valueOf:function(){return this.length},
    item:function(i){return i==undefined&&Array.prototype.slice.call(this,0)||this[i]},
    create:function(s,root){
        if (s.sjs) {
            return s;
        }

        var data=s, i = 0, e = '';
        if(s&&s.constructor==String){
         if (/^(?:\s*<(\S+)[^>]*>(?:.*<\/\1>\s*)?)+$/.test(s)) {
            data = sjs.makeHTML(s,root);
         } else {
            this.selector = s;
            data = sjs.querySelector(s,root);
         }
        }else if(s.nodeName||s==window) {
            data=new Array(s);
        }

        this.length=i=data.length;
        while(i--){
            e=data[i];
            if(e&&!e.sjsEventId) e.sjsEventId=++sjs.count;
            this[i]=e
        }
        return this
    },
    each:function(fn){
        return sjs.forEach(this,fn)
    },
    iterate:function(fn){
        var i=this.length;
        while(i--) fn.call(this[i],this[i],i,this);
        return this
    },
    filter:function(){
        var i=arguments.length, flt=[this,[]], cfg=[];

        while(i--){
            if(sjs.isFn(arguments[i])){
                flt[flt.length]=arguments[i];
            }else if(arguments[i].constructor==String){
                cfg[cfg.length]=['not',sjs.parseSelector(arguments[i])];
            }
        }
        if(cfg.length){
            sjs.setFilters.filt=cfg; cfg=null;
            flt.push(sjs.setFilters);
        }
        flt=sjs.filter.apply(sjs,flt);
        sjs.setFilters.filt=null;
        return sjs(flt)
    },
    mvc:function(name,type){
        var res=new Array(), g=sjs.globals[name];
        this.iterate(function(){
            var cur=g[this.sjsEventId];
            cur && res.push(cur&&cur[type]||cur)
        });
        return res
    },
    print:function(index,l,noproto){
        if(typeof index == 'number') {
            sjs.print(this[index],l,noproto)
        }else{
            sjs.print(this,l,noproto)
        }
        return this
    },
    trigger:function(type){
        return this.iterate(function(){
            if (sjs.event.fire(this, type) !== false && sjs.isFn(this[type])) {
                this[type]();
            }
        })
    },
    onEvent:function(e,fn){
        e='on'+e;
        var _fn=function(e){
            var fn=arguments.callee,res; fn.data[0]=e||window.event;
            res=fn.fn.apply(this,fn.data);fn.data[0]=null;
            return res
        };
        _fn.fn=fn; _fn.data=Array.prototype.slice.call(arguments,1); _fn.data[0]=null;
        return this.iterate(function(){sjs.event.attach(this,e,_fn)})
    },
    unlinkEvent: function(type, fn) {
        sjs.event.attach(this, type, null);
        //sjs.event.level3.dettach(this, type, fn);
    },
    on:function(e){
        this.eventType=e;
        e='on'+e;
        return this.iterate(function(){
            if(!this[e])sjs.event.attach(this,e,sjs.event.call);
        })
    },
    add:function(efn){
        if(sjs.isFn(efn)){
            var a=Array.prototype.slice.call(arguments,0),fn=function(e){
                var fn=arguments.callee,res; fn.data[0]=e;
                res=fn.fn.apply(this,fn.data); fn.data[0]=e=null;
                return res
            },t=this.eventType;
            fn.fn=efn; fn.data=a; fn.data[0]=null;
            return this.iterate(function(){    sjs.event.add(t,fn,this.sjsEventId)    })
        }else{
            this.trigger(this.eventType);
        }
    },
    dettach:function(type,fn){// @type - Event type; @fn - function or function index in sjs.event[id][event] array
        var find=null;
        if(sjs.isFn(fn)) {
            find=function(fn,id,et){
                var e=sjs.event[id][et],i=e.length;
                while(i--&&e[i].fn!==fn);
                return i
            };
        } else {
            find=function(index){return index};
        }
        return this.iterate(function(){
            var i=find(fn,this.sjsEventId,type);
            if(i+1){
                var e=sjs.event[this.sjsEventId][type], func=e.splice(i,1);
                func.fn=func.args=null; delete func.args; delete func.fn; func=null;
                if(!e.length){
                    delete sjs.event[this.sjsEventId][type];
                    sjs.event.attach(this,'on'+type,null)
                }
            }
        })
    },
    mousewheel:function(fn){
        var type;
        this.iterate(function(){
            type=sjs.event.attachWheel(this,sjs.event.call);
            if (fn) {
                sjs.event.add(type,fn,this.sjsEventId);
                var data = sjs.event[this.sjsEventId];
                if (data['DOMMouseScroll'] && !data['mousewheel']) {
                    data['mousewheel'] = data['DOMMouseScroll'];
                }
            }
        });
        this.eventType=type;
        return this
    },
    hover:function(ov,ou){
         var over=function(e){
            var p=sjs.event.target(e,'from');
            try{ while(p&&p!=this)p=p.parentNode}catch(e){p=this}
            if(p==this) return false;
            return ov.call(this,e)
        }, out=function(e){
            var p=sjs.event.target(e,'to');
            try{while(p&&p!=this)p=p.parentNode}catch(e){p=this}
            if(p==this) return false;
            return ou.call(this,e)
        };
        return this.on('mouseover').add(over).on('mouseout').add(out);
    },
    css:function(css,v){
        if(typeof css != 'object'){
            if(sjs.isFn(v)){
                if(css=='opacity') return this.iterate(function(){sjs.setOpacity(this,v.call(this,css,sjs.css(this,css)))});
                return this.iterate(function(){this.style[css]=v.call(this,css,sjs.css(this,css))})
            }else{
                if(css=='opacity') return this.iterate(function(){sjs.setOpacity(this,v)});
                return this.iterate(function(){this.style[css]=v})
            }
        }else{
            if(css.opacity){
                var opacity=css.opacity, fn=function(el,k){
                    for(var rule in css) el.style[rule]=css[rule];
                    sjs.setOpacity(this,opacity)
                };
                delete css.opacity
            }else{
                fn=function(el,k){ for(var rule in css) el.style[rule]=css[rule] }
            }
            return this.iterate(fn)
        }
    },
    readCss: function(v) {
        return sjs.css(this[0], v);
    },
    getStyle:function(pr){
        return sjs.css(this[0],pr);
    },
    setClass:function(cl){
        return this.iterate(function(){
            if(!sjs.className.has(this,cl)) sjs.className.set(this,cl)
        })
    },
    toogleClass: function(cl){
        return this.iterate(function(){
            if(sjs.className.has(this,cl)) {
                sjs.className.remove(this, cl)
            } else {
                sjs.className.set(this, cl)
            }
        })
    },
    hasClass:function(cl){
        var is=false;
        this.each(function(){
            return !(is=sjs.className.has(this,cl))
        });
        return is
    },
    removeClass:function(cl){
        return this.iterate(function(){
            sjs.className.remove(this,cl)
        })
    },
    is:function(s){
        var is=true,cfg=sjs.parseSelector(s);
        this.each(function(v,i,obj){
            return (is=sjs.filters.not(this,i,obj,cfg))
        });
        return !is
    },
    fixPng:function(){
        return this.iterate(function(){
            sjs.fixPNG(this,sjs.pathToBlankGif)
        })
    },
    attr:function(atr,v){
        var fn=function(){ sjs.setAttr(this,atr,v) };
        if(typeof atr == 'object') fn=function(){for(var pr in atr) sjs.setAttr(this,pr,atr[pr])};
        else if(typeof v == undefined){
            var res=[];
            this.iterate(function(){res.push(sjs.getAttr(this,atr))});
            return res
        }
        return this.iterate(fn)
    },
    attrNode:function(atr,v){
        var fn=function(){ sjs.setAttrNode(this,atr,v) };
        if(typeof atr == 'object') fn=function(){for(var pr in atr) sjs.setAttrNode(this,pr,atr[pr])};
        else if(typeof v == undefined){
            var res=[];
            this.iterate(function(){res.push(sjs.getAttrNode(this,atr))});
            return res
        }
        return this.iterate(fn)
    },
    html:function(h){
        if (typeof h == 'undefined') {
            return this[0] && this[0].innerHTML || ''
        }
        return this.iterate(function(){
            this.innerHTML=h
        })
    },
    text:function(t){
        return this.iterate(function(){
            sjs.setText(this,t)
        })
    },
    prop:function(prop,val){
        if(val == undefined){
            var res=new Array();
            this.iterate(function(){ res.push(this[prop]) });
            return res
        }else if(typeof prop == 'object'){
            return this.iterate(function(){ for(var i in prop) this[i]=prop[i] })
        }else{
            return this.iterate(function(){ this[prop]=val })
        }
    },
    width:function(v,i){
        i = i || 0;
        if (typeof v != 'undefined') {
            if (v !== 0 && (!v || v < 0)) {
                return this;
            }
            if (!/%|px|em|auto$/i.test(v)) {
                v += 'px';
            }
            this[i].style.width = v;
            return this;
        } else {
            return this[i].offsetWidth || this[i].clientWidth || (parseInt(sjs.css(this[i],'width')) || 0) || parseInt(this[i].style.width) || 0;
        }
    },
    height:function(v,i){
        i = i || 0;
        if (typeof v != 'undefined') {
            if (v !== 0 && (!v || v < 0)) {
                return this;
            }
            if (!/%|px|em|auto$/i.test(v)) {
                v += 'px';
            }

            this[i].style.height = v;
            return this;
        } else {
            return this[i].offsetHeight  || this[i].clientHeight || (parseInt(sjs.css(this[i],'height')) || 0) || parseInt(this[i].style.height) || 0;
        }
    },
    value:function(v){
        return this.iterate(function(){this.value=v})
    },
    parent:function(callback){
        var res=new Array(),pp=null,fn=null;
        if(sjs.isFn(callback)){
            fn=function(v,i,obj){
                var p=this.parentNode;
                if(!p||pp==p) return true;
                callback.call(p,v,i,obj);
                pp=res[res.length]=p
            };
        }else if (Number(callback) > 0) {
            var num = Number(callback);
            fn=function(){
                var p=this.parentNode;
                while (p && num--) {
                    p=p.parentNode;
                }
                if(!p||pp==p) return true;
                pp=res[res.length]=p
            };
        } else {
            fn=function(){
                var p=this.parentNode;
                if(!p||pp==p) return true;
                pp=res[res.length]=p
            };
        }
        this.iterate(fn);
        return sjs(res)
    },
    first:function(callback){
        var res=new Array(), fn=null;
        if(sjs.isFn(callback)){
            fn=function(v,i,obj){
                var first=v.firstChild;
                if(first&&first.nodeType!=1) first=first.nextSibling;
                callback.call(first,v,i,obj);
                res.push(first)
            }
        }else{
            fn=function(){
                var first=this.firstChild;
                if(first&&first.nodeType!=1) first=first.nextSibling;
                res.push(first)
            }
        }
        this.iterate(fn);
        return sjs(res)
    },
    last:function(callback){
        var res=new Array(), fn=null;
        if(sjs.isFn(callback)){
            fn=function(v,i,obj){
                var last=v.lastChild;
                if(last&&last.nodeType!=1) last=last.previousSibling;
                callback.call(last,v,i,obj);
                res.push(last)
            }
        }else{
            fn=function(){
                var last=this.lastChild;
                if(last&&last.nodeType!=1) last=last.previousSibling;
                res.push(last)
            }
        }
        this.iterate(fn);
        return sjs(res)
    },
    prev:function(callback){
        var res=new Array(),fn=null;
        if(sjs.isFn(callback)){
            fn=function(v,i,obj){
                var prev=this.previousSibling;
                if(prev&&prev.nodeType!=1) prev=prev.previousSibling;
                callback.call(prev,v,i,obj);
                res.push(prev)
            };
        }else{
            fn=function(){
                var prev=this.previousSibling;
                if(prev&&prev.nodeType!=1) prev=prev.previousSibling;
                res.push(prev)
            };
        }
        this.iterate(fn);
        return sjs(res)
    },
    next:function(callback){
        var res=new Array(),fn=null;
        if(sjs.isFn(callback)){
            fn=function(v,i,obj){
                var next=this.nextSibling;
                if(next&&next.nodeType!=1) next=next.nextSibling;
                callback.call(next,v,i,obj);
                res.push(next)
            };
        }else{
            fn=function(){
                var next=this.nextSibling;
                if(next&&next.nodeType!=1) next=next.nextSibling;
                res.push(next)
            };
        }
        this.iterate(fn);
        return sjs(res)
    },
    nth: function(i) {
        if (i == 'last') {
            i = this.length - 1;
        } else if (i == 'first') {
            i = 0;
        }
        return sjs(this[i]);
    },
    remove: function() {
        return this.iterate(function() {
            if (this.parentNode) {
                this.parentNode.removeChild(this);
            }
        });
    },
    find:function(sel){
        var f=new Array();
        this.iterate(function(){f.push(sjs.querySelector(sel,this))});
        return sjs(f.concat.apply([],f))
    },
    insertAfter:function(domObj){
        if(domObj.constructor == String) {
            domObj=sjs(domObj)[0];
        } else if (domObj.sjs) {
            domObj = domObj[0];
        }
        return this.iterate(function(){
            sjs.after(this,domObj)
        })
    },
    insertBefore:function(domObj){
        if (domObj.constructor==String) {
            domObj=sjs(domObj)[0];
        } else if (domObj.sjs) {
            domObj = domObj[0];
        }
        return this.iterate(function(){
            sjs.before(this,domObj)
        })
    },
    appendTo:function(domObj){
        if (!domObj.sjs) {
            domObj = sjs(domObj);
        }
        return this.iterate(function(){
            domObj.append(this)
        })
    },
    append:function(object){
        if(typeof object == 'string') {
            object=sjs(object)[0]
        } else if (object && object.sjs) {
            object = object[0]
        }
        return this.iterate(function(){
            this.appendChild(object)
        });
    },
    prepend: function(object){
        if(typeof object == 'string') {
            object=sjs(object)[0]
        } else if (object && object.sjs) {
            object = object[0]
        }
        return this.iterate(function(){
            var first = sjs(this).first().item(0);
            if (first) {
                sjs.before(object, first)
            } else {
                this.appendChild(object)
            }
        });
    },
    getSize:function(type){
        var size = sjs.getSize(this[0]);
        return size[type] || size
    },
    unselectable: function() {
        return this.iterate(function() {
            sjs.event.unselect(this);
        })
    },
    selectable: function() {
        return this.iterate(function() {
            sjs.event.select(this);
        })
    },
    show: function(isBlock) {
        return this.iterate(function(){
            this.style.display = isBlock ? 'block' : '';
            this.style.visibility = 'visible';
        })
    },
    hide: function() {
        return this.iterate(function(){
            this.style.display = 'none';
            this.style.visibility = 'hidden';
        })
    },
    toogleDisplay: function(isBlock) {
        return this.iterate(function(){
            if (this.style.display == 'none' || this.style.visibility == 'hidden') {
                this.style.display = isBlock ? 'block' : '';
                this.style.visibility = 'visible';
            } else {
                this.style.display = 'none';
                this.style.visibility = 'hidden';
            }
        })
    },
    data: function(k, v) {
        if (typeof v == 'undefined') {
            return this[0].__sjsData && this[0].__sjsData[k]
        }
        return this.iterate(function(){
            if (!this.__sjsData) {
                this.__sjsData = {};
            }
            this.__sjsData[k] = v;
        })
    },
    resetStyle: function() {
        return this.iterate(function(){
            if (this.style) {
                this.style.cssText = ''
            }
        })
    },
    copyStyle: function(from) {
        if (from.sjs) {
            from = from[0];
        }
        if (!from || !from.style) {
            return this;
        }
        return this.iterate(function(){
            if (this.style) {
                this.style.cssText = from.style.cssText
            }
        })
    }
};
sjs.prototype.count=sjs.prototype.valueOf;

sjs.extend=function(){
    var target=arguments[0],a=1,ex,i;
    if(arguments.length==1){target=this;a=0}
    while(ex=arguments[a++]) for(i in ex)target[i]=ex[i];
    return target
};

sjs.extend({
    sjs:'1.1.2',
    count:0,
    readyFn:[],
    ui:{},
    globals:{},
    $empty:function(){},
    isActive:false,
    pathToBlankGif:'/tmpl/img/blank.gif',
    wrapper:document.createElement('div'),
    exp:{
        BeginSpace:new RegExp(/^\s+/),
        EndSpace:new RegExp(/\s+$/),
        SpaceGlobal:new RegExp(/\s+/g),
        AsciiLetter:new RegExp(/[a-z]/),
        Quotes:new RegExp(/"[^\\"]*(?:\\.[^"\\]*)*"/)
    },
    escape:function(s){
        return escape(s).replace(new RegExp('\\+','g'), '%2B');
    },
    assignErrorHandler:function(){
        sjs.event.level3.add('error', function($1,$2,$3){
            alert("Call by file: "+$2+"\nString: "+$3+"\nError: "+$1)
        }, false);
    },
    objectInfo:function(obj,l,noproto){
        var pr,str='';
         try{for(pr in obj){
            if(noproto && !obj.hasOwnProperty(pr)) continue;
            str+='<div style="color:red;">'+pr+': ';
            if(typeof obj[pr]== 'object' && l){
                str+='{<div style="margin-left:20px;">'+(sjs.objectInfo(obj[pr],l,noproto))+'</div>}</div>';
                continue
            }
            str+='<b style="font-size:16px; color:blue;">'+(sjs.htmlChars(obj[pr]+'')||obj[pr])+'</b></div>';
        }}catch(e){alert(e.message)}
        return str
    },
    print:function(obj,l,noproto){
        var win = window.open('','__object_','width=800,height=800,top=150,left=200,scrollbars=1,resizable=1');
        win.document.write('<html><head><title>Object information</title></head><body>');
        win.document.write('<p style=\'font-size:24px;\'>Properties of object</p>'+sjs.objectInfo(obj,l,noproto)+'</body></html>');
        if(sjs.browser.mozilla) win.stop()
    },
    toConsole:function(data,id,add,l,noproto,print){
        var c=document.getElementById(id||'console');
        if(typeof data == 'object' || print) data=sjs.objectInfo(data,l,noproto);
        if(add) c.innerHTML+=data;
        else c.innerHTML=data;
    },
    newError:function(msg){
        if(!window.Error){
            sjs.newError=function(msg){    throw msg}
        }else if((new Error(1, 'test')).description=="test"){
            sjs.newError=function(msg){throw new Error(1,msg)}
        }else{
            sjs.newError=function(msg){ throw new Error(msg)}
        }
        sjs.newError(msg)
    },
    plugin:function(m){
        var c=function(){ return (this.__construct)?this.__construct.apply(this, arguments):this};c.prototype=m;
        return c
    },
    ready:function(fn){
        if(sjs.isFn(fn)) {
            sjs.readyFn.push(fn)
        } else{
            var i=sjs.readyFn.length;
            while(i--) sjs.readyFn[i].call(document);
            sjs.isActive=true;
            sjs.readyFn=null;
            try{
                if(window.onload==this.ready) sjs.event.attach(window,'onload',null);
                document.removeEventListener("DOMContentLoaded",sjs.ready,false)
            }catch(e){}
            this.ready=function(fn){fn.apply(document,arguments)}
        }
    },
    cleanUp:function(){
        sjs.event.removeAll();
        var obj=null, pr=null;
        try{
            for(var pl in sjs.globals){
                obj=sjs.globals[pl];
                for(pr in obj) obj[pr].__destruct();
                delete sjs.globals[pl];
            }
        }catch(e){}
        obj=pr=pl=sjs.globals=null
    },
    is_mail:function(s){
        return (/^[\w\d_\.\-]+@[\w\d_\.\-]+(?:\.[\w\d]+)+$/i).test(sjs.trim(s))
    },
    is_date:function(s){// dmy OR mdy
        return (/^\d{1,2}([.\/\\-]|\s+)\d{1,2}\1\d{2,4}$/i).test(s.trim())
    },
    split:function(str,delim){
        var res=[],k=0,i,tmp;
        while((i=str.search(delim))+1){
            tmp=str.substr(k,i);
            str=str.substr(i+1);
            res.push(tmp);
            k=i-tmp.length
        }
        res.push(str);
        return res
    },
    indexOf:function(arr,obj){
        var i=0,l=arr.length;
        while(i!=l && arr[i]!=obj) i++;
        return (i==arr.length) && -1 || i
    },
    lastIndexOf:function(arr,obj){
        var i=arr.length;
        while(i--&&arr[i]!=obj);
        return i
    },
    in_array:function(arr,obj){
        return sjs.indexOf(arr,obj)!=-1
    },
    unique:function(b){
        var res=new Array();
        sjs.each(b,function(v,k){
            if(!res.in_array(v)) res[res.length]=v
        });
        return res
    },
    toList:function(obj){
        var list=new Array(), i=obj.length;
        while(i--) list[i]=obj[i];
        return list
    },
    setFilters:function(v,i,obj,tFn){
        var filt=tFn.filt,ret=true,i=filt.length,flt=sjs.filters,f;
        while(i--&&ret){ f=filt[i]; ret=flt[f[0]](v,i,obj,f[1],f) }
        filt=f=flt=null;
        return !ret
    },
    filter:function(it,cont){
        var args=cont.slice.call(arguments,2), l=it.length, size=args.length, ret,j,v,i;
        for(i=0;i<l;i++){
            v=it[i]; j=size; ret=true;
            while(j--&&(ret=args[j](v,i,it,args[j])));
            if(ret) cont.push(v)
        }
        return cont
    },
    parseSelector:function(s){
        var filters=sjs.selReg('(?::)'), atrfilt=sjs.selReg('\\[.*\\]'), local=new RegExp(/([^#.]+)?(?:([#.])(.+))?/i),
            quoteReg=new RegExp(/^\[?\s*([^=]+)\s*(?:=(?:\s*["']?)(.+))?/i), freg=new RegExp(/^([^\(]+)(?:\((\s*['"]?)(.+)\2\))?/i),
            square=sjs.selReg('(?:["\']?\\s*\\])'), filt, mch, fattr, type, fltr=new Array(), i;

        s=s.trim(); type=s.charAt(0);
        filt=(((type=='['||type==':')&&'*'||'')+s).split(filters);
        mch=filt.shift();
        fattr=mch.match(atrfilt);
        mch=mch.split(atrfilt)[0].match(local); mch.shift(); type=mch;
        fattr=fattr&&fattr[0]&&fattr[0].split(square)||[];
        i=filt.length;
        while(i--){
            mch=freg.exec(filt[i]);
            s=mch[3];
            if(mch[1].indexOf('nth')!=-1) s=(s=='odd'&&[2,1]||s=='even'&&[2,0]||(s.indexOf('+')==-1&&[Infinity,parseInt(s)]||[parseInt(s),Number(s.split('+')[1]||0)]));
            else if(mch[1]=='not') s=sjs.parseSelector(mch[3]);

            fltr[fltr.length]=[mch[1],s]
        }
        i=fattr.length;
        while(i--){
            mch=quoteReg.exec(fattr[i]);
            if(mch&&mch[1]){
                mch.shift();
                mch[1]=mch[1]&&(new RegExp(mch[1]));
                fltr[fltr.length]=['attr',mch]
            }
        }
        return [type,fltr]
    },
    querySelector:function(s,b){
        s=s.split(sjs.selReg('(?:\\s*,\\s*)'));
        var main=sjs.selReg('(?:(?:>|\\+|~|\\s(?![+>~]))\\s*)'), filters=sjs.selReg('(?::)'), atrfilt=sjs.selReg('\\[.*\\]'),
        square=sjs.selReg('(?:["\']?\\s*\\])'), local=new RegExp(/([^#.]+)?(?:([#.])(.+))?/i), res=new Array(),
        quoteReg=new RegExp(/^\[?\s*([^=]+)\s*(?:=(?:\s*["']?)(.+))?/i), freg=new RegExp(/^([^\(]+)(?:\((\s*['"]?)(.+)\2\))?/i),
        data, gData=[b||document], j=s.length, key, i, sl, $do, sel, filt, flt, fattr, mch, selfn, name, tag, fltr, tmp, remove=[],
        setFilters=function(v,i,obj,tFn){
            var filt=tFn.filt,ret=true,i=filt.length,flt=sjs.filters,f;
            while(i--&&ret){ f=filt[i]; ret=flt[f[0]](v,i,obj,f[1],f) }
            filt=f=flt=null;
            return ret
        };
        while(j--){
            sl=s[j];
            if(tmp=(sl=='body'&&document.body||(sl==':root'||sl=='html')&&document.documentElement)){
                res[res.length]=tmp;
                continue
            }
            //alert(sl)
            $do=sl.match(main)||[]; sel=sl.split(main)||[];
            $do.unshift(' ');
            // alert(sel); alert($do)
            key=-1; data=gData; main=sel.length;
            while(++key<main){
                sl=sel[key].trim(); tmp=sl.charAt(0);
                filt=(((tmp=='['||tmp==':')&&'*'||'')+sl).split(filters);
                mch=filt.shift();
                fattr=mch.match(atrfilt);
                mch=mch.split(atrfilt)[0].match(local);
                selfn=mch[2]||'tag'; name=mch[3]; tag=mch[1]||'*';
                fltr=[]; flt=[0,[]];
                fattr=fattr&&fattr[0]&&fattr[0].split(square)||[];
                i=filt.length;
                while(i--){
                    mch=freg.exec(filt[i]);
                    sl=mch[3];
                    if(mch[1].indexOf('nth')!=-1) sl=(sl=='odd'&&[2,1]||sl=='even'&&[2,0]||(sl.indexOf('+')==-1&&[Infinity,parseInt(sl)]||[parseInt(sl),Number(sl.split('+')[1]||0)]));
                    else if(mch[1]=='not'||mch[1]=='has') sl=sjs.parseSelector(mch[3]);
                    fltr.push([mch[1],sl])
                }
                i=fattr.length;
                while(i--){
                    mch=quoteReg.exec(fattr[i]);
                    if(mch&&mch[1]){
                        mch.shift();
                        mch[1]=mch[1]&&(new RegExp(mch[1]));
                        fltr.push(['attr',mch])
                    }
                }
                selfn=sjs.selectors[$do[key].trim()][selfn](name,tag,flt);
                if(fltr.length){
                    setFilters.filt=fltr;
                    flt.push(setFilters)
                }
                sl=data.length;
                for(i=0;i<sl;i++) selfn(data[i],flt,tag,name,data[i-1]);
                data=flt[1]; i=data.length;
                while(i--) data[i].__sjs__=null;
                setFilters.filt=fattr=mch=selfn=tmp=flt=fltr=null
            }
            res=res.concat(data)
        }
        gData=s=sl=filters=main=freg=quoteReg=local=square=atrfilt=null;

        return res
    },
    selReg:function(str){
        return new RegExp(str+'(?!(?:(?:[^\\[\\(]*|["\'\\(\\[]?[^"\']*["\'\\)\\]]|[^"\'\\(\\[]*)(?![\\[\\(]))(?:[\\[\\]"\'\\\\\\[\\\\\\]\\\\\\(\\\\\\)]{1}))','gi')
    },
    selectors:{ /*name,tag, filters*/
        '':{
            '#':function(name,tag,flt){
                return function(node,f,tag,name){ /*curNode, filters, tag, name, prevNode*/
                    f[0]=[document.getElementById(name)];
                    return (f[0][0]&&!f[0][0].__sjs__)&&(f[0][0].__sjs__=1)&&sjs.filter.apply(sjs,f)
                }
            },
            '.':function(name,tag,flt){
                name=new String(' '+name+' ');

                if(tag&&tag!='*'){
                    flt.push(function(e){ return (!e.__sjs__)&&(' '+e.className+' ').indexOf(name)!=-1&&(e.__sjs__=1)  });
                    return function(node,f,tag){
                        f[0]=node.getElementsByTagName(tag);
                        return sjs.filter.apply(sjs,f)
                    }
                }else{
                    return function(node,f,tag,name){
                        f[0]=sjs.getElementsByClassName(node,name);
                        return sjs.filter.apply(sjs,f)
                    }
                }
            },
            'tag':function(name,tag,flt){
                return function(node,f,tag){
                    f[0]=node.getElementsByTagName(tag);
                    return sjs.filter.apply(sjs,f)
                }
            }
        },
        '>':{
            '#':function(id,tag,flt){
                flt.push(function(e){return (!e.__sjs__)&&e.id==id&&e.parentNode.isMyParent&&(e.__sjs__=1) });

                return this.call
            },
            '.':function(name,tag,flt){
                name=new String(' '+name+' ');
                flt.push(function(e){
                    return (!e.__sjs__)&&e.parentNode.isMyParent&&(' '+e.className+' ').indexOf(name)!=-1&&(e.__sjs__=1)
                });

                return this.call
            },
            'tag':function(name,tag,flt){
                flt.push(function(e){ return (!e.__sjs__)&&e.parentNode.isMyParent&&(e.__sjs__=1)});

                return this.call
            },
            call:function(node,f,tag){
                f[0]=node.getElementsByTagName(tag);
                node.isMyParent=true;
                var find=sjs.filter.apply(sjs,f);
                node.isMyParent=null;
                return find
            }
        },
        '+':{
            '#':function(id,tag,flt){
                flt.push(function(e){return (!e.__sjs__)&&e.id==id&&(e.__sjs__=1)});

                return this.call
            },
            '.':function(name,tag,flt){
                name=new String(' '+name+' ');
                flt.push(function(e){ return (!e.__sjs__)&&(' '+e.className+' ').indexOf(name)!=-1&&(e.__sjs__=1) });

                return this.call
            },
            'tag':function(name,tag,flt){
                flt.push(function(e){ return (!e.__sjs__)&&sjs.nodeName(e,tag)&&(e.__sjs__=1)});

                return this.call
            },
            call:function(node,f){
                while((node=node.nextSibling)&&node.nodeType!=1);
                f[0]=node&&[node]||[];
                return sjs.filter.apply(sjs,f);
            }
        },
        '~':{ /* incapsulate all methods from "+" */
            call:function(node,f,tag,nm,prev){
                if(node.parentNode!=(prev&&prev.parentNode)){
                    var broth=node.nextSibling, res=[];
                    do if(broth&&broth.nodeType==1)
                        res[res.length]=broth;
                    while(broth=broth&&broth.nextSibling);
                    f[0]=res; res=null;
                    return sjs.filter.apply(sjs,f)
                }
            }
        }
    },
    filters:{
        attr:function(e,k,obj,cfg){
            return (cfg[1]) ? cfg[1].test(sjs.getAttrNode(e,cfg[0])||'') : sjs.hasAttr(e,cfg[0])
        },
        _attr:{
            '=~':function(e,n,regValue){
                n=sjs.getAttrNode(e,n);
                return n && regValue.test(n)
            },
            '=':function(e,n,v){
                n=sjs.getAttrNode(e,n);
                //n=e.getAttribute(n);
                return n==v
            },
            '^=':function(e,n,v){
                n=sjs.getAttrNode(e,n);
                //n=e.getAttribute(n);
                return n && !n.indexOf(v)
            },
            '$=':function(e,n,v){
                n=sjs.getAttrNode(e,n);
                //n=e.getAttribute(n);
                return n && (n.indexOf(v) == n.length - v.length)
            },
            '*=':function(e,n,v){
                n=sjs.getAttrNode(e,n);
                //n=e.getAttribute(n);
                return n && n.indexOf(v)+1
            },
            '|=':function(e,n,v){
                n=sjs.getAttrNode(e,n);
                //n=e.getAttribute(n);
                return n && ('-'+n+'-').indexOf(v)+1
            },
            '~=':function(e,n,v){
                n=sjs.getAttrNode(e,n);
                //n=e.getAttribute(n);
                return n && (' '+n+' ').indexOf(v)+1
            },
            has:function(e,n){
                return sjs.hasAttr(e,n)
            }
        },
        enabled:function(e){
            return e.disabled===false&&e.type!=='hidden'
        },
        disabled:function(e){
            return e.disabled===true
        },
        checked:function(e){
            return e.checked===true
        },
        selected:function(e){
            e.parentNode.selectedIndex;
            return e.selected===true
        },
        parent:function(e){
            return !!e.firstChild
        },
        empty:function(e){
            return !e.firstChild
        },
        header:function(e){
            return /h\d/i.test(e.nodeName)
        },
        text:function(e){
            return 'text'===e.type
        },
        radio:function(e){
            return 'radio'===e.type
        },
        checkbox:function(e){
            return 'checkbox'===e.type
        },
        file:function(e){
            return 'file'===e.type
        },
        password:function(e){
            return 'password'===e.type
        },
        submit:function(e){
            return 'submit'===e.type
        },
        image:function(e){
            return 'image'===e.type
        },
        reset:function(e){
            return 'reset'===e.type
        },
        button:function(e){
            return 'button'===e.type||sjs.nodeName(e,'button')
        },
        input: function(e){
            return /input|select|textarea|button/i.test(e.nodeName);
        },
        root:function(e){
            return e.nodeName.toLowerCase() == 'html'
        },
        visible:function(e){
            return e.offsetWidth&&e.offsetHeight
        },
        hidden:function(e){
            return !e.offsetWidth||!e.offsetHeight
        },
        contains:function(e,k,obj,txt){
            return sjs.getText(e).indexOf(txt)+1
        },
        animated:function(e){
            var anime=sjs.globals.anime&&sjs.globals.anime[e.sjsEventId];
            if(!anime) return false;
            for(var type in anime) if(anime[type].timer!=-2) return true;
            return false
        },
        has:function(e,k,obj,cfg){
            var all=sjs.all(e), res=1, i=all.length, flt=sjs.filters.not;
            while(i--&&res) res=flt(all[i],i,all,cfg);
            return !res
        },
        not:function(e,k,obj,cfg){ /*
            cfg:Array [local-selector,attrFilters,otherFilters]
            local-selector:Array [tagName,#|.,name]
            attrFilters:Arrays [fn,attrName,attrValue,invert]
            otherFilters:Arrays [fn,fltValue]
            */
            var fltr=cfg[0], flt=fltr[1], cur, fn,
                res = flt=='.'&&(' '+e.className+' ').indexOf(fltr[2])+1 || flt=='#'&&e.id==fltr[2] || true;

            flt=fltr[0];
            if(flt!='*') res=res&&e.nodeName.toLowerCase()==flt;

            flt=sjs.filters._attr; fltr=cfg[1]; i=fltr.length; fn=Boolean.xor;
            while(res&&i--){ cur=fltr[i]; res=fn(flt[cur[0]](e,cur[1],cur[2]),cur[3]) }

            flt=sjs.filters; fltr=cfg[2]; i=fltr.length; fn=null;
            while(res&&i--){ cur=fltr[i]; res=flt[cur[0]](e,k,obj,cur[1]) }

            return !res
        },
        'nth-child':function(e,k,obj,cfg){
            var broth=e.parentNode.firstChild, i=e.nodeIndex||0, a=cfg[0], b=cfg[1];
            if(i){ // diff=i-b; !(diff % a) && diff/a >= 0
                e.nodeIndex=null; b=i-b;
                return !(b%a) && b/a>=0
            }
            do if(broth.nodeType==1&&(broth.nodeIndex=++i)&&broth===e&&((i-b)/a<0 || (i-b)%a)){
                broth.nodeIndex=null;
                return 0
            }while(broth=broth.nextSibling);
            return true
        },
        'nth-last-child':function(e,k,obj,cfg){
            var broth=e.parentNode.lastChild, i=e.nodeLastIndex||0, a=cfg[0], b=cfg[1];
            if(i){
                e.nodeLastIndex=null; b=i-b;
                return !(b%a) && b/a>=0
            }
            do if(broth.nodeType==1&&(broth.nodeLastIndex=++i)&&broth===e&&((i-b)/a<0 || (i-b)%a)){
                broth.nodeLastIndex=null;
                return 0
            }while(broth=broth.previousSibling);
            return true
        },
        'first-child':function(e){
            while((e=e.previousSibling)&&e.nodeType != 1);
            return !e
        },
        'last-child':function(e){
            while((e=e.nextSibling)&&e.nodeType != 1);
            return !e
        },
        'only-child':function(e){
            return sjs.filters['first-child'](e)&&sjs.filters['last-child'](e)
        },
        'nth-of-type':function(e,k,obj,cfg){
            var all=e.parentNode.getElementsByTagName(e.nodeName), a=cfg[0],b=cfg[1],i=e.typeIndex||0,cur,j=0;
            if(i){
                e.typeIndex=null; b=i-b;
                return !(b%a) && b/a>=0
            }
            e.parentNode.__sjsIsParent__=1;
            cur=all[i];
            do if(cur.parentNode.__sjsIsParent__&&(cur.typeIndex=++j)&&cur===e&&((j-b)/a<0 || (j-b)%a)){
                cur.typeIndex=null;
                return 0
            }while(cur=all[++i]);
            e.parentNode.__sjsIsParent__=null;
            return true
        },
        'nth-last-of-type':function(e,k,obj,cfg){
            var all=e.parentNode.getElementsByTagName(e.nodeName), a=cfg[0],b=cfg[1],i=e.typeLastIndex||0,cur,j=0;
            if(i){
                e.typeIndex=null; b=i-b;
                return !(b%a) && b/a>=0
            }
            e.parentNode.__sjsIsParent__=1;
            cur=all[(i=all.length-1)];
            do if(cur.parentNode.__sjsIsParent__&&(cur.typeLastIndex=++j)&&cur===e&&((j-b)/a<0 || (j-b)%a)){
                cur.typeLastIndex=null;
                return 0
            }while(cur=all[--i]);
            e.parentNode.__sjsIsParent__=null;
            return true
        },
        'first-of-type':function(e){
            return e.typeIndex==1||e.parentNode.getElementsByTagName(e.nodeName)[0]==e
        },
        'last-of-type':function(e,k,obj){
            return e.typeLastIndex==1||sjs.filters['nth-last-of-type'](e,k,obj,[Infinity,1])
        },
        'only-of-type':function(e){
            return e.parentNode.getElementsByTagName(e.nodeName).length == 1
        },
        first:function(e,k){
            return !k
        },
        last:function(e,k,obj){
            return obj.length-k==1
        },
        even:function(e,k){
            return !(k % 2)
        },
        odd:function(e,k){
            return k % 2
        },
        lt:function(e,k,obj,cfg){
            return k < cfg
        },
        gt:function(e,k,obj,cfg){
            return k > cfg
        },
        nth:function(e,k,obj,cfg){
            return cfg == k
        }
    },
    cookie:{
        isset:function(n){
            return document.cookie.indexOf(escape(n)+'=')!=-1
        },
        remove:function(n){
            n=escape(n);
            document.cookie=n+'=0; expires=Fri, 31 Dec 1999 23:59:59 GMT; '
        },
        get:function(n){
            var pos, v=null;
            n=escape(n);
            pos=document.cookie.indexOf(n+'=')+1;
            if(pos){
                v=document.cookie.substr(pos+n.length);
                pos=v.indexOf(';');
                if(pos+1) v=v.substr(0,pos)
            }
            return v&&unescape(v)
        },
        set:function(n,v,e,p,s){ // e - days
            var date;
            n=escape(n);
            v=escape(v);
            v=n+'='+v+'; ';
            if(e=parseInt(e)){
                date=new Date();
                date.setDate(date.getTime()+e*86400);
                v+='expires='+date.toUTCString()+'; ';
            }
            if(p) v+='path='+p+'; ';
            if(s) v+='secure='+s+'; ';
            document.cookie=v
        }
    },
    className:{
        get:function(obj){
            return obj.className&&obj.className.trim().space().split(' ')
        },
        set:function(obj,className){
            if (className) {
                var cl  = sjs.trim(obj.className),
                    put = sjs.trim(className);
                if (cl) {
                    obj.className = cl + ' ' + put
                } else {
                    obj.className = put;
                }
            }
        },
        remove:function(obj,className){
            var cl=obj.className.split(' '),i=sjs.indexOf(cl,className);
            if(i+1){
                cl[i]='';
                obj.className=cl.join(' ');
            }
            return (i!=-1)
        },
        has:function(obj,className){
            return (' '+obj.className+' ').indexOf(' '+className+' ')!=-1
        }
    },
    event:{
        fire: function(obj,type){
            if (document.createEventObject){
                this.fire = function(obj,type){
                    var e = document.createEventObject();
                    return obj.fireEvent('on'+type,e)
                }
            } else if (document.createEvent) {
                this.fire = function(obj,type){
                    var e = document.createEvent("HTMLEvents");
                    e.initEvent(type, true, true);
                    return !obj.dispatchEvent(e);
                }
            } else {
                sjs.newError('can\'t find function fireEvent(obj,type)');
            }
            return this.fire(obj,type)
        },
        attach:function(obj,e,fn){
            obj[e]=fn
        },
        remove:function(id){
            delete this[id]
        },
        level3:{
            add:function(obj,e,fn,buble){
                if(obj.addEventListener){
                    this.add=function(obj,e,fn,buble){obj.addEventListener(e,fn,buble)}
                }else if(obj.attachEvent){
                    this.add=function(obj,e,fn,buble){obj.attachEvent('on'+e,fn)}
                }else sjs.newError('can\'t find function level3.add (event,handler,bubble)');
                return this.add(obj,e,fn,buble)
            }
        },
        add:function(e,fn,id){
            if(!this[id]) this[id]={};
            if(!this[id][e]) this[id][e]=new Array();
            this[id][e].push(fn);
        },
        call:function(e){
            var e=e||window.event,fn=sjs.event[this.sjsEventId][e.type];
            for(var i=0,l=fn.length;i<l;i++) fn[i].call(this,e);
            fn=e=null
        },
        removeAll:function(){
            for(var e in this){
                if(isNaN(Number(e))) continue;
                this[e]=null;
                delete this[e]
            }
        },
        target:function(e,t){
            if(typeof e.fromElement != undefined){
                this.target=function(e,t){ return e[t+'Element']}
            }else if(typeof e.relatedTarget != undefined){
                this.target=function(e,t){ return e.relatedTarget}
            }else sjs.newError('can\'t find function target (event,["from" | "to" (for IE)])');
            return this.target(e,t)
        },
        caller:function(e){
            if(e.srcElement){
                this.caller=function(e){ return e.srcElement}
            }else if(e.target){
                this.caller=function(e){ return e.target}
            }else sjs.newError('can\'t find function caller (event)');
            return this.caller(e)
        },
        key:function(e){
            if(typeof e.keyCode == 'number'){
                this.key=function(e){ return {code:e.keyCode,shift:e.shiftKey,ctrl:e.ctrlKey,alt:e.altKey}}
            }else if(typeof e.which == 'number'){
                this.key=function(e){ return {code:e.which,shift:e.shiftKey,ctrl:e.ctrlKey,alt:e.altKey}}
            }else sjs.newError('can\'t find function key (event)');
            return this.key(e)
        },
        xy:function(e){
            if(e.pageX&&e.pageY){
                this.xy=function(e){return {x:e.pageX,y:e.pageY}}
            }else if(e.clientX&&e.clientY){
                this.xy=function(e){
                    var h=document.documentElement,b=document.body;
                    return {x:e.clientX+(h.scrollLeft||b.scrollLeft),y:e.clientY+(h.scrollTop||b.scrollTop)}
                }
            }else sjs.newError('can\'t find function xy (event)');
            return this.xy(e)
        },
        offsetXY:function(e){
            if(e.layerX&&e.layerY){
                this.offsetXY=function(e){return {x:e.layerX,y:e.layerY}}
            }else if(e.offsetX&&e.offsetY){
                this.offsetXY=function(e){ return {x:e.offsetX,y:e.offsetY}}
            }else sjs.newError('can\'t find function offsetXY (event)');
            return this.offsetXY(e)
        },
        attachWheel:function(obj,fn){
            if(obj.addEventListener){
              this.attachWheel=function(obj,fn){
                  obj.addEventListener('DOMMouseScroll',fn,false);
                  obj.addEventListener('mousewheel',fn,false);
                  return 'DOMMouseScroll'
              }
            }else{
                this.attachWheel=function(obj,fn){obj.onmousewheel=fn;return 'mousewheel'}
            }
            return this.attachWheel(obj,fn)
        },
        unselect:function(obj){
            if(sjs.browser.msie){
                this.unselect=function(obj){obj.onselectstart=function(){return false}}; //?! obj.unselectable="on"
                this.select=function(obj){obj.onselectstart=null}
            }else if(sjs.browser.mozilla){
                this.unselect=function(obj){obj.style.MozUserSelect='none'};
                this.select=function(obj){obj.style.MozUserSelect=''}
            }else if(sjs.browser.safari){
                this.unselect=function(obj){obj.style['-webkit-user-select']='none'};
                this.select=function(obj){obj.style['-webkit-user-select']=''}
            }else if(sjs.browser.opera) {
                this.unselect=function(obj){obj.style['-o-user-select']='none'};
                this.select=function(obj){obj.style['-o-user-select']=''}
            }else{
                this.unselect=this.select=sjs.$empty;
            }
            this.unselect(obj)
        },
        preventDefault:function(e){
            if(e.stopPropagation){
                this.preventDefault=function(e){ return e.preventDefault()}
            }else {
                this.preventDefault=function(e){ return (e.returnValue=false)}
            }
            return this.preventDefault(e)
        },
        stopPropagation:function(e){
            if(e.stopPropagation){
                this.stopPropagation=function(e){return e.stopPropagation()}
            }else{
                this.stopPropagation=function(e){return (e.cancelBubble=true)}
            }
            return this.stopPropagation(e)
        },
        wheel:function(e){
            if(e.wheelDelta){
                this.wheel=function(e){return e.wheelDelta/120}
            }else if(e.detail){
                this.wheel=function(e){return -e.detail/3}
            }else sjs.newError('can\'t find function wheel(event)');
            return this.wheel(e)
        }
    },
    escape:function(s){
        return escape(s).replace(new RegExp('\\+','g'), '%2B')
    },
    toQuery:function(form){
        return sjs.toArray(form,1).join('&')
    },
    toArray:function(form,type){
        var arr=[],k,v,$=0,hash={};
        sjs.iterate(form.elements,function(){
            k=this.name; v=this.value;
            if((this.type=='checkbox'||this.type=='radio')&&!this.checked) return true;
            else if(/select/i.test(this.type)) v=this.options[this.selectedIndex].value;
            v=sjs.escape(v);
            arr.push(k+'='+v);
            hash[k]=v
        });
        return type?arr:hash
    },
    each:function(obj,fn){
        if(obj.length==undefined) for(var i in obj) fn.call(obj[i],obj[i],i,obj);
        else sjs.forEach(obj,fn);
        return obj
    },
    forEach:function(obj,fn){
        for(var i=0,l=obj.length; i<l&&(fn.call(obj[i],obj[i],i,obj)!==false); i++);
        return obj
    },
    iterate:function(obj,fn){
        for(var i=0,l=obj.length;i<l;i++) fn.call(obj[i],obj[i],i,obj);
        return obj
    },
    isFn:function(fn){
        return fn&&fn.constructor==Function
    },
    isXMLdoc:function(el){
        return el.tagName&&el.ownerDocument&&!el.ownerDocument.body
    },
    nodeName:function(elem,name){
        return elem&&elem.nodeName&&elem.nodeName.toUpperCase()==name.toUpperCase()
    },
    trim:function(t){
        return t.replace(sjs.exp.BeginSpace,'').replace(sjs.exp.EndSpace,'')
    },
    space:function(s){
        return sjs.trim(s.replace(sjs.exp.More2SpaceGlobal,' '))
    },
    htmlChars:function(s){
        var div = sjs.wrapper, txt = document.createTextNode(s);
        div.appendChild(txt);
        s = div.innerHTML;
        div.innerHTML = '';
        return s
    },
    detectStyle:function(type){
        if(!type) return false;
        return type.replace(/-(\w)/i,function(m,ch){// matchAll,match_1,...,match_n, indexOf, str
            return ch.toUpperCase()
        })
    },
    before:function(_n,_c){
        //parent.removeChild(_n);
        _c.parentNode.insertBefore(_n,_c)
    },
    after:function(_n, _c){
        //parent.removeChild(_c);
        _c.parentNode.insertBefore(_n,_c.nextSibling)
    },
    swap:function(cur,nw){
        if(cur.swapNode){this.swap=function(cur,nw){
            return cur.swapNode(nw)
        }}else{this.swap=function(cur,nw){
            var clone=sjs.newText("");//n.cloneNode(false);
            sjs.before(clone,cur); sjs.before(cur,nw);
            clone.parentNode.replaceChild(nw,clone);clone=null;
            return cur
        }}
        return this.swap(cur,nw)
    },
    newTag:function(tag){
        return document.createElement(tag)
    },
    newText:function(txt){
        return document.createTextNode(txt)
    },
    setOpacity:function(_e,_o){
        if (!_e)return false;
        _o=_o||0;
        if (typeof _e.style.opacity=='string'){
            sjs.setOpacity=function(_e,_o){_e.style.opacity=_o}
        }else if (typeof _e.style.MozOpacity=='string'){
            sjs.setOpacity=function(_e,_o){_e.style['MozOpacity']=_o}
        }else if (typeof _e.style.KhtmlOpacity=='string'){
            sjs.setOpacity=function(_e,_o){_e.style['KhtmlOpacity']=_o}
        }else if (_e.filters && sjs.browser.msie){
            sjs.setOpacity=function(_e,_o){    _o*=100;
                var oAlpha=_e.filters['DXImageTransform.Microsoft.Alpha']||_e.filters.alpha;
                if(oAlpha){
                    try{         oAlpha.opacity=_o
                    }catch(err){ _e.style.filter=_e.style.filter.replace(/alpha\([^\)]*\)/i,'')+"alpha(opacity="+_o+")"}
                }else _e.style.filter+='progid:DXImageTransform.Microsoft.Alpha(opacity='+_o+')'
            }
        }else sjs.newError('cant\' find function setOpacity(domObject,opacity)');
        sjs.setOpacity(_e,_o)
    },
    css:function(el,pr){
        if(el.currentStyle){
            this.css=function(el,pr){return el.currentStyle[sjs.detectStyle(pr)]}
        }else if(document.defaultView&&document.defaultView.getComputedStyle){
            this.css=function(el,pr){ var s=document.defaultView.getComputedStyle(el,null);return s.getPropertyValue(pr)}
        }else sjs.newError('cant\' find function css(domObject,rule)');
        return this.css(el,pr)
    },
    getPosition:function(e){
        if(e.getBoundingClientRect){
            this.getPosition=function(e){
                var h=document.documentElement, b=document.body, scrTop=h.scrollTop||b.scrollTop+h.clientTop||b.clientTop,
                    scrLeft=h.scrollLeft||b.scrollLeft+h.clientLeft||b.clientLeft;
                h=null;
                b=e.getBoundingClientRect();
                return {left:parseInt(b.left+scrLeft),top:parseInt(b.top+scrTop)}
            }
        }else{
            this.getPosition=function(e){
                var x = 0, y = 0, es = e.style, restoreStyles = false, el = e;
                if (sjs.css(e,'display') == "none") {
                    var oldVisibility = es.visibility, oldPosition = es.position;
                    restoreStyles = true;
                    es.visibility = "hidden";
                    es.display = "block";
                    es.position = "absolute"
                }
                while(el){
                    x += el.offsetLeft + parseInt(sjs.css(el,'border-left-width')||0)*!sjs.browser.opera;
                    y += el.offsetTop + parseInt(sjs.css(el,'border-top-width')||0)*!sjs.browser.opera;
                    el = el.offsetParent
                }
                while(!sjs.nodeName(e,'body')) {
                    x += e.scrollLeft || 0;
                    y += e.scrollTop || 0;
                    e = e.parentNode
                }
                if (restoreStyles) {
                    es.display = "none";
                    es.position = oldPosition;
                    es.visibility = oldVisibility
                }
                el=e=es=null;
                return {left: x, top: y}
            }
        }
        return this.getPosition(e)
    },
    getSimplePosition:function(el){
        var x = 0,y = 0;
        while(el){
            x += el.offsetLeft;
            y += el.offsetTop;
            el = el.offsetParent;
        }
        return {left:x,top:y}
    },
    isElementPosition:function(el,xy){
        if(!el)return false;
        var s = sjs.getSimplePosition(el),    y=s.top, x=s.left, w=el.offsetWidth, h=el.offsetHeight;
        return (x<xy.x&&(x+w)>xy.x&&y<xy.y&&(y+h)>xy.y)
    },
    isElementPositionRelative:function(el,xy){
        if(!el)return false;
        var y=el.offsetTop,x=el.offsetLeft,w=el.offsetWidth,h=el.offsetHeight;
        return (x<xy.x&&(x+w)>xy.x&&y<xy.y&&(y+h)>xy.y)
    },
    fixPNG:function(el,gif){
        if(sjs.browser.msie&&sjs.browser.version<='6.0'){this.fixPNG=function(el,gif){
            var src;
            if(sjs.nodeName(el,'img')&&/\.png$/i.test(el.src)){
                src=el.src;
                el.src=(gif||'blank.gif')
            }else{
                src=sjs.css(el,'backgroundImage').match(/url\("(.+\.png)"\)/i);
                if(src){
                    src=src[1];
                    el.runtimeStyle.backgroundImage='none'
                }
            }
            if(src)el.runtimeStyle.filter="progid:DXImageTransform.Microsoft.AlphaImageLoader(src='"+src+"',sizingMethod='scale')";
        }}else{
            this.fixPNG=sjs.$empty;
        }
        sjs.fixPNG(el,gif)
    },
    setAttrNode:function(obj,atr,v){
        //if(!obj.attributes) return false;
        try {
            obj.attributes[atr].nodeValue=v;
                } catch(e) {
                    sjs.setAttr(obj,atr,v);
                }
        return true
    },
    getAttrNode:function(obj,atr){
        return obj.attributes&&obj.attributes[atr]&&obj.attributes[atr].nodeValue;
    },
    getAttr:function(obj,atr){
        return obj.getAttribute(atr)
    },
    setAttr:function(obj,atr,v){
        return obj.setAttribute(atr,v)
    },
    hasAttr:function(obj,atr){
        if(obj.hasAttribute){
            sjs.hasAttr=function(obj,atr){return obj.hasAttribute(atr)}
        }else{
            sjs.hasAttr=function(obj,atr){return obj.attributes&&obj.attributes[atr]&&obj.attributes[atr].specified}
        }
        return sjs.hasAttr(obj,atr)
    },
    all:function(obj){
        if(obj.all){sjs.all=function(obj){
            return obj.all
        }}else{ sjs.all=function(obj){
            return obj.getElementsByTagName('*')
        }}
        return sjs.all(obj)
    },
    getElementsByClassName:function(obj,cl){
        if(obj.getElementsByClassName){
            this.getElementsByClassName=function(obj,cl){return obj.getElementsByClassName(cl)}
        }else{
            this.getElementsByClassName=function(obj,className){
                var nodes=sjs.all(obj),i=nodes.length,j=-1, res=[]; className=' '+className+' ';
                while(++j<i) if((' '+nodes[j].className+' ').indexOf(className)+1) res[res.length]=nodes[j];
                return res
            }
        }
        return this.getElementsByClassName(obj,cl)
    },
    addBookMark:function(url,title,a){
        if((typeof window.sidebar=='object')&&sjs.isFn(window.sidebar.addPanel)){ this.addBookMark=function(url,title){
            if(!url) url=location.href; if(!title)title=document.title;
            window.sidebar.addPanel(title,url,'')
        }}else if(typeof window.external=='object'){ this.addBookMark=function(url,title){
            if(!url) url=location.href; if(!title)title=document.title;
            window.external.AddFavorite(url,title)
        }}else if(sjs.browser.opera&&sjs.browser.version>='7.0'){ this.addBookMark=function(url,title,a){
            if(!url) url=location.href; if(!title)title=document.title;
            sjs.setAttr(a,'rel','sidebar');
            sjs.setAttr(a,'href',url);
            sjs.setAttr(a,'title',title);
        }}else return false;
        this.addBookMark(url,title,a)
    },
    selectText:function(obj,i,j){ // domObj, from, to
        if(obj.setSelectionRange){
            sjs.selectText=function(obj,i,j){
                return obj.setSelectionRange(i,j)
            }
        }else if(obj.createTextRange){
            sjs.selectText=function(obj,i,j){
                var txt = obj.createTextRange();
                txt.collapse(true);
                txt.moveStart("character", i);
                txt.moveEnd("character", Math.abs(j-i));
                return txt.select()
            }
        }else sjs.selectText=sjs.$empty;
        return sjs.selectText(obj,i,j);
    },
    setText:function(obj,txt){
        if(typeof obj.textContent=='string'){
            sjs.setText=function(obj,txt){obj.textContent=txt}
        }else if(typeof obj.innerText=='string'){
            sjs.setText=function(obj,txt){obj.innerText=txt}
        }else sjs.newError('can\'t find function: setText(domObject,textContent)');
        sjs.setText(obj,txt)
    },
    getText:function(obj){
        if(typeof obj.textContent=='string'){
            sjs.getText=function(obj){return obj.textContent}
        }else if(typeof obj.innerText=='string'){
            sjs.getText=function(obj){return obj.innerText}
        }else sjs.newError('can\'t find function: getText(domObject)');
        return sjs.getText(obj)
    },
    makeHTML:function(html,root){
        var div=sjs.wrapper,i,tmp;

        div.innerHTML=html;
        if(root&&root.nodeName){
            tmp=div.childNodes; i=0;
            while(tmp[i]) root.appendChild(tmp[i++]);
            tmp=null
        }

        return div.childNodes
    },
    getBrowserWindowScrolls:function(){
        var scroll = {top:0, left:0};
        if (self && self.pageYOffset) {
            scroll.left = self.pageXOffset;
            scroll.top  = self.pageYOffset;
        } else if (document.documentElement && document.documentElement.scrollTop) {
            scroll.left = document.documentElement.scrollLeft;
            scroll.top  = document.documentElement.scrollTop;
        } else if(document.body) {
            scroll.left = document.body.scrollLeft;
            scroll.top  = document.body.scrollTop;
        }
        return scroll;
    },
    getBrowserWindowSize:function(){
        var size={width:0, height:0};
        if(self && self.innerHeight) {
            size.width  = self.innerWidth;
            size.height = self.innerHeight;
        } else if(document.documentElement && document.documentElement.clientHeight) {
            size.width  = document.documentElement.clientWidth;
            size.height = document.documentElement.clientHeight;
        } else if(document.body) {
            size.width  = document.body.clientWidth;
            size.height = document.body.clientHeight;
        }
        return size
    },
    getSize: function(content){
        var m=[
           parseInt(sjs.css(content,'margin-top'))    || 0,
           parseInt(sjs.css(content,'margin-right'))  || 0,
           parseInt(sjs.css(content,'margin-bottom')) || 0,
           parseInt(sjs.css(content,'margin-left'))   || 0
        ], p=[
           parseInt(sjs.css(content,'padding-top'))    || 0,
           parseInt(sjs.css(content,'padding-right'))  || 0,
           parseInt(sjs.css(content,'padding-bottom')) || 0,
           parseInt(sjs.css(content,'padding-left'))   || 0
        ], b=[
           parseInt(sjs.css(content,'border-top-width'))    || 0,
           parseInt(sjs.css(content,'border-right-width'))  || 0,
           parseInt(sjs.css(content,'border-bottom-width')) || 0,
           parseInt(sjs.css(content,'border-left-width'))   || 0
        ];

        return {
          margin:  m,
          padding: p,
          border:  b,
          height: sjs(content).height(),
          width:  sjs(content).width()
        };
    },
    capitalize:function(str){
        var fl = str.charAt(0);

        fl  = fl.toUpperCase();
        str = (str.substr(1) || '').toLowerCase();

        return fl + str;
    },
    pathinfo: function(str) {
        var r = {}, p = str.lastIndexOf('/');

        if (p == -1) {
            r.basename = str;
            r.dirname  = '';
        } else {
            r.basename = str.substr(p + 1);
            r.dirname  = str.substr(0, p);
        }

        p = r.basename.lastIndexOf('.');
        if (p == -1) {
            r.filename  = r.basename;
            r.extension = '';
        } else {
            r.filename  = r.basename.substr(0, p);
            r.extension = r.basename.substr(p + 1);
        }

        return r
    },
    createChunk: function (elms) {
        var wrap = document.createDocumentFragment();
        for (var i = 0, l = elms.length; i < l; i++) {
            wrap.appendChild(elms[i]);
        }
        return wrap;
    }
});

sjs.when = function (promise, onOk, onErr) {
    if (promise.resolve) {
        return promise.resolve(onOk).reject(onErr);
    } else {
        return onOk.call(promise, promise);
    }
};

sjs.promise = function () {
    this.callbacks = { ok: [], err: [] };
    this.state = null;
};

sjs.promise.prototype = {
    _call: function (type, object) {
        var fns = this.callbacks[type], i = fns.length;
        while (i--) {
            fns[i].call(this, object);
        }
    },
    resolve: function (obj) {
        if (sjs.isFn(obj)) {
            this.callbacks.ok.push(obj);
        } else {
            this.state = true;
            this._call('ok', obj);
        }
        return this;
    },
    reject: function (obj) {
        if (sjs.isFn(obj)) {
            this.callbacks.err.push(obj);
        } else {
            this.state = false;
            this._call('err', null);
        }
        return this;
    },
    isOk: function () {
        return this.state === true
    },
    isErr: function () {
        return this.state === false
    },
    isResolved: function () {
        return this.state !== null
    }
};

sjs.ScrollableContent = new sjs.plugin({
    __construct: function (content, options) {
        options = options || {};
        var self = this;
        this.cfg = {};
        this.page   = options.page || 1;
        this.cfg.gt = options.gt || 3;
        this.cfg.data = options.data || {};
        this.cfg.url  = options.url;
        this.loaded   = {};
        this.events   = {
            load: new sjs.promise(),
            data: new sjs.promise()
        };

        sjs(content).mousewheel(function() {
            if (this.scrollHeight - this.scrollTop <= this.scrollHeight / self.cfg.gt
                || this.offsetHeight + this.scrollTop >= this.scrollHeight
            ) {
                self.load()
            }
        });
    },
    load: function (force) {
        var self = this, key = this.page;
        if (!force && this.loaded[key]) {
            return false;
        }

        this.cfg.data.page = this.page;
        self.events.data.resolve(this.cfg.data);

        this.loaded[key] = true;
        sjs.query(this.cfg.url, this.cfg.data, function (js, html) {
            self.events.load.resolve({
                js: js,
                html: html,
                loader: self
            });
        }, 1);
    },
    on: function (event, fn) {
        this.events[event].resolve(fn);
        return this;
    },
    clearCache: function () {
        this.loaded = {};
        return this;
    }
});

(function(){var b=navigator.userAgent.toLowerCase(), opera=b.indexOf('opera')!=-1, webkit=b.indexOf('webkit')!=-1;
    sjs.browser={
        lang:navigator.language||navigator.userLanguage,
        version:(b.match( /.+(?:rv|it|ra|ie|version|firefox)[\/: ]([\d.]+)/)||[0,'0'])[1],
        safari:webkit,
        opera:opera,
        msie:b.indexOf('msie')!=-1&&!opera,
        mozilla:b.indexOf('mozilla')!=-1&&(b.indexOf('compatible') + webkit == -1)
    }
})();
sjs.attrMap={
    $for:'htmlFor',
    $float:sjs.browser.msie?'styleFloat':'cssFloat',
    $pointer:sjs.browser.msie&&sjs.browser.version<='5.5'?'hand':'pointer'
};
sjs.support={
    svg:window.SVGPreserveAspectRatio&&window.SVGPreserveAspectRatio.SVG_PRESERVEASPECTRATIO_XMINYMIN==2,
    vml:sjs.browser.msie&&sjs.browser.version>='5.5'
};
['click','mousemove','mouseout','mouseover','mousedown','mouseup','contextmenu','dblclick','keydown','keypress','keyup','submit','focus','change','blur','reset','scroll'].iterate(function(e){sjs.prototype[e]=function(){return this.on(e).add.apply(this,arguments)}});
['#','.','tag'].iterate(function(s){sjs.selectors['~'][s]=sjs.selectors['+'][s]});
['push','sort','splice'].iterate(function(fn){sjs.prototype[fn]=this[fn]});
sjs.event.level3.add(window,'unload',sjs.cleanUp,false);
if(sjs.browser.mozilla||sjs.browser.opera){
    document.addEventListener("DOMContentLoaded",sjs.ready,false);
}else if(sjs.browser.msie){
    document.write('<scr'+'ipt id="__ie_ready" defer="true" '+'src="//:"><\/script>');
    var scr=document.getElementById("__ie_ready");
    if(scr)scr.onreadystatechange=function(){
        if(this.readyState!="complete")return;
        this.parentNode.removeChild(this);
        sjs.ready()
    };scr=null
}else if(sjs.browser.safari){
    var __safari_ready=setInterval(function(){if(document.readyState=="loaded"||document.readyState=="complete"){
        clearInterval(__safari_ready);    __safari_ready=null;
        sjs.ready()
    }},10);
}else sjs.event.level3.add(window,'onload',sjs.ready);
