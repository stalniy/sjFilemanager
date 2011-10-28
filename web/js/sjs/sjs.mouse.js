sjs.globals.drag={};

sjs.startDrag=function(obj,cfg){
	sjs.event.unselect(document.documentElement);
	cfg=cfg||{};
	cfg._x=cfg._x||0; cfg._y=cfg._y||0;
	cfg.target=obj;
	//if(!obj.sjsEventId) obj.sjsEventId=++sjs.count;
    if (cfg.onMove && !sjs.isFn(cfg.onMove)) {
        cfg.onMove = false;
    }
	sjs.globals.drag[obj.sjsEventId]=cfg;
	sjs(document).on('mousemove').add(sjs.ui.move[cfg.type],obj.sjsEventId);
	cfg=null;
	return obj.sjsEventId
};
sjs.stopDrag=function(e,id){
	var cfg=sjs.globals.drag[id];
	if(!cfg) return false;
	sjs.event.select(document.documentElement);
	if(sjs.isFn(cfg.onDragEnd)) cfg.onDragEnd.call(cfg.target,cfg,id,e);
	delete sjs.globals.drag[id];
	sjs(document).dettach('mousemove',sjs.ui.move[cfg.type]);
	cfg=cfg.target=null;
	return true
};
sjs.stopDragAll=function(e){
	for(var id in sjs.globals.drag) sjs.stopDrag(e,id)
};

sjs.ui.move={
	'undefined':function(e,id){
		var xy=sjs.event.xy(e), cfg=sjs.globals.drag[id];
		cfg.target.style.top=xy.y-cfg._y+'px';
		cfg.target.style.left=xy.x-cfg._x+'px';

        if (cfg.onMove) {
            cfg.onMove.call(cfg.target, xy.x-cfg._x, xy.y-cfg._y, cfg);
        }
		sjs.event.preventDefault(e);
	},
	horizontal:function(e,id){
		var xy=sjs.event.xy(e), cfg=sjs.globals.drag[id];
		cfg.target.style.left=xy.x-cfg._x+'px';
        if (cfg.onMove) {
            cfg.onMove.call(cfg.target, xy.x-cfg._x, null, cfg);
        }
		sjs.event.preventDefault(e);
	},
	vertical:function(e,id){
		var xy=sjs.event.xy(e), cfg=sjs.globals.drag[id];
		cfg.target.style.top=xy.y-cfg._y+'px';
        if (cfg.onMove) {
            cfg.onMove.call(cfg.target, null, xy.y-cfg._y, cfg);
        }
		sjs.event.preventDefault(e);
	},
	grid:function(e,id){
		var xy=sjs.event.xy(e),cfg=sjs.globals.drag[id], drag=cfg.target,
            y=xy.y-cfg._y, x=xy.x-cfg._x, posX = null, posY = null,
            where=null;
		if(Math.abs(x-drag.offsetLeft)>=cfg.gridX){
			where=(x<drag.offsetLeft)?-cfg.gridX:cfg.gridX;
			drag.style.left=drag.offsetLeft+where+'px'
            posX = drag.offsetLeft+where;
		}
		if(Math.abs(y-drag.offsetTop)>=cfg.gridY){
			where=(y<drag.offsetTop)?-cfg.gridY:cfg.gridY;
			drag.style.top=drag.offsetTop+where+'px'
            posY = drag.offsetTop+where;
		}
        if (cfg.onMove) {
            cfg.onMove.call(cfg.target, posX, posY, cfg);
        }
		sjs.event.preventDefault(e);
	},
	bounds:function(e,id){
		var xy=sjs.event.xy(e), cfg=sjs.globals.drag[id], drag=cfg.target, y=xy.y-cfg._y, x=xy.x-cfg._x;
		if(x<=cfg.left) x=cfg.left;
		else if(x+drag.offsetWidth>=cfg.right) x=cfg.right-drag.offsetWidth;
		if(y<=cfg.top) y=cfg.top;
		else if(y+drag.offsetHeight>=cfg.bottom) y=cfg.bottom-drag.offsetHeight;
		drag.style.left=x+'px';
		drag.style.top=y+'px';
        if (cfg.onMove) {
            cfg.onMove.call(cfg.target, x, y, cfg);
        }
        sjs.event.preventDefault(e);
    },
	offsetBounds:function(e,id){
		var xy = sjs.event.xy(e), cfg = sjs.globals.drag[id], drag = cfg.target,
            y = xy.y - cfg._y, x = xy.x - cfg._x,
            p = drag.parentNode;
		if (x <= cfg.left - p.offsetLeft) {
            x = cfg.left - p.offsetLeft;
        } else if (x + drag.offsetWidth >= cfg.right - p.offsetLeft) {
            x = cfg.right - drag.offsetWidth - p.offsetLeft;
        }
		if (y <= cfg.top-p.offsetTop) {
            y = cfg.top - p.offsetTop;
        } else if (y + drag.offsetHeight >= cfg.bottom - p.offsetTop) {
            y = cfg.bottom - drag.offsetHeight - p.offsetTop;
        }
        drag.style.left = x + 'px';
        drag.style.top  = y + 'px';
        if (cfg.onMove) {
            cfg.onMove.call(cfg.target, x, y, cfg);
        }
        sjs.event.preventDefault(e);
	},
    parentOffset: function(e, id) { // cfg.target.offsetParent == cfg.target.parentNode
		var xy = sjs.event.xy(e), cfg = sjs.globals.drag[id], drag = cfg.target,
            y = xy.y - cfg._y, x = xy.x - cfg._x,
            p = drag.parentNode;

        if (x <= 0) {
            x = 0;
        } else if (x + drag.offsetWidth >= p.offsetWidth) {
            x = p.offsetWidth - drag.offsetWidth;
        }

        if (y <= 0) {
            y = 0;
        } else if (y + drag.offsetHeight >= p.offsetHeight) {
            y = p.offsetHeight - drag.offsetHeight;
        }
		drag.style.left = x + 'px';
		drag.style.top  = y + 'px';
        if (cfg.onMove) {
            cfg.onMove.call(cfg.target, x, y, cfg);
        }
        sjs.event.preventDefault(e);
    }
};

