require(["dojo/json", "dojo/dnd/Moveable", "dojo/_base/declare", "dojo/_base/event", "dojo/dnd/Mover", "dojo/dom-geometry"], function (JSON, Moveable, declare, event, Mover, domGeom) {

    var widget = {
        mixins: [dijit._TemplatedMixin],
        
        // input parameters
        inputargs: {
            responsiveHeaders:false
        },

        // Caches
        grid: null,
        templateString: '<div id="contextMenu" dojoAttachPoint="contextMenu" class="dropdown clearfix gridExtention" style="position: absolute; display:none; overflow:hidden;"><ul class="dropdown-menu" role="menu" aria-labelledby="dropdownMenu" style="display:block;position:static;margin-bottom:5px;"><li><a data-dojo-attach-event="onclick:_hideColumn" tabindex="-1" href="#"><i class="glyphicon glyphicon-eye-close">  Hide</i></a></li><li><a data-dojo-attach-event="onclick:_enableMove" tabindex="-1" href="#"><i class="glyphicon glyphicon-resize-horizontal"></i>  Move</a></li><li role="presentation" class="divider"></li><li><a data-dojo-attach-event="onclick:_reset" tabindex="-1" href="#"><i class="glyphicon glyphicon-repeat">  Reset</i></a></li></ul></div>',
        gridAttributesOrg: null,
        gridAttributesStore: null,
        gridAttributes: null,
        selectedHeader: 0,
        settingLoaded: false,
        
        // ISSUES:
        // 
        // 
        // TODO:  
        // Test other browser versions
        // Distribute width over all columns after column is added/removed in the moddeler.
        // Add responsive columns suport in reorder feature.
        // 
        // FUTURE:
        // Combine all (appstore) grid functions into one widget
        // 
        // RESOLVED:
        // DONE test accross browsers. Safari 5.1.7 Chrome 33, IE 11,(emulate 10, 9 ok, 8fails), FF 27 ok, FF3.6 fails 
        // FIXED Display Names are not updated when changed in modeler
        // FIXED Reset will not reset the sort order

        postCreate: function () {
            // post create function of dojo widgets.
            
            try {
                var colindex = this.domNode.parentNode.cellIndex;
                this.grid = dijit.findWidgets(this.domNode.parentNode.parentNode.previousSibling.cells[colindex])[0];
                
                 this.gridAttributes = this.grid._gridConfig.gridAttributes();
                    
                if(this.responsiveHeaders){
                    dojo.empty(this.grid.gridHeadNode);
                    dojo.empty(this.grid.headTableGroupNode);
                    dojo.empty(this.grid.bodyTableGroupNode);

                    this.buildGridBody();
                } else {

                    this.gridAttributesOrg = dojo.clone(this.gridAttributes);
                    this.gridAttributesStore = dojo.clone(this.gridAttributes);
                    this.loadSettings();
                    if (this.settingLoaded) {
                        this.reloadGridHeader();
                        this.setSortOrder();
                    }                
                    this.setHandlers();
                }
            } catch (e) {
                console.log("error in create widget:" + e);
            }
            if (this.grid === null) {
                this.caption = "Error: unable to find grid. Is the widget placed in a row underneath a grid?";
            }
            
            this.loaded();
        },
       
        setSortOrder: function () {
            // Code based in the Mendix dataGrid function: eventColumnClicked
            // set theW storred sort order in the dataGrid.
            var headerNodes = this.grid.gridHeadNode.children[0].children;
            var isFirst = true;
            // reset the current sort icons
            for (var i in this.grid._gridColumnNodes) {
                _c35 = this.grid._gridColumnNodes[i];
                dojo.query("." + this.grid.cssmap.sortIcon, _c35)[0].style.display = "none";
            }

            for (var i = 0; i < this.gridAttributes.length; i++) {
                if (this.gridAttributes[i].sort) {
                    this.grid._dataSource.setSortOptions(this.gridAttributes[i].tag, this.gridAttributes[i].sort, !isFirst);
                    var sortNode = dojo.query("." + this.grid.cssmap.sortText, headerNodes[i])[0];
                    if (this.gridAttributes[i].sort === "asc") {
                        sortNode.innerHTML = "&#9650;";
                    } else {
                        sortNode.innerHTML = "&#9660;";
                    }
                    sortNode.parentNode.style.display = "";

                    isFirst = false;
                }
            }
            if (this.grid.constraintsFilled()) {
                this.grid._dataSource.refresh(dojo.hitch(this.grid, this.grid.refreshGrid));
            }
        },

        eventColumnClicked: function (e, node) {
            // is triggered after the Mx dataGrid eventColumnClicked
            // stores the sort into the cookie
            var isAdditionalSort = e.shiftKey;
            var sortorder = this.grid.domData(node, "sortorder");
            var datakey = this.grid.domData(node, "datakey");
            for (var i = 0; i < this.gridAttributes.length; i++) {
                if (!isAdditionalSort) {
                    this.gridAttributes[i].sort = null;
                }
                if (this.gridAttributes[i].tag === datakey) {
                    this.gridAttributes[i].sort = sortorder;
                    this.gridAttributesStore[i].sort = sortorder;
                }
            }
            this.storeGridSetting();
        },

        clearGridDataNodes: function () {
            // empty datagrid, nodes and data cache
            dojo.empty(this.grid.gridBodyNode);
            this.grid._gridRowNodes = [];
            this.grid._gridMatrix = [];
        },

        endResize: function (evt) {
            // event triggered after the resize is done. 
            // Stores the new size settings.
            var cols = this.grid._resizer.columns,
                total = 0;
            for (var i = 0; i < cols.length; i++) {
                total += cols[i].width;
            }
            for (var i = 0; i < this.gridAttributes.length; i++) {
                this.gridAttributes[i].display.width = Math.round(cols[i].width / total * 100).toString() + "%";
                this.gridAttributesStore[i].display.width = Math.round(cols[i].width / total * 100).toString() + "%";
            }
            this.storeGridSetting();
        },

        storeGridSetting: function () {
            // stores the setting based on the form ID and grid ID
            var cName = this.mxform.id + this.grid.mxid;
            dojo.cookie(cName, JSON.stringify(this.gridAttributesStore));
        },

        loadSettings: function () {
            // load the setting from the cookie
            // checks stored object equal to the column before copy settings
            var cName = this.mxform.id + this.grid.mxid;
            var cookie = dojo.cookie(cName);
            var compareAttObj = function (a, b) {
                try {
                    if (a.tag !== b.tag) //check name
                        return false;
                    else if (a.attrs[0] !== b.attrs[0]) //check att
                        return false;
                    else if (a.display.string !== b.display.string) //display name
                        return false;
                    else
                        return true;
                } catch (e) {
                    return false;
                }
            };
            if (cookie) {
                var settings = JSON.parse(cookie);
                if (settings) {
                    var lenA = this.gridAttributes.length;
                    var lenS = settings.length;
                    for (var i = 0; i < lenA; i++) {
                        for (var j = 0; j < lenS; j++) {
                            if (compareAttObj(this.gridAttributes[j], settings[i])) {
                                this.gridAttributes[j] = settings[i];
                                this.gridAttributesStore[j] = settings[i];
                                this.gridAttributes[j].order = i;
                                this.settingLoaded = true;
                            }
                        }
                    }
                    if (this.settingLoaded) {
                        var compareOrder = function (a, b) {
                            try {
                                if (a.order < b.order)
                                    return -1;
                                else if (a.order > b.order)
                                    return +1;
                                else
                                    return 0;
                            } catch (e) {
                                return 0;
                            }
                        };
                        this.gridAttributes.sort(compareOrder);
                    } else { // when no setted column is matched with current table, remove cookie
                        this.removeGridSettings();
                    }
                }
            }
        },
        
        getSortParams: function () {
            var sort = {}, isFromStorage = false;
            for (var i = 0; i < this.gridAttributes.length; i++) {
                if (this.gridAttributes[i].sort) {
                    sort[this.gridAttributes[i].tag] = [this.gridAttributes[i].tag, this.gridAttributes[i].sort];
                    //isFromStorage = true;
                }
            }
            return sort;
            //return isFromStorage ? sort : this.grid._gridConfig.gridSetting("sortparams");
        },
        
        _reset: function (evt) {
            // user menu click reset. restores the original settings
            dojo.setStyle(this.contextMenu, "display", "none");
            var sortParams = this.grid._gridConfig.gridSetting("sortparams");
            for (var i = 0; i < this.gridAttributesOrg.length; i++) {
                this.gridAttributes[i] = dojo.clone(this.gridAttributesOrg[i]);
                for(var j=0; j<sortParams.length; j++){
                    if(sortParams[j][0] === this.gridAttributes[i].tag)
                        this.gridAttributes[i].sort = sortParams[j][1];
                }
            }
            this.reloadFullGrid();
            this.setSortOrder();
            this.setHandlers();
            this.removeGridSettings();
            dojo.stopEvent(evt);
        },

        removeGridSettings: function () {
            // remove all settings from cookie
            var cName = this.mxform.id + this.grid.mxid;
            dojo.cookie(cName, null);
        },

        _hideColumn: function (evt) {
            // hide a column from a grid. with is set to 0, so it is not rendered.
            // width is equaly distributed over other columns.
            dojo.setStyle(this.contextMenu, "display", "none");
            if (this.countVisableCol() > 1) {
                this.gridAttributes[this.selectedHeader].display.width = "0"; // Note that columns with width 0 are not renderd, 0% and 0px are
                this.gridAttributesStore[this.selectedHeader].display.width = "0";
                var total = 0;
                for (var i = 0; i < this.gridAttributes.length; i++) {
                    total += parseFloat(this.gridAttributes[i].display.width, 10);
                }
                //redistribute the width over the other columns
                for (var i = 0; i < this.gridAttributes.length; i++) {
                    var width = (parseFloat(this.gridAttributes[i].display.width, 10) / total) * 100;
                    this.gridAttributes[i].display.width = (Math.round(width) === 0) ? "0" : width.toString() + "%";
                }
                this.gridAttributesStore = dojo.clone(this.gridAttributes);
                this.reloadFullGrid();
                this.setHandlers();
            } else {
                mx.ui.info("It is not posible to hide the last column");
            }
            dojo.stopEvent(evt);
        },

        countVisableCol: function () {
            // count the amount of visable columns.
            // to prefent hiding the last column
            var count = 0;
            var cols = this.grid.headTableGroupNode.children;
            for (var i = 0; i < cols.length; i++) {
                var display = dojo.getStyle(cols[i], "display");
                if (display !== "hidden" && display !== "none")
                    count++;
            }
            return count;
        },

        loadContextMenu: function () {
            // add the context menu to the documentt
            // Is this the best way?
            dojo.query("body").connect("oncontextmenu", dojo.hitch(this, function (evt) {
                if (evt.target.parentElement === this.contextMenu) {
                    dojo.stopEvent(evt);
                }
            }));
            var headers = this.grid.gridHeadNode.children[0].children;
            for (var i = 0; i < headers.length; i++) {
                dojo.connect(headers[i], "onmousedown", dojo.hitch(this, this.headerClick, i));
            }
        },

        _enableMove: function (evt) {
            // user click context menu to enable the move of columns
            dojo.setStyle(this.contextMenu, "display", "none");
            var headers = this.grid.gridHeadNode.children[0].children;
            for (var i = 0; i < headers.length; i++) {
                var horMover = declare([Mover], {
                    onMouseMove: function (evt) {
                        if (evt.pageX - this.host.startPosX > this.host.minX) {
                            w = domGeom.position(this.host.node).w;
                            if (evt.pageX - this.host.startPosX < this.host.maxX - w)
                                l = evt.pageX - this.host.startPosX;
                            else
                                l = this.host.maxX - w;
                        } else {
                            l = this.host.minX;
                        }
                        this.host.onMove(this, {
                            l: l,
                            t: 0 // vertical no movement allowed
                        });
                        event.stop(evt);
                    }
                });
                var dnd = new Moveable(headers[i], {
                    mover: horMover
                });
                dojo.connect(dnd, "onMoveStart", dojo.hitch(this, this.headerMoveStart));
                dojo.connect(dnd, "onMoveStop", dojo.hitch(this, this.headerMoveStop, i));
            }
            dojo.stopEvent(evt);
        },

        headerMoveStart: function (evt) {
            // start of header column move. store the limites of the movement.
            evt.host.startPosX = domGeom.position(evt.node).x - evt.node.offsetLeft;

            var headers = this.grid.gridHeadNode.children[0].children;
            for (var i = 0; i < headers.length; i++) {
                this.gridAttributes[i].i = i; // set original sort order
            }
            evt.host.minX = domGeom.position(evt.node.parentNode).x - domGeom.position(evt.node.parentNode).x;
            evt.host.maxX = domGeom.position(evt.node.parentNode).x + domGeom.position(evt.node.parentNode).w - domGeom.position(evt.node.parentNode).x;
            evt.host.node = evt.node;
        },

        headerMoveStop: function (index, evt) {
            // end of header column move. store setting and rebuild datagrid
            var headers = this.grid.gridHeadNode.children[0].children;
            for (var i = 0; i < headers.length; i++) {
                var g = domGeom.position(headers[i]);
                this.gridAttributes[i].x = g.x;
                this.gridAttributes[i].w = g.w;
                if (headers[i] === evt.node)
                    this.gridAttributes[i].moving = true;
                else
                    this.gridAttributes[i].moving = false;
            }
            var compareXPos = function (a, b) {
                // Javascript array Sort function: 
                // returns less than zero, sort a before b
                // return greather than zero, sort b befora a
                // returns zer0, leave a and be unchanged with respect to each other
                // 
                if (a.i < b.i && (a.moving === true) || a.i > b.i && (b.moving === true)) {
                    //moved object left should compare to start position
                    if (a.x < b.x)
                        return -1;
                    if (a.x >= b.x)
                        return 1;
                } else { // moved object to the right should compaire till the left site of the other object
                    if (a.x + a.w < b.x + b.w)
                        return -1;
                    if (a.x + a.w >= b.x + b.w)
                        return 1;
                }
                return 0;
            };
            this.gridAttributes.sort(compareXPos);
            this.gridAttributesStore = dojo.clone(this.gridAttributes);
            this.reloadFullGrid();
            this.setHandlers();
        },

        reloadFullGrid: function () {
            // rebuild grid header and body
            this.reloadGridHeader();
            this.clearGridDataNodes();
            this.grid.fillGrid();
        },

        setHandlers: function () {
            // enable the context menu and connect with the resizer
            this.loadContextMenu();
            this.connect(this.grid, "eventColumnClicked", this.eventColumnClicked);
            this.connect(this.grid._resizer, "endResize", this.endResize);
        },

        reloadGridHeader: function () {
            // rebuild grid header
            dojo.empty(this.grid.gridHeadNode);
            dojo.empty(this.grid.headTableGroupNode);
            dojo.empty(this.grid.bodyTableGroupNode);

            this.buildGridBody();
            this.storeGridSetting();
        },

        buildGridBody: function () {
            // Copied form mendix BuidlGridBody and commented out the creation of the handlers
            // this is needed otherwise the handlers will be create multiple times
            // replace this -> this.grid
            // Added the following line to enable resonsive columns viewing (disbaled its bugging):
            // line  class: _c15.display.cssClass ? _c15.display.cssClass: ""  

            var _c09 = this.grid._gridConfig.gridAttributes();
            var self = this.grid;
            var node = null;
            var _c0a = null;
            var _c0b = null;
            var _c0c = null;
            var row = mxui.dom.tr();
            var _c0d = mxui.dom.div({
                "class": this.grid.cssmap.headCaption
            });
            var _c0e = mxui.dom.div({
                "class": this.grid.cssmap.headWrapper
            });
            var _c0f = [];
            mxui.dom.disableSelection(row);
            
            var _c11 = this.getSortParams(); //Added function for this widget
            //var _c10 = this.grid._gridConfig.gridSetting("sortparams"),
            //    _c11 = {};
            //if (_c10) {
            //    for (var j = 0, _c12; _c12 = _c10[j]; j++) {
            //        _c11[_c12[0]] = _c12;
            //    }
            //}
            var _c13 = this.grid._gridConfig.getPlugins()["Calculations"] || {};
            var _c14 = 0;
            for (var i = 0, _c15; _c15 = _c09[i]; i++, _c14 += _c15.tag in _c13 ? 1 : 0) {
                var _c16 = node;
                var _c17 = _c15.display.width;
                if (_c17 != null && _c17 == "0") {
                    if (_c15.tag in _c13) {
                        this.grid._hiddenAggregates.push(_c14);
                    }
                    _c09.splice(i--, 1);
                    continue;
                }
                node = mxui.dom.th();
                this.grid.domData(node, {
                    datakey: _c15.tag,
                    key: i
                });
                this.grid.setColumnStyle(node, _c15);
                var text = _c15.display.string;
                _c0c = _c0d.cloneNode(true);
                _c0c.innerHTML = !text ? "&nbsp;" : text;
                var _c18 = _c0e.cloneNode(true);
                _c0a = mxui.dom.div({
                    "class": this.grid.cssmap.sortIcon,
                    style: "display: none"
                }, _c0b = mxui.dom.span({
                    "class": this.grid.cssmap.sortText
                }));
                _c18.appendChild(_c0a);
                _c18.appendChild(_c0c);
                node.appendChild(_c18);
                this.grid.setNodeTitle(node, _c0c);
                var _c19 = _c15.display.width;
                var col = mxui.dom.col({
                    style: "width:" + _c19,
                    class: _c15.display.cssClass ? _c15.display.cssClass : "" 
                }),
                    _c1a = col.cloneNode(true);
                this.grid.headTableGroupNode.appendChild(col);
                this.grid.bodyTableGroupNode.appendChild(_c1a);
                _c0f[i] = [col, _c1a];
                var _c1b = _c11[_c15.tag];
                if (_c1b) {
                    var _c1c = _c1b[1];
                    this.grid.domData(node, "sortorder", _c1c);
                    if (_c1c === "asc") {
                        _c0b.innerHTML = "&#9650;";
                    } else {
                        _c0b.innerHTML = "&#9660;";
                    }
                    _c0a.style.display = "";
                }
                this.grid._gridColumnNodes[i] = node;
                row.appendChild(node);
            }
            _c11 = null;
            this.grid.gridHeadNode.appendChild(row);
            //if (this.grid._gridState.sortable) {
            //    this.grid.own(dojo.on(this.grid.gridHeadNode, "th:click", function(e) {
            //        var key = self.domData(this, "key");
            //        if (_c09[key].sortable !== false) {
            //            self.eventColumnClicked(e, this);
            //        }
            //    }));
            //}
            this.grid._resizer = new mxui.lib.ColumnResizer({
                thNodes: mxui.dom.toArray(row.children),
                colNodes: _c0f,
                colUnits: _c09[0].display.width.indexOf("%") > 0 ? "%" : "px",
                rtl: !this.grid.isLeftToRight(),
                tableNode: this.grid.headTable,
                gridNode: this.grid.gridTable
            });
            if (this.grid._gridState.showemptyrows) {
                var _c1d = this.grid._gridConfig.gridSetting("rows");
                for (var i = 0; i < _c1d; i++) {
                    this.grid.addNewRow();
                }
            }
            //this.grid.own(dojo.on(this.grid.gridBodyNode, "tr:click", function(e) {
            //    self.eventGridRowClicked(e, this);
            //}));
            //this.grid.liveConnect(this.grid.gridBodyNode, "onclick", {td: "eventCellClicked"});
            //this.grid.liveConnect(this.grid.gridBodyNode, "onmouseover", {tr: "eventRowMouseOver"});
            //this.grid.liveConnect(this.grid.gridBodyNode, "onmouseout", {tr: "eventRowMouseOut"});
            //var _c1e = function(e) {
            //    self.eventActionBindingHandler(this, e.type);
            //};
            //var _c1f = this.grid._gridConfig.gridActionBindings();
            //for (var _c20 in _c1f) {
            //    this.grid.own(dojo.on(this.grid.gridBodyNode, "tr:" + _c20.replace(/^on/, ""), _c1e));
            //}
        },

        headerClick: function (header, evt) {
            // context menu on right button click.
            this.selectedHeader = header;
            if (evt.button === dojo.mouseButtons.RIGHT) {
                //Correct x pos to prevent from overflowing on right hand side.
                dojo.setStyle(this.contextMenu, "display", "block");
                x = evt.pageX - 5,
                menuWidth = domGeom.position(this.contextMenu).w,
                winWidth = window.innerWidth;
                if (evt.pageX > winWidth - menuWidth)
                    x = winWidth - menuWidth - 5;

                dojo.setStyle(this.contextMenu, "left", x + "px");
                dojo.setStyle(this.contextMenu, "top", (evt.pageY - 5) + "px");
                this.connect(this.contextMenu, "onmouseleave", dojo.hitch(this, this.closeContextMenu));

                dojo.stopEvent(evt);
            }
        },

        closeContextMenu: function () {
            //close the context menu when mouse is leaving the menu.
            dojo.setStyle(this.contextMenu, "display", "none");
        },

        destroy: function () {
            //is there anything left to destroy?
        }
    };

    mxui.widget.declare("GridExtention.widget.GridExtention", widget);
    mxui.widget.declare("GridExtention.widget.GridExtentionNoContext", widget);
});