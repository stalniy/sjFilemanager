
/*
 * This file is part of the sjFilemanager package.
 * (c) 2010-2011 Stotskiy Sergiy <serjo@freaksidea.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */
/**
 * File manager functionality
 *
 * @package    sjFilemanager
 * @author     Stotskiy Sergiy <serjo@freaksidea.com>
 * @version    SVN: $Id$
 */
(function() {

sjs.globals.fm={};
var sjFileManager = new sjs.plugin({
    __construct: function(cfg, listeners) {
        var self = this, queue = [];
        self._init(cfg, listeners);

        queue.push(this.view.getAll('window.body', 'dir.files_list'));
        queue.push(self._request(this.actionUrl), self._get(this.webRoot + '/config.json'));

        sjs.promiseAll.apply(sjs, queue).then(function (tmpls, data, config) {
            var bodyTmpl = tmpls[0];

            self.files = data[0].files;
            self.files.i18n = sjFileManager.i18n;

            sjs.when(self._configure(config[0]), function (js , html) {
                var content = sjs(cfg.container).html(bodyTmpl(self.files)).find('div.sj-fm-body');
                self._attachTo(content);
            })
        }).fail(function () {
            throw "One of the required requests was failed";
        });
    },
    __destruct:function(){
        delete sjs.globals.fm[this.id];
        this.clearStek('dir', 'file');
        for (name in this.windows) {
            if (this.windows[name].__destruct) {
                this.windows[name].__destruct();
            }
        }
        this.windows=this.requestData=this.events=this.lastSelected=this.id=null;
    },
    _get: function (url) {
        var waiter = new sjs.promise(), self = this;
        this.wait(true);
        sjs.query(url, null, function (js, html) {
            waiter.resolve([js, html, self]);
        }, true);
        return waiter;
    },
    _request: function (url, data, cache) {
        var waiter = new sjs.promise(), self = this;
        this.wait(true);
        sjs.query(url, data, function (js, html) {
            self.wait(false);
            if(js && js.response && js.response.status == 'error'){
                waiter.reject([js, html, self]);
                self.notify('serverError', js, html);
            } else {
                self.notify('serverOk', js, html);
                waiter.resolve([js, html, self]);
            }
        }, !cache);
        return waiter;
    },
    _init: function (cfg, listeners) {
        this.windows = {};
        this.events  = listeners || {};
        this.actions = [];
        this.dirStek  = null;
        this.fileStek = null;
        this.lastSelected   = null;
        this.hasStekChanges = false;
        this.requestData  = {};

        this.actionUrl = (cfg.actionUrl || '').replace(/\/+$/, '')
        this.rootUrl   = (cfg.rootUrl   || '').replace(/\/+$/, '');

        if (!cfg.container) {
            throw "'container' setting is missed";
        }

        this.webRoot = cfg.webRoot || sjs('head > script[data-sjfm-root]', document.documentElement).attr('data-sjfm-root')[0];
        if (!this.webRoot) {
            throw "Unable to find javascript root url. There is no \"data-sjfm-root\" attribute on filemanager.js script tag";
        }
        this.webRoot = this.webRoot.replace(/\/+$/, '');
        this.view = new sjs.View({
            baseUrl:  this.webRoot + '/tmpl',
            idPrefix: 'sj_filemanager_'
        });

        if (!this.actionUrl) {
            this.actionUrl = this.webRoot;
        }
    },
    _configure: function (config) {
        this.rootUrl = config.rootUrl || (config.root || '').replace(/%[\w_-]+%/g, '');
        this.lang    = config.lang;

        return this._get(this.webRoot + '/js/i18n/' + this.lang + '.js');
    },
    _attachTo: function (content) {
        this.id = content[0].sjsEventId;
        this.actionsBlock = content.prev();

        sjs.globals.fm[this.id]=this;

        this._createActions();
        this.findLastSelected(content.first()[0]);
        this.initialize(content);

        this.notify('ready', content);
    },
    _createActions: function () {
        var actions = [
            ['refresh',   { title: sjFileManager.i18n('Refresh') }],
            ['createDir', { title: sjFileManager.i18n('Create Folder')}],
            ['cut',       { title: sjFileManager.i18n("Cut"), dynamic: true, 'for': 'files'}],
            ['copy',      { title: sjFileManager.i18n("Copy"), dynamic: true, 'for': 'files'}],
            ['remove',    { title: sjFileManager.i18n("Remove"), dynamic: true }],
            ['paste',     { title: sjFileManager.i18n("Paste"),  dynamic: true, enabled: false }],
            ['rename',    { title: sjFileManager.i18n("Rename"),  dynamic: true }],
            ['perms',     { title: sjFileManager.i18n("Permissions"),  dynamic: true }],
            ['upload',    { title: sjFileManager.i18n("Upload File(s)") }],
            ['download',  { title: sjFileManager.i18n("Download File(s) as Zip Archive") }],
            ['stat',      { title: sjFileManager.i18n("Information about File(s)") }],
            ['transform', { title: sjFileManager.i18n("Fix Panel"), state: 'active' }]
        ].concat(this.actions);

        for (var i = 0, c = actions.length; i < c; i++) {
            var action = actions[i];
            this.addAction(action[0], action[1]);
        }
        this.actions = [];
    },
    setFiles: function (files) {
        var body = this.getContent();

        this.files = files;
        this.files.i18n = sjFileManager.i18n;
        body.html(this.view.get('dir.files_list')(files));
        this.findLastSelected(body.first()[0]);
        this.hasStekChanges = true;

        return this;
    },
    getFileInfo: function (name) {
        var files = this.files.source, i = files.length, info = null;
        while (i--) {
            if (files[i].basename == name) {
                info = files[i];
                break;
            }
        }
        return info;
    },
    getRow: function(file) {
        var html = this.view.get('dir.files_list_row')({ file: file, i18n: sjFileManager.i18n });
        return sjs(sjs.makeHTML(html));
    },
    addRow: function (file, where) {
        var row = this.getRow(file);

        switch (where) {
            case 'first':
                !file.fake && this.files.source.unshift(file);
                var wrap = this.getContent().find('tbody');
                if (wrap.first().hasClass('parent-dir')) {
                    row.insertAfter(wrap.first());
                } else {
                    wrap.prepend(row);
                }
                break;
            default:
                !file.fake && this.files.source.push(file);
                this.getContent().find('tbody').append(row);
                break;
        }
        this.hasStekChanges = true;
        return row;
    },
    findLastSelected:function(tbl){
        tbl=tbl.tBodies[0];
        if (tbl.rows[0]) {
            this.lastSelected = (tbl.rows[0].id == 'parent-dir' && tbl.rows[1]) || tbl.rows[0];
        }
        return tbl
    },
    select:function(to){
        var body=to.offsetParent.rows, i_from=this.lastSelected.rowIndex, i_to=to.rowIndex,
          i=Math.abs(i_to - i_from) + 1, from = (i_from > i_to) && i_from || i_to;
        while(i--) this.checked(body[from-i], 'selected', 1)
    },
    choose:function(tr, changeCheckboxState){
        if(tr.className){
            this.checked(tr,'', !changeCheckboxState)
        }else{
            this.lastSelected=tr;
            this.checked(tr,'selected', changeCheckboxState)
        }
        return this;
    },
    checked:function(tr,cls,chk){
        var checkbox = sjs('input', tr.cells[0])[0];
        tr.className=cls;
        if (sjs.nodeName(checkbox,'input')) {
            checkbox.checked=chk;
        }
        return this;
    },
    getChecked:function(parent) {
        return sjs('tr.selected', parent || this.lastSelected.parentNode);
    },
    makeStek:function(){
        if (!this.hasStekChanges) return false;

        var files=[], dirs=[];
        this.getChecked().iterate(function(){
            var chk = sjs('input[type="checkbox"]', this.cells[0]);
            if(!chk.length) return true;
            var td=this.cells[1];
            chk = chk[0];

            if (sjs.className.has(td,'dir')) {
                dirs[dirs.length] = chk.value
            } else {
                files[files.length] = chk.value
            }
        });
        this.fileStek=files;
        this.dirStek=dirs;
        this.hasStekChanges = false;
        return this;
    },
    getFiles: function() {
        var path = this.rootUrl + this.getCurrentPath(), files = [],
            i = this.fileStek && this.fileStek.length || 0;
        path = path.replace(/\/+$/, '') + '/';
        while (i--) {
            files[files.length] = path + this.fileStek[i];
        }
        return files;
    },
    clearStek: function(){
        var i = arguments.length, stek='';
        this.hasStekChanges = true;
        while (i--) {
            stek = arguments[i] + 'Stek';
            if(this[stek]) {
                this[stek] = null
            }
        }
        return this;
    },
    emptyStek: function() {
        return !this.dirStek && !this.fileStek
            || !this.dirStek.length && !this.fileStek.length
    },
    getCurrentPath: function(tbl){
        tbl && this.findLastSelected(tbl);
        if (!this.lastSelected) return '/';

        return this.lastSelected.parentNode.className;
    },
    displayFullPath: function(dir) {
        this.notify('displayPath', dir);
    },
    open: function(path){
        path = path.trim();
        if (path && path != this.getCurrentPath()) {
            this.doAction('opendir', path, this.lastSelected);
        }
    },
    reset: function(){
        this.clearStek('dir', 'file');
        this.getContent().find('input[type="checkbox"]:checked').iterate(function(){
            sjs(this.parentNode.parentNode).removeClass('selected');
            this.checked = false
        });
        this.restoreDefaultActions();
        return this;
    },
    initialize:function(content){
        this.reset();
        sjFileManager.link(content[0], this.id);
        sjFileManager.link(this.actionsBlock[0], this.id);

        content.unselectable().onEvent('mousedown',function(e){
            var $this=sjs.event.caller(e), key=sjs.event.key(e),
                mn=sjFileManager.get(this), i = 5, that = $this;
            while ($this && i-- && !(sjs.nodeName($this,'td') || sjs.nodeName($this,'th'))) {
                $this=$this.parentNode;
            }

            if (sjs.nodeName($this,'td')) {
                mn.prepareContent($this, key, that)
            } else if (sjs.nodeName($this,'th')) {
                mn.prepareHeaders($this, key, that);
                sjs.event.preventDefault(e);
            } else {
                return true;
            }
            mn.notify('click', $this.parentNode);
        }).onEvent('dblclick',function(e){
            var $this=sjs.event.caller(e), key=sjs.event.key(e), mn=sjFileManager.get(this),
                tr, i = 10, isCheckbox = sjs.nodeName($this, 'input');
            while($this && !sjs.nodeName($this, 'td') && i--) $this=$this.parentNode;

            if (key.shift || key.ctrl || !sjs.nodeName($this,'td') || isCheckbox) {
                return false;
            }
            tr = $this.parentNode;
            if (sjs('.folder', tr).setClass('loading').length) {
                var dir = sjs.getText(tr.cells[1]) || '';
                mn.hasStekChanges = true;
                mn.doAction('opendir', mn.getCurrentPath() + dir.trim(), tr);
            }
            mn.notify('dblclick', tr);
            sjs.event.preventDefault(e);
        });
        this.actionsBlock.unselectable().onEvent('click',function(e){
            var $this=sjs.event.caller(e), mn=sjFileManager.get(this);

            if (!sjs.nodeName($this,'a') || !mn.isActionEnabled($this)) return false;

            mn.doAction($this.name, $this);
            return false
        });

        var wrapper = content.parent(2);
        var path = sjs('<div id="sjPath" />').unselectable().onEvent('click', function(e) {
            var that = sjs.event.caller(e);
            if (!sjs.nodeName(that, 'a')) {
                return true;
            }
            var fm = sjFileManager.get(this), path = that.href.substr(that.href.lastIndexOf('#') +1);

            fm.open(path);
            sjs.event.preventDefault(e);
        }).appendTo(wrapper);
        sjFileManager.link(path.item(0), this.id);

        sjs('<div id="sjPopup" />').insertBefore(wrapper);

        this.addStandardHandlers();
        this.displayFullPath(this.getCurrentPath());
    },
    prepareContent: function(td, key, eventTarget) {
        var tr = td.parentNode, selected = this.getChecked(tr.parentNode),
            mn = this, isCheckbox = eventTarget && eventTarget.type == 'checkbox';

        if(key.shift){
            selected.iterate(function(){mn.checked(this,'',0)});
            this.checked(tr,'selected',1);
            this.select(tr)
        }else if(key.ctrl || isCheckbox){
            this.choose(tr, !isCheckbox)
        }else{
            this.lastSelected=tr;
            selected.iterate(function(){mn.checked(this,'',0)});
            this.checked(tr,'selected',1)
        }

        this.hasStekChanges = true;
        this.prepareActions();
    },
    prepareHeaders: function(th, key, eventTarget) {
        var mn = this;
        if (eventTarget && eventTarget.type == 'checkbox') {
            var chk = eventTarget.checked;
            sjs('tr', this.lastSelected.parentNode).iterate(function(){
                if (sjs('label.parent-dir', this).length) {
                    return true;
                }
                if (chk) {
                    mn.checked(this, '', 0);
                } else {
                    mn.checked(this, 'selected', 1);
                }
            });
        }
    },
    addStandardHandlers: function() {
        if (!this.hasListeners('serverError')) {
            this.when('serverError', function(js, html) {
                sjs('#sjPopup').text(js.response.msg).show(true).animate('opacity', {
                    start: 0, end: 1,
                    onEnd: function(dom, cfg) {
                        var that = this;
                        (function(that){
                            cfg.onEnd = function(dom){sjs(dom).hide()};
                            that.reverse(dom, cfg);
                        }).delay(5, this)
                    }
                }, .5);
            });
        }
        if (!this.hasListeners('displayPath')) {
            this.when('displayPath', function(path) {
                var fullPath = path;
                path = (path || '/').replace(/\/+$/, '').split('/');

                var rootName = sjFileManager.i18n('root'), wrap = sjs('#sjPath'),
                    i = path.length - 1, html = [], k = -1, tmp = '',
                    lastElement = (path[i] || rootName), activeElement = null;

                wrap.find('a').each(function() {
                    var p = this.href.substr(this.href.lastIndexOf('#') + 1);
                    if (p == fullPath) {
                        activeElement = this;
                        return false;
                    }
                });
                if (!activeElement) {
                    while (++k < i) {
                        tmp += (path[k] || '') + '/';
                        html[html.length] = '<a href="#' + sjs.htmlChars(tmp) + '">'
                            + sjs.htmlChars(path[k] || rootName)
                            + '</a>';
                    }
                    html[html.length] = '<a href="#' + sjs.htmlChars(tmp + (path[k] || '/')) + '" class="act">'
                        + sjs.htmlChars(path[k] || rootName)
                        + '</a>';

                    wrap.html('<span>&nbsp;</span>').append('<div />');
                    // fix for chrome innerHTML bug
                    setTimeout(function(){
                        wrap.first().remove();
                        wrap.first().html(html.join("&gt;"))
                        wrap.first().first().setClass('root');
                    }, 10);
                } else {
                    wrap.find('a.act').removeClass('act');
                    sjs(activeElement).setClass('act');
                }
            });
        }
        return this;
    },
    hasListeners: function (eventName) {
        return !!this.events[eventName] && this.events[eventName].length
    },
    clearListeners: function (eventName) {
        if (this.events[eventName]) {
            this.events[eventName] = null;
        }
    },
    when: function(eventName, listener) {
        if (sjs.isFn(listener)) {
            if (!this.events[eventName]) {
                this.events[eventName] = [];
            }
            this.events[eventName].push(listener);
        }
        return this;
    },
    notify: function(eventName) {
        if (this.id && this.events[eventName] && this.events[eventName].push) {
            var args = sjs.toList(arguments), fns = this.events[eventName],
                i = fns.length;
            args.shift();
            while (i--) {
               fns[i].apply(this, args);
            }
        }
        return this;
    },
    isActionEnabled: function(actionBtn) {
        var a = sjs(actionBtn), result = false;

        this.makeStek();
        var has_dirs  = (this.dirStek || []).length,
            has_files = (this.fileStek || []).length;

        result = !a.hasClass('sjsFMdisabled')
            && (
                 has_dirs  && !has_files && !a.hasClass('onlyFile')
              || has_files && !has_dirs  && !a.hasClass('onlyDir')
              || has_files && has_dirs   && !a.hasClass('onlyDir') && !a.hasClass('onlyFile')
              || !a.hasClass('sjsFMdinamic')
              || a.data('params')
            );
        return result;
    },
    _turnAction: function (names, flag) {
        if (!names.push) {
            names = [names];
        }

        var i = names.length, fn = flag ? 'show' : 'hide';
        while (i--) {
            this.getActionButton(names[i])[fn]();
        }
        return this
    },
    disable: function (names) {
        return this._turnAction(names, false);
    },
    enable: function (names) {
        return this._turnAction(names, true);
    },
    hasAction: function(name) {
        return sjs.isFn(this[name + 'Action']);
    },
    wait: function (flag) {
        if (this.actionsBlock) {
            this.actionsBlock[(flag ? 'set' : 'remove') + 'Class']('processing');
        }
        return this;
    },
    doAction: function(name) {
        if (!this.hasAction(name) || name == 'do' || name == 'has' || name == 'add') return false;

        var args = Array.prototype.slice.call(arguments,1);
        this.notify(name, args);
        this[name + 'Action'].apply(this, args || []);
        return this;
    },
    addAction: function(name, options, callback) {
        var btn = this.getActionButton(name);
        if (btn && !btn.item(0)) {
            var attrs = { 'class': [], name: name };

            switch (options['for']) {
                case 'files':
                    attrs['class'].push('onlyFile');
                    break;
                case 'dirs':
                    attrs['class'].push('onlyDir');
                    break;
            }

            if (options.dynamic) {
                attrs['class'].push('sjsFMdinamic');
            }

            if ('enabled' in options && !options['enabled']) {
                attrs['class'].push('sjsFMdisabled');
            }

            if ('class' in options) {
                attrs['class'].push(options['class']);
            }

            if ('title' in options) {
                attrs['title'] = options.title;
            }

            if ('state' in options) {
                attrs['class'].push(options.state);
            }

            attrs['class'].push('sjfm_files_' + name);
            attrs['class'] = attrs['class'].join(' ');
            btn = sjs('<a href="#">&nbsp;</a>').attr(attrs);

            if (options.after) {
                btn.insertAfter(this.getActionButton(options.after));
            } else if (options.before) {
                btn.insertBefore(this.getActionButton(options.before));
            } else {
                btn.appendTo(this.actionsBlock);
            }
        } else {
            this.actions.push([name, options]);
        }

        if (sjs.isFn(callback)) {
            this[name + 'Action'] = callback;
        }
        return this;
    },
    getActionButton: function(name) {
        return this.actionsBlock && this.actionsBlock.find('a[name="' + name +'"]')
    },
    prepareActions: function(){
        this.makeStek();
        var has_dirs = (this.dirStek || []).length,
            has_files = (this.fileStek || []).length;

        if (has_files && has_dirs) {
            this.actionsBlock.setClass('enabledGeneralActions')
                .removeClass('enabledDirActions')
                .removeClass('enabledFileActions')
        } else if (has_files && !has_dirs) {
            this.actionsBlock.setClass('enabledFileActions')
                .setClass('enabledGeneralActions')
                .removeClass('enabledDirActions')
        } else if (has_dirs && !has_files) {
            this.actionsBlock.setClass('enabledDirActions')
                .setClass('enabledGeneralActions')
                .removeClass('enabledFileActions')
        } else {
            this.restoreDefaultActions()
        }
        return this;
    },
    restoreDefaultActions: function(){
        this.actionsBlock.removeClass('enabledGeneralActions')
            .removeClass('enabledDirActions')
            .removeClass('enabledFileActions')
    },
    refreshAction:function(btn) {
        var path=this.getCurrentPath();
        this.opendirAction(path.substr(0,path.length-1), null, true);
    },
    opendirAction:function(dir, rowNode, dropCache) {
        var tr = this.lastSelected;
        this._request(this.actionUrl, { path: sjs.realpath(dir), dropCache: !!dropCache }, true)
            .resolve(ResponseProcessor.opendir)
            .reject(function(js, html) {
                sjs(tr).find('label').removeClass('loading');
            });
        this.restoreDefaultActions();
    },
    transformAction:function(btn){
        var $do=sjs(btn.parentNode);

        if($do.hasClass('filemanagerfixed')){
            $do.removeClass('filemanagerfixed');
            sjs.className.set(btn,'active')
        }else{
            $do.setClass('filemanagerfixed');
            sjs.className.remove(btn,'active')
        }
    },
    cutAction:function(btn, onlyCopy){
        this.makeStek();
        this.getActionButton('paste').removeClass('sjsFMdisabled')
            .setClass('sjsFMenabled')
            .data('params', {
                files: [].concat(this.fileStek, this.dirStek),
                baseDir: this.getCurrentPath(),
                onlyCopy: onlyCopy || false
            });
    },
    copyAction:function(btn){
        this.cutAction(btn, true);
    },
    pasteAction:function(btn){
        var post = sjs(btn).data('params');
        if(!post || !post.files || !post.files.length || !post.onlyCopy
           && post.baseDir == this.getCurrentPath()
        ) {
            sjs(btn).setClass('sjsFMdisabled').removeClass('sjsFMenabled');
            return false
        }

        this._request(this.actionUrl, sjs.extend({
            action: 'paste',
            path: this.getCurrentPath()
        }, post)).resolve(ResponseProcessor.paste);
        sjs(btn).data('params', null);
    },
    removeAction:function(btn){
        sjFileManager.createWindow(this, {
            title:   sjFileManager.i18n('Remove file(s)') + '?',
            vars: { message: sjFileManager.i18n('Are you sure you want to permanently delete') },
            arguments: { action: 'remove' }
        }, 'window.confirm');
    },
    renameAction:function(btn){
        this.makeStek();

        if(this.emptyStek()){
            return false;
        }
        this._setItemName(this.lastSelected.cells[1])
            .onEvent('blur', ResponseProcessor.rename);
    },
    _setItemName: function(td) {
        var stek = this.dirStek.concat(this.fileStek),
            p = stek[0].lastIndexOf('.');
        sjs(td).next().css('display', 'none');
        td.setAttribute('colSpan','2');

        if (p==-1 || !p) {
            p = stek[0].length;
        }
        this.getContent().selectable();
        var fName = sjs.htmlChars(stek[0]), inp = sjs('label', td)
            .html('<input type="text" name="sjsFMnewName" value="' + fName + '" title="' + fName + '" />')
            .first();
        sjs.selectText(inp[0], 0, p);
        inp[0].focus();
        sjFileManager.link(inp[0], this.id);

        return inp.onEvent('keydown',function(e){
            var key=sjs.event.key(e);
            if (key.code==13) {
                this.blur();
                return false
            } else if (key.code == 27) {
                this.isEscaped = true;
                this.value = this.title;
                this.blur();
                return false;
            }
        });
    },
    downloadAction:function(btn){
        this.actionsBlock.find('img').setClass('unvisible');

        this._request(this.actionUrl, {
            action: 'download',
            path: this.getCurrentPath(),
            files: document.sjs_form
        }).resolve(ResponseProcessor.base);
    },
    permsAction:function(btn){
        this.makeStek();
        if(this.emptyStek()) {
            return false;
        }

        var files = this.dirStek.concat(this.fileStek);
        sjFileManager.createWindow(this, {
            title: sjFileManager.i18n('Permissions'),
            vars: { value: files.length > 1 ? '755' : this.getFileInfo(files[0]).mode },
            arguments: { action: 'perms' }
        }, 'actions.perms.permissions_form');
    },
    statAction:function(btn) {
        this.makeStek();
        var files = [];
        if (!this.emptyStek()) {
            var files = this.dirStek.concat(this.fileStek);
            files.length = 1;
        }

        var path = this.getCurrentPath(),
            title = (files[0] || sjs.pathinfo(path.substr(0, path.length - 1)).basename || sjFileManager.i18n('root'));

        this.wait(true);
        sjFileManager.createWindow(this, {
            title: sjFileManager.i18n('Information') + ': ' + title,
            url: this.actionUrl,
            isModal: false,
            move: true,
            postData: {
                files:  files,
                action: 'stat',
                path: path
            }
        }, 'window.file_info');
    },
    createDirAction:function(btn) {
        var name = sjFileManager.i18n('untitled folder'),
            row = this.addRow({
                is_dir: true,
                name: name,
                basename: name,
                fake: true
            }, 'first');

        this.reset().checked(row[0], 'selected', true);
        this.makeStek();

        this.prepareActions()
            ._setItemName(row[0].cells[1])
            .onEvent('blur', ResponseProcessor.createDir);
    },
    uploadAction:function(btn){
        if (!this.uploader) {
            return false;
        }
        this.getWindow('upload', {
            title: sjFileManager.i18n('Upload Files'),
            template: 'window.upload_form',
            move: true
        });
        this.uploader.wakeUp();
    },
    onUploaderReady: function(){
        var mn = this.getFileManager(),
            postParams = {
                action: 'upload',
                print_error: !mn.uploader.silently,
                path: mn.getCurrentPath()
            };

        postParams[$_Request.prototype.session_name] = $_Request.prototype.getSession();
        if (mn) {
            mn.notify('uploader_ready', postParams);
            mn.uploader.setPostParams(postParams);
        }
    },
    onUploadSuccess: function(file, serverData){
        if (!this.uploader.hasErrors && this.uploader.getStats().files_queued == 0) {
            var w = this.doAction('refresh').getWindow('upload');
            (function(){ w.close() }).delay(.5)
        }
    },
    getWindow: function(name, options) {
        var w = this.windows[name];
        if (w) {
            w.show().position();
            return w;
        }

        w = sjFileManager.createWindow(this, sjs.extend({
            content: '',
            arguments: { action: name }
        }, options || {}), options.template);

        w.onclose = function(){
            this.hide();
            return false;
        };
        return this.windows[name] = w;
    },
    setUploader: function(upl) {
        if (upl) {
            this.uploader = upl;
            upl.__file_manager_id = this.id;
            upl.getFileManager = function() {
                return sjs.globals.fm[this.__file_manager_id];
            };
            this.enable('upload');
        } else {
            this.disable('upload')
        }
        return this;
    },
    getContent: function() {
        var p = this.lastSelected.offsetParent;
        if (!p) {
            p = this.lastSelected.parentNode.parentNode;
        }
        return sjs(p.parentNode);
    }
});

var ResponseProcessor = {
    base: function(js, html, mn){
        mn.doAction('refresh');
        mn.clearStek('file', 'dir');

        return mn;
    },
    opendir: function(js, html, mn) {
        mn.setFiles(js.files).displayFullPath(mn.getCurrentPath());
    },
    paste: function(js,txt,mn){
        ResponseProcessor.base(js, txt, mn);

        mn.getActionButton('paste').setClass('sjsFMdisabled')
            .removeClass('sjsFMenabled');
    },
    remove: function(mn, content, js, html, wObj){
       content.onEvent('click', function(e) {
          var $this = sjs.event.caller(e), i = 2;
          while (!sjs.nodeName($this,'button') && i--) {
              $this = $this.parentNode;
          }
          if (!sjs.nodeName($this,'button')) {
              return false;
          }

          ResponseProcessor.processButtons($this, mn, {
              action: 'remove',
              files: mn.fileStek.concat(mn.dirStek)
          });
          this.onclick = null;
          wObj.close(e,$this);
       });
    },

    perms: function(mn, content, js, html, wObj){
        var permsOct = content.onEvent('click', function(e){
            var $this=sjs.event.caller(e);

            if (!sjs.nodeName($this,'input')
                && !sjs.nodeName($this,'button')
                && !(sjs.nodeName($this,'span')
                && sjs.nodeName($this=$this.parentNode,'button'))
            ) return true;

            var permsOct=$this.form['perms[value]'];

            if($this.type=='checkbox'){
                if(isNaN(Number(permsOct.value))) return false;
                if($this.checked){
                    permsOct.value=Number(permsOct.value)+Number($this.value);
                }else{
                    permsOct.value=Number(permsOct.value)-Number($this.value);
                }
            }else if(sjs.nodeName($this,'button')){
                ResponseProcessor.processButtons($this, mn, {
                    action: 'perms',
                    fileperms: permsOct.value,
                    send: permsOct.value != permsOct.title,
                    files: mn.fileStek.concat(mn.dirStek)
                });
                this.onclick = null;
                wObj.close(e,$this);
            }
        }).find('input[type=text]').onEvent('keyup',function(){
            if(!isNaN(Number(this.value))){
                var num,type=new Array('own','gr','oth'),value=this.value.trim();
                for(var i=0;i<3;i++){
                    num=Number(value.charAt(i))||0;
                    if(num>=4){
                        this.form['perms['+type[i]+'_read]'].checked=1;
                        num-=4;
                    }else{
                        this.form['perms['+type[i]+'_read]'].checked=0;
                    }
                    if(num>=2){
                        this.form['perms['+type[i]+'_write]'].checked=1;
                        num-=2;
                    }else{
                        this.form['perms['+type[i]+'_write]'].checked=0;
                    }
                    if(num>=1){
                        this.form['perms['+type[i]+'_exec]'].checked=1;
                    }else{
                        this.form['perms['+type[i]+'_exec]'].checked=0;
                    }
                }
            }
        });

        permsOct.trigger('keyup');
        permsOct[0].title = permsOct[0].value;
    },

    createDir: function(event) {
        var mn = sjFileManager.get(this), dirname = sjs.trim(this.value),
            content = mn.getContent();

        content.unselectable();
        if (this.isEscaped || !dirname) {
            sjs(this).parent(2).remove();
            mn.clearStek('dir');
        } else {
            mn._request(mn.actionUrl, {
                path: mn.getCurrentPath(),
                action: 'create_dir',
                dirname: dirname
            }).resolve(ResponseProcessor.base);
        }
        mn.findLastSelected(content.first()[0]);
        mn.reset();
    },
    rename: function(e){
        var mn = sjFileManager.get(this);

        mn.getContent().unselectable();
        this.value = String(this.value).trim();
        if(!this.value || this.value == this.title){
            var td = this.parentNode.parentNode,
                p = files[0].lastIndexOf('.');
                filename = this.title;

            if (p && p != -1) {
                filename = filename.substr(0, p);
            }

            sjs(td).attr('colSpan', 1).next().css('display', '');
            sjs(this.parentNode).html(sjs.htmlChars(filename));
            return false;
        }
        mn._request(mn.actionUrl, {
            files: mn.dirStek.concat(mn.fileStek),
            fileNames: [this.value],
            action: 'rename',
            path: mn.getCurrentPath()
        }).resolve(ResponseProcessor.base);
    },

    upload: function(fm, content, js, html, wObj){
        var btn = content.find('button[name="upload"]').onEvent('click', function(){
            fm.uploader.startUpload();
        });
    },

    processButtons: function(btn, mn, cfg, callback){
        var type = btn.name, apply = true;
        if ('send' in cfg){
            apply = cfg.send;
            delete cfg.send;
        }

        switch (type) {
            case 'ok':
                if(!apply) return false;

                mn.makeStek();
                mn._request(mn.actionUrl, sjs.extend({
                    path: mn.getCurrentPath()
                }, cfg || {})).resolve(sjs.isFn(callback) && callback || ResponseProcessor.base);
            break;
        }
    }
};

sjFileManager.createWindow = function(fm, cfg, tmplId){
    return new sjWindow(cfg.url, sjs.extend({
        title: sjFileManager.i18n('Information'),
        tmpl:'#sjWindowTmpl',
        isModal:true,
        action:'001'
    }, cfg || {}), function(content, js, html) {
        var tmpl = '', vars = cfg.vars || {}, self = this;
        if (tmplId) {
            tmpl = fm.view.get(tmplId)
            vars.i18n = sjFileManager.i18n;
            vars = sjs.extend(vars, js || {});
        }
        self.hide();
        sjs.when(tmpl, function (tmpl) {
            var action = ResponseProcessor[self.arguments.action];
            if (sjs.isFn(tmpl)) {
                content.html(tmpl(vars));
            }
            content.width('auto').height('auto');
            self.show();

            if (js && js.response && js.response.status == 'error'){
                fm.notify('serverError', js, html);
                return self.close();
            } else if (sjs.isFn(action)) {
                action(fm, content, js, html, self);
            }
            fm.wait(false);
            self.toInnerSize();
            self.position();
        });
    });
};

var Config = {
    data: {},
    _value: function (name, value) {
        var chunks = name.split('.'), i = chunks.length - 1, current = this.data;
        for (var k = 0; k < i; k++) {
            if (!current[chunks[k]]) {
                current[chunks[k]] = {};
            }
            current = current[chunks[k]];
        }

        if (value != undefined) {
            current[chunks[k]] = value;
        } else {
            return current[chunks[k]];
        }
    },
    set: function (name, value, def) {
        value = value == undefined ? def : value;
        if (name.indexOf('.') != -1) {
            this._value(name, value);
        } else {
            this.data[name] = value;
        }
        return this;
    },
    get: function (name, def) {
        var v;
        if (name.indexOf('.') != -1) {
            v = this._value(name);
        } else {
            v = this.data[name];
        }
        return v || def;
    },
    clear: function () {
        this.data = {};
    }
};

var events = ['ready', 'displayPath', 'serverError', 'serverOk', 'click', 'dblclick', 'uploader_ready', 'opendir'],
    i = events.length;
while(i--) {
    Config.set('fm.listeners.' + events[i], []);
}

sjFileManager.configure = function (options) {
    options = options || {};
    if (options.i18n) {
        this.i18n(options.i18n);
    }

    var url = sjs.trim(options.url);
    if (options.opendir) {
        url += (url.indexOf('?') == -1 ? '?' : '&') + 'path=' + options.opendir;
    }

    Config.set('url', url)
        .set('fm.container', options.container, '#sjFilemanager')
        .set('fm.rootUrl', options.root)
        .set('fm.actionUrl', sjs.trim(options.url))
        .set('fm.webRoot', options.webRoot);

    options.window = options.window || {};
    Config.set('window.tmpl', '#sjWindowTmpl')
        .set('window.title', sjFileManager.i18n('File Manager'))
        .set('window.isModal', options.window.isModal, true)
        .set('window.action', options.window.action, '001')
        .set('window.move', options.window.movable, true)
        .set('window.resizable', options.window.resizable, true);

    return Config;
};

var Instance = new sjs.promise();
sjFileManager.getInstance = function() {
    if (Instance instanceof sjFileManager) {
        Instance.getWindow('main').show().position();
        Instance.reset();
        return Instance;
    }

    if (!Config.get('window') || !Config.get('fm')) {
        throw "sjFilemanager was not configured. Use sjFilemanager.configure method!";
    }

    var w = new sjWindow(null, Config.get('window'), function(content, js, html) {
        var self = this;
        Config.set('fm.container', content).get('fm.listeners.ready').unshift(function() {
            content.width('auto').height('auto');
            self.show().toContentSize();
            self.position();

            Instance.resolve(this);
            Instance = this;
        });
        var fm = new sjFileManager(Config.get('fm'), Config.get('fm.listeners'));
        fm.windows.main = self;
        self.hide();

        sjs.className.set(self.window, 'sjFilemanagerWindow');
        sjs.className.set(self.clone, 'sjFilemanagerWindow');
    });
    sjs(w.window).removeClass('ie6_width_fix')
        .find('.sjs_wcontent')
        .setClass('sjDimensions');
    w.onclose = function(){
        this.hide();
        return false;
    };
    return Instance;
};

sjFileManager.create = function(options) {
    if (Instance.is_configured) {
        return false;
    }
    sjWindow.renderView();

    var cfg = sjFileManager.configure(options);
    cfg.get('fm.listeners.ready').push(function() {
        this.setUploader(sjFileManager.getUploaderFor(this, cfg.get('fm.uploader')));

        MediaManager.renderView(sjFileManager.i18n.get());
        var fm = this, c = sjs('#sjMediamanager').insertBefore(fm.getContent().parent(1))
            .find('.sjMediaWrapper');
        MediaManager.getInstance(c, {
            panel: '.sjMediaPanel',
            lazy: true,
            saveUrl: cfg.get('url')
        }).syncWithFileManager(fm, 'refresh').addListener('serverOk', function(js, html){
            this.unsFiles(js.media.rm);
            this.addFiles(js.media.add);

            this.gotoFile(this.files.length - js.media.add.length);
            fm.doAction('refresh');
        });
        cfg.clear();
    });

    cfg.get('fm.listeners.click').push(function() {
        var mm = MediaManager.getInstance(), files;
        this.makeStek();
        if (!mm.isSleepy && (files = this.getFiles())) {
            mm.setFiles(files).showFile();
        }
    });

    cfg.get('fm.listeners.dblclick').push(function(tr) {
        if (!sjs('td.dir', tr).length) {
            this.doAction('insert');
        }
    });

    cfg.get('fm.listeners.ready').push(function (content) {
        var fm = this, scr = new sjs.ScrollableContent(content.parent(2), {
            url:  fm.actionUrl,
            page: 2,
            data: { format: 'json' }
        });

        scr.on('load', function (data) {
            var response = data.js;
            if (response.files && response.files.source) {
                var files = response.files.source;
                for (var i = 0, count = files.length; i < count; i++) {
                    var file = files[i];

                    file.type = file.is_dir ? 'dir' : file.type;
                    fm.addRow(file);
                }

                if (files.length) {
                    data.loader.page++;
                }
            }
        }).on('data', function (data) {
            data.path = fm.getCurrentPath();
        });

        var clear = scr.reset.bind(scr);
        fm.when('opendir', clear).when('refresh', clear);
    });
    Instance.is_configured = true;
    return cfg;
};

var HelperMixin = {
    exportToField: function (field, type) {
        this.makeStek();
        if (this.fileStek && this.fileStek.length) {
            var url = this.rootUrl + this.getCurrentPath();

            if (!field.sjs) {
                field = sjs(field);
            }

            switch (type) {
                case 'multiple':
                    field.prop('value', url + '|' + this.fileStek.join(":"));
                break;
                default:
                    field.prop('value', url + this.fileStek[0]);
                break;
            }
            field.trigger('change');
            this.windows.main.close();
        }
    }
};

sjFileManager.choiseCallback = function(field, type) {
    return sjs.when(sjFileManager.getInstance(), function (fm) {
        path = String(field.value).replace(fm.rootUrl, '');
        path && fm.open(
            path.charAt(path.length - 1) == '/'
            ? path
            : sjs.pathinfo(path).dirname
        );
        fm.addAction('insert', {
            before: 'refresh',
            dynamic: true,
            'class': 'sjfm_files_insert',
            'for': 'files'
        }, HelperMixin.exportToField.bind(fm, field, type));
    });
};

var i18n = {};
sjFileManager.i18n = function(data) {
    if (data.constructor != String) {
        i18n = data;
    } else if (i18n[data]) {
        return i18n[data];
    } else {
        return data;
    }
};

sjFileManager.i18n.get = function () {
    return i18n;
};

window.sjFileManager = sjFileManager;
}())

