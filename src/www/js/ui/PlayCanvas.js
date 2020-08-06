/* PlayCanvas.js
 */
 
import { PaintService } from "/js/service/PaintService.js";
 
export class PlayCanvas {

  static getDependencies() {
    return [HTMLCanvasElement, Window, PaintService];
  }
  constructor(element, window, paintService) {
    this.element = element;
    this.window = window;
    this.paintService = paintService;
    
    this.mouseMoveListener = null;
    this.mouseUpListener = null;
    this.element.addEventListener("mousedown", (event) => this.onMouseDown(event));
    this.recentMouse = null; // [x,y] in canvas space
    this.renderTimeout = null;
    this.renderDebounceTime = 100;
    this.backgroundImage = null;
    
    this.initializeCanvas();
  }
  
  onDetachFromDom() {
    this.removeMouseListeners();
  }
  
  initializeCanvas() {
    this.element.width = 800;
    this.element.height = 600;
    this.paintService.setBounds(this.element.width, this.element.height);
    this.renderLater();
  }
  
  /* Controls from parent.
   ********************************************************************/
   
  undo() {
    if (!this.paintService.undo()) return false;
    this.renderLater();
    return true;
  }
  
  redo() {
    if (!this.paintService.redo()) return false;
    this.renderLater();
    return true;
  }
  
  clear() {
    if (!this.paintService.clear()) return false;
    this.renderLater();
    return true;
  }
  
  setColor(color) {
    this.paintService.setColor(color);
  }
  
  setBackgroundImage(image) {
    this.backgroundImage = image;
    this.renderLater();
  }
  
  /* Render.
   * TODO Mostly not my problem. Only thing we should do is the debounce.
   ********************************************************************/
   
  renderLater() {
    if (this.renderTimeout) return;
    this.renderTimeout = this.window.setTimeout(() => this.renderNow(), this.renderDebounceTime);
  }
  
  renderNow() {
    this.renderTimeout = null;
    const context = this.element.getContext("2d");
    
    if (this.backgroundImage) {
      context.drawImage(this.backgroundImage, 0, 0, this.element.width, this.element.height);
    } else {
      context.fillStyle = "#000000";
      context.fillRect(0, 0, this.element.width, this.element.height);
    }
    
    this.paintService.render(context);
  }
  
  /* Coordinates.
   *********************************************************************/
   
  transformCanvasFromEvent(event) {
    const bounds = this.element.getBoundingClientRect();
    return [
      Math.round(((event.x - bounds.left) * this.element.width) / bounds.width),
      Math.round(((event.y - bounds.top) * this.element.height) / bounds.height),
    ];
  }
  
  /* Events.
   ********************************************************************/
   
  removeMouseListeners() {
    if (this.mouseMoveListener) {
      this.window.removeEventListener("mousemove", this.mouseMoveListener);
      this.mouseMoveListener = null;
    }
    if (this.mouseUpListener) {
      this.window.removeEventListener("mouseup", this.mouseUpListener);
      this.mouseUpListener = null;
    }
  }
  
  onMouseMove(event) {
    const canvasPoint = this.transformCanvasFromEvent(event);
    if ((canvasPoint[0] === this.recentMouse[0]) && (canvasPoint[1] === this.recentMouse[1])) return;
    this.recentMouse = canvasPoint;
    this.paintService.continueStroke(canvasPoint);
    this.renderLater();
  }
  
  onMouseUp(event) {
    if (event.button !== 0) return;
    const canvasPoint = this.transformCanvasFromEvent(event);
    this.paintService.endStroke(canvasPoint);
    this.renderLater();
    this.removeMouseListeners();
  }
   
  onMouseDown(event) {
    if (event.button !== 0) return;
    if (this.mouseMoveListener || this.mouseUpListener) return;
    this.mouseMoveListener = (event) => this.onMouseMove(event);
    this.window.addEventListener("mousemove", this.mouseMoveListener);
    this.mouseUpListener = (event) => this.onMouseUp(event);
    this.window.addEventListener("mouseup", this.mouseUpListener);
    const canvasPoint = this.transformCanvasFromEvent(event);
    this.recentMouse = canvasPoint;
    this.paintService.beginStroke(canvasPoint);
    this.renderLater();
  }
  
}

PlayCanvas.tagName = "CANVAS";
