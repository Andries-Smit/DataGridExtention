//----------------------------------------------------------------------
// Toolbar Buttons
//----------------------------------------------------------------------
define(["dojo/_base/declare"], function(declare) {
    "user strict";
    return declare(null, {

        selectionButtons: [],
        nonSelectionButtons: [],
        hideOnEmptyButtons: [],
        showOnEmptyButtons: [],
        selectAllButtons: [],

        dataView: null,

        inputargs: {
            hideUnusableButtons: false
        },

        checkConfigToolbarButtons: function() {

        },

        postCreateToolbarButtons: function() {
            this.checkConfigToolbarButtons();

            this.selectionButtons = [];
            this.nonSelectionButtons = [];
            this.hideOnEmptyButtons = [];
            this.showOnEmptyButtons = [];
            this.setButtons = [];

            var dvNode = dojo.query(this.domNode).closest(".mx-dataview")[0];
            if (dvNode)
                this.dataView = dijit.byNode(dvNode); // data view for conditional visible buttons

            if (this.hideUnusableButtons) {
                this.setupControlbarButtonVisibility();
            }
            this.loaded();
        },

        // ---------------------------------------------------------------------
        // Section for Controlbar Button Visibility
        // ---------------------------------------------------------------------

        setupControlbarButtonVisibility: function() {
            // Append empty div, so height is not bar is not collapsing (issue does not apply when there multiple lines of buttons
            if (this.grid.toolBarNode.childNodes[0]) { // has buttons
                var spacer = mxui.dom.create("div", {
                    class: "hightSpacer mx-button",
                    style: "height:" + this.grid.toolBarNode.childNodes[0].clientHeight + "px; width:1px; display: inline-block;"
                });
                this.grid.toolBarNode.appendChild(spacer);
            }

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
                                    if (action.params[key].applyTo && (action.params[key].applyTo === "selectionset" || action.params[key].applyTo === "selection")) {
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
                            if (action.actionCall === "SelectPage") {
                                this.hideOnEmptyButtons.push(this.grid.toolBarNode.childNodes[i]);
                                this.selectAllButtons.push(this.grid.toolBarNode.childNodes[i]);
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

            this.connect(this.dataView, "applyConditions", this.selectChangeControlBarButtons); // for conditional views            
        },

        checkVisable: function(node) {
            // check Conditional view By modeller on data view
            if (this.dataView) {

                var cf = this.dataView.getCFAction ? [this.dataView.getCFAction(node)] : this.dataView.getCFActions(node);

                for (var i = 0; i < cf.length; i++) {
                    if (cf[i] === "hide") {
                        return false;
                    }
                }
                return true;
            } else {
                return true;
            }
        },

        selectChangeControlBarButtons: function() {
            var countSelected = 0;
            
            if(this.grid.hasOwnProperty("_selectedGuids")){
                if (this.grid._selectedGuids) // before mx 5.11 
                    countSelected = this.grid._selectedGuids.length; 
            } else {
                if (this.grid.selection)    // from mx 5.11
                    countSelected = this.grid.selection.length;
            }
            
            var gridSize = this.grid.getCurrentGridSize ? this.grid.getCurrentGridSize() : 
                    this.grid.hasOwnProperty("_selectedGuids") ?  this.grid._datagrid.getCurrentGridSize() :
                    this.grid.hasOwnProperty("_dataSource") ? this.grid._dataSource.getSetSize() : 0;
            
            if (countSelected > 0) {
                // show the buttons that need a row selection
                for (var i = 0; i < this.selectionButtons.length; i++) {
                    if (this.checkVisable(this.selectionButtons[i])) {
                        dojo.style(this.selectionButtons[i], "display", "inline-block");
                    }
                }
                // hide buttons that should not be shown on selection
                for (var i = 0; i < this.nonSelectionButtons.length; i++) {
                    dojo.style(this.nonSelectionButtons[i], "display", "none");
                }
                if (gridSize === countSelected) {
                    for (var i = 0; i < this.selectAllButtons.length; i++) {
                        dojo.style(this.selectAllButtons[i], "display", "none");
                    }
                }

            } else {
                // hide buttons that need a selection.
                for (var i = 0; i < this.selectionButtons.length; i++) {
                    dojo.style(this.selectionButtons[i], "display", "none");
                }
                // show buttons that are marked to display only when no row is selected.
                for (var i = 0; i < this.nonSelectionButtons.length; i++) {
                    if (this.checkVisable(this.nonSelectionButtons[i])) {
                        dojo.style(this.nonSelectionButtons[i], "display", "inline-block");
                    }
                }
                if (gridSize === 0) {
                    for (var i = 0; i < this.setButtons.length; i++) {
                        dojo.style(this.setButtons[i], "display", "none");
                    }
                    for (var i = 0; i < this.hideOnEmptyButtons.length; i++) {
                        dojo.style(this.hideOnEmptyButtons[i], "display", "none");
                    }
                    for (var i = 0; i < this.showOnEmptyButtons.length; i++) {
                        if (this.checkVisable(this.showOnEmptyButtons[i])) {
                            dojo.style(this.showOnEmptyButtons[i], "display", "inline-block");
                        }
                    }
                } else {
                    // when grid has record show set buttons
                    for (var i = 0; i < this.setButtons.length; i++) {
                        if (this.checkVisable(this.setButtons[i])) {
                            dojo.style(this.setButtons[i], "display", "inline-block");
                        }
                    }
                    for (var i = 0; i < this.hideOnEmptyButtons.length; i++) {
                        if (this.checkVisable(this.hideOnEmptyButtons[i])) {
                            dojo.style(this.hideOnEmptyButtons[i], "display", "inline-block");
                        }
                    }
                    for (var i = 0; i < this.showOnEmptyButtons.length; i++) {
                        dojo.style(this.showOnEmptyButtons[i], "display", "none");
                    }
                }
            }
        }

    });
});

//@ sourceURL=widgets/DataGridExtension/widget/ToolbarButtons.js
