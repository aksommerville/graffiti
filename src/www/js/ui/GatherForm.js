/* GatherForm.js
 */
 
import { Dom } from "/js/service/Dom.js";
import { RoomService } from "/js/service/RoomService.js";
import { UserService } from "/js/service/UserService.js";

export class GatherForm {

  static getDependencies() {
    return [HTMLElement, Dom, RoomService, UserService];
  }
  constructor(element, dom, roomService, userService) {
    this.element = element;
    this.dom = dom;
    this.roomService = roomService;
    this.userService = userService;
    
    this.onbegin = null; // () User clicked "begin" -- ping the server
    this.oncancel = null; // ()
    this.onstarted = null; // () Reacting to game start (maybe not really our job?)
    
    this.roomListener = null;
    
    this.buildUi();
    
    this.onRoomChanged(this.roomService.room);
    this.roomListener = this.roomService.listen((room) => this.onRoomChanged(room));
  }
  
  onDetachFromDom() {
    this.roomService.unlisten(this.roomListener);
    this.roomListener = null;
  }
  
  /* UI
   *******************************************************/
   
  buildUi() {
    this.element.innerHTML = "";
    const peopleList = this.dom.spawn(this.element, "UL", ["people"]);
    
    const beginButton = this.dom.spawn(this.element, "INPUT", null, { type: "button", value: "Begin" });
    beginButton.addEventListener("click", () => this.onBegin());
    //TODO enable buttons only if we're the room's owner
    // Otherwise some text like "Joe has to start it"
    
    const cancelButton = this.dom.spawn(this.element, "INPUT", null, { type: "button", value: "Cancel" });
    cancelButton.addEventListener("click", () => this.onCancel());
    
    const membersList = this.dom.spawn(this.element, "UL", ["members"]);
  }
  
  populateMembersList(userIds) {
    const membersList = this.element.querySelector(".members");
    membersList.innerHTML = "";
    for (const id of userIds) {
      const element = this.dom.spawn(membersList, "LI", null, null, id);
      this.userService.getUserNameById(id).then((name) => element.innerText = name);
    }
  }
  
  /* Events
   ******************************************************/
   
  onBegin() {
    if (this.onbegin) this.onbegin();
  }
  
  onCancel() {
    if (this.oncancel) this.oncancel();
  }
  
  onRoomChanged(room) {
    this.populateMembersList(room ? room.userIds : []);
    if (room) switch (room.state) {
      case "play": if (this.onstarted) this.onstarted(); break;
    }
  }
   
}
