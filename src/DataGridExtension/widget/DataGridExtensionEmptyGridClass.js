define([
    "dojo/_base/declare",
    "mxui/widget/_WidgetBase",
    "dijit/registry",
    "dojo/aspect",
    "dojo/_base/lang",
    "dojo/dom-class" ],
    function(declare, _WidgetBase, registry, aspect, lang, dojoClass) {
        "use strict";

        return declare("DataGridExtension.widget.DataGridExtensionEmptyGridClass", [ _WidgetBase ], {
            gridName: "",
            targetElementClass: "",
            emptyClass: "",
            grid: null,

            postCreate: function() {
                try {
                    var domList = document.getElementsByClassName("mx-name-" + this.gridName);

                    if (domList.length > 0) {
                        this.grid = registry.byNode(domList[domList.length - 1]);
                    }

                    if (!this.grid) {
                        this.showError("Error: unable to find grid with name " + this.gridName);
                        return;
                    }

                    if (this.grid.declaredClass === "mxui.widget.ReferenceSetSelector") {
                        this.grid = this.grid._datagrid;
                    }

                    aspect.after(this.grid, "fillGrid", lang.hitch(this, this.updateEmptyTable));
                } catch (error) {
                    this.showError("error in create widget:" + error.message);
                }
            },

            showError: function(msg) {
                logger.error(msg);
                this.domNode.appendChild(mxui.dom.create("div", {
                    style: "color:red"
                }, msg));
            },

            updateEmptyTable: function() {
                if (this.grid !== null) {
                    var gridSize = this.grid.getCurrentGridSize
                        ? this.grid.getCurrentGridSize()
                        : this.grid._dataSource.getObjects().length;
                    if (gridSize === 0) {
                        this.setClass();
                    } else {
                        this.removeClass();
                    }
                }
            },

            setClass: function() {
                var targets = document.getElementsByClassName(this.targetElementClass);
                for (var i = 0; i < targets.length; i++) {
                    dojoClass.add(targets[i], this.emptyClass);
                }
            },

            removeClass: function() {
                var targets = document.getElementsByClassName(this.targetElementClass);
                for (var i = 0; i < targets.length; i++) {
                    dojoClass.remove(targets[i], this.emptyClass);
                }
            }

        });
    });

// @ sourceURL=widgets/DataGridExtension/widget/DataGridExtensionEmptyGridClass.js
