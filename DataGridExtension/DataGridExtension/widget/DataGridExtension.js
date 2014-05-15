mxui.dom.addCss(mx.moduleUrl("DataGridExtension") + "widget/ui/DataGridExtension.css");

require(["dojo/json", "dojo/dnd/Moveable", "dojo/_base/declare", "dojo/_base/event", "dojo/dnd/Mover", "dojo/dom-geometry"], function (JSON, Moveable, declare, event, Mover, domGeom) {
    "user strict";
    var widget = {
        mixins: [dijit._TemplatedMixin, mendix.addon._Contextable],

        // input parameters
        inputargs: {
            responsiveHeaders: false,
            hasFlexHeader: false,
            hideUnusedPaging: false,
            hideUnusableButtons: false,
            rowClassMapping: [],
            rowClassAttr: "",

            firstLastMinPages: 3,
            //Empty Table
            onclickmf: "",
            buttonIcon: "",
            showAsButton: "",
            caption: "",
            hideEmptyTable: false
        },

        // Caches
        grid: null,
        templatePath: dojo.moduleUrl("DataGridExtension", "widget/ui/DataGridExtension.html"),
        gridAttributesOrg: null,
        gridAttributesStore: null, // gridAttributes with 0 width will be removed.
        gridAttributes: null,
        selectedHeader: 0,
        settingLoaded: false,

        fillHandler: null,
        dynamicButton: null,
        dataobject: null,
        columnChanges: [],
        columnMenuItems: [],
        selectionButtons: [],
        nonSelectionButtons: [],
        hideOnEmptyButtons: [],
        showOnEmptyButtons: [],        
        setButtons: [],
        rowClassTable: [],
        
        // Templated variables:
        // gridExtension
        // contextMenu
        // emptyTableHolder
        // columnMenu

        // ISSUES:
        //
        // TODO:
        // 
        // FUTURE:   
        // Test other browser versions
        // Distribute width over all columns after column is added/removed in the modeller.
        // Add responsive columns support in flex header feature.
        // Make flex header compatible with Widht unit = Pixels .
        // review usage of gridAttributesStore
        // Row class text to css class conversion should remove leading digits too
        // Disable move when there is only one column left.
        // 
        // RESOLVED:
        // DONE test across browsers. Safari 5.1.7 Chrome 33, IE 11,(emulate 10, 9 ok, 8fails), FF 27 ok, FF3.6 fails 
        // FIXED Display Names are not updated when changed in modeller
        // FIXED Reset will not reset the sort order
        // DONE Added App store Empty table gird functions
        // DONE hide buttons that need selected rows in case that there is no row selected
        // DONE Hide first last page button when there are not many buttons.
        // DONE show hide toolbar buttons when needed based on row selection
        // DONE set table row styling based on data grid column value
        // DONE No more Cookie! Html local storage!
        // DONE columns visability can be chaned with submenu, hence modeler 0 width columns can now made visable
        // DONE give warning message if last column is hidden via column menu
        // DONE move template string to html file
        // DONE check if the configuration is valid. 
        // FIXED removed required "Row Class Attribute" form context XML
        // FIXED hide controlbar buttons of Microflows of type "selection" (single select data grid)
        // FIXED Shared array confolicting with mutliple widgets in a page (toolbar buttos)
        // DONE Enable datagrid extention to work on reference set selector too.
        // DONE Can hide / show grid buttons when a grid is empty or not with the classes "hideOnEmpty" or "showOnEmpty"
        // FIXED When paging is hidden in modeler and dynamic hiding is enabled resulted in an error
        // DONE empty table header can be hidden without showing a button.
        // FIXED Mx5.4 Grid buttons where no working wel; Mx renamed eventGridRowClicked to eventItemClicked in datagrid.
        // DONE Handler refresh of grid buttons on double click
        
        postCreate: function () {
            // post create function of dojo widgets.
            
            this.columnChanges = []; // per-instance objects
            this.columnMenuItems = [];
            this.selectionButtons = [];
            this.nonSelectionButtons = [];
            this.hideOnEmptyButtons = [];
            this.showOnEmptyButtons = [];  
            this.setButtons = [];
            this.rowClassTable = [];
        
        
            try {
                var colindex = this.domNode.parentNode.cellIndex;
                this.grid = dijit.findWidgets(this.domNode.parentNode.parentNode.previousSibling.cells[colindex])[0];
                if(this.grid.class === "mx-referencesetselector")
                    this.grid = this.grid._datagrid;
                this.gridAttributes = this.grid._gridConfig.gridAttributes();
                this.checkConfig();
                this.fillHandler = this.connect(this.grid, "fillGrid", this.performUpdate); //setup for paging
                this.setupDynamicRowClasses();
                this.setupControlbarButtonVisibility();
                this.setupFlexibleColumns();
            } catch (e) {
                console.log("error in create widget:" + e);
            }
            if (this.grid === null) {
                this.caption = "Error: unable to find grid. Is the widget placed in a row underneath a grid?";
            }
            this.loaded();
        },

        checkConfig: function () {
            if (this.hasFlexHeader && this.gridAttributes[0].display.width.indexOf("%") === -1) {
                console.error("You can no use the Flex Header feature in combination with 'Width unit = pixels' in a  data grid");
                this.hasFlexHeader = false;
            }
            if (this.responsiveHeaders && this.hasFlexHeader)
                console.error("You can not enable both bootstrap responsive columns && Flex Header feature");
            if ((this.showAsButton === "Button" || this.showAsButton === "Link") && !this.onclickmf)
                console.error("When Empty table grid message is rendered as button or link a on click microflow is required");
        },

        // ---------------------------------------------------------------------
        // Section for Controlbar Button Visibility
        // ---------------------------------------------------------------------
        setupControlbarButtonVisibility: function () {
            if (this.hideUnusableButtons) {
                // Append empty div, so height is not bar is not collapsing (issue dos not apply when there multiple lines of buttons
                var spacer = mxui.dom.create("div", {
                    class: "hightSpacer mx-button",
                    style: "height:" + this.grid.toolBarNode.childNodes[0].clientHeight + "px; width:1px; display: inline-block;"
                });
                this.grid.toolBarNode.appendChild(spacer);

                for (var i = 0; i < this.grid.toolBarNode.childNodes.length; i++) {
                    if (this.grid.toolBarNode.childNodes[i].nodeName === "BUTTON") {
                        var actionKey = this.grid.toolBarNode.childNodes[i].getAttribute("data-mendix-id");
                        if (actionKey) {
                            if (!dojo.hasClass(this.grid.toolBarNode.childNodes[i], "ignoreRowSelectionVisibility")) {
                                if (dojo.hasClass(this.grid.toolBarNode.childNodes[i], "hideOnRowSelect"))
                                    this.nonSelectionButtons.push(this.grid.toolBarNode.childNodes[i]);
                                if (dojo.hasClass(this.grid.toolBarNode.childNodes[i], "showOnRowSelect"))
                                    this.selectionButtons.push(this.grid.toolBarNode.childNodes[i]);
                                if (dojo.hasClass(this.grid.toolBarNode.childNodes[i], "hideOnEmpty"))
                                    this.hideOnEmptyButtons.push(this.grid.toolBarNode.childNodes[i]);
                                if (dojo.hasClass(this.grid.toolBarNode.childNodes[i], "showOnEmpty"))
                                    this.showOnEmptyButtons.push(this.grid.toolBarNode.childNodes[i]);
                                
                                var action = this.grid._gridConfig.getActionsByKey(actionKey);
                                if (action.actionCall === "InvokeMicroflow") {
                                    if (action.params) {
                                        for (var key in action.params) break; //get first param
                                        if (action.params[key].applyTo && ( action.params[key].applyTo === "selectionset" || action.params[key].applyTo === "selection")) {
                                            this.selectionButtons.push(this.grid.toolBarNode.childNodes[i]);
                                        }
                                        if (action.params[key].applyTo && action.params[key].applyTo === "set") {
                                            this.setButtons.push(this.grid.toolBarNode.childNodes[i]);
                                        }
                                    }
                                }
                                if (action.actionCall === "EditSelection" || action.actionCall === "DeleteSelection" || action.actionCall === "ClearSelection" || action.actionCall === "ReturnSelection" || action.actionCall === "DeleteRef") {
                                    this.selectionButtons.push(this.grid.toolBarNode.childNodes[i]);
                                }
                            }
                        }
                    }
                }
                // many function will change can change the condition of visibility
                this.connect(this.grid, "eventGridRowClicked", this.selectChangeControlBarButtons); //mx5.3
                this.connect(this.grid, "eventItemClicked", this.selectChangeControlBarButtons); //mx 5.4
                this.connect(this.grid, "actionEditSelection", this.selectChangeControlBarButtons);
                
                this.connect(this.grid, "selectRow", this.selectChangeControlBarButtons);
                this.connect(this.grid, "deselectRow", this.selectChangeControlBarButtons);
                this.connect(this.grid, "fillGrid", this.selectChangeControlBarButtons);
                
            }
        },

        selectChangeControlBarButtons: function () {
            var countSelected = 0;
            if (this.grid._selectedGuids)
                countSelected = this.grid._selectedGuids.length;

            var gridSize = (this.grid.getCurrentGridSize ? this.grid.getCurrentGridSize() : this.grid._datagrid.getCurrentGridSize());
            if (countSelected > 0) {
                // show the buttons that need a row selection
                for (var i = 0; i < this.selectionButtons.length; i++) {
                    dojo.style(this.selectionButtons[i], "display", "inline-block");
                }
                // hide buttons that should not me shown on selection
                for (var i = 0; i < this.nonSelectionButtons.length; i++) {
                    dojo.style(this.nonSelectionButtons[i], "display", "none");
                }
            } else {
                // hide buttons that need a selection.
                for (var i = 0; i < this.selectionButtons.length; i++) {
                    dojo.style(this.selectionButtons[i], "display", "none");
                }
                // show buttons that are marked to display only when no row is selected.
                for (var i = 0; i < this.nonSelectionButtons.length; i++) {
                    dojo.style(this.nonSelectionButtons[i], "display", "inline-block");
                }
                if (gridSize === 0) {
                    for (var i = 0; i < this.setButtons.length; i++) {
                        dojo.style(this.setButtons[i], "display", "none");
                    }
                    for (var i = 0; i < this.hideOnEmptyButtons.length; i++) {
                        dojo.style(this.hideOnEmptyButtons[i], "display", "none");
                    }
                    for (var i = 0; i < this.showOnEmptyButtons.length; i++) {
                        dojo.style(this.showOnEmptyButtons[i], "display", "inline-block");
                    }                    
                } else {
                    // when grid has record show set buttons
                    for (var i = 0; i < this.setButtons.length; i++) {
                        dojo.style(this.setButtons[i], "display", "inline-block");
                    }
                    for (var i = 0; i < this.hideOnEmptyButtons.length; i++) {
                        dojo.style(this.hideOnEmptyButtons[i], "display", "inline-block");
                    }
                    for (var i = 0; i < this.showOnEmptyButtons.length; i++) {
                        dojo.style(this.showOnEmptyButtons[i], "display", "none");
                    }
                }
            }
        },

        //----------------------------------------------------------------------
        // Section for styling Rows based on table values
        //----------------------------------------------------------------------
        setupDynamicRowClasses: function () {
            // 
            if (this.rowClassAttr) {
                var self = this; // needed in aspect function

                this.grid.rowClassMapping = {};
                for (var i = 0; i < this.rowClassMapping.length; i++) {
                    this.rowClassTable[this.rowClassMapping[i].key] = this.rowClassMapping[i].value;
                }
                dojo.aspect.around(this.grid, "_gridbodyFillRow", function (originalMethod) {
                    // wrap arround the grid function to change stuff before and after.
                    return function (mxobj, gridMatrixRow, gridAttributes) {
                        if (mxobj.has(self.rowClassAttr)) { // check Has Attribute
                            var tr = gridMatrixRow[0].parentNode,
                                value = mxobj.get(self.rowClassAttr);
                            if (value in self.rowClassTable) {
                                value = self.rowClassTable[value];
                            } else {
                                value = value.replace(/[^\w_-]/gi, ''); // remove all special characters, TODO: remove leading digits too.
                            }
                            dojo.attr(tr, "class", value);
                        }
                        originalMethod.apply(this, arguments);
                    };
                });
            }
        },

        //---------------------------------------------------------------------
        // Section Empty table grid behaviour
        //---------------------------------------------------------------------

        showButton: function () {
            this.hideButton();
            if (this.showAsButton.toLowerCase() === "text") {
                this.dynamicButton = new mxui.dom.div({
                    "class": "empty_grid"
                }, mxui.dom.escapeString(this.caption));
                this.emptyTableHolder.appendChild(this.dynamicButton);
            } else {
                this.dynamicButton = new mxui.widget._Button({
                    caption: mxui.dom.escapeString(this.caption),
                    iconUrl: this.buttonIcon,
                    onClick: dojo.hitch(this, this.onclickEvent),
                    renderType: this.showAsButton.toLowerCase(),
                    cssclass: ""
                });
                this.emptyTableHolder.appendChild(this.dynamicButton.domNode);
            }
        },

        hideButton: function () {
            dojo.empty(this.emptyTableHolder);
        },

        onclickEvent: function () {
            if (this.onclickmf !== "") {
                mx.data.action({
                    error: function () {
                        logger.error("DynamicButton.widget.dynamicbutton.onclickEvent: XAS error executing microflow");
                    },
                    actionname: this.onclickmf,
                    context: this.dataobject,
                    callback: function () {}
                });
            }
        },

        applyContext: function (context, callback) {
            if (context && context.getTrackId() !== "") {
                this.dataobject = context;
            }
            callback && callback();
        },

        //----------------------------------------------------------------------
        // Section for dynamic showing paging and Empty table //TODO split function paging empty table
        //----------------------------------------------------------------------

        performUpdate: function () {
            if (this.grid !== null) {
                var gridSize = (this.grid.getCurrentGridSize ? this.grid.getCurrentGridSize() : this.grid._datagrid.getCurrentGridSize());
                    if (gridSize === 0) {
                        if (this.hideEmptyTable === true)
                            dojo.style(this.grid.gridHeadNode, "display", "none");
                        if (this.showAsButton !== "Disabled")  // show empty table info    
                            this.showButton();
                        
                    } else {
                        if (this.hideEmptyTable === true)
                            dojo.style(this.grid.gridHeadNode, "display", "table-header-group");
                        if (this.showAsButton !== "Disabled")  // show empty table info  
                            this.hideButton();
                    }
                
                if (this.hideUnusedPaging === true) {
                    var ds = this.grid._dataSource;
                    var atBegin = ds.atBeginning();
                    var atEnd = ds.atEnd();
                    if (atBegin === true && atEnd === true)
                        dojo.style(this.grid.pagingBarNode, "display", "none");
                    else
                        dojo.style(this.grid.pagingBarNode, "display", "block");
                }

                if (this.hideUnusedPaging && this.grid.pagingBarNode.childNodes.length > 0) {
                    var countPages = Math.ceil(this.grid._dataSource.getSetSize() / this.grid._dataSource._pageSize);
                    if (countPages <= this.firstLastMinPages) {
                        dojo.style(this.grid.pagingBarNode.childNodes[0], "display", "none");
                        dojo.style(this.grid.pagingBarNode.childNodes[8], "display", "none");
                    } else {
                        dojo.style(this.grid.pagingBarNode.childNodes[0], "display", "inline-block");
                        dojo.style(this.grid.pagingBarNode.childNodes[8], "display", "inline-block");
                    }
                }

            }
        },

        //----------------------------------------------------------------------
        // Section for Flexible Columns
        //----------------------------------------------------------------------
        setupFlexibleColumns: function () {
            // initialize all the create flexibility to change the columns in the header of the grid
            if (this.responsiveHeaders) {
                dojo.empty(this.grid.gridHeadNode);
                dojo.empty(this.grid.headTableGroupNode);
                dojo.empty(this.grid.bodyTableGroupNode);

                this.buildGridBody();
            } else if (this.hasFlexHeader) {
                if (this.supports_html5_storage()) {
                    var sortParams = this.grid._gridConfig.gridSetting("sortparams");
                    for (var i = 0; i < this.gridAttributes.length; i++) {
                        // set sort order and width for future use.
                        this.gridAttributes[i].order = i;
                        for (var j = 0; j < sortParams.length; j++) {
                            if (sortParams[j][0] === this.gridAttributes[i].tag)
                                this.gridAttributes[i].sort = sortParams[j][1];
                        }
                    }
                    this.gridAttributesOrg = dojo.clone(this.gridAttributes);
                    this.gridAttributesStore = dojo.clone(this.gridAttributes);
                    this.loadSettings();
                    if (this.settingLoaded) {
                        this.reloadGridHeader();
                        this.setSortOrder();
                    }
                    this.getColumnMenu();
                    this.setHandlers();
                } else {
                    console.info("your browser does not support html local storage, so no flex headers for you. pleas updgrade your browser and enjoy");
                }
            }
        },

        supports_html5_storage: function () {
            // Checks if local storage is supported in the browser.
            try {
                return 'localStorage' in window && window['localStorage'] !== null;
            } catch (e) {
                return false;
            }
        },

        storeGridSetting: function () {
            // stores the setting based on the form ID and grid ID
            var storageKey = this.mxform.id + this.grid.mxid;
            localStorage.setItem(storageKey, JSON.stringify(this.gridAttributesStore));
        },

        loadSettings: function () {
            // load the setting from the local storage
            // checks stored object equal to the column before copy settings
            var storageKey = this.mxform.id + this.grid.mxid;
            var storageValue = localStorage.getItem(storageKey);

            var compareAttObj = function (a, b) {
                // check if 2 attribute objects are equal
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

        getColumnMenu: function () {
            // render the bootstrap drop down menus for the header
            var $ = mxui.dom.create;

            for (var i = 0; i < this.gridAttributesOrg.length; i++) {
                var visible = false,
                    width = "";
                for (var j = 0; j < this.gridAttributes.length; j++) {
                    width = this.gridAttributes[j].display.width;
                    if (this.gridAttributes[j].tag === this.gridAttributesOrg[i].tag && width !== "0%" && width !== "0px")
                        visible = true;
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

        resetColumnMenu: function () {
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

        closeSubMenus: function (evt) {
            //close subMenus of main menu.
            dojo.query("*", evt.taget).removeClass("open");
        },

        columnHide: function (tag) {
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

        columnShow: function (tag) {
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

        distributeColumnWidth: function (attrs) {
            var total = 0; // count total
            for (var i = 0; i < attrs.length; i++) {
                total += parseFloat(attrs[i].display.width, 10);
            }
            //redistribute the width over the 100%
            for (var i = 0; i < attrs.length; i++) {
                var width = (parseFloat(attrs[i].display.width, 10) / total) * 100;
                attrs[i].display.width = (Math.round(width) === 0) ? "0%" : width.toString() + "%";
                attrs[i].order = i;
            }
        },

        updateColumnvisibility: function (evt) {
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
                    mx.ui.info("It is not posible to hide the last column");
                    this.resetColumnMenu();
                }
                this.columnChanges = [];
            }
            dojo.removeClass(this.columnListItem, "open");
        },

        onItemSelect: function (tag, evt) {
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

        onSubMenuEnter: function (evt) {
            // open sub menu item, 
            dojo.addClass(evt.target.parentNode, "open");
            dojo.stopEvent(evt);
        },

        setSortOrder: function () {
            // Code based in the Mendix dataGrid function: eventColumnClicked
            // set the stored sort order in the dataGrid.
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
                for (var j = 0; j < this.gridAttributesStore.length; j++) {
                    if (this.gridAttributesStore[j].tag === this.gridAttributes[i].tag) {
                        this.gridAttributesStore[j].display.width = Math.round(cols[i].width / total * 100).toString() + "%";
                    }
                }
            }
            this.storeGridSetting();
        },

        removeGridSettings: function () {
            // remove all settings from local storage
            var storageKey = this.mxform.id + this.grid.mxid;
            localStorage.removeItem(storageKey);
        },

        getSortParams: function () {
            // get and re-organise sort parameters from local storage.
            var sort = {};
            for (var i = 0; i < this.gridAttributes.length; i++) {
                if (this.gridAttributes[i].sort) {
                    sort[this.gridAttributes[i].tag] = [this.gridAttributes[i].tag, this.gridAttributes[i].sort];
                }
            }
            return sort;
        },

        _reset: function (evt) {
            // user menu click reset. restores the original settings
            dojo.setStyle(this.contextMenu, "display", "none");
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

        _hideColumn: function (evt) {
            // hide a column from a grid. with is set to 0, so it is not rendered.
            // width is equally distributed over other columns.
            dojo.setStyle(this.contextMenu, "display", "none");
            if (this.countVisableCol() > 1) {
                this.columnHide(this.selectedHeader);
                // update column menu
                var icon = this.columnMenuItems[this.selectedHeader].childNodes[0];
                dojo.attr(icon, "class", "glyphicon glyphicon-remove");
                dojo.attr(this.columnMenuItems[this.selectedHeader], "visible", false);

                this.reloadFullGrid();
                this.setHandlers();
            } else {
                mx.ui.info("It is not posible to hide the last column");
            }
            dojo.stopEvent(evt);
        },

        countVisableCol: function () {
            // count the amount of visible columns.
            // to prevent hiding the last column
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
            // add the context menu to the document
            // Is this the best way?
            dojo.query("body").connect("oncontextmenu", dojo.hitch(this, function (evt) {
                if (evt.target.parentElement === this.contextMenu) {
                    dojo.stopEvent(evt);
                }
            }));
            var headers = this.grid.gridHeadNode.children[0].children;
            for (var i = 0; i < headers.length; i++) {
                var tag = this.grid.domData(headers[i], "datakey");
                dojo.connect(headers[i], "onmousedown", dojo.hitch(this, this.headerClick, tag));
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
                // return greater than zero, sort b before a
                // returns zero, leave a and be unchanged with respect to each other
                if (a.i < b.i && (a.moving === true) || a.i > b.i && (b.moving === true)) {
                    // moved object left should compare to start position
                    if (a.x < b.x)
                        return -1;
                    if (a.x >= b.x)
                        return 1;
                } else { // moved object to the right should compare till the left site of the other object
                    if (a.x + a.w < b.x + b.w)
                        return -1;
                    if (a.x + a.w >= b.x + b.w)
                        return 1;
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

        compareOrder: function (a, b) {
            // function to compare order of the columns
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
            // Copied form mendix BuildGridBody and commented out the creation of the handlers
            // this is needed otherwise the handlers will be create multiple times
            // replace this -> this.grid
            // Added the following line to enable responsive columns viewing (disabled its bugging?):
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

            var _c11 = this.getSortParams(); // Added function for this widget
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

        headerClick: function (tag, evt) {
            // context menu on right button click.
            this.selectedHeader = tag;
            if (evt.button === dojo.mouseButtons.RIGHT) {
                // Correct x pos to prevent from overflowing on right hand side.
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
            // Close the context menu when mouse is leaving the menu.
            dojo.setStyle(this.contextMenu, "display", "none");
        },

        //----------------------------------------------------------------------

        destroy: function () {
            //is there anything left to destroy?
        }

    };
    mxui.widget.declare("DataGridExtension.widget.DataGridExtension", widget);
    mxui.widget.declare("DataGridExtension.widget.DataGridExtensionNoContext", widget);
});