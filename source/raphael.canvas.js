/*jslint forin: true, regexp: true, todo: true, white: false, browser: true,
 sloppy: true, white: true, eqeq: false, newcap: true, nomen: true */

/*global FusionCharts */

/**
 * Raphael Canvas Extension
 */

window.Raphael && window.Raphael.canvas && function (R) {
    var win = R._g.win,
        doc = R._g.doc,
        g = R._g,

        STRING = 'string',
        PX = 'px',

        separator = /[, ]+/,

        Str = win.String,
        toInt = win.parseInt,
        toFloat = win.parseFloat,

        math = win.Math,
        mmax = math.max,
        mmin = math.min,
        pi = math.PI,
        mathFloor = math.floor,

        eve = R.eve,
        paperproto = R.fn,
        elproto = R.el,
        setproto = R.st,

        clone = R.clone,
        deg2rad = pi / 180,
        rad2deg = 180 / pi,

        DEFAULT_FILL = "#fff",
        DEFAULT_STROKE = "#000",
        has = "hasOwnProperty",
        S = " ",
        /** @todo: detect touch */
        supportsTouch = (('ontouchstart' in win) || (navigator.msMaxTouchPoints > 0)),
        events = ("click dblclick mousedown mousemove mouseout mouseover mouseup touchstart touchmove touchend touchcancel").split(S),
        noHandle = false,
        
        $,
        FauxNode,
        Element,
        coms = [],
        needsScreenUpdate = false,
        log = function () {
            console.log(arguments)
        };


    if (!R.canvas) {
         return;
    }

    
    R.toString = function () {
        return "Your browser supports canvas.\nYou are running RedRaphael " +
                R.version;
    };

    $ = R._createNode = function(el, attr) {
        if (attr) {
            if (typeof el === STRING) {
                el = $(el);
            }
            for (var key in attr)
                if (attr.hasOwnProperty(key)) {
                    el.setAttribute(key, Str(attr[key]));
                }
        } else {
            el = doc.createElement(el);
        }
        return el;
    };

    R._engine.create = function () {
        var con = R._getContainer.apply(0, arguments) || {},
            container = con.container,
            x = con.x,
            y = con.y,
            width = con.width,
            height = con.height,
            //handler = R._containerEventHandler,
            wrapper,
            cssText,
            image,
            mmap,
            i,
            paper,
            canvas,
            com,
            layers;

        if (!container) {
            throw new Error("Canvas container not found.");
        }

        paper = new R._Paper();
        paper.stage = wrapper = $("div");
        paper.stage.layers = layers = {};

        // window.wrapperTemp = wrapper;

        x = (x || 0);
        y = (y || 0);
        paper.width = width = (width || 512);
        paper.height = height = (height || 342);
        paper.left = paper.top = 0;

        if (container == 1) {
           wrapper.style.cssText = cssText +
                    R.format(";width:100%;height:100%;position:absolute;left:{0}px;top:{1}px;", [x, y]);
            doc.body.appendChild(wrapper);
        }
        else {
            wrapper.style.cssText = cssText + ";width:100%;height:100%;position:absolute";
            if (container.firstChild) {
                container.insertBefore(wrapper, container.firstChild);
            }
            else {
                container.appendChild(wrapper);
            }
        }

        cssText = "overflow:hidden;-webkit-tap-highlight-color:rgba(0,0,0,0);" +
            "-webkit-user-select:none;-moz-user-select:-moz-none;" +
            "-khtml-user-select:none;-ms-user-select:none;user-select:none;" +
            "-o-user-select:none;cursor:default;" +
            R.format("width:{0}px;height:{1}px;", [width, height]);

        // Create the canvas element and set it to occupy full space. Retain a
        // reference to its context.
        
        com = new COM (paper);

        layers.presentation = createLayer("presentation", wrapper, paper, com);
        layers.interaction = createLayer("interaction", wrapper, paper, com);

        


        return paper;
    };

    function createLayer (type, wrapper, paper, com) {
        var canvas = $("canvas");

        canvas.type = type;
        canvas.setAttribute('width', paper.width);
        canvas.setAttribute('height', paper.height);
        canvas.style.cssText = "position:absolute;left:0;top:0";

        wrapper.appendChild(canvas);
       
        coms[type] = com;

        return canvas;    
    }

    setFillAndStroke = function (el, params) {
        var attrs = el.attrs,
            att,
            val;
            //needsRepaint = false,
            //positionChanged = false,
            //dimensionChanged = false,

        for (att in params) {
            if (params[has](att)) {
                if (!R._availableAttrs[has](att)) {
                    log("Unsupported attribute >> " + att)
                    continue;
                }
                val = params[att];

                if (attrs[att] !== val) {
                    needsScreenUpdate = true;
                }

                switch (att) {

                    case 'fill-opacity':
                    case 'opacity':
                    case 'stroke-opacity':
                    case 'stroke':
                    case 'fill':
                        attrs[att] = val;
                        //needsRepaint = true;
                        break;

                    case 'stroke-width':
                    case "cx":
                    case "cy":
                    case "x":
                    case "y":
                        attrs[att] = val;
                        //positionChanged = true;
                        break;

                    case "width":
                    case "height":
                        attrs[att] = val;
                        //dimensionChanged = true;
                        break;

                    case "clip-rect":
                        attrs[att] = val;
                        //needsRepaint = true;
                        break;

                    case "font-size":
                    case "font":
                    case "vertical-align":
                    case "text-anchor":
                        attrs[att] = val;
                        //needsRepaint = true;

                    default:
                        log("Unprocessed attribute >> " + att + " : " + val)
                        continue;
                }
            }
        }
    }

    R._engine.rect = function (paper, attrs, group) {
        var el = new Rect(paper, attrs, group),
            com = getCOM(paper);

        com.add(el, group);
        return el;
    };

    //------------------------------------------//

    Element = function (node, paper, group) {
        //log('new Element')
        var o = this;

        o.styles = o.styles || {};
        o.followers = o.followers || [];
        o.X = 0;
        o.Y = 0;

        o.matrix = R.matrix();
        o._ = {
            transform: [],
            sx: 1,
            sy: 1,
            dx: 0,
            dy: 0,
            deg: 0
        };
    };

    elproto = Element.prototype = {
        draw: function () {
            log('Drawing ' + this);
        }
    }

    elproto.constructor = Element;

    elproto.attr = function(name, value) {
        if (this.removed) {
            return this;
        }

        var o = this,

            attrs = o.attrs,
            ca = o.ca,
            names,
            params,
            par,

            res,
            key,
            out,

            subkey,
            delkeys,

            follower,
            ii,
            i;

        // fetch a copy of all attributes
        if (name == null) {
            res = {};
            for (key in attrs) if (attrs.hasOwnProperty(key)) {
                res[key] = attrs[key];
            }
            res.gradient && res.fill == "none" && (res.fill = res.gradient) && delete res.gradient;
            res.transform = o._.transform;
            /** @todo res.visibility = o.node.style.display === "none" ? "hidden" : "visible"; */
            return res;
        }

        // fetch a single value
        if (value == null && R.is(name, "string")) {
            if (name == "fill" && attrs.fill == "none" && attrs.gradient) {
                return attrs.gradient;
            }
            if (name == "transform") {
                return o._.transform;
            }
            /** @todo if (name == "visibility") {
                return this.node.style.display === "none" ? "hidden" : "visible";
            }*/

            names = name.split(separator),
            out = {};

            for (i = 0, ii = names.length; i < ii; i++) {
                name = names[i];
                if (name in attrs) {
                    out[name] = attrs[name];
                }
                else if (R.is(ca[name], "function")) {
                    out[name] = ca[name].def;
                } else {
                    out[name] = R._availableAttrs[name];
                }
            }
            return ii - 1 ? out : out[names[0]];
        }

        // fetch specific attributes
        if (value == null && R.is(name, "array")) {
            out = {};
            for (i = 0, ii = name.length; i < ii; i++) {
                out[name[i]] = o.attr(name[i]);
            }
            return out;
        }

        // prepare setter params
        if (value != null) {
            params = {};
            params[name] = value;
        }
        else if (name != null && R.is(name, "object")) {
            params = name;
        }

        for (key in params) {
            eve("raphael.attr." + key + "." + o.id, o, params[key], key);
        }

        delkeys = {};
        for (key in ca) {

            if (ca[key] && params.hasOwnProperty(key) &&
                    R.is(ca[key], "function") && !ca['_invoked' + key]) {

                ca['_invoked'+key] = true; // prevent recursion
                par = ca[key].apply(o, [].concat(params[key]));
                delete ca['_invoked'+key];

                for (subkey in par) {
                    if (par.hasOwnProperty(subkey)) {
                         params[subkey] = par[subkey];
                    }
                }
                attrs[key] = params[key];
                if (par === false) {
                    delkeys[key] = params[key];
                    delete params[key];
                }
            }
        }

        setFillAndStroke(this, params);

        for (i = 0, ii = o.followers.length; i < ii; i++) {
            follower = o.followers[i];
            (follower.cb && !follower.cb.call(follower.el, params, o)) ||
                follower.el.attr(params);
        }

        for (subkey in delkeys) {
            params[subkey] = delkeys[subkey];
        }
        return this;
    }

    //------------------------------------------//

    function Rect (paper, attrs, group) {
        //log('new Rect')
        var o = this,
            parent = group || paper;

        o.attrs = attrs || {};
        o.paper = paper;
        o.com = parent.com;
        
        o.ca = o.customAttributes = o.customAttributes ||
            new paper._CustomAttributes();

        o.parent = parent;
        /*
        !parent.bottom && (parent.bottom = o);

        o.prev = parent.top || null;
        parent.top && (parent.top.next = o);
        parent.top = o;
        o.next = null;
        */

        this.draw = function (crc) {
            /*
            var canvas = $('canvas');
            window.wrapperTemp.appendChild(canvas);
            var crc = canvas.getContext('2d');
            */

            var attrs = this.attrs;

            crc.fillStyle = attrs.fill === "none" ? 'rgba(0,0,0,0)' : attrs.fill;
            crc.strokeStyle = attrs.stroke;
            crc.lineWidth = attrs['stroke-width'];
            crc.rect(attrs.x, attrs.y, attrs.width, attrs.height);
            crc.fill();
            crc.stroke();
        }


        this.toString = function () {
            return "Rect";
        }
    }

    Rect.prototype = new Element();
    Rect.prototype.constructor = Rect;

    //------------------------------------------//

    function getCOM (paper) {
        return paper.com;
    }

    function COM (paper) {
        paper.com = this;
        this.paper = paper;
        this.list = [];
        this.init = function (otherCom) {

        }
        this.add = function (el, group) {
            this.list.push(el);
        };
    }

    R.fn.render = function () {

        var com = coms.presentation,
            listCom = com.list,
            paper = com.paper,
            crc = paper.stage.layers.presentation.getContext('2d');
        
        for (var i=0; i< listCom.length; i++) {
            listCom[i].draw(crc);
        }

        //log(listCom)
        //log('render called')
    }



}(window.Raphael);
