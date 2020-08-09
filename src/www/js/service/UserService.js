/* UserService.js
 */
 
import { Transport } from "/js/service/Transport.js";
import { RoomService } from "/js/service/RoomService.js";

export class User {
  constructor(id, name) {
    this.id = id;
    this.name = name || "";
    this.time = Date.now(); // Last time we fetched from server.
  }
  
  repr() {
    if (this.name) return this.name;
    return this.id;
  }
}

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
    this.userRefreshTime = 1000 * 30;
    
    this.user = null; // *session* response; our user
    this.users = []; // User; metadata around all known users (esp name)
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
          this.addUser(id, name);
          this.restartPoll();
          return this.user;
        });
      });
    } else {
      return this.transport.post("/api/player/login", { id }, "text/plain", password).then((response) => {
        return response.json().then((body) => {
          this.transport.accessToken = body.accessToken;
          this.user = body;
          this.addUser(id, name);
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
  
  /* User list.
   *******************************************************/
   
  addUser(id, name) {
    for (const user of this.users) {
      if (user.id === id) {
        user.name = name;
        user.time = Date.now();
        return user;
      }
    }
    const user = new User(id, name);
    this.users.push(user);
    return user;
  }
  
  // => Promise<string>
  getUserNameById(id) {
    let user = this.users.find(u => u.id === id);
    if (user) {
      if (user.time + this.userRefreshTime < Date.now()) {
        return this.fetchAndAddUser(id).then((user) => {
          return user.repr();
        }).catch((error) => {
          // We already had a User record, so go with that.
          return user.repr();
        });
      } else {
        return Promise.resolve(user.repr());
      }
    } else {
      return this.fetchAndAddUser(id).then((user) => {
        return user.repr();
      }); // no fallback in this case
    }
  }
  
  fetchAndAddUser(id) {
    return this.transport.get("/api/player", { id }).then((response) => {
      return response.json().then((transportUser) => {
        const user = this.addUser(transportUser.id, transportUser.name);
        return user;
      });
    });
  }
  
}

UserService.singleton = true;
