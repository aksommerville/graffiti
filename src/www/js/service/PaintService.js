/* PaintService.js
 * Manages user input to a canvas.
 * Records every input action in a way we can undo, etc.
 * Actions:
 *   ["pencil", color, width, [x,y]...]
 */
 
export class PaintService {

  static getDependencies() {
    return [];
  }
  constructor() {
    this.w = 1;
    this.h = 1;
    this.tool = "pencil";
    this.color = "#ffffff";
    this.width = 8;
    this.actions = [];
    this.multiUndo = null; // null or array of actions
    this.pending = null;
    this.redoStack = [];
  }
  
  setBounds(w, h) {
    this.w = w;
    this.h = h;
  }
  
  /* Controls.
   *****************************************************************/
   
  undo() {
    if (this.actions.length > 0) {
      this.redoStack.splice(0, 0, ...this.actions.splice(this.actions.length - 1, 1));
      return true;
    }
    if (this.multiUndo) {
      this.actions = this.multiUndo;
      this.multiUndo = null;
      return true;
    }
    return false;
  }
  
  redo() {
    if (!this.redoStack.length) return false;
    this.actions.push(...this.redoStack.splice(0, 1));
    return true;
  }
  
  clear() {
    if (!this.actions.length && !this.pending) return false;
    this.multiUndo = this.actions;
    this.redoStack = [];
    this.actions = [];
    this.pending = null;
    return true;
  }
  
  /* Render.
   ***************************************************************/
   
  render(context) {
    for (const action of this.actions) this.renderAction(context, action);
    if (this.pending) this.renderAction(context, this.pending);
  }
  
  renderAction(context, action) {
    switch (action[0]) {
      case "pencil": this.renderPencil(context, action); break;
    }
  }
  
  /* Contextual events, public interface.
   *****************************************************************/
   
  setColor(color) {
    this.color = color;
  }
  
  setLineWidth(width) {
    width = ~~width;
    if (width < 1) width = 1;
    this.lineWidth = width;
  }
  
  setTool(tool) {
    switch (tool) {
      case "pencil":
        break;
      default: return;
    }
    this.tool = tool;
  }
   
  beginStroke(point) {
    this.pending = null;
    switch (this.tool) {
      case "pencil": this.beginPencil(point); break;
      default: console.log(`PaintService: unknown tool '${this.tool}'`);
    }
  }
  
  endStroke(point) {
    if (!this.pending) return;
    switch (this.tool) {
      case "pencil": this.endPencil(point); break;
    }
    this.pending = null;
    this.redoStack = [];
  }
  
  continueStroke(point) {
    if (!this.pending) return;
    switch (this.tool) {
      case "pencil": this.continuePencil(point); break;
    }
  }
  
  /* Pencil.
   **************************************************************/
   
  beginPencil(point) {
    this.pending = ["pencil", this.color, this.width, point];
  }
  
  endPencil(point) {
    this.pending.push(point);
    this.actions.push(this.pending);
  }
  
  continuePencil(point) {
    this.pending.push(point);
  }
  
  renderPencil(context, action) {
    context.lineCap = "round";
    context.lineJoin = "round";
    context.strokeStyle = action[1];
    context.lineWidth = action[2];
    context.beginPath();
    context.moveTo(action[3][0], action[3][1]);
    for (let i=3; i<action.length; i++) {
      context.lineTo(action[i][0], action[i][1]);
    }
    context.stroke();
  }
  
}

PaintService.singleton = false; // Each client gets a private one.
