/* Toolbar.js
 * Buttons that go under the PlayCanvas.
 */
 
import { Dom } from "/js/service/Dom.js";

export class Toolbar {

  static getDependencies() {
    return [HTMLElement, Dom];
  }
  constructor(element, dom) {
    this.element = element;
    this.dom = dom;
    
    /* Assign delegate directly.
     * Must not be null but all members are optional:
     * {
     *   onUndo()
     *   onRedo()
     *   onClear()
     *   onSetColor(cssColorString)
     *   onSetLineWidth(int)
     *   onSetTool(name)
     *   onCaption()
     * TODO Caption size
     * TODO Caption position
     * }
     */
    this.delegate = {};
    
    this.buildUi();
  }
  
  /* UI
   ***********************************************************/
   
  buildUi() {
    this.element.innerHTML = "";
    this.addButton("Undo", () => this.onUndo());
    this.addButton("Redo", () => this.onRedo());
    this.addButton("Clear", () => this.onClear());
    this.addColorPalette("#ffffff");
    this.addColorPalette("#000000");
    this.addColorPalette("#ff0000");
    this.addColorPalette("#008000");
    this.addColorPalette("#0000ff");
    this.addColorPalette("#ffff00");
    this.addColorPalette("#ff8000");
    this.addColorPalette("#00ffff");
    this.addColorPalette("#808080");
    this.addButton("Caption", () => this.onCaption());
  }
  
  addButton(label, callback) {
    const button = this.dom.spawn(this.element, "INPUT", null, { type: "button", value: label });
    button.addEventListener("click", callback);
    return button;
  }
  
  addColorPalette(color) {
    const button = this.dom.spawn(this.element, "INPUT", null, {
      type: "button",
      style: `background-color: ${color}`,
    });
    button.addEventListener("click", () => this.onSetColor(color));
    return button;
  }
  
  /* Events.
   *********************************************************/
   
  onUndo() {
    if (!this.delegate.onUndo) return;
    this.delegate.onUndo();
  }
  
  onRedo() {
    if (!this.delegate.onRedo) return;
    this.delegate.onRedo();
  }
  
  onClear() {
    if (!this.delegate.onClear) return;
    this.delegate.onClear();
  }
  
  onCaption() {
    if (!this.delegate.onCaption) return;
    this.delegate.onCaption();
  }
  
  onSetColor(color) {
    if (!this.delegate.onSetColor) return;
    this.delegate.onSetColor(color);
  }
   
}