sjs.globals.resize = {};
sjs.startResize = function(obj, cfg) {
    var resizeId = obj.sjsEventId;
    cfg = cfg || {};
    cfg._x = cfg._x || 0;
    cfg._y = cfg._y || 0;
    cfg.r = {};
    cfg.r.fn = 'resize';
    cfg.r.target = obj;

    //cfg.r.rect = sjs.ui.resize._getPosition(obj);
    sjs.ui.resize._prepareObject(obj, cfg);
    if (cfg.proportions) {
        cfg.r.proportions = sjs(obj).width() / sjs(obj).height();
    }
    if (cfg.selection) {
        cfg.r._fn = cfg.r.fn;
        cfg.r.fn = 'selection';
    }
    if (cfg.onResize && !sjs.isFn(cfg.onResize)) {
        cfg.onResize = false;
    }
	sjs(document).on('mousemove').add(sjs.ui.resize[cfg.r.fn], resizeId);
    sjs.event.unselect(document.documentElement);
	sjs.globals.resize[resizeId]=cfg;
	return resizeId;
};

sjs.stopResize=function(e, id){
	var cfg=sjs.globals.resize[id];
	if (!cfg) {
        return false;
    }
	sjs.event.select(document.documentElement);
	if (sjs.isFn(cfg.onResizeEnd)) {
        cfg.onResizeEnd.call(cfg.r.target, cfg, id, e);
    }
	sjs(document).dettach('mousemove', sjs.ui.resize[cfg.r.fn]);
    sjs.globals.resize[id] = null;
	delete sjs.globals.resize[id];
	return true
};

