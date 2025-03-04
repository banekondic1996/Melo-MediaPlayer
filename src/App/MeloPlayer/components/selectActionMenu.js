class SelectActionMenu {
    constructor(id, options, onSelect,actionName,confirmName,actionBtnBool,appendElement) {
        this.id = id;
        this.options = options;
        this.onSelect = onSelect; // Function to execute when "SelectActionAction" is clicked
        this.actionName=actionName;
        this.confirmName=confirmName;
        this.actionBtnBool=actionBtnBool;
        this.appendElement=appendElement;
        this.createMenu();
    }
    createMenu() {
        // Create menu container
        this.dialog = document.createElement("div");
        this.dialog.className = "inputDialog";
        this.dialog.id = this.id;
        this.dialog.style.display="none";
        // Create label
        const label = document.createElement("label");
        label.innerText = this.actionName;
        label.style.paddingBottom = "2px";
        if(typeof this.appendElement=='undefined'){
        // Create dropdown
        this.selectAction = document.createElement("select");
        this.selectAction.id="presetSelectID";
        this.selectAction.style.width = "150px";
        this.selectAction.style.height = "40px";
        this.selectAction.style.marginBottom = "10px";
        this.selectAction.style.borderRadius = "5px";
        // Populate options dynamically
        this.options.forEach(option => {
            const opt = document.createElement("option");
            opt.value = option.value;
            opt.textContent = option.label;
            this.selectActionn.appendChild(opt);
        });
        this.dialog.appendChild(label);
        this.dialog.appendChild(this.selectAction);
        }
        else{
            this.dialog.appendChild(this.appendElement);
        }
        // Create Convert button
        const actionBtn = document.createElement("input");
        actionBtn.type = "button";
        actionBtn.value = this.confirmName;
        actionBtn.style.height = "40px";
        actionBtn.style.borderRadius = "10px";
        actionBtn.onclick = () => {
            if (this.onConvert) {
                this.onConvert(this.select.value);
            }
                this.hide();
        };
         // Create Close button
         const closeBtn = document.createElement("input");
         closeBtn.type = "button";
         closeBtn.value = "Close";
         closeBtn.style.height = "40px";
         closeBtn.style.borderRadius = "10px";
         closeBtn.onclick = () => this.hide();
        // Create Button container
        const btnContainer = document.createElement("div");
        btnContainer.style = "text-align: center;";
        //Append to document
         if(this.actionBtnBool){btnContainer.appendChild(actionBtn)};
         btnContainer.appendChild(closeBtn);
         this.dialog.appendChild(btnContainer);
        // Add menu to body
        document.body.appendChild(this.dialog);
    }

    show() {
        this.dialog.style.display = "flex";
    }

    hide() {
        this.dialog.style.display = "none";
    }
}

const presetMenu = new SelectActionMenu("presetMenuID", [], () => {
    console.log("Preset applied");
},"Select preset:","Select",false);


//Load presets into Select list
let presets=[];
Object.assign(presets, butterchurnPresets.getPresets());
presetKeys = Object.keys(presets);
presetIndex = Math.floor(Math.random() * presetKeys.length);
var presetSelectEl = document.getElementById('presetSelectID');
for(var i = 0; i < presetKeys.length; i++) {
    var opt = document.createElement('option');
    opt.innerHTML = presetKeys[i].substring(0,60) + (presetKeys[i].length > 60 ? '...' : '');
    opt.value = i;
    presetSelectEl.appendChild(opt);
}
presetSelectEl.value=94;
presetSelectEl.onclick=()=>{console.log("Preset applied :"+presetKeys[presetSelectEl.value]);visualizer.loadPreset(presets[presetKeys[presetSelectEl.value]], 5.7);};
