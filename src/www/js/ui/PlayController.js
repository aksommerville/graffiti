/* PlayController.js
 */
 
import { Dom } from "/js/service/Dom.js";
import { BackgroundImageService } from "/js/service/BackgroundImageService.js";
import { PlayCanvas } from "/js/ui/PlayCanvas.js";
import { Toolbar } from "/js/ui/Toolbar.js";
import { RoomService } from "/js/service/RoomService.js";

export class PlayController {

  static getDependencies() {
    return [HTMLElement, Dom, BackgroundImageService, Window, RoomService];
  }
  constructor(element, dom, backgroundImageService, window, roomService) {
    this.element = element;
    this.dom = dom;
    this.backgroundImageService = backgroundImageService;
    this.window = window;
    this.roomService = roomService;
    
    this.playCanvas = null;
    this.toolbar = null;
    this.backgroundImageUrl = "";
    
    this.buildUi();
    
    this.onRoomChanged(this.roomService.room);
    this.roomService.listen((room) => this.onRoomChanged(room));
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
  
  onRoomChanged(room) {
    const backgroundImageUrl = room ? room.backgroundImageUrl : "";
    if (backgroundImageUrl !== this.backgroundImageUrl) {
      this.backgroundImageUrl = backgroundImageUrl;
      if (this.backgroundImageUrl) {
        this.backgroundImageService.loadImageFromUrl(this.backgroundImageUrl).then((image) => {
          this.playCanvas.setBackgroundImage(image);
        });
      } else {
        this.playCanvas.setBackgroundImage(null);
      }
    }
  }
   
}
