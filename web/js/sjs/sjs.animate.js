/*
 * This file is part of the SJS package.
 * (c) 2010-2011 Stotskiy Sergiy <serjo@freaksidea.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */
/**
 * Animate functionality
 *
 * @package    SJS
 * @author     Stotskiy Sergiy <serjo@freaksidea.com>
 * @version    SVN: $Id$
 */
sjs.globals.anime={};
sjs.prototype.animate=function(type,cfg,time,nocashe){
	if(cfg.start==cfg.end) return this;
	var animeType='boundRect',style='linear';
	cfg.time=time*1000;
	cfg.type=sjs.detectStyle(type);
	cfg.fps=(1/cfg.fps).round(3)||.02;
	cfg.delta=cfg.end-cfg.start;
	cfg.unit=cfg.unit||'px';
	cfg.onlyInit=!cfg.onlyInit;
	if(type.indexOf('color')+1){
		var i=3; cfg.delta=[]; style='simple'; animeType='color';
		cfg.start=cfg.start.hex2rgb();
		cfg.end=cfg.end.hex2rgb();
		while(i--) cfg.delta[i]=cfg.end[i]-cfg.start[i]
	}else if(sjs.ui.animate[cfg.type]){
		animeType=cfg.type
	}else if(typeof document.body.style[cfg.type] != 'string'){
		animeType='prop'
	}
	cfg.style=(cfg.style||style).trim();
	if(sjs.ui.animate[style=cfg.style.charAt(0)]){
		cfg.curStyle=cfg.style.substring(1);
		cfg.style=style;
	}
	nocashe=!nocashe;
	return this.iterate(function(){
		var anime=sjs.globals.anime,conf={progress:null,now:null,curStyle:null,aType:animeType,offset:1,playState:1};
		sjs.extend(conf,cfg);
		if(!anime[this.sjsEventId]) anime[this.sjsEventId]={};
		anime=anime[this.sjsEventId];
		if(anime[cfg.type]) window.clearTimeout(anime[cfg.type].timer);
		conf.begin=new Date().getTime();
		if(conf.onlyInit) conf.timer=sjs.ui.animate[animeType](this,conf);
		if(nocashe) anime[cfg.type]=conf;
		conf=anime=null
	})
};
sjs.prototype.detachAnime=function(){
	var args=arguments;
	return this.iterate(function(){
		var anime=sjs.globals.anime[this.sjsEventId],type='';
		for(var i=0,l=args.length;i<l;i++) if(anime&&anime[type=sjs.detectStyle(args[i])]){
			window.clearTimeout(anime[type].timer);
			delete anime[type]
		}

		anime=null
	})
};
sjs.prototype.pauseAnime=function(){
	var args=arguments;
	return this.iterate(function(){
		var anime=sjs.globals.anime[this.sjsEventId],type='';
		for(var i=0,l=args.length;i<l;i++)	if(anime&&anime[type=sjs.detectStyle(args[i])]&&anime[type].timer){
			window.clearTimeout(anime[type].timer);
			anime[type].timer=-1;
			if(sjs.isFn(anime[type].onPause)) anime[type].onPause.call(sjs.ui.animate,this,anime[type])
		}
		anime=null
	})
};
sjs.prototype.playAnime=function(){
	var args=arguments;
	return this.iterate(function(){
		var anime=sjs.globals.anime[this.sjsEventId], type='';
		for(var i=0,l=args.length;i<l;i++){
			type=sjs.detectStyle(args[i]);
			if(anime&&anime[type]&&anime[type].timer==-1){
				var cfg=anime[type];
				cfg.begin=new Date().getTime()-cfg.now;
				sjs.ui.animate[cfg.aType](this,cfg);
				cfg=null
			}
		}
		anime=null
	})
};

sjs.prototype.stopAndPlayBackAnime=function(){
	var args=arguments;
	return this.iterate(function(){
		var anime=sjs.globals.anime[this.sjsEventId], type='';
		for(var i=0,l=args.length;i<l;i++){
			type=sjs.detectStyle(args[i]);
			if(anime&&anime[type]&&anime[type].timer){
				var cfg=anime[type];
				window.clearTimeout(cfg.timer);
				if(sjs.isFn(cfg.onChangeState)) cfg.onChangeState.call(sjs.ui.animate,this,cfg);
				cfg.begin=new Date().getTime()+cfg.playState*cfg.now;
				cfg.playState=-cfg.playState;
				sjs.ui.animate[cfg.aType](this,cfg);
				cfg=null
			}
		}
		anime=null
	})
};

