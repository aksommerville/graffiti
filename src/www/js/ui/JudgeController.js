/* JudgeController.js
 */
 
import { Dom } from "/js/service/Dom.js";
import { RoomService } from "/js/service/RoomService.js";
import { UserService } from "/js/service/UserService.js";
import { ImprovedImage } from "/js/ui/ImprovedImage.js";

export class JudgeController {

  static getDependencies() {
    return [HTMLElement, Dom, RoomService, UserService];
  }
  constructor(element, dom, roomService, userService) {
    this.element = element;
    this.dom = dom;
    this.roomService = roomService;
    this.userService = userService;
    
    this.images = []; // ImprovedImage (TODO); ui controllers under ".imagesContainer"
    
    this.buildUi();
    
    this.onRoomChanged(this.roomService.room);
    this.roomListener = this.roomService.listen((room) => this.onRoomChanged(room));
  }
  
  onDetachFromDom() {
    this.roomService.unlisten(this.roomListener);
    this.roomListener = null;
  }
  
  /* UI
   ***************************************************/
   
  buildUi() {
    this.element.innerHTML = "";
    this.images = [];
    
    this.dom.spawn(this.element, "DIV", ["imagesContainer"]);
  }
  
  /* Image list.
   ********************************************************/
   
  getImageByUserId(userId) {
    return this.images.find(i => i.userId === userId);
  }
  
  replaceImageImprovement(image, serial) {
    image.replaceImprovement(serial);
  }
  
  addImageImprovement(userId, serial) {
    const image = this.dom.spawnController(this.element.querySelector(".imagesContainer"), ImprovedImage);
    image.userId = userId;
    image.replaceImprovement(serial);
    this.images.push(image);
  }
  
  removeImage(image) {
    const index = this.images.indexOf(image);
    if (index >= 0) this.images.splice(index, 1);
    if (image.element) image.element.remove();
  }
  
  replaceChangedImages(improvedImagesByUserId) {
    const incomingUserIds = Object.keys(improvedImagesByUserId);
    for (const userId of incomingUserIds) {
      const serial = improvedImagesByUserId[userId];
      const image = this.getImageByUserId(userId);
      if (image) {
        if (image.serial === serial) {
          // got it, no change
        } else {
          // exists but changed
          this.replaceImageImprovement(image, serial);
        }
      } else {
        // add model and ui
        this.addImageImprovement(userId, serial);
      }
    }
    for (const image of this.images) {
      if (incomingUserIds.indexOf(image.userId) < 0) {
        // removed
        this.removeImage(image);
      }
    }
  }
  
  /* Events
   ****************************************************/
   
  onRoomChanged(room) {
    this.replaceChangedImages(room ? room.improvements : {});
  }
  
}
