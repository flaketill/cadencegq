class Modal extends ElemJS {
    constructor(titleText) {
        super("div");
        this.titleText = titleText;
        this.body = null;
        this.class("modal");
        q("body").style.overflow = "hidden";
        document.body.appendChild(this.element);
    }
    generateBase() {
        this.clearChildren();
        this.body = new ElemJS("div").class("modal-body");
        this.child(
            new ElemJS("section").class("modal-child")
            .child(
                new ElemJS("header").text(this.titleText)
            ).child(
                this.body
            )
        )
    }
    dismiss() {
        q("body").style.overflow = "";
        this.element.remove();
    }
}

class MessageModal extends Modal {
    constructor(titleText, bodyText, buttonText) {
        super(titleText);
        this.bodyText = bodyText;
        this.buttonText = buttonText || "OK";
        this.displayButtons = !!buttonText;
        this.render();
    }
    setState(data) {
        Object.assign(this, data);
        this.render();
        return this;
    }
    render() {
        this.generateBase();
        this.body.child(
            new ElemJS("div")
            .class("modal-expand")
            .text(this.bodyText)
        ).child(
            this.displayButtons &&
            new ElemJS("div")
            .class("modal-buttons")
            .child(
                new ElemJS("button")
                .text(this.buttonText)
                .direct("onclick", this.dismiss.bind(this))
            )
        )
    }
}

class ExportTypeModal extends Modal {
    constructor(callback) {
        super("Select export format");
        this.callback = callback;
        this.formats = [
            {
                name: "CloudTube/Invidious",
                generate: () => ({
                    subscriptions: lsm.array("subscriptions").array,
                    watch_history: lsm.get("trackWatchedVideos") == "1" ? lsm.array("watchedVideos").array : [],
                    preferences: []
                })
            },{
                name: "NewPipe",
                generate: () => new Promise(resolve => {
                    let subsObject = {};
                    if (lsm.get("token")) {
                        subsObject.token = lsm.get("token");
                    } else {
                        subsObject.subscriptions = lsm.array("subscriptions").array;
                    }
                    let messageModal = new MessageModal("Exporting...", "Downloading current subscription data...");
                    request("/api/youtube/subscriptions", result => {
                        let data = JSON.parse(result.responseText);
                        messageModal.setState({
                            titleText: "Export complete",
                            bodyText:
                                "Importing into NewPipe can sometimes create duplicate channels. "+
                                "After you import, be sure to check your subscription list and remove any duplicates.",
                            displayButtons: true
                        });
                        resolve({
                            app_version: "0.16.1",
                            app_version_int: 730,
                            subscriptions: data.channels.map(channel => ({
                                service_id: 0,
                                url: "https://www.youtube.com/channel/"+channel.authorID,
                                name: channel.author
                            }))
                        });
                    }, subsObject);
                })
            }
        ]
        this.render();
    }
    render() {
        this.generateBase();
        this.select = new ElemJS("select");
        this.select.attribute("autocomplete", "off");
        this.formats.forEach(format => {
            let option = new ElemJS("option");
            option.text(format.name);
            option.format = format;
            this.select.child(option);
        });
        this.body.child(
            new ElemJS("div")
            .class("modal-expand")
            .child(this.select)
        ).child(
            new ElemJS("div")
            .class("modal-buttons")
            .child(
                new ElemJS("button")
                .text("Export")
                .direct("onclick", this.export.bind(this))
            ).child(
                new ElemJS("button")
                .text("Cancel")
                .direct("onclick", this.cancel.bind(this))
            )
        )
    }
    cancel() {
        this.callback(null);
        this.dismiss();
    }
    export() {
        let format = this.select.element.selectedOptions[0].js.format;
        let generatorResult = format.generate();
        new Promise(resolve => {
            if (generatorResult.constructor.name == "Promise") generatorResult.then(resolve);
            else resolve(generatorResult);
        }).then(result => {
            this.callback(result);
            this.dismiss();
        });
    }
}