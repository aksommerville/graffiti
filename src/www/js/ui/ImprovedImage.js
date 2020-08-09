/* ImprovedImage.js
 */
 
import { Dom } from "/js/service/Dom.js";
import { PaintService } from "/js/service/PaintService.js";
import { BackgroundImageService } from "/js/service/BackgroundImageService.js";
import { PlayCanvas } from "/js/ui/PlayCanvas.js";

export class ImprovedImage {

  static getDependencies() {
    return [HTMLElement, Dom, PaintService, BackgroundImageService];
  }
  constructor(element, dom, paintService, backgroundImageService) {
    this.element = element;
    this.dom = dom;
    this.paintService = paintService;
    this.backgroundImageService = backgroundImageService;
    
    this.userId = "";
    this.serial = "";
    this.playCanvas = null;
    
    this.buildUi();
  }
  
  replaceImprovement(serial) {
    if (serial === this.serial) return;
    this.serial = serial || "";
    this.composeImage();
  }
  
  /* UI
   ************************************************************/
   
  buildUi() {
    this.element.innerHTML = "";
    this.playCanvas = this.dom.spawnController(this.element, PlayCanvas);
    this.playCanvas.setInteractive(false);
  }
  
  composeImage() {
    this.playCanvas.decode(this.serial);
  }
  
}
