// Simple JavaScript Templating
// @author John Resig - http://ejohn.org/ - MIT Licensed
// @modified by Sergiy Stotskiy
(function($){
    var cache = {};

    $.tmpl = function tmpl(str, data){
        var fn, dom;
        str = String(str);
        // Figure out if we're getting a template, or if we need to
        // load the template - and be sure to cache the result.
        if (str.indexOf('<?') == -1) {
            if (cache[str]) {
                fn = cache[str];
            } else if (dom = document.getElementById(str)) {
                fn = tmpl(dom.innerHTML);
            } else {
                throw String("Non-valid template identificator: " + str);
            }
        } else {
            // Generate a reusable function that will serve as a template
            // generator (and which will be cached).
            fn = new Function("$",
                "var p=[],print=function(){p.push.apply(p,arguments);},render=sjs.tmpl,escapeHtml=sjs.htmlChars;" +

                "p.push('" +

                // Convert the template into pure JavaScript
                str
                    .replace(/[\r\t\n]/g, " ")
                    .split("<\?").join("\t")
                    .replace(/((^|\?>)[^\t]*)'/g, "$1\r")
                    .replace(/\t=\s*(\$\..*?)\?>/g, "',escapeHtml($1),'")
                    .replace(/\t=(.*?)\?>/g, "',$1,'")
                    .split("\t").join("');")
                    .split("\?>").join("p.push('")
                    .split("\r").join("\\'")
                + "');return p.join('');"
            );
            cache[str] = fn;
        }

        // Provide some basic currying to the user
        return data ? fn( data ) : fn;
    };

    $.View = function(options) {
        this.format  = options.format   || 'html';
        this.baseUrl = (options.baseUrl || '').replace(/\/+$/, '');
        this.engine  = options.engine   || $.tmpl;
        this.idPrefix= options.idPrefix || '';

        if (this.baseUrl) {
            this.baseUrl = this.baseUrl.replace(/\/$/, '');
        }
    };
    $.View.prototype = {
        _parseId: function (id) {
            id = String(id).split('.');
            return {
                id:  this.idPrefix + id.pop(),
                url: '/' + (id.length ? id.join('/') + '.' + this.format : '')
            };
        },
        get: function (tmpl) {
            var self = this;
            tmpl = this._parseId(tmpl);

            try {
                return self.engine(tmpl.id);
            } catch (e) {
                var p = new sjs.promise();
                $.query(this.baseUrl + tmpl.url, null, function (js, html) {
                    sjs.makeHTML(html, document.body);
                    p.resolve([self.engine(tmpl.id)]);
                });
                return p;
            }
        },
        getAll: function () {
            var tmpls = [];
            for (var i = 0, c = arguments.length; i < c; i++) {
                tmpls.push(this.get(arguments[i]));
            }
            return sjs.promiseAll.apply(sjs, tmpls);
        }
    };
})(window.sjs);
