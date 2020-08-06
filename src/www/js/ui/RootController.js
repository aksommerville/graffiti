/* RootController.js
 */
 
import { Dom } from "/js/service/Dom.js";
import { PlayCanvas } from "/js/ui/PlayCanvas.js";
import { BackgroundImageService } from "/js/service/BackgroundImageService.js";

export class RootController {

  static getDependencies() {
    return [HTMLElement, Dom, BackgroundImageService];
  }
  constructor(element, dom, backgroundImageService) {
    this.element = element;
    this.dom = dom;
    this.backgroundImageService = backgroundImageService;
    
    this.playCanvas = null;
    
    this.buildUi();
    
    this.backgroundImageService.loadRandomImage().then(
      (image) => this.playCanvas.setBackgroundImage(image)
    ).catch(
      (error) => console.error(error)
    );
  }
  
  /* UI.
   *************************************************************/
  
  buildUi() {
    this.playCanvas = this.dom.spawnController(this.element, PlayCanvas);
    
    const toolbar = this.dom.spawn(this.element, "DIV", ["toolbar"]);
    
    this.dom.spawn(toolbar, "INPUT", null, { type: "button", value: "Undo" }).addEventListener("click", () => this.onUndo());
    this.dom.spawn(toolbar, "INPUT", null, { type: "button", value: "Redo" }).addEventListener("click", () => this.onRedo());
    this.dom.spawn(toolbar, "INPUT", null, { type: "button", value: "Clear" }).addEventListener("click", () => this.onClear());
    
    this.dom.spawn(toolbar, "INPUT", null, {
      type: "button",
      style: "background-color: #ffffff",
    }).addEventListener("click", (event) => this.onPaletteClick(event));
    this.dom.spawn(toolbar, "INPUT", null, {
      type: "button",
      style: "background-color: #000000",
    }).addEventListener("click", (event) => this.onPaletteClick(event));
    this.dom.spawn(toolbar, "INPUT", null, {
      type: "button",
      style: "background-color: #ff0000",
    }).addEventListener("click", (event) => this.onPaletteClick(event));
    this.dom.spawn(toolbar, "INPUT", null, {
      type: "button",
      style: "background-color: #008000",
    }).addEventListener("click", (event) => this.onPaletteClick(event));
    this.dom.spawn(toolbar, "INPUT", null, {
      type: "button",
      style: "background-color: #0000ff",
    }).addEventListener("click", (event) => this.onPaletteClick(event));
  }
  
  /* Events.
   **************************************************************/
   
  onUndo() {
    this.playCanvas.undo();
  }
  
  onRedo() {
    this.playCanvas.redo();
  }
  
  onClear() {
    this.playCanvas.clear();
  }
  
  onPaletteClick(event) {
    this.playCanvas.setColor(event.target.style.backgroundColor);
  }
  
}
