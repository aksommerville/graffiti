/* GatherForm.js
 */
 
import { Dom } from "/js/service/Dom.js";
import { RoomService } from "/js/service/RoomService.js";

export class GatherForm {

  static getDependencies() {
    return [HTMLElement, Dom, RoomService];
  }
  constructor(element, dom, roomService) {
    this.element = element;
    this.dom = dom;
    this.roomService = roomService;
    
    this.onbegin = null; // ()
    this.oncancel = null; // ()
    
    this.buildUi();
  }
  
  /* UI
   *******************************************************/
   
  buildUi() {
    this.element.innerHTML = "";
    const peopleList = this.dom.spawn(this.element, "UL", ["people"]);
    const beginButton = this.dom.spawn(this.element, "INPUT", null, { type: "button", value: "Begin" });
    beginButton.addEventListener("click", () => this.onBegin());
    const cancelButton = this.dom.spawn(this.element, "INPUT", null, { type: "button", value: "Cancel" });
    cancelButton.addEventListener("click", () => this.onCancel());
  }
  
  /* Events
   ******************************************************/
   
  onBegin() {
    if (this.onbegin) this.onbegin();
  }
  
  onCancel() {
    if (this.oncancel) this.oncancel();
  }
   
}
