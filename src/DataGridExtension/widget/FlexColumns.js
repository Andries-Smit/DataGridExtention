//----------------------------------------------------------------------
// Flex Columns
//----------------------------------------------------------------------
define([
    "dojo/_base/declare",
    "mxui/widget/_WidgetBase",
    "dojo/json",
    "dojo/dnd/Moveable",
    "dojo/_base/event",
    "dojo/dnd/Mover",
    "dojo/dom-geometry",
    "mxui/lib/ColumnResizer",
    "dojo/NodeList-traverse"
], function(declare, _WidgetBase, JSON, Moveable, event, Mover, domGeom, ColumnResizer) {
        // "use strict";

    return declare(null, {

        gridAttributesOrg: null,
        gridAttributesStore: null, // gridAttributes with 0 width will be removed.
        gridAttributes: null,
        selectedHeader: 0,
        selectedHeaderNode: null,
        settingLoaded: false,

        fillHandler: null,
        dataobject: null,
        columnChanges: [],
        columnMenuItems: [],

        useLocalStorage: true,
        settingsObj: null,

            // Templated variables:
            // gridExtension
            // contextMenu
            // columnMenu

        inputargs: {
            gridAttributesOrg: null,
            gridAttributesStore: null, // gridAttributes with 0 width will be removed.
            gridAttributes: null,
            selectedHeader: 0,
            selectedHeaderNode: null,
            settingLoaded: false,

            fillHandler: null,
            dataobject: null,
            columnChanges: [],
            columnMenuItems: []
        },

        checkConfigFlexColumns: function() {
            if (this.hasFlexHeader && this.gridAttributes[0].display.width.indexOf("%") === -1) {
                this.showError("You can no use the Flex Header feature in combination with 'Width unit = pixels' in a  data grid");
                this.hasFlexHeader = false;
            }

            if (this.responsiveHeaders && this.hasFlexHeader) {
                this.showError("You cannot enable both bootstrap responsive columns & Flex Header feature");
            }

            if (this.hasFlexHeader && this.gridSettingsEntity && this.settingsAttr && this.gridIdAttr && this.userEntity) {
                    // Guest users and users that are not of the correct entity type should always use local storage
                var uEntity = this.userEntity.split("/")[1];
                var meta = mx.meta.getEntity(mx.session.getUserClass());
                var superEntities = meta.getSuperEntities();
                if (mx.session.getUserClass() === uEntity || uEntity in superEntities) {
                    if (mx.session.isGuest() === false || mx.session.isGuest() === null) {
                        this.useLocalStorage = false;
                    }
                }
                if (this.useLocalStorage && !this.supports_html5_storage()) {
                    console.info("Your browser does not support html local storage, so no flex headers for you. pleas updgrade your browser and enjoy");
                    this.hasFlexHeader = false;
                }
            }
        },

        postCreateFlexColumns: function() {
            this.gridAttributes = this.grid._gridConfig.gridAttributes();
            this.checkConfigFlexColumns();

            if (this.responsiveHeaders || this.hasFlexHeader) {
                this.setupFlexColumns();
            }

            // this.loaded();
        },

        setupFlexColumns: function() {
                // initialize all the create flexibility to change the columns in the header of the grid
            if (this.responsiveHeaders) {
                dojo.empty(this.grid.gridHeadNode);
                dojo.empty(this.grid.headTableGroupNode);
                dojo.empty(this.grid.bodyTableGroupNode);

                this.buildGridBody();
            } else if (this.hasFlexHeader) {
                var sortParams = this.grid._gridConfig.gridSetting("sortparams");
                var sortable = this.grid._gridConfig.gridSetting("sortable");
                for (var i = 0; i < this.gridAttributes.length; i++) {
                        // set sort order and width for future use.
                    this.gridAttributes[i].order = i;
                    if (sortable) {
                        for (var j = 0; j < sortParams.length; j++) {
                            if (sortParams[j][0] === this.gridAttributes[i].tag) {
                                this.gridAttributes[i].sort = sortParams[j][1];
                            }
                        }
                    }
                }
                this.gridAttributesOrg = dojo.clone(this.gridAttributes);
                this.gridAttributesStore = dojo.clone(this.gridAttributes);
                this.loadSettings(dojo.hitch(this, function() {
                    if (this.settingLoaded) {
                        this.reloadGridHeader();
                        sortable && this.setSortOrder();
                    }
                    this.getColumnMenu();
                    this.setHandlers();
                }));
            }
        },

        supports_html5_storage: function() {
                // Checks if local storage is supported in the browser.
            try {
                return "localStorage" in window && window.localStorage !== null;
            } catch (e) {
                return false;
            }
        },

        storeGridSetting: function() {
                // stores the setting based on the form ID and grid ID
            var storageKey = this.mxform.id + this.grid.mxid;
            var settings = JSON.stringify(this.gridAttributesStore);
            if (this.useLocalStorage) {
                localStorage.setItem(storageKey, settings);
            } else if (this.settingsObj) {
                this.settingsObj.set(this.settingsAttr, settings);
                mx.data.commit({
                    mxobj: this.settingsObj,
                    callback: function() {
                        console.log("Object committed");
                    },
                    error: function(e) {
                        console.log("Error occurred attempting to commit: " + e);
                    }
                });
            } else {
                mx.data.create({
                    entity: this.gridSettingsEntity,
                    callback: function(obj) {
                        console.log("Object created on server");
                        obj.set(this.userEntity.split("/")[0], mx.session.getUserId());
                        obj.set(this.gridIdAttr, storageKey);
                        obj.set(this.settingsAttr, settings);
                        mx.data.commit({
                            mxobj: obj,
                            callback: function() {
                                console.log("Object committed");
                            },
                            error: function(e) {
                                console.log("Error occurred attempting to commit: " + e);
                            }
                        });
                        this.settingsObj = obj;
                    },
                    error: function(e) {
                        console.log("Failed create Grid Settings: " + e);
                    }
                }, this);
            }
        },

        loadSettings: function(callback) {
                // load the setting from the local storage
                // checks stored object equal to the column before copy settings
            var storageKey = this.mxform.id + this.grid.mxid;

            if (this.useLocalStorage) {
                var storageValue = localStorage.getItem(storageKey);
                this.processSetting(storageValue);
                callback();
            } else {
                var xPath = "//" + this.gridSettingsEntity;
                xPath += "[" + this.userEntity.split("/")[0] + " = " + mx.session.getUserId() + "]";
                xPath += "[ " + this.gridIdAttr + " = '" + storageKey + "' ]";

                mx.data.get({
                    xpath: xPath,
                    callback: function(objs) {
                        console.log("Received " + objs.length + " MxObjects");
                        if (objs.length > 0) {
                            this.settingsObj = objs[0];
                            this.processSetting(objs[0].get(this.settingsAttr));
                        }
                        callback();
                    }
                }, this);
            }
        },

        processSetting: function(storageValue) {
            var compareAttObj = function(a, b) {
                // check if 2 attribute objects are equal
                try {
                    if (a.tag !== b.tag) { // check name
                        return false;
                    } else if (!a.attrs && b.attrs || a.attrs && !b.attrs) { // one has attrs
                        return false;
                    } else if (a.attrs && b.attrs && a.attrs[0] !== b.attrs[0]) { // check att
                        return false;
                    } else if (a.display.string !== b.display.string) { // display name
                        return false;
                    }
                    return true;
                } catch (e) {
                    return false;
                }
            };
            if (storageValue) {
                var settings = JSON.parse(storageValue);
                if (settings) { // storage contains settings
                    var lenA = this.gridAttributes.length;
                    var lenS = settings.length;
                    for (var i = 0; i < lenA; i++) {
                        for (var j = 0; j < lenS; j++) {
                            if (compareAttObj(this.gridAttributes[i], settings[j])) { // Mix stored string with Mendix attribute Settings
                                this.gridAttributes[i] = dojo.clone(settings[j]);
                                this.gridAttributesStore[i] = dojo.clone(settings[j]);
                                this.settingLoaded = true;
                            }
                        }
                    }
                    if (this.settingLoaded) {
                        this.gridAttributes.sort(this.compareOrder);
                        var len = this.gridAttributes.length;
                        while (len--) { // remove columns witn 0% width
                            if (this.gridAttributes[len].display.width === "0%") {
                                this.gridAttributes.splice(len, 1);
                            }
                        }
                    } else { // when no setting column is matched with current table, remove from storage
                        this.removeGridSettings();
                    }
                }
            }
        },

        getColumnMenu: function() {
                // render the bootstrap drop down menus for the header
            var $ = mxui.dom.create;

            for (var i = 0; i < this.gridAttributesOrg.length; i++) {
                var visible = false,
                    width = "";
                for (var j = 0; j < this.gridAttributes.length; j++) {
                    width = this.gridAttributes[j].display.width;
                    if (this.gridAttributes[j].tag === this.gridAttributesOrg[i].tag && width !== "0%" && width !== "0px") {
                        visible = true;
                    }
                }
                var selected = $("i", {
                    class: visible ? "glyphicon glyphicon-ok" : "glyphicon glyphicon-remove",
                    tag: this.gridAttributesOrg[i].tag
                });
                var subLink = $("a", {
                    href: "#",
                    tag: this.gridAttributesOrg[i].tag,
                    visible: visible
                }, selected, " ", this.gridAttributesOrg[i].display.string);
                var listItem = $("li", {
                    role: "presentation"
                }, subLink);
                this.connect(subLink, "onclick", dojo.hitch(this, this.onItemSelect, this.gridAttributesOrg[i].tag));
                this.columnMenuItems[this.gridAttributesOrg[i].tag] = subLink;
                this.columnMenu.appendChild(listItem);
            }
            this.connect(this.columnMenu, "onmouseleave", dojo.hitch(this, this.updateColumnvisibility));
        },

        resetColumnMenu: function() {
                // Set the the correct state for all the columns in the menu
            for (var i = 0; i < this.gridAttributesOrg.length; i++) {
                var icon = this.columnMenuItems[this.gridAttributesOrg[i].tag].childNodes[0];
                var visible = false,
                    width = "";
                for (var j = 0; j < this.gridAttributes.length; j++) {
                    width = this.gridAttributesOrg[i].display.width;
                    if (this.gridAttributes[j].tag === this.gridAttributesOrg[i].tag && width !== "0%" && width !== "0px") {
                        visible = true;
                        break;
                    }
                }
                dojo.attr(icon, "class", visible ? "glyphicon glyphicon-ok" : "glyphicon glyphicon-remove");
                dojo.attr(this.columnMenuItems[this.gridAttributesOrg[i].tag], "visible", visible);
            }
        },

        closeSubMenus: function(evt) {
            // close subMenus of main menu.
            dojo.query("*", evt.taget).removeClass("open");
        },

        columnHide: function(tag) {
            // remove from render columns
            for (var i = 0; i < this.gridAttributes.length; i++) {
                if (this.gridAttributes[i].tag === tag) {
                    this.gridAttributes.splice(i, 1);
                    break;
                }
            }
            // set store to 0%
            for (var i = 0; i < this.gridAttributesStore.length; i++) {
                if (this.gridAttributesStore[i].tag === tag) {
                    this.gridAttributesStore[i].display.width = "0%";
                    break;
                }
            }
            this.distributeColumnWidth(this.gridAttributes);
            this.distributeColumnWidth(this.gridAttributesStore);
        },

        columnShow: function(tag) {
            // Find attribute
            var att = null;
            for (var j = 0; j < this.gridAttributes.length; j++) {
                if (this.gridAttributes[j].tag === tag) {
                    att = this.gridAttributes[j];
                    break;
                }
            }
            if (!att) { // add attribute if not in collection
                for (var i = 0; i < this.gridAttributesOrg.length; i++) {
                    if (this.gridAttributesOrg[i].tag === tag) {
                        att = dojo.clone(this.gridAttributesOrg[i]); // keep sore copy original
                        this.gridAttributes.push(att);
                        break;
                    }
                }
            }
            // set minimum width: for columns hidden by modeler (set width to 0)
            if (att.display.width === "0%") {
                att.display.width = "10%";
            }
            // set store
            for (var i = 0; i < this.gridAttributesStore.length; i++) {
                if (this.gridAttributesStore[i].tag === tag) {
                    this.gridAttributesStore[i].display.width = att.display.width;
                    break;
                }
            }
            this.gridAttributes.sort(this.compareOrder);
            this.gridAttributesStore.sort(this.compareOrder);
            this.distributeColumnWidth(this.gridAttributes);
            this.distributeColumnWidth(this.gridAttributesStore);
        },

        distributeColumnWidth: function(attrs) {
            var total = 0; // count total
            for (var i = 0; i < attrs.length; i++) {
                total += parseFloat(attrs[i].display.width, 10);
            }
                // redistribute the width over the 100%
            for (var i = 0; i < attrs.length; i++) {
                var width = (parseFloat(attrs[i].display.width, 10) / total) * 100;
                attrs[i].display.width = (Math.round(width) === 0) ? "0%" : width.toString() + "%";
                attrs[i].order = i;
            }
        },

        updateColumnvisibility: function(evt) {
            // update the column visibility
            if (this.columnChanges.length > 0) {
                var countVisible = 0;
                for (var key in this.columnMenuItems) {
                    var visible = dojo.attr(this.columnMenuItems[key], "visible");
                    if (visible === "true" || visible === true) {
                        countVisible++;
                    }
                }
                if (countVisible > 0) {
                    for (var i = 0; i < this.columnChanges.length; i++) {
                        var tag = this.columnChanges[i].tag;
                        if (this.columnChanges[i].visible) {
                            this.columnShow(tag);
                        } else {
                            this.columnHide(tag);
                        }
                    }
                    this.reloadFullGrid();
                    this.setHandlers();
                } else {
                    mx.ui.info("It is not possible to hide the last column");
                    this.resetColumnMenu();
                }
                this.columnChanges = [];
            }
            dojo.removeClass(this.columnListItem, "open");
        },

        onItemSelect: function(tag, evt) {
            // Change column menu icons and cache changes, change will be execute on leave of menu.
            var link = evt.target.nodeName === "A" ? evt.target : evt.target.parentNode;
            var visible = dojo.attr(link, "visible");
            visible = (visible === "true" || visible === true);

            dojo.attr(link, "visible", !visible);
            var icon = link.childNodes[0];
            dojo.attr(icon, "class", !visible ? "glyphicon glyphicon-ok" : "glyphicon glyphicon-remove");

            var match = false;
            for (var i = 0; i < this.columnChanges.length; i++) {
                if (this.columnChanges[i].tag === tag) {
                    this.columnChanges[i].visible = !visible;
                    match = true;
                }
            }
            if (!match) {
                this.columnChanges.push({
                    tag: tag,
                    visible: !visible
                });
            }
            dojo.stopEvent(evt);
        },

        onSubMenuEnter: function(evt) {
            // open sub menu item,
            dojo.addClass(evt.target.parentNode, "open");
            dojo.stopEvent(evt);
        },

        setSortOrder: function() {
            // Code based in the Mendix dataGrid function: eventColumnClicked
            // set the stored sort order in the dataGrid.
            var headerNodes = this.grid.gridHeadNode.children[0].children;
            var isFirst = true;
            // reset the current sort icons
            for (var i in this.grid._gridColumnNodes) {
                var _c35 = this.grid._gridColumnNodes[i];
                var icon = dojo.query("." + this.grid.cssmap.sortIcon, _c35);
                if (icon) {
                    icon.style.display = "none";
                }
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

        eventColumnClicked: function(e, node) {
            // is triggered after the Mx dataGrid eventColumnClicked
            // stores the sort into the locally
            var isAdditionalSort = e.shiftKey;
            var sortorder = this.grid.domData(node, "sortorder");
            var datakey = this.grid.domData(node, "datakey");
            for (var i = 0; i < this.gridAttributes.length; i++) {
                for (var j = 0; j < this.gridAttributesStore.length; j++) {
                    if (this.gridAttributesStore[j].tag === this.gridAttributes[i].tag) {
                        if (!isAdditionalSort) {
                            this.gridAttributes[i].sort = null;
                            this.gridAttributesStore[j].sort = null;
                        }
                        if (this.gridAttributes[i].tag === datakey) {
                            this.gridAttributes[i].sort = sortorder;
                            this.gridAttributesStore[j].sort = sortorder;
                        }
                    }
                }
            }
            this.storeGridSetting();
        },

        clearGridDataNodes: function() {
                // empty datagrid, nodes and data cache
            dojo.empty(this.grid.gridBodyNode);
            this.grid._gridRowNodes = [];
            this.grid._gridMatrix = [];
        },

        endResize: function(evt) {
            // event triggered after the resize is done.
            // Stores the new size settings.
            var cols = this.grid._resizer.columns,
                total = 0;
            for (var i = 0; i < cols.length; i++) {
                total += cols[i].width;
            }
            for (var i = 0; i < cols.length; i++) {
                // TODO fix issue cols is less if it contains 0 with columns gridAttributes > cols
                var width = Math.round(cols[i].width / total * 100).toString() + "%";
                for (var j = 0; j < this.gridAttributes.length; j++) {
                    if (this.gridAttributes[j].tag === cols[i].tag) {
                        this.gridAttributes[j].display.width = width;
                    }
                }
                for (var j = 0; j < this.gridAttributesStore.length; j++) {
                    if (this.gridAttributesStore[j].tag === this.gridAttributes[i].tag) {
                        this.gridAttributesStore[j].display.width = Math.round(cols[i].width / total * 100).toString() + "%";
                    }
                }
            }
            this.storeGridSetting();
        },

        removeGridSettings: function() {
            // remove all settings from local storage
            var storageKey = this.mxform.id + this.grid.mxid;
            if (this.useLocalStorage) {
                localStorage.removeItem(storageKey);
            } else if (this.settingsObj) {
                mx.data.remove({
                    guid: this.settingsObj.getGuid(),
                    callback: function() {
                        console.log("Settings removed");
                    },
                    error: function(e) {
                        console.log("Error attempting to remove Grid Settingsobject " + e);
                    }
                });
                this.settingsObj = null;
            }
        },

        getSortParams: function() {
            // get and re-organise sort parameters from local storage.
            var sort = {};
            for (var i = 0; i < this.gridAttributes.length; i++) {
                if (this.gridAttributes[i].sort) {
                    sort[this.gridAttributes[i].tag] = [ this.gridAttributes[i].tag, this.gridAttributes[i].sort ];
                }
            }
            return sort;
        },

        _reset: function(evt) {
            // user menu click reset. restores the original settings
            this.closeContextMenu();
            var sortParams = this.grid._gridConfig.gridSetting("sortparams");
            for (var i = 0; i < this.gridAttributesOrg.length; i++) {
                this.gridAttributes[i] = dojo.clone(this.gridAttributesOrg[i]);
                this.gridAttributesStore[i] = dojo.clone(this.gridAttributesOrg[i]);
            }
            var len = this.gridAttributes.length;
            while (len--) { // remove columns witn 0% width
                if (this.gridAttributes[len].display.width === "0%") {
                    this.gridAttributes.splice(len, 1);
                }
            }
            this.reloadFullGrid();
            this.setSortOrder();
            this.setHandlers();
            this.removeGridSettings();
            this.resetColumnMenu();
            dojo.stopEvent(evt);
        },

        _hideColumn: function(evt) {
            // hide a column from a grid. with is set to 0, so it is not rendered.
            // width is equally distributed over other columns.
            this.closeContextMenu();
            if (this.countVisableCol() > 1) {
                this.columnHide(this.selectedHeader);
                    // update column menu
                var icon = this.columnMenuItems[this.selectedHeader].childNodes[0];
                dojo.attr(icon, "class", "glyphicon glyphicon-remove");
                dojo.attr(this.columnMenuItems[this.selectedHeader], "visible", false);

                var index = this.grid._gridColumnNodes.indexOf(this.selectedHeaderNode);
                if (index > -1) {
                    this.grid._gridColumnNodes.splice(index, 1);
                }

                this.reloadFullGrid();
                this.setHandlers();
            } else {
                mx.ui.info("It is not posible to hide the last column");
            }
            dojo.stopEvent(evt);
        },

        countVisableCol: function() {
            // count the amount of visible columns.
            // to prevent hiding the last column
            var count = 0;
            var cols = this.grid.headTableGroupNode.children;
            for (var i = 0; i < cols.length; i++) {
                var display = dojo.getStyle(cols[i], "display");
                if (display !== "hidden" && display !== "none") {
                    count++;
                }
            }
            return count;
        },

        loadContextMenu: function() {
            // add the context menu to the document
            // Is this the best way?
            dojo.query("body").connect("oncontextmenu", dojo.hitch(this, function(evt) {
                if (evt.target.parentElement === this.contextMenu) {
                    dojo.stopEvent(evt);
                }
            }));
            var headers = this.grid.gridHeadNode.children[0].children;
            for (var i = 0; i < headers.length; i++) {
                var tag = this.grid.domData(headers[i], "datakey");
                dojo.connect(headers[i], "onmousedown", dojo.hitch(this, this.headerClick, tag, headers[i]));
            }
        },

        _enableMove: function(evt) {
            // user click context menu to enable the move of columns
            this.closeContextMenu();
            var headers = this.grid.gridHeadNode.children[0].children;
            for (var i = 0; i < headers.length; i++) {
                var horMover = declare([ Mover ], {
                    onMouseMove: function(evt) {
                        var l = 0;
                        if (evt.pageX - this.host.startPosX > this.host.minX) {
                            var w = domGeom.position(this.host.node).w;

                            if (evt.pageX - this.host.startPosX < this.host.maxX - w) {
                                l = evt.pageX - this.host.startPosX;
                            } else {
                                l = this.host.maxX - w;
                            }
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

        headerMoveStart: function(evt) {
            // start of header column move. store the limits of the movement.
            evt.host.startPosX = domGeom.position(evt.node).x - evt.node.offsetLeft;

            var headers = this.grid.gridHeadNode.children[0].children;
            for (var i = 0; i < headers.length; i++) {
                this.gridAttributes[i].i = i; // set original sort order
            }
            evt.host.minX = domGeom.position(evt.node.parentNode).x - domGeom.position(evt.node.parentNode).x;
            evt.host.maxX = domGeom.position(evt.node.parentNode).x + domGeom.position(evt.node.parentNode).w - domGeom.position(evt.node.parentNode).x;
            evt.host.node = evt.node;
        },

        headerMoveStop: function(index, evt) {
            // end of header column move. store setting and rebuild datagrid
            var headers = this.grid.gridHeadNode.children[0].children;
            for (var i = 0; i < headers.length; i++) {
                var g = domGeom.position(headers[i]);
                this.gridAttributes[i].x = g.x;
                this.gridAttributes[i].w = g.w;
                if (headers[i] === evt.node) {
                    this.gridAttributes[i].moving = true;
                } else {
                    this.gridAttributes[i].moving = false;
                }
            }
            var compareXPos = function(a, b) {
                // Javascript array Sort function:
                // returns less than zero, sort a before b
                // return greater than zero, sort b before a
                // returns zero, leave a and be unchanged with respect to each other
                if (a.i < b.i && (a.moving === true) || a.i > b.i && (b.moving === true)) {
                    // moved object left should compare to start position
                    if (a.x < b.x) {
                        return -1;
                    }
                    if (a.x >= b.x) {
                        return 1;
                    }
                } else { // moved object to the right should compare till the left site of the other object
                    if (a.x + a.w < b.x + b.w) {
                        return -1;
                    }
                    if (a.x + a.w >= b.x + b.w) {
                        return 1;
                    }
                }
                return 0;
            };
            this.gridAttributes.sort(compareXPos);
            for (var i = 0; i < this.gridAttributesStore.length; i++) {
                this.gridAttributesStore[i].order = -1;
            }
            for (var i = 0; i < this.gridAttributes.length; i++) {
                for (var j = 0; j < this.gridAttributesStore.length; j++) {
                    if (this.gridAttributesStore[j].tag === this.gridAttributes[i].tag) {
                        this.gridAttributesStore[j].order = i;
                    }
                }
            }
            this.gridAttributesStore.sort(this.compareOrder);
            this.reloadFullGrid();
            this.setHandlers();
        },

        compareOrder: function(a, b) {
            // function to compare order of the columns
            try {
                if (a.order < b.order) {
                    return -1;
                } else if (a.order > b.order) {
                    return +1;
                }
                return 0;
            } catch (e) {
                return 0;
            }
        },

        reloadFullGrid: function() {
            // rebuild grid header and body
            // this.doGridAttributes();
            this.reloadGridHeader();
            this.clearGridDataNodes();
            this.grid.fillGrid();
        },

        setHandlers: function() {
            // enable the context menu and connect with the resizer
            this.loadContextMenu();
            this.connect(this.grid, "eventColumnClicked", this.eventColumnClicked);
            this.connect(this.grid._resizer, "endResize", this.endResize);
        },

        reloadGridHeader: function() {
            // rebuild grid header
            dojo.empty(this.grid.gridHeadNode);
            dojo.empty(this.grid.headTableGroupNode);
            dojo.empty(this.grid.bodyTableGroupNode);

            this.buildGridBody();
            this.storeGridSetting();
        },

        doGridAttributes: function() {
            var columns = this.grid._visibleColumns;
            dojo.forEach(columns, function(col) {
                var path = col.tag.split("/");
                if (path.length === 2 || path.length === 4) {
                    path.shift();
                }
                col.attrs = path;
            }, this.grid);
        },

        buildGridBody: function() {
            // Copied form mendix BuildGridBody and commented out the creation of the handlers
            // this is needed otherwise the handlers will be create multiple times
            // replace this -> this.grid (execpt for in the forEach)
            // Added the following line to enable responsive columns viewing (disabled its bugging?):
            // line  class: _c15.display.cssClass ? _c15.display.cssClass: ""
            // for more changes see inline comments

            var _c4d = mxui.dom;
            var self = this.grid,
                $ = _c4d.create,
                _c6f = this.grid._gridConfig.gridAttributes(),
                _c70 = [],
                _c71 = [],
                row = $("tr", {
                    class: "mx-name-head-row"
                }),
                _c72 = $("div", {
                    class: this.grid.cssmap.headCaption
                }),
                _c73 = $("div", {
                    class: this.grid.cssmap.headWrapper
                }),
                _c74 = {},
                _c75 = this.grid._gridConfig.getPlugins().Calculations || {};
            _c4d.disableSelection(row);
            _c74 = this.getSortParams(); // Added function for this widget, getting sort param from settings
            this.grid._visibleColumns = [];
            this.grid._gridColumnNodes = [];
            // dojo.forEach(this.grid._gridConfig.gridSetting("sortparams"), function(_c76) {
            //    _c74[_c76[0]] = _c76;
            // });

            dojo.forEach(_c6f, function(_c77, i) {
                var _c78 = _c77.display.width,
                    _c79 = _c77.tag in _c75,
                    _c7a = _c78 != null && (_c78 == "0px" || _c78 == "0%");
                if (_c79) {
                    _c71.push(_c7a);
                }
                if (!_c7a) {
                    this._visibleColumns.push(_c77);
                }
            }, this.grid);
            var columns = this.grid._visibleColumns;
            dojo.forEach(columns, function(col) { // add fix for unloaded attributes
                var path = col.tag.split("/");
                if (path.length == 2 || path.length == 4) {
                    path.shift();
                }
                col.attrs = path;
            }, this.grid);
            dojo.forEach(_c71, function(_c7b, i) {
                if (_c7b) {
                    this._hiddenAggregates.push(i);
                }
            }, this.grid);
            dojo.forEach(this.grid._visibleColumns, function(_c7c, i) {
                var _c7d = $("th");
                this.domData(_c7d, {
                    datakey: _c7c.tag,
                    index: i
                });
                this.setColumnStyle(_c7d, _c7c);
                var _c7e = $("span", {
                    class: this.cssmap.sortText
                });
                var _c7f = $("div", {
                    class: this.cssmap.sortIcon,
                    style: "display: none"
                }, _c7e);
                var _c80 = _c74[_c7c.tag];
                if (_c80) {
                    var _c81 = _c80[1];
                    this.domData(_c7d, "sortorder", _c81);
                    _c7e.innerHTML = _c81 === "asc" ? "&#9650;" : "&#9660;";
                    _c7f.style.display = "";
                }
                var _c82 = _c72.cloneNode(true);
                _c82.innerHTML = _c7c.display.string || "&nbsp;";
                var _c83 = _c73.cloneNode(true);
                _c83.appendChild(_c7f);
                _c83.appendChild(_c82);
                _c7d.appendChild(_c83);
                this.setNodeTitle(_c7d, _c82);
                var _c84 = $("col", {
                        style: "width:" + _c7c.display.width,
                        class: _c7c.display.cssClass ? _c7c.display.cssClass : ""
                    }),
                    _c85 = _c84.cloneNode(true);
                this.headTableGroupNode.appendChild(_c84);
                this.bodyTableGroupNode.appendChild(_c85);
                _c70.push([ _c84, _c85 ]);
                this._gridColumnNodes.push(_c7d);
                row.appendChild(_c7d);
            }, this.grid);
            this.grid.gridHeadNode.appendChild(row);
            /* Sort handler cannot be destroyed, so it should not set again
            if (this.grid._gridState.sortable) {
                this.grid.own(_c52(this.grid.gridHeadNode, "th:click", function(e) {
                    var key = self.domData(this.grid, "index");
                    if (_c6f[key].sortable !== false) {
                        self.eventColumnClicked(e, this.grid);
                    }
                }));
            }*/
            this.grid._resizer = new ColumnResizer({ // added AMD loading for ColumnResizer
                thNodes: _c4d.toArray(row.children),
                colNodes: _c70,
                colUnits: _c6f[0].display.width.indexOf("%") > 0 ? "%" : "px",
                rtl: !this.grid.isLeftToRight(),
                tableNode: this.grid.headTable,
                gridNode: this.grid.gridTable
            });
            if (this.grid._gridState.showemptyrows) {
                var _c86 = this.grid._gridConfig.gridSetting("rows");
                for (var i = 0; i < _c86; i++) {
                    this.grid.addNewRow();
                }
            }
            /* even handlers do not need be set again.
            this.grid.own(_c52(this.grid.gridBodyNode, "tr:click", function(e) {
                self.eventItemClicked(e, this.grid);
            }));
            this.grid.liveConnect(this.grid.gridBodyNode, "onclick", {
                td: "eventCellClicked"
            });
            this.grid.liveConnect(this.grid.gridBodyNode, "onmouseover", {
                tr: "eventRowMouseOver"
            });
            this.grid.liveConnect(this.grid.gridBodyNode, "onmouseout", {
                tr: "eventRowMouseOut"
            });
            var _c87 = function(e) {
                self.eventActionBindingHandler(this.grid, e.type);
            };
            var _c88 = this.grid._gridConfig.gridActionBindings();
            for (var _c89 in _c88) {
                this.grid.own(_c52(this.grid.gridBodyNode, "tr:" + _c89.replace(/^on/, ""), _c87));
            }
            */
        },


        headerClick: function(tag, node, evt) {
            // context menu on right button click.
            this.selectedHeader = tag;
            this.selectedHeaderNode = node;
            if (evt.button === dojo.mouseButtons.RIGHT) {
                // Correct x pos to prevent from overflowing on right hand side.
                dojo.setStyle(this.contextMenu, "display", "block");
                var x = evt.pageX - 5,
                    menuWidth = domGeom.position(this.contextMenu).w,
                    winWidth = window.innerWidth;

                if (evt.pageX > winWidth - menuWidth) {
                    x = winWidth - menuWidth - 5;
                }

                dojo.setStyle(this.contextMenu, "left", x + "px");
                dojo.setStyle(this.contextMenu, "top", (evt.pageY - 5) + "px");
                this.connect(this.contextMenu, "onmouseleave", dojo.hitch(this, this.closeContextMenu));

                dojo.stopEvent(evt);
            }
        },

        closeContextMenu: function() {
            // Close the context menu when mouse is leaving the menu.
            dojo.setStyle(this.contextMenu, "display", "none");
            dojo.removeClass(this.columnListItem, "open");
        }

    });
});

// @ sourceURL=widgets/DataGridExtension/widget/FlexColumns.js
