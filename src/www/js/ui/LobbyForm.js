/* LobbyForm.js
 */
 
import { Dom } from "/js/service/Dom.js";
import { RoomService } from "/js/service/RoomService.js";

export class LobbyForm {

  static getDependencies() {
    return [HTMLElement, Dom, RoomService];
  }
  constructor(element, dom, roomService) {
    this.element = element;
    this.dom = dom;
    this.roomService = roomService;
    
    this.oncreate = null; // (id)
    this.onjoin = null; // (id)
    
    this.buildUi();
    this.element.querySelector("input[name='name']").focus();
  }
  
  onDetachFromDom() {
  }
  
  /* UI
   *******************************************************************/
   
  buildUi() {
    this.element.innerHTML = "";
    
    const createForm = this.dom.spawn(this.element, "FORM", ["create"]);
    createForm.addEventListener("submit", (event) => {
      event.preventDefault();
      this.onCreateRoom();
    });
    const createButton = this.dom.spawn(createForm, "INPUT", null, {
      type: "submit",
      value: "Create New Room",
    });
    
    const joinForm = this.dom.spawn(this.element, "FORM", ["join"]);
    joinForm.addEventListener("submit", (event) => {
      event.preventDefault();
      this.onJoinRoom();
    });
    const joinName = this.dom.spawn(joinForm, "INPUT", null, {
      type: "text",
      name: "name",
    });
    const joinButton = this.dom.spawn(joinForm, "INPUT", null, {
      type: "submit",
      value: "Join Existing Room",
    });
  }
  
  /* Events.
   *****************************************************************/
   
  onCreateRoom() {
    if (this.oncreate) this.oncreate();
  }
   
  onJoinRoom() {
    const id = this.element.querySelector(".join > input[name='name']").value.trim();
    if (!id) return;
    if (this.onjoin) this.onjoin(id);
  }
   
}
