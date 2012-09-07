/*
 * This file is part of the sjFilemanager package.
 * (c) 2010-2011 Stotskiy Sergiy <serjo@freaksidea.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */
/**
 * Media manager functionality
 *

 * @package    sjFilemanager
 * @author     Stotskiy Sergiy <serjo@freaksidea.com>
 * @version    SVN: $Id$
 */
sjs.globals.mm={};
var MediaManager = new sjs.plugin({
    __construct: function(content, cfg){
        this.body  = content;
        this.panel = cfg && cfg.panel && content.parent().find(cfg.panel || '.sjMediaPanel');
        this.id    = this.body.getObjectId();
        this.files = cfg && cfg.files || [];
        this.index = 0;
        this.mode  = cfg && cfg.mode || 'preview';
        this.layer   = null;
        this.saveUrl  = (cfg.saveUrl || '').replace(/[\\\/]+$/, '') + '/';
        this.isActive = false;
        this.isBusy   = false;
        this.isSleepy = true;
        this.listeners       = {};
        this.currentFileType = '';
        this.activeAction    = null;
        this.loadingMask     = null;

        if (!cfg.lazy) {
            this.initialize();
        }
        sjs('<span class="vmiddle-fix">&nbsp;</span>').insertAfter(this.body).unselectable();
        sjs.globals.mm[this.id] = this;
    },
    __destruct: function() {
        this.layer = this.loadingMask = null;
        this.panel = this.body = this.files = null
    },
    reset: function() {
        this.body.parent().css('minHeight', '')
            .parent().removeClass('fixMediaManager');
        this.getContent().resetStyle();
        this.resetDrawLayer().getToolbar(':active').hide();
        this.getLining().hide();
        this.activeAction = null;
        this.isBusy = false;
        this.panel.find('*[name="save"]').setClass('sjDisabled');

        return this
    },
    isFrosen: function() {
        return this.activeAction == 'save';
    },
    initialize: function() {
        this.isActive = true;
        this.isSleepy = false;
        this.setMode(this.mode);
        if (!this.panel) {
            return false;
        }
        this.panel.click(function(e, mediaManagerId) {
            var $this = sjs.event.caller(e);
            if (!sjs.nodeName($this, 'a')) {
                return true;
            }
            var mm = sjs.globals.mm[mediaManagerId];

            mm.processHandler($this.name, $this, e);
            sjs.event.preventDefault(e);
        }, this.id);
        this.body.unselectable();

        var mediaManagerId = this.id;
        this.panel.unselectable().onEvent('keydown', function(e){
            var $this = sjs.event.caller(e);
            if (!sjs.nodeName($this, 'input')) {
                return true;
            }

            if (sjs.event.key(e).code == 13) {
                sjs($this).trigger('change');
            }
        }).find('input[type="text"]').focus(function(){
            sjs(this).data('value', this.value);
            MediaManager.get(mediaManagerId).panel.selectable();
        }).blur(function(){
            MediaManager.get(mediaManagerId).panel.unselectable();
        });

        this.addStandardHandlers();
        return this;
    },
    addStandardHandlers: function(){
        if (!this.listeners) {
            return this;
        }
        if (!sjs.isFn(this.listeners.serverError)) {
            this.addListener('serverError', function(js, html) {
                sjs('#sjPopup').text(js.response.msg).show(true).animate('opacity', {
                    start: 0, end: 1,
                    onEnd: function(dom, cfg) {
                        (function(that){
                            cfg.onEnd = function(dom){sjs(dom).hide()};
                            that.reverse(dom, cfg);
                        }).delay(5, this)
                    }
                }, .5);
            });
        }
        if (!sjs.isFn(this.listeners.serverOk)) {
            this.addListener('serverOk', function(js, html) {
                this.unsFiles(js.media.rm);
                this.addFiles(js.media.add);

                this.gotoFile(this.files.length - js.media.add.length);
            });
        }
        return this;
    },
    wakeupResizeToolbar: function(toolbar, restriction, apply) {
        if (toolbar.data('isInit')) {
            return this;
        }
        toolbar.data('isInit', true);
        if (typeof apply == 'undefined') {
            apply = true;
        }

        var managerId = this.id, inputs = toolbar.find('input[type="text"]');
        inputs.onEvent('change', function(e) {
            this.value = MediaManager.get(managerId)
                .filterToolbarValue(this, restriction, apply);
        });
        return this
    },
    wakeupCropToolbar: function(toolbar) {
        return this.wakeupResizeToolbar(toolbar, true, false)
    },
    wakeupSaveToolbar: function(toolbar) {
        if (toolbar.data('isInit')) {
            return this;
        }
        toolbar.data('isInit', true);
        var r = sjs.pathinfo(this.currentFile()), inp = 0,
            mediaManagerId = this.id;
        inp = toolbar.find('input[name="file"]').value(r.basename).onEvent('change', function(){
            var v = sjs.trim(this.value);
            if (!v) {
                v = sjs(this).data('value')
            }
            this.value = v;
        }).item(0);

        toolbar.mousedown(function(e){
            var $this = sjs.event.caller(e);
            if (!sjs.nodeName($this, 'a')) {
                return true;
            }
            sjs.event.preventDefault(e);
            var mm = MediaManager.get(mediaManagerId),
                fnName = '_' + $this.name + 'Changes';
            if (sjs.isFn(mm[fnName])) {
                mm[fnName](sjs(this).data('action'));
                mm.notify($this.name + 'Changes', this, $this);
            }
        });
        return this
    },
    filterToolbarValue: function(inp, restriction, apply) {
        var v = Number(inp.value) || 0, toolbar = this.getToolbar(':active'),
            proportions = toolbar.find('input[type="checkbox"]').item(0),
            maxWidth = this.body.width(), maxHeight = this.body.height(),
            width = this.getDrawLayer().width(), height = this.getDrawLayer().height(),
            size = {};

        if (v < 0 || (inp.name == 'width' || inp.name == 'height') && v == 0) {
            v = Number(sjs(inp).data('value')) || 1;
        }

        if (restriction) {
            switch (inp.name) {
                case 'left':
                    if (v + width > maxWidth) {
                        v = maxWidth - width;
                    }
                break;
                case 'top':
                    if (v + height > maxHeight) {
                        v = maxHeight - height;
                    }
                break;
                case 'width':
                    if (v > maxWidth) {
                        v = maxWidth;
                    }
                break;
                case 'height':
                    if (v > maxHeight) {
                        v = maxHeight;
                    }
                break;
            }
        }

        v = v.round(2);
        if (proportions && proportions.checked) {
            var n = width / height;
            if (inp.name == 'height') {
                size.width = (v * n).round(2);
                toolbar.find('input[name="width"]').value(size.width);
            } else if (inp.name == 'width') {
                size.height = (v / n).round(2);
                toolbar.find('input[name="height"]').value(size.height);
            }
        }
        size[inp.name] = v;
        this.setDrawLayerSize(size);
        if (apply) {
            var lb = this.getLayerBody();
            lb.first().width(lb.width()).height(lb.height());
            this.applyChanges()
        }

        return v;
    },
    getContent: function() {
        if (!this.body.first().hasClass('sjMediaContent')) {
            this.body.prepend('<div class="sjMediaContent" />');
        }
        return this.body.first()
    },
    applyChanges: function() {
        var lb = this.getLayerBody();
        this.updateContent().getContent().css({
            overflow: sjs.css(lb.item(0), 'overflow') || ''
        });
        this.body.width(this.getDrawLayer().width()).height(this.getDrawLayer().height());
        return this
    },
    updateContent: function() {
        var lb = this.getLayerBody(), fc = lb.first();
        this.getContent().css({
            width:  lb.width()  + 'px',
            height: lb.height() + 'px'
        }).first().css({
            width:  fc.width()  + 'px',
            height: fc.height() + 'px',
            marginTop:  sjs.css(fc.item(0), 'top')  || '',
            marginLeft: sjs.css(fc.item(0), 'left') || ''
        });
        return this;
    },
    getLining: function() {
        if (!this.body.find('div.sjLining').length) {
            sjs('<div class="sjLining" />').insertAfter(this.getContent()).css({
                position: 'absolute',
                top: '0px', left: '0px',
                display: 'none'
            });
        }
        return this.getContent().next()
            .width(this.body.width())
            .height(this.body.height());
    },
    resetDrawLayer: function() {
        if (!this.layer) {
            return this;
        }

        if (sjs.isFn(this['__begin' + this.activeAction])) {
            this.layer.unlinkEvent('mousedown', this['__begin' + this.activeAction])
        }
        this.layer.resetStyle().hide();
        this.getLayerBody().resetStyle().first().resetStyle();
        return this
    },
    updateDrawLayer: function(force) {
        if (!this.layer || !force && !this.layer.width()) {
            return this;
        }
        this.getLayerBody().html(this.getContent().html());
        this.getDrawLayer().width(this.body.width()).height(this.body.height());

        return this
    },
    getDrawLayer: function() {
        if (!this.layer) {
            var html = '', r = ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'],
                i = r.length;

            while (i--) {
                html += '<span class="sjsResize ' + r[i] + '" id="' + r[i] + '"></span>';
            }
            this.layer = sjs('<div class="sjMediaLayer" />').hide()
                .append('<div class="sjMediaHolder" />')
                .append('<div class="sjsResizable" />')
                .last().html(html)
                .parent().appendTo(this.body);
            MediaManager.link(this.layer.item(0), this.id);
        }
        return this.layer
    },
    getLayerBody: function() {
        return this.getDrawLayer().first()
    },
    getResizeTools: function() {
        return this.getDrawLayer().first().next()
    },
    getToolbar: function(name, search) {
        search = search ? ' ' + search : '';
        if (name == ':active') {
            return this.panel.find('div.tools:visible' + search);
        }
        return this.panel.find('div.' + name + 'Tools' + search)
    },
    getLoadingMask: function() {
        if (!this.loadingMask) {
            this.loadingMask = sjs('<div class="loading-mask" />')
                .appendTo(this.body.parent());
        }
        return this.loadingMask;
    },
    waiting: function(flag) {
        var l = this.getLoadingMask();
        if (flag) {
            l.show(true);
        } else {
            l.hide();
        }
        return this;
    },
    notify: function(eventName) {
        if (sjs.isFn(this.listeners[eventName])) {
            var args = sjs.toList(arguments);
            args.shift();
            this.listeners[eventName].apply(this, args);
        }
        return this;
    },
    attachListeners: function(listeners) {
        this.listeners = listeners;
        return this;
    },
    addListener: function(eventName, listener) {
        if (sjs.isFn(listener)) {
            this.listeners[eventName] = listener;
        }
        return this;
    },
    setActiveAction: function(name, link) {
        this.panel.find('.active').removeClass('active');
        if (link) {
            sjs(link).setClass('active');
        } else {
            this.panel.find('*[name="' + name + '"]').setClass('active');
        }
        this.panel.find('.sjDisabled[name="save"]').removeClass('sjDisabled');
        this.activeAction = name;
        return this
    },
    disableAction: function(name, link) {
        if (link) {
            sjs(link).setClass('sjDisabled');
        } else {
            this.panel.find('*[name="' + name + '"]').setClass('sjDisabled');
        }
        return this;
    },
    setMode: function(mode) {
        this.body.parent().removeClass('sj' + sjs.capitalize(this.mode) + 'Mode')
            .setClass('sj' + sjs.capitalize(mode) + 'Mode');
        this.mode = mode;
        this.notify('changeMode', mode);

        return this;
    },
    preparePanel: function(oldFileType) {
        if (oldFileType) {
            this.panel.removeClass('sj' + sjs.capitalize(oldFileType) + 'Type');
        }
        this.panel.setClass('sj' + sjs.capitalize(this.currentFileType) + 'Type');

        var nav = this.panel.find('.nav');
        if (this.isLastFile()) {
            if (this.files.length <= 1) {
                nav.hide();
            } else {
                var prevIndex = nav.item(1).name == 'prev' && 1 || 0;
                nav.removeClass('sjDisabled').show();
                if (this.index == 0) {
                    nav.nth(prevIndex).setClass('sjDisabled');
                } else if (this.index == this.files.length - 1) {
                    nav.nth(Number(!prevIndex)).setClass('sjDisabled');
                }
            }
        } else {
            nav.removeClass('sjDisabled');
        }

        var saveButton = this.panel.find('*[name="save"]');
        if (this.activeAction) {
            saveButton.removeClass('sjDisabled')
        } else {
            saveButton.setClass('sjDisabled')
        }

        return this;
    },
    setPanelVisibility: function(flag) {
        if (!this.panel || !this.panel.length) {
            return false
        }
        var panel = this.panel.item(0), end = 0;

        if (flag) {
            end = this.panel.data('oldTop');
        } else {
            if (!this.panel.data('oldTop')) {
                this.panel.data('oldTop', panel.offsetTop);
            }
            end = -panel.offsetHeight - 10;
        }
        this.panel.animate('top', {
            start: panel.offsetTop,
            end: end
        }, .2);
        return this
    },
    setFiles: function(files) {
        this.files = files;
        this.index = 0;
        return this;
    },
    addFiles: function(files) {
        if (files.constructor == Array) {
            this.files = this.files.concat(files);
        } else {
            this.files.push(files);
        }
        return this;
    },
    unsFiles: function(files) {
        if (!files) {
            return this;
        }

        if (files.constructor != Array) {
            files = [files];
        }

        var i = this.files.length, hash = {}, j = files.length, k = '';
        while (i--) {
            hash[this.files[i].replace(/\/+$/, '')] = i;
        }

        while (j--) {
            k = files[j].replace(/\/+$/, '');
            if (k in hash) {
                this.files.splice(hash[k], 1);
            }
        }

        return this;
    },
    getMediaHtml: function() {
        var name = this.currentFile(), html = '',
            ext  = name.substr(name.lastIndexOf('.') + 1).toLowerCase();

        if (ext == 'jpg' || ext == 'jpeg' || ext == 'gif' || ext == 'png') {
            html += '<img src="' + sjs.htmlChars(name) + '?' + (+new Date) + '" />';
            this.currentFileType = 'image';
        } else if (ext == 'swf') {
            html = '<object align="middle" codebase="http://fpdownload.macromedia.com/pub/shockwave/cabs/flash/swflash.cab#version=8,0,0,0" >';
            html += '    <param value="opaque" name="wmode"/>';
            html += '    <param value="' + sjs.htmlChars(name) + '" name="movie"/>';
            html += '    <param value="always" name="AllowScriptAccess"/>';
            html += '    <param value="high" name="quality"/>';
            html += '    <embed align="middle" ';
            html += '    pluginspage="http://www.macromedia.com/go/getflashplayer" type="application/x-shockwave-flash" allowscriptaccess="always" wmode="opaque" quality="high" src="' + name + '"/>';
            html += '</object>';
            this.currentFileType = 'flash';
        } else {
            html = '<div class="unknown-file"></div>';
            this.currentFileType = 'unknown';
        }

        return html
    },
    __mediaLoadingEvent: function(media, callback) {
        var mm = MediaManager.get(media.item(0));
        if (mm.currentFileType != 'unknown' && (!media.width() || mm.currentFileType == 'image' && media.item(0).complete != true)) {
            if (sjs.browser.msie || sjs.browser.opera || mm.currentFileType != 'image') {
                arguments.callee.delay(.1, media, callback);
            } else {
                media.onEvent('load', callback);
            }
        } else {
            callback.call(media.item(0));
        }
    },
    getMediaContent: function(obj) {
        var c = sjs(obj), tmp = 0;

        switch (this.currentFileType) {
            case 'flash':
                //~ tmp = c.find('embed');
                //~ if (tmp.length) {
                    //~ c = tmp;
                //~ }
            break;
        }
        return c
    },
    __onFileReady: function(event) {
        var mm = MediaManager.get(this).waiting(false);
        mm.prepareLayers(mm.getMediaContent(this))
    },
    prepareLayers: function(media) {
        // @todo: implement logic for multifile editing

        var w = media.width(), h = media.height();
        if (this.layer) {
            this.resetDrawLayer().getContent().resetStyle();
            this.getToolbar(':active').hide();
        }
        this.getLining().hide();
        if (this.currentFileType == 'image') {
            this.body.width(w).height(h);
            media.width(w).height(h);
        } else {
            this.body.width('auto').height('auto');
        }
        this.activeAction = null;
        return this;
    },
    currentFile: function() {
        return this.files[this.index]
    },
    nextFile: function() {
        return this.gotoFile(this.index + 1);
    },
    prevFile: function() {
        return this.gotoFile(this.index - 1);
    },
    isLastFile: function(index) {
        index = index || this.index;
        return index == 0 || index == this.files.length - 1
    },
    gotoFile: function(index) {
        if (index >= this.files.length || index < 0) {
            return false;
        }
        this.index = index;
        var oldFileType = this.currentFileType,
            html = this.getMediaHtml(), media = null;

        media = this.getMediaContent(this.getContent().html(html).first());
        if (!media.length) {
            return this;
        }
        MediaManager.link(media.item(0), this.id);

        this.waiting(true);
        this.__mediaLoadingEvent(media, this.__onFileReady);

        return this.preparePanel(oldFileType);
    },
    showFile: function() {
        this.gotoFile(0);
        return this
    },
    setIsSleepy: function(flag) {
        this.notify('changeState', flag);
        this.isSleepy = flag;
        return this;
    },
    processHandler: function(name, link, event) {
        var fnName = name + 'Action';
        if (!this.isSleepy && sjs.isFn(this[fnName])
            && !sjs.className.has(link, 'sjDisabled')
            && link.offsetWidth
        ) {
            var initToolbarFn = 'wakeup' + sjs.capitalize(name) + 'Toolbar',
                toolbar = this.getToolbar(name);

            if (sjs.isFn(this[initToolbarFn])) {
                this.getToolbar(':active').hide();
                this[initToolbarFn](toolbar.show(true))
            }
            this[fnName](link, event, toolbar);
            this.notify(name, link, event, toolbar);
        }
        return this;
    },
    lazyWakeUp: function(link) {
        var mm = MediaManager.get(link), files = null,
            a  = sjs(link), parent = mm.body.parent().parent();
        if (a.hasClass('active')) {
            a.removeClass('active');
            mm.processHandler('halt', link);
        } else {
            a.setClass('active');
            mm.setIsSleepy(false).display(true, {
                width:   [10, parseInt(parent.width() / 2)],
                height:  [0, parent.height() - 4],
                opacity: [0, 1]
            });
            if (this.getFiles && (files = this.getFiles())) {
                mm.setFiles(this.getFiles()).showFile();
            }
        }

        if (!mm.isActive) {
            mm.initialize();
        }
    },
    haltAction: function() {
        this.setIsSleepy(true).setMode('preview').reset();
        return this.display(false, function(dom, cfg) {
            sjs(dom).hide();
        });
    },
    changemodeAction: function() {
        var mode = '', parent = this.body.parent().parent(),
            width = 0, onEnd = null;
        if (this.mode == 'preview') {
            mode  = 'full';
            width = parent.width() - 4;
            onEnd = function(domObj) {
                var dom = sjs(domObj);
                dom.css('minHeight', dom.height() + 'px').parent()
                    .setClass('fixMediaManager')
            };
        } else {
            mode  = 'preview';
            width = parent.width() / 2;
            this.reset();
        }

        this.setMode(mode).display(true, {
            width:   [this.body.parent().width(), width],
            height:  [this.body.parent().height(), parent.height() - 4],
            opacity: [1, 1]
        }, onEnd);
    },
    resizeAction: function(link, event, toolbar) {
        if (this.currentFileType != 'image' || 'resize' == this.activeAction) {
            return false;
        }
        this.setActiveAction('resize', link);
        this.getDrawLayer();
        this.resetDrawLayer().updateDrawLayer(true).getLining().hide();
        this.layer.show(true).onEvent('mousedown', this.__beginResize);
        if (!sjs.browser.msie) {
            this.getLayerBody().css('opacity', 0.5);
        }

        var inputs = toolbar.find('input');
        inputs.item(0).value = this.body.width();
        inputs.item(1).value = this.body.height();
    },
    __beginResize: function(e) {
        var $this = sjs.event.caller(e);
        if (!sjs.className.has($this, 'sjsResize')) {
            return true
        }
        var mm = MediaManager.get(this);
        if (mm.isFrosen()) {
            return true;
        }
        var proportionsResize = mm.getToolbar(':active', 'input[type="checkbox"]').item(0);

        mm.setResizable(this, {
            type: $this.id,
            proportions: proportionsResize && proportionsResize.checked,
            onEnd: function(cfg) {
                var mm = MediaManager.get(cfg);
                mm.setPanelVisibility(true);
                mm.getDrawLayer().css({
                    top: '', left: '',
                    right: '', bottom: ''
                })
            }
        }).setPanelVisibility(false);
    },
    cropAction: function(link, event, toolbar) {
        if (this.currentFileType != 'image' || 'crop' == this.activeAction) {
            return false;
        }
        this.setActiveAction('crop', link);

        this.isBusy = true;
        this.getDrawLayer();
        this.resetDrawLayer().updateDrawLayer(true)
            .getLining().show(true);

        this.layer.show(true);
        var w = this.layer.width() / 2, h = this.layer.height() / 2;

        this.setDrawLayerSize({
            width: w,
            height: h,
            left: w / 2,
            top: h / 2
        }).getLayerBody().css({
            overflow: 'hidden',
            cursor: 'move'
        });

        this.layer.onEvent('mousedown', this.__beginCrop);

        var inputs = toolbar.find('input');
        inputs.item(0).value = h / 2;
        inputs.item(1).value = w / 2;
        inputs.item(2).value = w;
        inputs.item(3).value = h;
    },
    __beginCrop: function(e) {
        var xy=sjs.event.xy(e), $this = sjs.event.caller(e),
            mm = MediaManager.get(this);
        sjs.event.preventDefault(e);
        if (mm.isFrosen()) {
            return false;
        }

        mm.setCropable(this, {
            type: sjs.className.has($this, 'sjsResize') && $this.id,
            x: xy.x - this.offsetLeft,
            y: xy.y - this.offsetTop,
            proportions: mm.getToolbar(':active', 'input[type="checkbox"]').item(0).checked,
            onEnd: function() {
                var mm = MediaManager.get(this),
                    inputs = mm.getToolbar(':active', 'input');
                inputs.item(0).value = this.offsetTop;
                inputs.item(1).value = this.offsetLeft;
                inputs.item(2).value = this.offsetWidth;
                inputs.item(3).value = this.offsetHeight;
                mm.setPanelVisibility(true)
            }
        }).setPanelVisibility(false);
    },
    nextAction: function(link) {
        this.nextFile();
    },
    prevAction: function(link) {
        this.prevFile();
    },
    saveAction: function(link, event, toolbar) {
        if (this.currentFileType != 'image' || 'save' == this.activeAction) {
            return false;
        }
        toolbar.data('action', this.activeAction);
        this.setActiveAction('save', link);

        var l = this.getLining(), r = sjs.pathinfo(this.currentFile()),
            p = r.basename.lastIndexOf('.');
        toolbar.data('showLining', !!l.width());

        var inp = toolbar.find('input[name="file"]').value(r.basename).item(0);
        if (!p || p == -1) {
            p = r.basename.length;
        }
        inp.focus();
        sjs.selectText(inp, 0, p);

        if (toolbar.data('isActive')) {
            return true;
        }
        toolbar.data('isActive', true);
        toolbar.onEvent('click', function(e) {
            var $this = sjs.event.caller(e);
            if (!sjs.nodeName($this, 'a') || sjs.className.has(this, 'disabledBar')) {
                return true;
            }
            var mm = MediaManager.get(this),
                method = '_' + $this.name.toLowerCase() + 'Changes';

            if (!sjs.isFn(mm[method])) {
                return true;
            }
            sjs(this).setClass('disabledBar');
            mm[method](sjs(this).data('action'), mm.currentFile());
            sjs.event.stopPropagation(e);
            sjs.event.preventDefault(e);
        });
        MediaManager.link(toolbar.item(0), this.id);
    },
    _syncChanges: function(actionName, filename) {
        var toolbar = this.getToolbar(actionName), data = {};
        toolbar.find('input[type="text"], textarea, input:checked').iterate(function(){
            data[this.name] = this.value
        });
        var inputs = this.getToolbar('save').find('input'),
            pi = sjs.pathinfo(this.currentFile());
        inputs[0].value = sjs.trim(inputs[0].value || pi.basename);
        data.action = actionName;
        data.files  = {};
        data.files[this.currentFile()] = inputs[0].value;
        data.override = inputs[1].checked;

        this._sendRequest(data)
    },
    _cancelChanges: function(actionName, filename) {
        var saveToolbar = this.getToolbar('save').hide();
        this.getToolbar(actionName).show(true);

        this.setActiveAction(actionName);
        if (saveToolbar.data('showLining')) {
            this.getLining().show(true);
        }
        saveToolbar.removeClass('disabledBar');
    },
    _sendRequest: function(data) {
        data['manager_type'] = 'media';
        this.notify('sendRequest', data);

        this.waiting(true);
        sjs.query(this.saveUrl, data, function(js, html){
            var mm = this.args.mm;
            mm.waiting(false);
            if (js && js.response.status == 'error') {
                mm.notify('serverError', js, html);
            } else {
                mm.notify('serverOk', js, html);
            }
            mm.getToolbar('save').removeClass('disabledBar');
            mm.disableAction('save');
        }, 1, { mm: this });
    },
    display: function(isVisible, data, onEnd) {
        var parent = this.body.parent().css('overflow', 'hidden'), cfg = {
            height:  {},
            width:   {},
            opacity: {}
        };

        if (isVisible) {
            cfg.width.start   = data.width[0] || 1;
            cfg.width.end     = data.width[1];
            cfg.height.start  = data.height[0];
            cfg.height.end    = data.height[1];
            cfg.opacity.start = data.opacity[0];
            cfg.opacity.end   = data.opacity[1];

            parent.css('lineHeight', cfg.height.end + 'px').show(true);
        } else {
            cfg.width.start   = parent.width();
            cfg.width.end     = 0;
            cfg.height.start  = parent.height();
            cfg.height.end    = 0;
            cfg.opacity.start = 1;
            cfg.opacity.end   = 0;
            onEnd = data;
        }
        parent.animate('width', {
            //style: 'shot',
            start: cfg.width.start,
            end:   cfg.width.end,
            onEnd: onEnd
        }, 1).animate('height', {
            style: '~bounce',
            start: cfg.height.start,
            end:   cfg.height.end,
            onEnd: function(dom) {
                sjs(dom).css('overflow', 'auto');
            }
        }, 2).animate('opacity', {
            start: cfg.opacity.start,
            end:   cfg.opacity.end
        }, 1);
        return this;
    },
    setResizable: function(item, cfg) {
        cfg = cfg || {};
        MediaManager.link(cfg, this.id);
        var pos = sjs.getPosition(item), resizeId = sjs.startResize(item, sjs.extend({
            _x: -pos.left,
            _y: -pos.top,
            onResize: function(w, h, cfg) {
                var mm = MediaManager.get(cfg);
                mm.getLayerBody().width(w).height(h)
                    .first().width(w).height(h)
            },
            onResizeEnd: function(cfg) {
                var mm = MediaManager.get(cfg), media = sjs(this),
                    inputs = mm.getToolbar(':active', 'input[type="text"]'),
                    w = media.width(), h = media.height();

                inputs.item(0).value = w;
                inputs.item(1).value = h;
                mm.applyChanges();
                if (sjs.isFn(cfg.onEnd)) {
                    cfg.onEnd.call(this, cfg);
                }
            }
        }, cfg));

        sjs(document).mouseup(sjs.stopResize, resizeId);
        return this;
    },
    setCropable: function(item, cfg) {
        var resetter = function(cfg) {
            if (sjs.isFn(cfg.data.onEnd)) {
                cfg.data.onEnd.call(this);
            }
            this.__cropObject = null;
        };
        item.__cropObject = this.getLayerBody().first();
        if (cfg.type) {
            var pos = sjs.getPosition(item.parentNode), resizeId = sjs.startResize(item, {
                _x: -pos.left,
                _y: -pos.top,
                selection: true,
                proportions: cfg.proportions,
                type: cfg.type,
                parentOffset: true,
                onResize: function(w, h, cfg) {
                    this.__cropObject.parent().height(h).width(w);
                    this.__cropObject.css({
                        top:  -this.offsetTop  + 'px',
                        left: -this.offsetLeft + 'px'
                    });
                },
                onResizeEnd: resetter,
                data: cfg
            });
            sjs(document).mouseup(sjs.stopResize, resizeId);
        } else {
            var dragId = sjs.startDrag(item, {
                _x: cfg.x,
                _y: cfg.y,
                type: 'parentOffset',
                onMove: function(x, y) {
                    this.__cropObject.css({
                        top:  -y + 'px',
                        left: -x + 'px'
                    })
                },
                onDragEnd: resetter,
                data: cfg
            });
            sjs(document).mouseup(sjs.stopDrag, dragId);
        }
        return this
    },
    setDrawLayerSize: function(data) {
        var lb = this.getLayerBody();

        if (typeof data.width != 'undefined') {
            lb.width(data.width);
            this.getDrawLayer().width(lb.width())
        }

        if (typeof data.height != 'undefined') {
            lb.height(data.height);
            this.getDrawLayer().height(lb.height())
        }

        if (typeof data.left != 'undefined') {
            this.getDrawLayer().css('left', data.left + 'px');
            lb.first().css('left', -data.left + 'px');
        }

        if (typeof data.top != 'undefined') {
            this.getDrawLayer().css('top', data.top + 'px');
            lb.first().css('top', -data.top + 'px');
        }

        return this;
    },
    syncWithFileManager: function(fm, afterBtnName) {
        var fn = this.lazyWakeUp, id = this.id, link;
        fm.addAction('openMedia', {
            'for': 'files',
            dynamic: true,
            'class': 'showMediaManager',
            after: afterBtnName
        }, function (btn) {
            link = btn;
            MediaManager.link(btn, id);
            fn.call(this, btn);
        });

        this.attachListeners({
            changeState: function(isSleepy) {
                var a = sjs(link);
                if (isSleepy && a.hasClass('active')) {
                    a.removeClass('active');
                }
            }
        });
        return this;
    }
});

