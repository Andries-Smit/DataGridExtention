require(["dojo", "dijit", "dojo/NodeList-traverse"], function (dojo, dijit) {
    "use strict";
    var widget = {
        mixins: [mendix.addon._Contextable],

        inputargs: {
            buttonPrevNext: "Next",
            onclickmf: "",
            caption: "Next",
            iconUrl: "",
            displayAs: "",
            buttonStyle: "",
            disableFirstLastStep: true
        },

        //Caches
        grid: null,
        context: null,
        dataView: null,
        button: null,

        // ISSUES:
        // 
        // TODO:
        // 
        // DONE:

        postCreate: function () {
            try {
                // get the enclosing dataview
                this.dataView = dijit.byNode(dojo.query(this.domNode).closest(".mx-dataview")[0]);
                // on refresh new widgets are generated in same window, so use latest.
                var gridNodes = dojo.query("[mxid=" + this.dataView.datasource.contextsource + "]"),
                    classes = this.class;
                this.grid = dijit.byNode(gridNodes[gridNodes.length - 1]);


                if (this.displayAs === "button") {
                    classes = this.buttonStyle === 'default' ? classes : classes + " btn-" + this.buttonStyle;
                }
                classes += " gridSelectButton" + this.buttonPrevNext;

                this.button = new mxui.widget.Button({
                    "caption": this.caption,
                    "iconUrl": this.iconUrl,
                    "onClick": dojo.hitch(this, this.buttonPrevNext === "Previous" ? this.mfPrevRow : this.mfNextRow),
                    "cssClasses": classes,
                    "style": this.style,
                    "tabIndex": this.focusIndex
                });

                if (this.buttonPrevNext === "Next" && this.iconUrl) {
                    // move image from begin, add at end button content
                    var img = this.button.domNode.childNodes[0];
                    [].slice.call(this.button.domNode.childNodes, 0, 1);
                    this.button.domNode.appendChild(img);
                }

                this.domNode.appendChild(this.button.domNode);

                this.connect(this.grid, "refreshGrid", this.checkEnableButtons);
                var shareId = mx.ui.makeShareId(this.mxform, this.dataView.datasource.contextsource),
                    listnerHandler = dojo.subscribe(shareId, dojo.hitch(this, this.checkEnableButtons));

            } catch (e) {
                console.log('error in create widget:' + e);
            }

            if (this.grid === null) {
                this.caption = 'Error: unable to find grid. Is the widget placed in a row underneath a grid?';
            }
            this.loaded();
        },

        checkEnableButtons: function () {
            // check if buttons can be used. Disable if they can not be used
            if(this.disableFirstLastStep){
                if (this.buttonPrevNext === "Previous") {
                    if (this.isFirstRowSelected()) {
                        dojo.setAttr(this.button.domNode, "disabled", "disabled");
                    } else {
                        dojo.removeAttr(this.button.domNode, "disabled");
                    }
                } else { // Next Button                    
                    if (this.isLastRowSelected()) {
                        dojo.setAttr(this.button.domNode, "disabled", "disabled");
                    } else {
                        dojo.removeAttr(this.button.domNode, "disabled");
                    }
                }
            }
        },
        
        isLastRowSelected: function(){
            var rowsLeft = this.grid._dataSource._setsize - this.grid._dataSource._offset - 1;
            if (rowsLeft - this.getSelectedIndex() <= 0) 
                return true;
            else
                return false;
                    
        },
        
        isFirstRowSelected: function(){
            if (this.getSelectedIndex() <= 0 && this.grid._dataSource._offset === 0) 
                return true;
            else 
                return false;
        },

        mfPrevRow: function () {
            if (this.onclickmf) {
                this.onclickEvent(dojo.hitch(this, this.prevRow));
            } else {
                this.prevRow();
            }
        },

        mfNextRow: function () {
            if (this.onclickmf) {
                this.onclickEvent(dojo.hitch(this, this.nextRow));
            } else {
                this.nextRow();
            }
        },

        getSelectedIndex: function () {
            // get index of selected row based on dom element tr with selected class
            var rowsLeft = this.grid._dataSource._setsize - this.grid._dataSource._offset;
            for (var i = 0; i < this.grid._gridRowNodes.length && i < rowsLeft; i++) {
                if (dojo.hasClass(this.grid._gridRowNodes[i], "selected")) {
                    return i; //find selected            
                }
            }
            return -1; // no selection
        },

        prevRow: function () {
            // select previous row.
            if(! this.isFirstRowSelected()){
                var rows = this.grid._gridRowNodes,
                    dataSource = this.grid._dataSource,
                    selectedIndex = this.getSelectedIndex();
                if (selectedIndex > 0) { // not first row selected
                    this.grid.deselectAll();
                    selectedIndex--; // previous row index
                    var nextRow = rows[selectedIndex];
                    var guid = this.grid.domData(nextRow, "mendixguid");
                    this.grid._selectedGuids = [guid];
                    this.grid.selectRow(nextRow);
                    this.grid.shareSelected();
                    this.checkEnableButtons();
                } else {
                    console.log("begining of page");
                    if (dataSource._offset > 0) {
                        if (!dataSource.atBeginning()) {
                            dataSource.previous(dojo.hitch(this, function () {
                                this.grid.refreshGrid();
                                this.grid.deselectAll();
                                var lastRow = rows[rows.length - 1];
                                var guid = this.grid.domData(lastRow, "mendixguid");
                                this.grid._selectedGuids = [guid];
                                this.grid.selectRow(lastRow);
                                this.grid.shareSelected(); // notify others including listinging Data View
                                this.checkEnableButtons();
                            }));
                        }
                    }
                }
            }
        },

        nextRow: function () {
            // select next row
            if(! this.isLastRowSelected()){
                var rows = this.grid._gridRowNodes,
                    dataSource = this.grid._dataSource,
                    selectedIndex = this.getSelectedIndex();
                if (selectedIndex < (rows.length - 1)) { // not last row selected
                    this.grid.deselectAll();
                    selectedIndex++; // next index
                    var nextRow = rows[selectedIndex];
                    var guid = this.grid.domData(nextRow, "mendixguid");
                    this.grid._selectedGuids = [guid]; // set mx-grid property 
                    this.grid.selectRow(nextRow);
                    this.grid.shareSelected(); // notify others including listinging Data View
                    this.checkEnableButtons();
                } else { // end of page
                    console.log("end of page");
                    if (dataSource._setsize > rows.length) {
                        if (!dataSource.atEnd()) { // go to next page
                            dataSource.next(dojo.hitch(this, function () {
                                this.grid.refreshGrid();
                                this.grid.deselectAll(); // deselect in case manual changed page
                                var firstRow = rows[0]; // select first row of new page
                                var guid = this.grid.domData(firstRow, "mendixguid");
                                this.grid._selectedGuids = [guid]; // set mx-grid property
                                this.grid.selectRow(firstRow);
                                this.grid.shareSelected(); // notify others including listinging Data View
                                this.checkEnableButtons();
                            }));
                        }
                    }
                }
            }
        },

        onclickEvent: function (callback) {
            // hande the micro flow call
            mx.xas.action({
                actionname: this.onclickmf,
                context: this.context,
                callback: dojo.hitch(this, function (value) {
                    if (value === true) {
                        callback();
                    } else {
                        logger.info("Microflow next returned false");
                    }
                }),
                error: function (error) {
                    logger.error("Button onclickEvent: XAS error executing microflow: " + error);
                }
            });
        },

        applyContext: function (context, callback) {
            // store context for microflow usage
            if (context && context.getTrackId() !== '') {
                this.context = context;
            }
            callback && callback();
        },

        destroy: function () {
            //is there anything left to destroy?
        }
    };

    mxui.widget.declare("DataGridExtension.widget.DataGridSelectionStep", widget);
    //mxui.widget.declare("GridExtention.widget.GridExtentionNoContext", widget);
});