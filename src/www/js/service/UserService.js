/* UserService.js
 */
 
import { Transport } from "/js/service/Transport.js";

export class UserService {

  static getDependencies() {
    return [Transport];
  }
  constructor(transport) {
    this.transport = transport;
    
    this.user = null;
  }
  
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
          return this.user;
        });
      });
    } else {
      return this.transport.post("/api/player/login", { id }, "text/plain", password).then((response) => {
        return response.json().then((body) => {
          this.transport.accessToken = body.accessToken;
          this.user = body;
          return this.user;
        });
      });
    }
  }
  
}

UserService.singleton = true;
