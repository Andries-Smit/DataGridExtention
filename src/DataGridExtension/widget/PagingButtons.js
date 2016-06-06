//----------------------------------------------------------------------
// Section for dynamic showing paging and Empty table 
//----------------------------------------------------------------------
define([
    "dojo/_base/declare",
    "mxui/widget/_WidgetBase"
], function(declare, _WidgetBase) {
    //"use strict";
    
    return declare(null, {
        inputargs: {
            hideUnusedPaging: false,
            firstLastMinPages: 3
        },

        checkConfigPagingButtons: function() {

        },

        postCreatePagingButtons: function() {
            this.checkConfigPagingButtons();

            if (this.hideUnusedPaging) {
                this.connect(this.grid, "fillGrid", this.updatePaging);
            }
            //this.loaded();
        },

        updatePaging: function() {
            if (this.grid !== null) {
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
        }
    });
});

//@ sourceURL=widgets/DataGridExtension/widget/PagingButtons.js