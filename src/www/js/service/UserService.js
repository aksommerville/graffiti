/* UserService.js
 */
 
import { Transport } from "/js/service/Transport.js";
import { RoomService } from "/js/service/RoomService.js";

export class UserService {

  static getDependencies() {
    return [Transport, Window, RoomService];
  }
  constructor(transport, window, roomService) {
    this.transport = transport;
    this.window = window;
    this.roomService = roomService;
    
    this.successPollRestartTime =  500;
    this.timeoutPollRestartTime = 1000;
    this.errorPollRestartTime =  10000;
    
    this.user = null;
  }
  
  /* Login.
   **************************************************************/
  
  login(name, id, password) {
    if (!name && !id) {
      return Promise.reject("Name or ID required");
    }
    if (id || password) {
      if (!id || !password) {
        return Promise.reject(`id and password, both or neither`);
      }
    }
    if (name) {
      return this.transport.post("/api/player/new", { name, id }, "text/plain", password).then((response) => {
        return response.json().then((body) => {
          this.transport.accessToken = body.accessToken;
          this.user = body;
          this.restartPoll();
          return this.user;
        });
      });
    } else {
      return this.transport.post("/api/player/login", { id }, "text/plain", password).then((response) => {
        return response.json().then((body) => {
          this.transport.accessToken = body.accessToken;
          this.user = body;
          this.restartPoll();
          return this.user;
        });
      });
    }
  }
  
  /* Logout
   ****************************************************************/
   
  logout() {
    if (!this.user) return;
    this.transport.post("/api/player/logout").then((response) => {
      this.user = null;
      this.roomService.receiveRoomFromPoll(null);
    });
  }
   
  /* Polling
   ****************************************************************/
  
  restartPoll() {
    if (!this.user) return;
    this.transport.get("/api/poll").then((response) => {
      return response.json().then((pollResult) => {
        for (const change of pollResult) {
          switch (change.type) {
            case "room": this.roomService.receiveRoomFromPoll(change.entity); break;
          }
        }
        this.window.setTimeout(() => this.restartPoll(), this.successPollRestartTime);
      });
    }).catch((error) => {
      if (error && (error.status === 598)) {
        this.window.setTimeout(() => this.restartPoll(), this.timeoutPollRestartTime);
      } else {
        this.window.setTimeout(() => this.restartPoll(), this.errorPollRestartTime);
      }
    });
  }
  
}

UserService.singleton = true;
