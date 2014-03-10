// wrapped by build app
define("mxui/widget/plugins/DataGrid/FlexHeader", ["dijit","dojo","dojox","dojo/require!mxui/widget/DataGrid"], function(dijit,dojo,dojox){
/*
Class: mxui.widget.plugins.DataGrid.FlexHeader

Author: michiel.kalkman@mendix.com

Parameters: None.

Description:


*/

dojo.provide("mxui.widget.plugins.DataGrid.FlexHeader");
dojo.require("mxui.widget.DataGrid");

if (!mxui.widget.plugins) {
    mxui.widget.plugins = {};
}

if (!mxui.widget.plugins.DataGrid) {
    mxui.widget.plugins.DataGrid = {};
}

mxui.widget.plugins.DataGrid.FlexHeader = function(kwArgs) {

    var name       = "mxui.widget.plugins.DataGrid.FlexHeader";

    //
    // Function caches
    //

    var hitch      = dojo.hitch;
    var findChild  = mxui.dom.getFirstChild;
    var findParent = mxui.dom.getAncestorNode;

    var state      = {
        node      : null,
        row       : -1
    };

    var grid         = kwArgs.parent;  // Grid reference
    var config       = kwArgs.config;  // Config parameters - currently not used here.

    if (grid && (grid.declaredClass != "mxui.widget.DataGrid")) {
        logger.error(name + ".initialize : can only register to DataGrid!");
    } else {

    }

    //
    // The grid events we are interested in and our corresponding event
    // handlers
    //

    var registrations = {
        onLoad        : "plugineventOnLoad",
        //onRefresh     : "plugineventOnRefresh",
        //onDestroy     : "plugineventOnDestroy"
    }

    //////////////////////////////////////////////
    //
    // Local shorthand functions
    //


    var focusFirstRow = function() {

        if (grid.getCurrentGridSize() == 0) {
            return;
        }

        //
        // First time this function runs we have no state, so just use the first
        // key
        //

        var node = grid.getCellNode(0, state.datakey || firstGridKey);
        if (node) {
            editNode(node);
        }
    }

    var moveToPreviousRow = function() {
        if (state.row != 0) {
             var node = grid.getCellNode((state.row - 1), state.datakey);
             setNode(node);
        }
    }

    var moveToNextRow = function() {
        makeChange() && saveAndCommitMxObject();
        if (state.row != (state.gridsize - 1)) {
            var node = grid.getCellNode((state.row + 1), state.datakey);
            if (node && (node != state.node)) {
                setNode(node);
            }
        }
    }

    //
    // End local shorthand functions
    //
    //////////////////////////////////////////////

    //////////////////////////////////////////////
    //
    // Event handlers for Grid events
    //

    this.plugineventOnLoad = function(e) {
        alert('plugineventOnLoad Flex Header Loaded');
        //setFirstCell();
    }

    this.plugineventOnDestroy = function(e) {

        this.destroy();
    }

    this.plugineventOnRefresh = function(e) {

        setFirstCell();
    }

    this.plugineventCellClicked = function(e) {

        setNode(e.target, true);
    }

    //
    // End event handlers for Grid events
    //
    //////////////////////////////////////////////

    //////////////////////////////////////////////
    //
    // Event handlers for editor events
    //

    this.focusKeyHandler = function(event) {


        var keycode = event.keyCode;

        switch(keycode) {
            case 33: // Page up
                grid.goToPreviousPage(editFirstCell);
            break;
            case 34: // Page down
                grid.goToNextPage(editFirstCell);
            break;
            case 35: // End
                grid.goToLastPage(editFirstCell);
            break;
            case 36: // Home
                grid.goToFirstPage(editFirstCell);
            break;
//             case 37: // Left arrow
//                 moveToPreviousCell();
//             break;
            case 38: // Up arrow
                moveToPreviousRow();
            break;
            case 9:  // Tab
                event.stopPropagation();
                event.preventDefault();
//             case 39: // Right arrow
//                 moveToNextCell();
//             break;
            case 40: // Down arrow
                moveToNextRow();
            break;
        }

        return false;
    }

    //
    // End event handlers for editor events
    //
    //////////////////////////////////////////////

    this.destroy = function() {

        try {
            for (var i in references) {
                references[i].source.destroy();
            }
            references = null;
        } catch(e) {

        }
        grid = null;
    }




    for (var i in registrations) {
        grid.registerToPluginEvent(i, hitch(this, registrations[i]));
    }

}

});