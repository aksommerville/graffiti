/* PlayCanvas.js
 */
 
import { PaintService } from "/js/service/PaintService.js";
import { BackgroundImageService } from "/js/service/BackgroundImageService.js";
 
export class PlayCanvas {

  static getDependencies() {
    return [HTMLCanvasElement, Window, PaintService, "discriminator", BackgroundImageService];
  }
  constructor(element, window, paintService, discriminator, backgroundImageService) {
    this.element = element;
    this.window = window;
    this.paintService = paintService;
    this.discriminator = discriminator;
    this.backgroundImageService = backgroundImageService;
    
    this.mouseMoveListener = null;
    this.mouseUpListener = null;
    this.element.addEventListener("mousedown", (event) => this.onMouseDown(event));
    this.recentMouse = null; // [x,y] in canvas space
    this.renderTimeout = null;
    this.renderDebounceTime = 100;
    this.backgroundImage = null;
    this.caption = "";
    this.interactive = true;
    
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
  
  setTool(tool) {
    this.paintService.setTool(tool);
  }
  
  setLineWidth(width) {
    this.paintService.setLineWidth(width);
  }
  
  setCaption(caption) {
    if (!this.interactive) return;
    this.caption = caption;
    this.renderLater();
  }
  
  setBackgroundImage(image) {
    this.backgroundImage = image;
    this.renderLater();
  }
  
  setInteractive(interactive) {
    if (interactive) {
      if (this.interactive) return;
      this.interactive = true;
    } else {
      if (!this.interactive) return;
      this.interactive = false;
      if (this.mouseUpListener) {
        this.onMouseUp(null);
      }
    }
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
    if (!this.element) return;
    const context = this.element.getContext("2d");
    
    if (this.backgroundImage) {
      context.drawImage(this.backgroundImage, 0, 0, this.element.width, this.element.height);
    } else {
      context.fillStyle = "#000000";
      context.fillRect(0, 0, this.element.width, this.element.height);
    }
    
    this.paintService.render(context);
    
    if (this.caption) {
      const bottomMargin = 20;
      context.textAlign = "center";
      context.font = "24pt serif";
      context.fillStyle = "#ffffff";
      context.strokeStyle = "#000000";
      context.lineWidth = 6;
      context.strokeText(this.caption, this.element.width / 2, this.element.height - bottomMargin);
      context.fillText(this.caption, this.element.width / 2, this.element.height - bottomMargin);
    }
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
    if (event && (event.button !== 0)) return;
    const canvasPoint = event ? this.transformCanvasFromEvent(event) : this.recentMouse;
    this.paintService.endStroke(canvasPoint);
    this.renderLater();
    this.removeMouseListeners();
  }
   
  onMouseDown(event) {
    if (!this.interactive) return;
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
  
  /* Encode
   **********************************************************/
   
  encode() {
    const actions = [];
    
    if (this.backgroundImage) {
      const url = this.backgroundImage.getAttribute("permanent-url");
      if (url) {
        actions.push(`bg ${url}`);
      }
    }
    
    for (const action of this.paintService.actions) {
      const serial = this.encodeAction(action);
      if (serial) actions.push(serial);
    }
    
    if (this.caption) {
      actions.push(`caption ${JSON.stringify(this.caption)}`);
    }
    
    return actions.join("\n");
  }
  
  encodeAction(action) {
    switch (action[0]) {
    
      case "pencil": return action.toString().replace(/,/g, " "); // "pencil COLOR WIDTH X0 Y0 ... Xn Yn"
    
      default: console.error(`No encoder for action '${action[0]}'`);
    }
  }
  
  /* Decode.
   * This discards any existing content.
   *********************************************************/
   
  decode(serial) {

    this.paintService.actions = [];
    this.backgroundImage = null;
    this.caption = "";
    
    for (let p=0; p<serial.length; ) {
      let nlp = serial.indexOf("\n", p);
      if (nlp < 0) nlp = serial.length;
      const command = serial.substring(p, nlp).trim().split(/\s+/);
      p = nlp + 1;
      this.decodeCommand(command);
    }
    
    this.renderLater();
  }
  
  decodeCommand(command) {
    switch (command[0]) {
      case "bg": this.decodeCommandBg(command[1]); break;
      case "caption": this.decodeCommandCaption(command.slice(1).join(' ')); break;
      case "pencil": this.decodeCommandPencil(command); break;
      case undefined: break;
      default: console.error(`No decoder for command: ${command}`);
    }
  }
  
  decodeCommandBg(url) {
    this.backgroundImageService.loadImageFromUrl(url).then((image) => {
      this.backgroundImage = image;
      this.renderLater();
    });
  }
  
  decodeCommandCaption(token) {
    try {
      this.caption = JSON.parse(token);
    } catch (e) {}
    if (typeof(this.caption) !== "string") {
      this.caption = "";
    }
  }
  
  decodeCommandPencil(command) {
    // Draw it just as if we had received the corresponding events. Neat, huh?
    this.paintService.setColor(command[1] || "#000000");
    this.paintService.setLineWidth(+command[2] || 1);
    this.paintService.setTool("pencil");
    let x = +command[3];
    let y = +command[4];
    this.paintService.beginStroke([x, y]);
    for (let p=5; p<command.length; p+=2) {
      x = +command[p];
      y = +command[p + 1];
      this.paintService.continueStroke([x, y]);
    }
    this.paintService.endStroke([x, y]);
  }
  
}

PlayCanvas.tagName = "CANVAS";
