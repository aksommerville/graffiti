/* RootController.js
 */
 
import { Dom } from "/js/service/Dom.js";
import { UserService } from "/js/service/UserService.js";
import { RoomService } from "/js/service/RoomService.js";
import { LoginForm } from "/js/ui/LoginForm.js";
import { LobbyForm } from "/js/ui/LobbyForm.js";
import { GatherForm } from "/js/ui/GatherForm.js";
import { PlayController } from "/js/ui/PlayController.js";
import { JudgeController } from "/js/ui/JudgeController.js";

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
    
    this.CLOCK_POLL_TIME = 500;
    
    this.practiceMode = false;
    this.clockInterval = null;
    
    this.buildUi();
    this.selectAndDisplayMainView();
  }
  
  onDetachFromDom() {
    if (this.clockInterval) {
      this.window.clearInterval(this.clockInterval);
      this.clockInterval = null;
    }
  }
  
  /* UI.
   *************************************************************/
  
  buildUi() {
    this.element.innerHTML = "";

    const header = this.dom.spawn(this.element, "HEADER");
    this.dom.spawn(header, "DIV", ["errorMessage"]);
    this.dom.spawn(header, "DIV", ["user"]);
    this.dom.spawn(header, "DIV", ["room"]);
    this.dom.spawn(header, "DIV", ["clock"]);
    
    const main = this.dom.spawn(this.element, "DIV", ["main"], { role: "main" });
    const footer = this.dom.spawn(this.element, "FOOTER");
  }
  
  selectAndDisplayMainView() {
    const main = this.element.querySelector(".main");
    main.innerHTML = "";
    if (this.practiceMode) {
      this.displayPlayView(main);
    } else if (!this.userService.user) {
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
    if (this.element.querySelector(".LoginForm")) return;
    const controller = this.dom.spawnController(container, LoginForm);
    controller.onsubmit = (name, id, password) => this.onLogin(name, id, password);
    controller.onpractice = () => this.onBeginPracticeMode();
  }
  
  displayLobbyView(container) {
    if (this.element.querySelector(".LobbyForm")) return;
    const controller = this.dom.spawnController(container, LobbyForm);
    controller.oncreate = (id) => this.onCreateRoom(id);
    controller.onjoin = (id) => this.onJoinRoom(id);
  }
  
  displayGatherView(container) {
    if (this.element.querySelector(".GatherForm")) return;
    const controller = this.dom.spawnController(container, GatherForm);
    controller.onbegin = () => this.onBeginGame();
    controller.oncancel = () => this.onCancelGame();
    controller.onstarted = () => this.onGameStarted();
  }
  
  displayPlayView(container) {
    if (this.element.querySelector(".PlayController")) return;
    const controller = this.dom.spawnController(container, PlayController);
    controller.onfinished = () => this.onGameFinished();
  }
  
  displayConcludeView(container) {
    if (this.element.querySelector(".JudgeController")) return;
    const controller = this.dom.spawnController(container, JudgeController);
  }
  
  displayCancelView(container) {
    container.innerText = "TODO: Cancel";
  }
  
  /* User.
   ************************************************************/
   
  refreshUserUi() {
    const element = this.element.querySelector("header > .user");
    if (this.practiceMode) {
      element.innerText = "Local practice mode";
    } else if (this.userService.user) {
      const userId = this.userService.user.userId;
      this.userService.getUserNameById(userId).then((name) => {
        element.innerText = `Logged in as '${name}'`;
      });
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
      this.enableClock(true);
    } else {
      element.innerText = "";
      this.enableClock(false);
    }
  }
  
  enableClock(enable) {
    if (enable) {
      if (this.clockInterval) return;
      this.clockInterval = this.window.setInterval(() => this.updateClock(), this.CLOCK_POLL_TIME);
    } else {
      if (!this.clockInterval) return;
      this.window.clearInterval(this.clockInterval);
      this.clockInterval = null;
      this.element.querySelector(".clock").innerText = "";
    }
  }
  
  updateClock() {
    const element = this.element.querySelector(".clock");
    if (this.roomService.room && this.roomService.room.endTime) {
      const msRemaining = this.roomService.room.endTime - Date.now();
      if (msRemaining <= 0) {
        element.innerText = "Time up!";
      } else {
        let seconds = Math.floor(msRemaining / 1000);
        let minutes = Math.floor(seconds / 60);
        seconds %= 60;
        element.innerText = `${minutes}:${seconds.toString().padStart(2, '0')}`;
      }
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
    this.practiceMode = false;
    this.userService.login(name, id, password).then((response) => {
      this.clearMessage();
      this.refreshUserUi();
      this.selectAndDisplayMainView();
    }).catch((error) => {
      this.setErrorMessageFromObject(error);
    });
  }
  
  onBeginPracticeMode() {
    this.practiceMode = true;
    this.clearMessage();
    this.refreshUserUi();
    this.selectAndDisplayMainView();
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
    }).catch((error) => {
      this.setErrorMessageFromObject(error);
    });
  }
  
  onCancelGame() {
    this.roomService.cancel().then((response) => {
      this.refreshRoomUi();
      this.selectAndDisplayMainView();
    }).catch((error) => {
      this.setErrorMessageFromObject(error);
    });
  }
  
  onGameStarted() {
    this.selectAndDisplayMainView();
  }
  
  onGameFinished() {
    this.selectAndDisplayMainView();
  }
  
}