sjs.ui.resize={
    _setPos:function(){
        var h=document.documentElement.style,b=document.body.style;
        h.width=b.width=h.height=b.height='100%';
        h=b=null;
        if(sjs.browser.msie&&sjs.browser.version<='6.0'){
            this._setPos=function(obj,rule,pr,val,type){
                var h=obj.offsetParent||document.documentElement,
                    v=h[pr]-val+(h['scroll'+type]||0)+(h['client'+type]||0);
                if (rule) {
                    obj.style[rule]=v+'px';
                }
                return v
            }
        }else{
            this._setPos=function(obj,rule,pr,val){
                var h=obj.offsetParent||document.documentElement,
                    v = h[pr]-val;
                if (rule) {
                    obj.style[rule]=v+'px';
                }
                return v
            }
        }
        return this._setPos.apply(this,arguments)
    },
    _getPosition: function(obj) {
        return {
            bottom: this._setPos(obj, false, 'clientHeight', obj.offsetHeight + obj.offsetTop, 'Top'),
            right:  this._setPos(obj, false, 'clientWidth', obj.offsetWidth + obj.offsetLeft, 'Left'),
            top: obj.offsetTop,
            left: obj.offsetLeft
        }
    },
    _prepareObject: function(obj, cfg) {
        var char=(cfg.type || '').charAt(0);
        switch(char){
            case 'n':
                cfg.r.y=obj.offsetHeight+obj.offsetTop;
                cfg.r.oY=-1;
                cfg.r.fn='resizeHeight';
                this._setPos(obj, 'bottom', 'clientHeight', obj.offsetHeight + obj.offsetTop, 'Top')
                obj.style.top='auto';
            break;
            case 's':
                cfg.r.y=obj.offsetTop;
                cfg.r.oY=1;
                cfg.r.fn='resizeHeight';
                obj.style.top=cfg.r.y+'px';
                obj.style.bottom='auto';
            break;
        }
        char=cfg.type.charAt(1)||char;
        switch(char){
            case 'w':
                cfg.r.x=obj.offsetWidth+obj.offsetLeft;
                cfg.r.oX=-1;
                cfg.r.fn=(cfg.r.oY) ? 'resize' : 'resizeWidth';
                this._setPos(obj, 'right', 'clientWidth', obj.offsetWidth + obj.offsetLeft, 'Left')
                obj.style.left='auto';
            break;
            case 'e':
                cfg.r.x=obj.offsetLeft;
                cfg.r.oX=1;
                cfg.r.fn=(cfg.r.oY) ? 'resize' : 'resizeWidth';
                obj.style.left=cfg.r.x+'px';
                obj.style.right='auto';
            break;
        }
        cfg.r.x-=cfg._x;
        cfg.r.y-=cfg._y;
    },
    _switchType: function(cfg, _1, _2) {
        var mapper = {n: 's', s: 'n', e: 'w', w: 'e'}, tmp = cfg.type.charAt(1),
            type = cfg.type.charAt(0);
        if (_1) {
            cfg.r.target.style.height = '0px';
            type = mapper[cfg.type.charAt(0)];
        }
        if (_2) {
            cfg.r.target.style.width = '0px';
            tmp = mapper[cfg.type.charAt(1)];
            if (cfg.type.length == 1) {
                type = mapper[cfg.type.charAt(0)];
            }
        }
        if (tmp) {
            type += tmp;
        }
        if (cfg.type != type) {
            cfg.type = type;
            tmp = cfg.r.fn;
            this._prepareObject(cfg.r.target, cfg);
            cfg.r.fn = tmp;
        }
    },
    _setWidth: function(w, cfg) {
        var e = cfg.r.target;
        if (cfg.parentOffset) {
            var p = e.parentNode, type = cfg.type.charAt(1) || cfg.type;
            if (type == 'w' && (w > e.offsetWidth && e.offsetLeft == 0 || e.offsetLeft < 0)) {
                w = e.offsetWidth + e.offsetLeft;
            } else if (type == 'e' && (w > e.offsetWidth
                && w + e.offsetLeft == p.offsetWidth || w + e.offsetLeft > p.offsetWidth)
            ) {
                w = p.offsetWidth - e.offsetLeft;
            }
        }
        e.style.width = w + 'px';
        return w;
    },
    _setHeight: function(h, cfg) {
        var e = cfg.r.target;
        if (cfg.parentOffset) {
            var p = e.parentNode, type = cfg.type.charAt(0);
            if (type == 'n' && (h > e.offsetHeight && e.offsetTop == 0 || e.offsetTop < 0)) {
                h = e.offsetHeight + e.offsetTop;
            } else if(type == 's' && h > e.offsetHeight
                && (h + e.offsetTop == p.offsetHeight || h + e.offsetTop > p.offsetHeight)
            ) {
                h = p.offsetHeight - e.offsetTop;
            }
        }
        e.style.height = h + 'px';
        return h;
    },
	resizeHeight:function(e,id){
		var xy=sjs.event.xy(e), cfg=sjs.globals.resize[id],
            h = (xy.y - cfg.r.y) * cfg.r.oY;

        h = sjs.ui.resize._setHeight(h, cfg);
		sjs.event.preventDefault(e);
        if (cfg.onResize) {
            cfg.onResize.call(cfg.r.target, null, h, cfg)
        }
	},
	resizeWidth:function(e,id){
		var xy = sjs.event.xy(e), cfg = sjs.globals.resize[id],
            w = (xy.x - cfg.r.x) * cfg.r.oX;

        w = sjs.ui.resize._setWidth(w, cfg);
        sjs.event.preventDefault(e);
        if (cfg.onResize) {
            cfg.onResize.call(cfg.r.target, w, null, cfg)
        }
	},
	resize:function(e,id){
		var xy=sjs.event.xy(e), cfg=sjs.globals.resize[id],
            w = 0, h = (xy.y - cfg.r.y) * cfg.r.oY;

        h = sjs.ui.resize._setHeight(h, cfg);
        if (cfg.proportions) {
            w = h * cfg.r.proportions;
        } else {
            w = (xy.x - cfg.r.x) * cfg.r.oX
        }
        w = sjs.ui.resize._setWidth(w, cfg);
		sjs.event.preventDefault(e);
        if (cfg.onResize) {
            cfg.onResize.call(cfg.r.target, w, h, cfg)
        }
	},
    selection: function(e,id) {
        var xy=sjs.event.xy(e), cfg=sjs.globals.resize[id],
            x = (xy.x-cfg.r.x)*cfg.r.oX, y = (xy.y - cfg.r.y) * cfg.r.oY,
            isX = cfg.r.target.clientWidth == 0 || x <= 0,
            isY = cfg.r.target.clientHeight == 0 || y <= 0;

        if (isX || isY) {
            sjs.ui.resize._switchType(cfg, isY, isX);
        }
        sjs.ui.resize[cfg.r._fn].call(this,e,id);
        sjs.event.preventDefault(e);
    }
};
