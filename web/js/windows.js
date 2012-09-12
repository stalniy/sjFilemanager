/**
 * This file is part of the sjFilemanager package.
 * (c) 2010-2011 Stotskiy Sergiy <serjo@freaksidea.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */
/**
 * Window manager functionality
 *
 * @package    sjFilemanager
 * @author     Stotskiy Sergiy <serjo@freaksidea.com>
 * @version    SVN: $Id$
 */
sjs.globals.windows={};
/*
@cfg={
    title: text_string
        title for Window
    tmb: imageUrl
        image use for Window
    useTagAsWindow: (1|0)
        flag use object cfg.tmpl as Window object without cloning
    tmpl: (css_selector_string|domObject)
        this object cloning if @useTagAsWindow=0 or simple use if @useTagAsWindow=1 as Window object;
        if this param is empty then the Class create a DIV tag and use it as Window object
    move: (1|cfgObject)
        if @move=1 use simple type of move if @move=cfgObject use special type of move with special params (see sjWindow.move)
    useSelf: (1|0)
        if @useSelf=0 create clone of Window else use own Window
    isModal: (1|0)
        if @isModal=1 create a DIV tag else as modal Window use a domObject
    resizable: (1|0)
        this flag show that the window can be resized or not
    content: string
        html content for Window (has higher priority than using this.url)
    action: (111|011|...|000)
        this flag show some Window actions as close,maximize,minimize
    postData: object
        this object use as data for gettings Window content, consists some params for server script
    randPosition: (1|0)
        if @randPosition=1 Window position with creating new Window will be random
        if @randPosition=0 Window position with creating new Window will be centered (html, body {height:100%; width:100%;}
    arguments: mixed
        arguments for window onload callback
}
*/
var sjWindow = new sjs.plugin({
    __construct:function(url,cfg,onload){
        this.id         = null;
        this.url     = url;
        this.clone     = null;
        this.modal     = null;
        this.window     = null;
        this.onload     = onload;
        this.onclose = null;
        this.moveCfg = null;
        this.resizeCfg    = null;
        this.onmaximize   = null;
        this.onunmaximize = null;
        this.onminimize   = null;
        this.onChangeSize = cfg.onChangeSize;
        this.arguments    = cfg.arguments || {};
        this.randPosition = cfg.randPosition;

        this.initialize(cfg)
    },
    __destruct:function(){
        sjWindow.count--;
        this.resizeCfg=this.moveCfg=this.modal=this.onload=sjs.globals.windows[this.id]=this.onclose=this.window=this.url=null;
        delete this.moveCfg;
        delete this.resizeCfg;
        delete sjs.globals.windows[this.id];
        this.onunmaximize=this.onmaximize=this.onminimize=this.clone=this.id=null;
        this.arguments = null
    },
    initialize:function(cfg){
        if(cfg.useTagAsWindow)
            this.window=sjs(cfg.tmpl);
        else if(cfg.tmpl)
            this.window=sjs(sjs.querySelector(cfg.tmpl)[0].cloneNode(1));
        else
            this.window=sjs('<div><div class="sjs_wcontent"></div></div>');

        this.id=this.window.css({
            position:'absolute',
            display:'none',
            zIndex:sjWindow.max_zIndex++
        }).setClass('sjs_window').attr('id','sjs_window_'+(++sjWindow.count)).onEvent('mousedown',function(){
            if(sjWindow.count>1){
                this.style.zIndex=sjWindow.max_zIndex++;
                var wObj=sjs.globals.windows[this.sjsEventId];
                if(wObj.clone) wObj.clone.style.zIndex=sjWindow.max_zIndex++;
                wObj=null
            }
        })[0].sjsEventId;
        this.window=this.window[0];
        var topPart=this.attachTitle(cfg.title,cfg.tmb);
        if(cfg.action && cfg.action!='111') {
            content=this.find('.sjs_waction a');
            for(var i=0;i<3;i++) if(cfg.action.charAt(i)!='1') content[i].style.display='none'
        }
        if(cfg.resizable) {
            this.attachResize(cfg.useSelf);
        }
        if(cfg.isModal) {
            this.setModal();
        }
        document.body.appendChild(this.window);
        this.position(cfg.randPosition);
        if(!cfg.useSelf && (cfg.move || cfg.resizable)) {
            this.attachClone();
        }
        if(cfg.move) {
            this.attachMove(topPart,cfg.move,cfg.useSelf);
        }
        if(this.url && !cfg.content) {
            this.getContent(cfg.postData);
        } else {
            this.setContent(cfg.content);
        }
        sjs.globals.windows[this.id]=this;
        topPart=img=content=null
    },
    attachTitle:function(title,tmb){
        var topPart=sjs('.sjs_wtop',this.window).unselectable();
        topPart.find('.sjs_waction').onEvent('click',this.action,this.id).onEvent('mousedown',function(e){e.cancelBubble=true});
        topPart.find('.sjs_wtitle').text(title).unselectable();
        try{
            topPart.find('img')[0].sjs_window_src=tmb
        }catch(e){
            this.onChangeContent=function(){ return this.toContentSize()};
        }
        return topPart
    },
    setArguments: function(args){
        sjs.extend(this.arguments, args);
        return this;
    },
    attachMove:function(topPart,cfg,self){
        if(typeof cfg != 'object') cfg={};
        if(self){
            cfg.caller='window'
        }else{
            cfg.caller='clone';
            this.onDragStart=function(e){
                var wObj = sjs.globals.windows[this.parentNode.sjsEventId];
                wObj.showClone();
                sjWindow.prototype.onDragStart.call(this,e)
            };
            this.onDragEnd=function(cfg){
                var main=sjs.globals.windows[cfg.id].window;
                if(cfg.animate){
                    sjs(main).animate('left',{
                        start:main.offsetLeft, end:this.offsetLeft
                    },.5).animate('top',{start:main.offsetTop, end:this.offsetTop},.5);
                }else{
                    main=main.style;
                    main.left=this.offsetLeft+'px';
                    main.top=this.offsetTop+'px';
                }
                sjWindow.prototype.onDragEnd.apply(this,arguments);
                this.style.display='none';
                main=cfg=null
            }
        }
        topPart.onEvent('mousedown',this.onDragStart);
        cfg.onDragEnd=this.onDragEnd;
        cfg.id=this.id;
        this.moveCfg=cfg;
        topPart=cfg=null
    },
    onDragStart:function(e){
        var xy=sjs.event.xy(e), wObj=sjs.globals.windows[this.parentNode.sjsEventId],cfg=wObj.moveCfg;
        cfg._x=xy.x-wObj[cfg.caller].offsetLeft;
        cfg._y=xy.y-wObj[cfg.caller].offsetTop;
        sjs(document).on('mouseup').add(sjs.stopDrag,sjs.startDrag(wObj[cfg.caller],cfg));
        cfg=wObj=null
    },
    onDragEnd:function(cfg){
        sjs(document).dettach('mouseup',sjs.stopDrag)
    },
    setModal:function(){
        var modal=sjs.newTag('div');
        modal.style.backgroundColor='#fff';
        document.body.appendChild(modal);
        sjs.setOpacity(modal,0.6);
        this.setModalPosition(modal);
        modal.style.zIndex=this.window.style.zIndex;
        sjWindow.max_zIndex=++this.window.style.zIndex;
        this.modal=modal;
        return this;
    },
    setModalPosition:function(modal){
        if(sjs.browser.msie&&sjs.browser.version<='6.0'){
            sjWindow.prototype.setModalPosition=function(modal){
                modal=modal.style;
                modal.position='absolute';
                modal.top='0px';
                modal.left='0px';
                modal.height=document.documentElement.scrollHeight||document.body.scrollHeight+'px';
                modal.width=document.documentElement.scrollWidth||document.body.scrollWidth+'px'
            }
        }else{
            sjWindow.prototype.setModalPosition=function(modal){
                modal=modal.style;
                modal.position='fixed';
                modal.top='0px';
                modal.left='0px';
                modal.height='100%';
                modal.width='100%'
            }
        }
        this.setModalPosition(modal);
        return this;
    },
    attachResize:function(self){
        if(!sjs.className.has(this.window,'sjsResizable')) {
            sjs.className.set(this.window,'sjsResizable');
        }
        if(!self){
            this.onResizeEnd=function(cfg){
                var ws=sjs.globals.windows[cfg.id].window.style,ts=this.style;
                ws.top=this.offsetTop+'px';
                ws.left=this.offsetLeft+'px';
                ws.height=ts.height;
                ws.width=ts.width;
                ts.display='none';
                sjWindow.prototype.onResizeEnd.apply(this,arguments);
                cfg=ws=ts=null
            };
            this.onResizeStart=function(e,id){
                var $this=sjs.event.caller(e);
                if(!sjs.className.has($this,'sjsResize')) return false;
                var wObj=sjs.globals.windows[id],cfg=wObj.resizeCfg;
                wObj.showClone();
                cfg.type=$this.id;
                wObj.clone.style.display='block';
                sjs(document).on('mouseup').add(sjs.stopResize,sjs.startResize(wObj.clone,cfg));
                cfg=wObj=null
                return false;
            }
        }
        this.resizeCfg={
            id:this.id,
            _x:1,
            _y:1,
            onResizeEnd:this.onResizeEnd
        };
        sjs('.sjs_resize',this.window).onEvent('mousedown',this.onResizeStart,this.id)
    },
    onResizeStart:function(e,id){
        var $this=sjs.event.caller(e);
        if(!sjs.className.has($this,'sjsResize')) return false;
        var wObj=sjs.globals.windows[id],cfg=wObj.resizeCfg;
        cfg.type=$this.id;
        sjs(document).on('mouseup').add(sjs.stopResize,sjs.startResize(wObj.window,cfg));
        cfg=wObj=content=null
    },
    onResizeEnd:function(cfg){
        sjWindow.expandContent(sjs.globals.windows[cfg.id].window);
        sjs(document).dettach('mouseup',sjs.stopResize);
        cfg=null
    },
    getContent:function(postData){
        var onload=function(js,html){
            var wObj=sjs.globals.windows[arguments.callee.id];
            wObj.setContent(html,new Array(js,html));
            arguments.callee.id=js=null
        };
        onload.id=this.id;
        sjs.query(this.url,postData,onload,1)
    },
    setContent:function(html, args){
        var content=sjs('.sjs_wcontent', this.window);

        if (typeof html != 'undefined') {
            if (typeof html != 'object') {
                content.html(html)
            } else {
                content.append(html)
            }
        }
        sjs(this.window).css('display', 'block');
        this.onChangeContent(sjs('.upload_img',this.window));
        if(sjs.isFn(this.onload)) this.onload.apply(this,[content].concat(args));

    },
    onChangeContent:function(img){
        if(img[0].sjs_window_src){
            this.getContent=function(){
                var img=sjs('.upload_img',this.window).attr('src',sjs.getAttr(img[0],'alt'));
                sjWindow.prototype.getContent.apply(this,arguments);
            };
            this.onChangeContent=function(img){
                img.attr('src',img[0].sjs_window_src);
                return this.toContentSize()
            }
        }else{
            this.onChangeContent=function(img){
                img.css('display','none');
                return this.toContentSize()
            };
            this.getContent=function(){
                sjs('.upload_img',this.window).css('display','');
                sjWindow.prototype.getContent.apply(this,arguments)
            }
        }
        return this.onChangeContent(img)
    },
    attachClone:function(){
        var clone=sjs(this.window.cloneNode(0));
        clone.css({
            position: 'absolute',
            display: 'none',
            visibility: 'visible',
            zIndex:sjWindow.max_zIndex++,
            width: this.window.offsetWidth + 'px',
            height: this.window.offsetHeight + 'px'
        }).appendTo(document.body)[0].id='';
        this.clone=clone[0];
        clone[0].className='sjs_window sjsClone';
        return this;
    },
    showClone: function() {
        sjs(this.clone).css({
            display: 'block',
            zIndex: sjWindow.max_zIndex + 1,
            width:  this.window.offsetWidth + 'px',
            height: this.window.offsetHeight + 'px',
            top:    this.window.offsetTop + 'px',
            left:   this.window.offsetLeft + 'px'
        });
        return this;
    },
    action:function(e,id){
        e.cancelBubble=true;
        var a=sjs.event.caller(e);
        if(!sjs.nodeName(a,'a')) return false;
        var wObj=sjs.globals.windows[id];
        switch(a.className){
            case 'close':
                wObj.close(e,a);
            break;
            case 'minimize':
                if(sjs.isFn(wObj.onminimize)) wObj.onminimize(e,a);
            break;
            case 'maximize':
                if(sjs.isFn(wObj.onmaximize)) wObj.onmaximize(e,a);
                a.className = 'unmaximize';
            break;
            case 'unmaximize':
                if(sjs.isFn(wObj.onunmaximize)) wObj.onunmaximize(e,a);
                a.className = 'maximize';
            break;
        }
        a=w=null;
        return false
    },
    position:function(rand){
        var sz  = sjs.getBrowserWindowSize(),
            scr = sjs.getBrowserWindowScrolls();
        if(rand){
            this.window.style.top = sjs.rand(scr.top+10, sz.height/2 + scr.top)+'px';
            this.window.style.left = sjs.rand(scr.left+100, sz.width/2 + scr.left)+'px'
        }else{

            var w=sjs(this.window), top = (sz.height-w.height())/2+scr.top,
                left = (sz.width-w.width())/2+scr.left;
            this.window.style.top  = (top <= 0 ? 10 : top) + 'px';
            this.window.style.left = (left <= 0 ? 10 : left) + 'px';
        }
        return this
    },
    setSize:function(w,h){
        this.window.style.width=w+'px';
        this.window.style.height=h+'px';
        this.position(this.randPosition);
        return sjWindow.expandContent(this.window)
    },
    close:function(e,callBy){
        var result = true;
        if (sjs.isFn(this.onclose)) {
            result = this.onclose(e,callBy);
        }
        if (result !== false) {
            this.window.parentNode.removeChild(this.window);
            if (this.modal) {
                this.modal.parentNode.removeChild(this.modal);
            }
            if (this.clone) {
                this.clone.parentNode.removeChild(this.clone);
            }
            this.__destruct()
        }
    },
    display: function(type){
        var s = [this.window, this.modal], i = s.length;
        type = type == 'show' ? 'block' : 'none';
        while(i--) {
            if (s[i]) {
                s[i].style.display = type;
                if (type == 'block') {
                    s[i].style.zIndex = sjWindow.max_zIndex++;
                }
            }
        }
        return this;
    },
    show: function(){
        if (!sjs.isFn(this.onShow) || this.onShow() !== false) {
            this.display('show');
        }
        return this;
    },
    hide: function(){
        if (!sjs.isFn(this.onHide) || this.onHide() !== false) {
            this.display('hide');
        }
        return this;
    },
    toContentSize:function(){
        var content = sjs('.sjs_wcontent', this.window);

        /*if (content.getStyle('position') == 'absolute') {
          if (!sjs.isFn(this.onChangeSize) || this.onChangeSize(content) !== false) {
             var size = sjs.getSize(content);

             this.setSize(
                size.width + size.margin[1] + size.margin[3] + size.padding[1] + size.padding[3],
                size.height + size.margin[0] + size.margin[2] + size.padding[0] + size.padding[2]
             )
          } else {

          }
        }*/
        sjs.isFn(this.onChangeSize) && this.onChangeSize(content);
        if (this.resizeCfg) {
            sjWindow.expandContent(this.window, content);
        }

        return content;
    },
    toInnerSize: function(){
        var content = this.find('.sjs_wcontent'), size  = content.getSize(),
            width  = size.margin[1]  + size.margin[3],
            height = size.margin[0]  + size.margin[2];
        sjs(this.window).css({
            width: size.width + width + 'px'
        });

        return content;
    },
    find: function(sel){
        return sjs(sel, this.window);
    },
    getBody: function () {
        return this.find('.sjs_wcontent');
    }
});
sjWindow.count=0;
sjWindow.max_zIndex=1000;
sjWindow.expandContent=function(w,content){
    var content=content||sjs('.sjs_wcontent',w),
       size = content.sjs && content.getSize() || sjs.getSize(content),
       height = 0, width = 0;

    for (var v in size) {
        if (size[v].constructor == Array) {
            height += size[v][0] + size[v][2];
            width  += size[v][1] + size[v][3];
        }
    }

    size = content.parent().getSize();
    height += size.padding[0] + size.padding[2];
    width += size.padding[1] + size.padding[3];

    content.css({
        height: sjs(w).height() - height - sjs('.sjs_wtop', w).height() + 'px',
        width:  sjs(w).width()  - width  +'px'
    });
    return content
};
sjWindow.renderView = function(className) {
    var actions = sjs('<div class="sjs_waction" />')
        .append('<a href="#" class="minimize" tabindex="0" />')
        .append('<a href="#" class="maximize" tabindex="0" />')
        .append('<a href="#" class="close" tabindex="0" />');

    var wrap = sjs('<div id="sjWindowTmpl" class="hide ie6_width_fix" />')
        .append('<div class="sjs_wtop" />')
        .append('<div class="window_main" />')
        .append('<div class="sjs_resize" />');

    var resizeHtml = '', r = ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'],
        i = r.length;

    while (i--) {
        resizeHtml += '<span class="sjsResize ' + r[i] + '" id="' + r[i] + '"></span>';
    }

    wrap.setClass(className)
        .first().append('<div class="sjs_wltitle" />')
            .append('<div class="sjs_wrtitle" />')
            .append('<div class="sjs_wtitle" />')
            .append(actions)
        .next().append('<div class="bbottom" />')
            .append('<div class="bleft" />')
            .append('<div class="bright" />')
            .append('<div class="sjs_wcontent" />')
        .next().html(resizeHtml);

    return wrap.appendTo(document.body);
};