sjs.ui.animate={
	'!':function(p,x,s){
		return this[s](1-p,x)
	},
	'~':function(p,x,s){
		return 1-this[s](1-p,x)
	},
	'&':function(p,x,s){
		return (p <= .5) ? this[s](2*p,x)/2 : 1-this[s](2*(1-p),x)/2
	},
	linear:function(p){
		return p
	},
	simple:function(p){
		return (1-Math.cos(Math.PI*p))/2
	},
	pow:function(p,x){
		return Math.pow(p,x)
	},
	shot:function(p,x){
		return Math.pow(p, 2)*((x + 1)*p-x);
	},
	bounce:function(p){
		var a=0, b=1;
		while(p<(7-4*a)/11){ a += b; b /= 2 }
		return -Math.pow((11-6*a-11*p)/4, 2)+Math.pow(b, 2)
	},
	elastic:function(p,x){
		return Math.pow(2,10*(p-1))*Math.cos(20*p*Math.PI*x/3);
	},
	circ:function(p){
		return 1-Math.sqrt(1-p*p)
	},
	repeat:function(dom,cfg){
		cfg.begin=new Date().getTime();
		this[cfg.aType](dom,cfg)
	},
	revert:function(dom,cfg){
		if(cfg.style=='~'){
			cfg.style=cfg.curStyle;
			cfg.curStyle=null
		}else{
			cfg.curStyle=cfg.style;
			cfg.style='~'
		}
		cfg.begin=new Date().getTime();
		this[cfg.aType](dom,cfg)
	},
	reverse:function(dom,cfg){
		if(cfg.style=='!'){
			cfg.style=cfg.curStyle;
			cfg.curStyle=null
		}else{
			cfg.curStyle=cfg.style;
			cfg.style='!'
		}
		cfg.begin=new Date().getTime();
		this[cfg.aType](dom,cfg)
	},
	boundRect:function(dom,cfg){
		cfg.now=(new Date().getTime()-cfg.begin)*cfg.playState;
		cfg.progress=cfg.now/cfg.time;
		if((cfg.progress>0||cfg.playState==1)&&(cfg.progress<1||cfg.playState==-1)){
			dom.style[cfg.type]=(cfg.delta*sjs.ui.animate[cfg.style](cfg.progress,cfg.offset,cfg.curStyle)+cfg.start).round(5)+cfg.unit;
			cfg.timer=arguments.callee.delay(cfg.fps,dom,cfg)
		}else{
			dom.style[cfg.type]=((cfg.playState+1)&&cfg.end||cfg.start)+cfg.unit;
			cfg.timer=-2;
			if(cfg.onEnd) cfg.onEnd.call(sjs.ui.animate,dom,cfg);
			dom=cfg=null
		}
	},
	opacity:function(dom,cfg){
		cfg.now=(new Date().getTime()-cfg.begin)*cfg.playState;
		cfg.progress=cfg.now/cfg.time;
		if((cfg.progress>0||cfg.playState==1)&&(cfg.progress<1||cfg.playState==-1)){
            var v = cfg.delta*sjs.ui.animate[cfg.style](cfg.progress,cfg.offset,cfg.curStyle)+cfg.start;
			sjs.setOpacity(dom, v.round(2));
			cfg.timer=arguments.callee.delay(cfg.fps,dom,cfg)
		}else{
            if (cfg.playState+1) {
                sjs.setOpacity(dom,cfg.end);
            } else {
                sjs.setOpacity(dom,cfg.start);
            }
			cfg.timer=-2;
			if(cfg.onEnd) cfg.onEnd.call(sjs.ui.animate,dom,cfg);
			dom=cfg=null
		}
	},
	prop:function(dom,cfg){
		cfg.now=(new Date().getTime()-cfg.begin)*cfg.playState;
		cfg.progress=cfg.now/cfg.time;
		if((cfg.progress>0||cfg.playState==1)&&(cfg.progress<1||cfg.playState==-1)){
			dom[cfg.type]=(cfg.delta*sjs.ui.animate[cfg.style](cfg.progress,cfg.offset,cfg.curStyle)+cfg.start).round(5);
			cfg.timer=arguments.callee.delay(cfg.fps,dom,cfg)
		}else{
			dom[cfg.type]=((cfg.playState+1)&&cfg.end||cfg.start);
			cfg.timer=-2;
			if(cfg.onEnd) cfg.onEnd.call(sjs.ui.animate,dom,cfg);
			dom=cfg=null
		}
	},
	color:function(dom,cfg){
		cfg.now=(new Date().getTime()-cfg.begin)*cfg.playState;
		cfg.progress=cfg.now/cfg.time;
		if((cfg.progress>0||cfg.playState==1)&&(cfg.progress<1||cfg.playState==-1)){
			var rgb=[],i=3,pc=sjs.ui.animate[cfg.style](cfg.progress,cfg.offset,cfg.curStyle);
			while(i--) rgb[i]=Math.floor(cfg.start[i]+(pc*cfg.delta[i]) + .5);
			dom.style[cfg.type]='rgb('+rgb.join(',')+')';
			cfg.timer=arguments.callee.delay(cfg.fps,dom,cfg)
		}else{
			dom.style[cfg.type]='rgb('+((cfg.playState+1)&&cfg.end||cfg.start).join(',')+')';
			cfg.timer=-2;
			if(cfg.onEnd) cfg.onEnd.call(sjs.ui.animate,dom,cfg);
			dom=cfg=null
		}
	}
}
