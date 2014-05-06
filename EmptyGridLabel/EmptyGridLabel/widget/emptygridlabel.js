dojo.provide("EmptyGridLabel.widget.emptygridlabel");

(function () {

    var widget = {
        addons: [dijit._Contained, mendix.addon._Contextable],

        inputargs: {
            onclickmf: "",
            buttonIcon: "",
            showAsButton: "",
            caption: ""
        },

        //Caches
        dynamicButton: null,
        grid: null,
        dataobject: null,
        fillHandler: null,

        postCreate: function () {
            dojo.addClass(this.domNode, "EmptyGridLabel");
            try {
                colindex = this.domNode.parentNode.cellIndex;
                this.grid = dijit.findWidgets(this.domNode.parentNode.parentNode.previousSibling.cells[colindex])[0];
                this.connect(this.grid, "fillGrid", this.performUpdate); //TODO: monkeypatching. Should be a nice pluginevent in Mendix 3.0.x
            } catch (e) {}

            if (this.grid === null) {
                this.caption = "Error: unable to find grid. Is the widget placed in a row underneath a grid?";
                this.showButton();
            }

            this.loaded();
        },

        showButton: function () {
            this.hideButton();

            this.dynamicButton = new mxui.widget._Button({
                caption: mxui.dom.escapeHTML(this.caption),
                iconUrl: this.buttonIcon,
                onClick: dojo.hitch(this, this.onclickEvent),
                renderType: this.showAsButton.toLowerCase(),
                cssclass: ""
            });

            this.domNode.appendChild(this.dynamicButton.domNode);
        },

        hideButton: function () {
            dojo.empty(this.domNode);
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

        performUpdate: function () {
            if (this.grid !== null) {
                var size = (this.grid.getCurrentGridSize ? this.grid.getCurrentGridSize() : this.grid._datagrid.getCurrentGridSize());
                if (size === 0)
                    this.showButton();
                else
                    this.hideButton();
            }
        },

        applyContext: function (context, callback) {
            if (context && context.getTrackID() !== "") {
                this.dataobject = context;
            }
            callback && callback();
        }
    };

    mxui.widget.declare("EmptyGridLabel.widget.emptygridlabel", widget);
    mxui.widget.declare("EmptyGridLabel.widget.emptygridlabelnocontext", widget);
})();