MediaManager.get = function(obj) {
    var id = Number(obj) || obj.__media_manager_id
    if (!id) {
        return null
    }
    return sjs.globals.mm[id];
};

MediaManager.link = function(obj, id) {
    if (!obj || !id) {
        return false
    }
    obj.__media_manager_id = id;
    return true
};

MediaManager.getInstance = function(content, cfg) {
    if (this.instance) {
        return this.instance;
    }

    this.instance = new MediaManager(content, cfg);
    return this.instance;
};
MediaManager.renderView = function(lang) {
    var lang = sjs.extend({
        Top: 'Top',
        Left: 'Left',
        Width: 'Width',
        Height: 'Height',
        Proportions: 'Proportions',
        'File Name': 'File Name',
        'Override File': 'Override File',
        'Apply for All': 'Apply for All'
    }, lang || {});
    var wrap = sjs('<div id="sjMediamanager" />')
        .append('<div class="sjMediaPanel" />')
        .append('<div class="sjMediaWrapper" />');

    var tools = wrap
        .first().append('<a href="#" name="prev" class="prev nav" />')
            .append('<a href="#" name="next" class="next nav" />')
            .append('<a href="#" name="crop" class="imageOnly forFullMode crop" />')
            .append('<a href="#" name="resize" class="imageOnly forFullMode resize" />')
            .append('<a href="#" name="save" class="imageOnly forFullMode save" />')
            .append('<a href="#" name="changemode" class="changeMode" />')
            .append('<a href="#" name="halt" class="halt" />')
            .append('<div class="sjMediaTools" />')
            .last().append('<div class="cropTools tools" />')
                .append('<div class="resizeTools tools" />')
                .append('<div class="saveTools tools" />');

    var saveToolbar = tools
        .first().append('<label for="crop_y" class="top">' + lang.Top + ': </label>')
            .append('<input type="text"class="text top" name="top" id="crop_y" />')
            .append('<label for="crop_x" class="left">' + lang.Left + ': </label>')
            .append('<input type="text" class="text left" name="left" id="crop_x" />')
            .append('<label for="crop_w" class="width">' + lang.Width + ': </label>')
            .append('<input type="text" class="text width" name="width" id="crop_w" />')
            .append('<label for="crop_h" class="height">' + lang.Height + ': </label>')
            .append('<input type="text" class="text height" name="height" id="crop_h" />')
            .append('<input type="checkbox" value="1" class="checkbox prop" name="crop_prop" id="crop_prop" />')
            .append('<label for="crop_prop" class="prop">' + lang.Proportions + '</label>')
        .next().append('<label for="resize_w" class="width">' + lang.Width + ': </label>')
            .append('<input type="text" class="text width" name="width" id="resize_w" />')
            .append('<label for="resize_h" class="height">' + lang.Height + ': </label>')
            .append('<input type="text" class="text height" name="height" id="resize_h" />')
            .append('<input type="checkbox" checked="checked" value="1" class="checkbox prop" name="crop_prop" id="resize_prop" />')
            .append('<label for="resize_prop" class="prop">' + lang.Proportions + '</label>')
        .next().append('<label for="file" class="file">' + lang['File Name'] + ': </label>')
            .append('<input type="text" class="text file" name="file" id="file" />')
            .append('<span class="v-wrap"></span>')
            .append('<a href="#" name="sync" class="apply" />')
            .append('<a href="#" name="cancel" class="cancel" />');

    saveToolbar.find('span.v-wrap')
        .append('<input type="checkbox" id="save_ovr" name="override" class="checkbox prop " value="1" checked="checked">')
        .append('<label class="prop" for="save_ovr">' + lang['Override File'] + '</label>')
        //~ .append('<br />')
        //~ .append('<input type="checkbox" id="save_apla" name="apply_all" class="checkbox prop " value="1">')
        //~ .append('<label class="prop" for="save_apla">' + lang['Apply for All'] + '</label>');

    return wrap.appendTo(document.body);
};
