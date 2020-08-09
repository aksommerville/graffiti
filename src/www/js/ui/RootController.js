/* RootController.js
 */
 
import { Dom } from "/js/service/Dom.js";
import { UserService } from "/js/service/UserService.js";
import { RoomService } from "/js/service/RoomService.js";
import { LoginForm } from "/js/ui/LoginForm.js";
import { LobbyForm } from "/js/ui/LobbyForm.js";
import { GatherForm } from "/js/ui/GatherForm.js";
import { PlayController } from "/js/ui/PlayController.js";

export class RootController {

  static getDependencies() {
    return [HTMLElement, Dom, Window, UserService, RoomService];
  }
  constructor(element, dom, window, userService, roomService) {
    this.element = element;
    this.dom = dom;
    this.window = window;
    this.userService = userService;
    this.roomService = roomService;
    
    this.buildUi();
    this.selectAndDisplayMainView();
  }
  
  /* UI.
   *************************************************************/
  
  buildUi() {
    this.element.innerHTML = "";

    const header = this.dom.spawn(this.element, "HEADER");
    this.dom.spawn(header, "DIV", ["errorMessage"]);
    this.dom.spawn(header, "DIV", ["user"]);
    this.dom.spawn(header, "DIV", ["room"]);
    
    const main = this.dom.spawn(this.element, "DIV", ["main"], { role: "main" });
    const footer = this.dom.spawn(this.element, "FOOTER");
  }
  
  selectAndDisplayMainView() {
    const main = this.element.querySelector(".main");
    main.innerHTML = "";
    if (!this.userService.user) {
      this.displayLoginView(main);
    } else if (!this.roomService.room) {
      this.displayLobbyView(main);
    } else switch (this.roomService.room.state) {
      case "gather": this.displayGatherView(main); break;
      case "play": this.displayPlayView(main); break;
      case "conclude": this.displayConcludeView(main); break;
      case "cancel": this.displayCancelView(main); break;
      default: console.error(`Unexpected room state`, this.roomService.room);
    }
  }
  
  displayLoginView(container) {
    const controller = this.dom.spawnController(container, LoginForm);
    controller.onsubmit = (name, id, password) => this.onLogin(name, id, password);
  }
  
  displayLobbyView(container) {
    const controller = this.dom.spawnController(container, LobbyForm);
    controller.oncreate = (id) => this.onCreateRoom(id);
    controller.onjoin = (id) => this.onJoinRoom(id);
  }
  
  displayGatherView(container) {
    const controller = this.dom.spawnController(container, GatherForm);
    controller.onbegin = () => this.onBeginGame();
    controller.oncancel = () => this.onCancelGame();
  }
  
  displayPlayView(container) {
    const controller = this.dom.spawnController(container, PlayController);
  }
  
  displayConcludeView(container) {
    container.innerText = "TODO: Conclude";
  }
  
  displayCancelView(container) {
    container.innerText = "TODO: Cancel";
  }
  
  /* User.
   ************************************************************/
   
  refreshUserUi() {
    const element = this.element.querySelector("header > .user");
    if (this.userService.user) {
      element.innerText = `Logged in as '${this.userService.user.name}'`;
    } else {
      element.innerText = "";
    }
  }
  
  /* Room.
   ************************************************************/
   
  refreshRoomUi() {
    const element = this.element.querySelector("header > .room");
    if (this.roomService.room) {
      element.innerText = `In room '${this.roomService.room.id}'`;
    } else {
      element.innerText = "";
    }
  }
  
  /* Message.
   **************************************************************/
   
  setErrorMessageFromObject(object) {
    if (object) {
      if (object.status && object.statusText) {
        return this.setErrorMessage(`${object.status} ${object.statusText}`);
      }
      if (object.message) {
        return this.setErrorMessage(object.message);
      }
    }
    if (object) {
      return this.setErrorMessage(object);
    }
    this.setErrorMessage("Error!");
  }
  
  setErrorMessage(message) {
    this.element.querySelector("header > .errorMessage").innerText = message;
  }
  
  clearMessage() {
    this.element.querySelector("header > .errorMessage").innerText = "";
  }
  
  /* Events.
   **************************************************************/
   
  onLogin(name, id, password) {
    this.userService.login(name, id, password).then((response) => {
      this.clearMessage();
      this.refreshUserUi();
      this.selectAndDisplayMainView();
    }).catch((error) => {
      this.setErrorMessageFromObject(error);
    });
  }
  
  onCreateRoom() {
    this.roomService.create().then((response) => {
      this.refreshRoomUi();
      this.selectAndDisplayMainView();
    }).catch((error) => {
      this.setErrorMessageFromObject(error);
    });
  }
  
  onJoinRoom(id) {
    this.roomService.join(id).then((response) => {
      this.refreshRoomUi();
      this.selectAndDisplayMainView();
    }).catch((error) => {
      this.setErrorMessageFromObject(error);
    });
  }
  
  onBeginGame() {
    this.roomService.begin().then((response) => {
      this.selectAndDisplayMainView();
    }).catch((error) => {
      this.setErrorMessageFromObject(error);
    });
  }
  
  onCancelGame() {
    this.roomService.cancel().then((response) => {
      this.selectAndDisplayMainView();
    }).catch((error) => {
      this.setErrorMessageFromObject(error);
    });
  }
  
}
