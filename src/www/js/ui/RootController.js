/* RootController.js
 */
 
import { Dom } from "/js/service/Dom.js";
import { PlayCanvas } from "/js/ui/PlayCanvas.js";
import { Toolbar } from "/js/ui/Toolbar.js";
import { BackgroundImageService } from "/js/service/BackgroundImageService.js";

export class RootController {

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
    this.toolbar = this.dom.spawnController(this.element, Toolbar);
    this.toolbar.delegate = this;
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
    if (!text) return;
    this.playCanvas.setCaption(text);
  }
  
}
