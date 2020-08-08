/* PlayController.js
 */
 
import { Dom } from "/js/service/Dom.js";
import { BackgroundImageService } from "/js/service/BackgroundImageService.js";
import { PlayCanvas } from "/js/ui/PlayCanvas.js";
import { Toolbar } from "/js/ui/Toolbar.js";

export class PlayController {

  static getDependencies() {
    return [HTMLElement, Dom, BackgroundImageService, Window];
  }
  constructor(element, dom, backgroundImageService, window) {
    this.element = element;
    this.dom = dom;
    this.backgroundImageService = backgroundImageService;
    this.window = window;
    
    this.playCanvas = null;
    this.toolbar = null;
    
    this.buildUi();
    
    //XXX get from room service
    this.backgroundImageService.loadRandomImage().then((image) => {
      this.playCanvas.setBackgroundImage(image);
    });
  }
  
  /* UI
   *********************************************************/
   
  buildUi() {
    this.element.innerHTML = "";
    this.playCanvas = this.dom.spawnController(this.element, PlayCanvas);
    this.toolbar = this.dom.spawnController(this.element, Toolbar);
    this.toolbar.delegate = this;
  }
  
  /* Events
   ***********************************************************/
     
  onUndo() {
    this.playCanvas.undo();
  }
  
  onRedo() {
    this.playCanvas.redo();
  }
  
  onClear() {
    this.playCanvas.clear();
  }
  
  onSetColor(color) {
    this.playCanvas.setColor(color);
  }
  
  onSetLineWidth(width) {
    this.playCanvas.setLineWidth(width);
  }
  
  onSetTool(tool) {
    this.playCanvas.setTool(tool);
  }
  
  onCaption() {
    const text = this.window.prompt("Caption:", this.playCanvas.caption);
    if (typeof(text) !== "string") return;
    this.playCanvas.setCaption(text);
  }
   
}
