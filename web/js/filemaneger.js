
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
    __construct: function(content, cfg, listeners) {
        this._create(content, cfg, listeners)
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
    _request: function (url, data) {
        var waiter = new sjs.promise();
        sjs.query(url, data, function (js, html) {
            waiter.resolve({js: js, html: html});
        }, true);
        return waiter;
    },
    _create: function (content, cfg, events) {
        this.id         = content[0].sjsEventId;
        this.actionUrl  = (cfg.actionUrl || '').replace(/[\\\/]+$/, '') + '/';
        this.dirUrl     = cfg.dirUrl || this.actionUrl;
        this.rootUrl    = (cfg.rootUrl || '').replace(/[\\\/]+$/, '');
        this.events     = events || {};
        this.dirStek    = null;
        this.fileStek   = null;
        this.windows    = {};
        this.requestData  = {};
        this.lastSelected = null;
        this.actionsBlock = sjs(cfg.actionSel || '#sjFmActions');
        this.hasStekChanges = false;
        this.rowTemplate  = '';

        this.findLastSelected(content.first()[0]);
        this.setUploader(cfg.uploader);
        this.setRowTemplate(cfg.rowTemplate);
        this.initialize(content);
        sjs.globals.fm[this.id]=this;

        this.notify('ready', content);
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
        var checkbox = tr.firstChild.firstChild;
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
        dirs=files=null;
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
        this.hasStekChanges = false;
        while (i--) {
            stek = arguments[i] + 'Stek';
            if(this[stek]) {
                this[stek] = null
            }
        }
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

        var wrapper = content.parent().parent();
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
    setRowTemplate: function (template) {
        if (!template) {
            var rows = [
                'tcenter padding-left-0 width40',
                'list-current', 'width70', null,
                'width110'
            ], i = rows.length, k = -1, td = '';
            template = sjs(sjs.newTag('tr'));
            while (++k < i) {
                td = sjs.newTag('td');
                td.className = rows[k];
                td.innerHTML = '&nbsp;';
                template.append(td);
            }
            template.find('td:nth-child(2)').html('<label />')
                .prev()
                .append('<input type="checkbox" name="files[]" />')
        }
        this.rowTemplate = template;
        return this;
    },
    getRowTemplate: function(type) {
        var template = sjs(this.rowTemplate.item(0).cloneNode(true)),
            lblClass = 'default', tdClass = 'file';

        switch (type) {
            case 'dir':
                lblClass = 'folder';
                tdClass  = 'dir';
            break;
            default:
                lblClass = 'default ' + type;
                tdClass  = 'file';
            break;
        }

        template.find('td label')
            .setClass(lblClass)
        .parent()
            .setClass(tdClass);

        return template;
    },
    addRow: function (data) {
        var row = this.getRowTemplate(data.type),
            tds = row.find('td');

        // checkbox value
        tds.nth(0).first().value(data.basename);
        tds.nth(1).first().text(data.name);
        tds.nth(2).text(data.type == 'dir' ? ' ' : data.type);
        tds.nth(3).text(data.size);
        tds.nth(4).text(data.modify)

        this.getContent().find('tbody')
            .append(row);
        return this;
    },
    addStandardHandlers: function() {
        if (!this.hasListeners('serverError')) {
            this.addListener('serverError', function(js, html) {
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
            this.addListener('displayPath', function(path) {
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
    addListener: function(eventName, listener) {
        if (sjs.isFn(listener)) {
            if (!this.events[eventName]) {
                this.events[eventName] = [];
            }
            this.events[eventName].push(listener);
        }
        return this;
    },
    notify: function(eventName) {
        if (this.events[eventName] && this.events[eventName].push) {
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
              || this.requestData.files
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
    doAction: function(name) {
        if (!this.hasAction(name) || name == 'do' || name == 'has' || name == 'add') return false;

        var args = Array.prototype.slice.call(arguments,1);
        this.notify(name, args);
        this[name + 'Action'].apply(this, args || []);
        return this;
    },
    addAction: function(name, options, callback) {
        var btn = this.getActionButton(name);
        if (!btn.item(0)) {
            var attrs = { 'class': [] };

            attrs.name = name;

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
                attrs['class'].push('sjsFMdisable');
            }

            if ('class' in options) {
                attrs['class'].push(options['class']);
            }

            attrs['class'] = attrs['class'].join(' ');
            btn = sjs('<a href="#">&nbsp;</a>').attr(attrs);

            if (options.after) {
                btn.insertAfter(this.getActionButton(options.after));
            } else if (options.before) {
                btn.insertBefore(this.getActionButton(options.before));
            } else {
                btn.appendTo(this.actionsBlock);
            }
        }
        this[name + 'Action'] = callback;
        return this;
    },
    getActionButton: function(name) {
        return this.actionsBlock.find('a[name="' + name +'"]')
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
    opendirAction:function(dir,content,refresh){
        refresh = !!refresh;
        if (refresh) {
            this.actionsBlock.setClass('dofileaction');
        }

        sjs.query(this.dirUrl, { dirpath: dir }, ResponseProcessor.opendir, 1,{
            line: content,
            isRefresh: refresh,
            fmId: this.id
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
    refreshAction:function(btn){
        var path=this.getCurrentPath();
        this.opendirAction(path.substr(0,path.length-1),this.lastSelected,1);
    },
    cutAction:function(btn, onlyCopy){
        var $this=sjs(btn.parentNode);

        this.makeStek();
        this.requestData.files = [].concat(this.fileStek, this.dirStek);
        this.requestData.baseDir  = this.getCurrentPath();
        this.requestData.onlyCopy = onlyCopy;
        $this.find('a[name="paste"]').removeClass('sjsFMdisabled')
             .setClass('sjsFMenabled');
    },
    copyAction:function(btn){
        this.cutAction(btn, true);
    },
    pasteAction:function(btn){
        if(!this.requestData.files
           || !this.requestData.files.length
           || !this.requestData.onlyCopy
           && this.requestData.baseDir == this.getCurrentPath()
        ) {
            this.actionsBlock.find('a[name="paste"]')
                .setClass('sjsFMdisabled')
                .removeClass('sjsFMenabled');
            return false
        }

        sjs.query(this.actionUrl, sjs.extend({
            action: 'paste',
            path: this.getCurrentPath()
        }, this.requestData),ResponseProcessor.paste,1,{
            object_id: this.id
        });
    },
    removeAction:function(btn){
        this.actionsBlock.find('img').setClass('unvisible');

        sjFileManager.createWindow({
            id: this.id,
            title: sjFileManager.i18n('Are you sure you want to permanently delete') + '?',
            arguments: { action: 'remove' }
        },'confirm');
    },
    renameAction:function(btn){
        this.actionsBlock.find('img').setClass('unvisible');
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

        if(p==-1 || !p) {
            p = stek[0].length;
        }
        this.getContent().selectable();
        var fName = sjs.htmlChars(stek[0]), inp = sjs('label', td)
            .html('<input type="text" name="sjsFMnewName" value="' + fName + '" title="' + fName + '" />')
            .first();
        sjs.selectText(inp[0], 0, p);
        inp[0].focus();
        inp[0].__file_manage_id = this.id;

        return inp.onEvent('keydown',function(e){
            var key=sjs.event.key(e);
            if (key.code==13) {
                this.blur();
                return false
            } else if (key.code == 27) {
                this.value = this.title;
                this.__escape = true;
                this.blur();
                return false;
            }
        });
    },
    downloadAction:function(btn){
        this.actionsBlock.find('img').setClass('unvisible');

        sjs.query(this.actionUrl,{
            action: 'download',
            path: this.getCurrentPath(),
            files: document.sjs_form
        }, ResponseProcessor.base, true, {
            object_id: this.id
        }, {
            loader: 'form',
            method: 'POST'
        });
    },
    permsAction:function(btn){
        this.actionsBlock.find('img').setClass('unvisible');
        this.makeStek();
        if(!this.dirStek.length && !this.fileStek.length) return false;

        sjFileManager.createWindow({
            id: this.id,
            title: sjFileManager.i18n('Permissions'),
            postData:{
                action: 'perms',
                files: this.dirStek.concat(this.fileStek),
                path: this.getCurrentPath()
            },
            arguments: { action: 'perms' }
        },null,this.actionUrl);
    },
    dirInfoAction:function(btn){
        this.actionsBlock.find('img').setClass('unvisible');
        this.makeStek();
        var files = 0;
        if (this.dirStek || this.fileStek) {
            var files = this.dirStek.concat(this.fileStek);
            files.length = 1;
        }

        sjFileManager.createWindow({
            id: this.id,
            postData: {
                files:  files,
                action: 'dir_info',
                path: this.getCurrentPath()
            }
        },null,this.actionUrl);
    },
    createDirAction:function(btn){
        this.actionsBlock.find('img').setClass('unvisible');
        var name = sjFileManager.i18n('untitled folder'),
            row  = this.getRowTemplate('dir'),
            lbl  = row.find('label.folder').text(name),
            td   = this.getContent().find('td.dir').nth('last');
        row.find('input[type="checkbox"]').value(name);
        if (td && td.item(0)) {
            row.insertAfter(td[0].parentNode);
        } else {
            this.getContent().find('tbody')
                .prepend(row);
        }
        this.reset().checked(row[0], 'selected', true);

        this.hasStekChanges = true;
        this.prepareActions()
            ._setItemName(lbl[0].parentNode)
            .onEvent('blur', ResponseProcessor.createDir);
    },
    uploadAction:function(btn){
        if (!this.uploader) {
            return false;
        }
        this.actionsBlock.find('img').setClass('unvisible');
        this.getWindow('upload', sjFileManager.i18n('Upload Files'));
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
            (function(){ w.close() }).delay(.9)
        }
    },
    getWindow: function(name, title) {
        var w = this.windows[name];
        if (w) {
            w.show();
            return w;
        }

        w = sjFileManager.createWindow({
            id: this.id,
            title: title,
            content: sjs('#sj' + sjs.capitalize(name) + 'Tmpl').first()[0],
            arguments: { action: name }
        });

        w.find('.sjs_wcontent').setClass('sjs_uploader');
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
            this.enable('upload')
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
    base: function(js, html){
       var mn=sjs.globals.fm[this.args.object_id];

       if(js && js.response && js.response.status == 'error'){
            mn.notify('serverError', js, html);
            mn.actionsBlock.find('img').setClass('unvisible');
       }else{
            mn.notify('serverOk', js, html);
            mn.doAction('refresh');
            mn.clearStek('file', 'dir');
            mn.requestData = {};
       }

       return mn
    },
    opendir: function(js,html){
       var mn=sjs.globals.fm[this.args.fmId], curDir;

       if(js && js.response && js.response.status == 'error'){
            sjs(this.args.line).find('label').removeClass('loading');
            mn.notify('serverError', js, html);
       } else {
           var tbl = mn.getContent().html(html).first().item(0);
           curDir=mn.getCurrentPath(tbl);
           if (this.args.isRefresh) {
              mn.actionsBlock.removeClass('dofileaction');
           } else {
              mn.displayFullPath(curDir);
           }
       }
    },
    paste: function(js,txt){
        var mn = ResponseProcessor.base.call(this, js, txt);
        if (js.response.status != 'error') {
           mn.actionsBlock.find('a[name="paste"]')
            .setClass('sjsFMdisabled')
            .removeClass('sjsFMenabled');
        }
    },
    remove: function(content, js, html, wObj){
       this.actionsBlock.find('img').removeClass('unvisible');

       content.onEvent('click',function(e){
          var $this = sjs.event.caller(e), i = 2;
          while (!sjs.nodeName($this,'button') && i--) $this = $this.parentNode;
          if(!sjs.nodeName($this,'button')) return false;

          var mn=sjs.globals.fm[this.__file_manager_id],
              wObj = sjs.globals.windows[this.__window_id];

          ResponseProcessor.processButtons($this, mn, {
              action: 'remove',
              files: mn.fileStek.concat(mn.dirStek)
          });
          this.onclick = null;
          wObj.close(e,$this);
       });
       content[0].__file_manager_id = this.id;
       content[0].__window_id = wObj.id;
    },

    perms: function(content, js, html, wObj){
        var permsOct = content.onEvent('click', function(e){
            var $this=sjs.event.caller(e),
                mn=sjs.globals.fm[this.__file_manager_id],
                wObj=sjs.globals.windows[this.__window_id];

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
                var num=null,type=new Array('own','gr','oth'),value=this.value.trim();
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
                num=type=value=null;
            }
        });
        content[0].__file_manager_id = this.id;
        content[0].__window_id = wObj.id;

        permsOct.trigger('keyup');
        //permsOct[0].select();
        permsOct[0].title = permsOct[0].value;
    },

    createDir: function(content, js, html, wObj){
        var mn = sjs.globals.fm[this.__file_manage_id],
            dirname = sjs.trim(this.value);

        mn.getContent().unselectable();
        if (this.__escape || !dirname) {
            mn.findLastSelected(mn.getContent().first()[0]);
            var tr = this.parentNode.parentNode.parentNode;
            tr.parentNode.removeChild(tr);
        } else {
            sjs.query(mn.actionUrl, {
                path: mn.getCurrentPath(),
                action: 'create_dir',
                dirname: dirname
            }, ResponseProcessor.base, 1, {
                object_id: mn.id
            });
        }
        mn.reset();
    },
    rename: function(e){
        var mn = sjs.globals.fm[this.__file_manage_id],
            files = mn.dirStek.concat(mn.fileStek);

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
        mn.actionsBlock.find('img').removeClass('unvisible');
        sjs.query(mn.actionUrl,{
            files: files,
            fileNames: [this.value],
            action: 'rename',
            path: mn.getCurrentPath()
        }, ResponseProcessor.base, true, {
            object_id: mn.id
        });
    },

    upload: function(content, js, html, wObj){
        var btn = content.find('button[name="upload"]').onEvent('click', function(){
            var mn = sjs.globals.fm[this.__file_manager_id];
            mn.uploader.startUpload();
        });
        btn[0].__file_manager_id = this.id;
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
                sjs.query(mn.actionUrl,sjs.extend({
                   path: mn.getCurrentPath()
                }, cfg || {}),
                sjs.isFn(callback) && callback || ResponseProcessor.base, 1, {
                   object_id: mn.id
                });
            break;
            default:
                mn.actionsBlock.find('img').setClass('unvisible');
            break;
        }
    }
};

sjFileManager.createWindow = function(cfg, contentType, url, onclose){
   if (contentType) {
      cfg.content = sjs('#sj'+sjs.capitalize(contentType)+'Tmpl')[0].innerHTML
   }

   if (cfg.arguments) {
      cfg.arguments.file_manage_id = cfg.id;
   } else {
      cfg.arguments = { file_manage_id: cfg.id };
   }

   var w=new sjWindow(url, sjs.extend({
      title: sjFileManager.i18n('Information'),
      tmpl:'#sjWindowTmpl',
      isModal:true,
      action:'001',
      onChangeSize:function(content){
          var size = content.getSize();
          sjs(this.window).css('width', size.width + size.margin[1] + size.margin[3] + 'px')
      }
   }, cfg || {}),function(content,js,html) {
      var fm = sjs.globals.fm[this.arguments.file_manage_id],
        action = ResponseProcessor[this.arguments.action];

      if (js && js.response && js.response.status == 'error'){
        fm.notify('serverError', js, html);
        return this.close();
      } else if (sjs.isFn(action)) {
        action.call(fm, content, js, html, this);
      }
      this.position();
   });

   return w
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


Config.set('fm.listeners.ready', [])
  .set('fm.listeners.displayPath', [])
  .set('fm.listeners.serverError', [])
  .set('fm.listeners.serverOk', [])
  .set('fm.listeners.click', [])
  .set('fm.listeners.dblclick', [])
  .set('fm.listeners.uploader_ready', []);

sjFileManager.configure = function (options) {
    if (options.i18n) {
        this.i18n(options.i18n);
    }

    var url = sjs.trim(options.url) + "?tmpl=window&show_actions=1";
    if (options.opendir) {
        url += '&dirpath=' + options.opendir;
    }

    Config.set('url', url)
        .set('fm.container', options.container, '#sjFilemanager')
        .set('fm.rootUrl', options.root)
        .set('fm.actionUrl', sjs.trim(options.url))
        .set('fm.files_per_page', options.files_per_page, 100);

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

    if (!Config.get('window') || !Config.get('url') || !Config.get('fm')) {
        throw "sjFilemanager was not configured. Use sjFilemanager.configure method!";
    }

    var w = new sjWindow(Config.get('url'), Config.get('window'), function(content, js, html) {
        var node = sjs(Config.get('fm.container'));

        if (!node.length) {
            Instance.reject();
            throw "Config 'fm.container' does not match any DOM element. Maybe the problem with server response";
        }

        var fm = new sjFileManager(node, Config.get('fm'), Config.get('fm.listeners'));
        fm.windows.main = this;
        Config.clear();
        Instance.resolve(fm);
        Instance = fm;

        this.position().toInnerSize();
        sjs.className.set(this.window, 'sjFilemanagerWindow');
        sjs.className.set(this.clone, 'sjFilemanagerWindow');
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

sjFileManager.tr = {};
sjFileManager.i18n = function(data) {
    if (data.constructor != String) {
        this.tr = data;
    } else if (this.tr[data]) {
        return this.tr[data];
    } else {
        return data;
    }
};

sjFileManager.getUploader = function(url, cfg){
    var baseDir = url.charAt(url.length - 1) == '/' ? url : sjs.pathinfo(url).dirname;
    return new SWFUpload(sjs.extend({
        upload_url: url,
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
            var mn = this.getFileManager();
            if (mn) {
                mn.onUploadSuccess(file, serverData);
            }
        }
    }, cfg || {}));
};

sjFileManager.create = function(options) {
    sjWindow.renderView();
    MediaManager.renderView(options.i18n);

    var cfg = sjFileManager.configure(options);
    cfg.get('fm.listeners.ready').push(function() {
        var fm = this, uploader = sjFileManager.getUploader(
            cfg.get('url'),
            cfg.get('fm.uploader')
        );
        this.setUploader(uploader);

        var c = sjs('#sjMediamanager').insertBefore('#sjWrapper')
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
        var scr = new sjs.ScrollableContent(content.parent(2), {
            url: cfg.get('fm.actionUrl'),
            per_page: cfg.get('fm.files_per_page'),
            data: { format: 'json' }
        });

        var fm = this;
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
            data.dirpath = fm.getCurrentPath();
        });
    });

    cfg.set('fm.liseners.opendir', []).get('fm.liseners.opendir').push(function () {
        scr.clearCache();
    });
    return cfg;
};