sjFileManager.get = function(obj){
    if (!obj || !obj.__FileManageId__) {
        return null;
    }
    return sjs.globals.fm[obj.__FileManageId__];
};

sjFileManager.link = function(obj, id) {
    if (!obj) {
        return null;
    }
    return obj.__FileManageId__ = id;
};

sjFileManager.getUploaderFor = function(fm, cfg){
    var baseDir = fm.webRoot;
    return new SWFUpload(sjs.extend({
        lazy: true,
        upload_url: fm.actionUrl,
        flash_url: baseDir + "/js/swfupload/swfupload.swf",
        file_post_name: 'files',
        custom_settings: {
            progressTarget : "sjFmUploadProgress"
        },
        file_size_limit: "300MB",
        file_types: "*.*",
        file_types_description: "All Files",
        file_upload_limit: 100,
        file_queue_limit: 0,
        button_text_left_padding: 5,
        button_text_top_padding: 1,
        button_image_url: baseDir + "/js/swfupload/sbtn.png",
        button_placeholder_id: "sjFmButtonPlaceHolder",
        button_text: '<span class="submit">' + sjFileManager.i18n('Files') + '</span>',
        button_width: "65",
        button_text_style: ".submit { font-size: 11; color:#000000; font-family:Tahoma, Arial, serif; }",
        button_height: "20",
        file_queued_handler: fileQueued,
        file_queue_error_handler: fileQueueError,
        file_dialog_complete_handler: sjFileManager.prototype.onUploaderReady,
        upload_start_handler: uploadStart,
        upload_progress_handler: uploadProgress,
        upload_error_handler: uploadError,
        upload_success_handler: function(file, serverData) {
            if (serverData) {
                this.hasErrors = true;
            }
            uploadSuccess.call(this, file, serverData);
            fm.onUploadSuccess(file, serverData);
        }
    }, cfg || {}));
};
