/* RoomService.js
 */
 
import { Transport } from "/js/service/Transport.js";

export class RoomService {

  static getDependencies() {
    return [Transport];
  }
  constructor(transport) {
    this.transport = transport;
    
    this.room = null;
    this.isOwner = false;
  }
  
  create() {
    return this.transport.post("/api/room/new").then((response) => {
      return response.json().then((room) => {
        return this.join(room.id).then((room) => {
          this.isOwner = true;
          return room;
        });
      });
    });
  }
  
  join(id) {
    return this.transport.post("/api/room/join", { id }).then((response) => {
      return response.json().then((room) => {
        this.room = room;
        this.isOwner = false;
        return room;
      });
    });
  }
  
  begin() {
    if (!this.room) return Promise.reject("no room");
    return this.transport.put("/api/room", { id: this.room.id }, "application/json", JSON.stringify({
      ...this.room,
      state: "play",
    })).then((response) => {
      return response.json().then((room) => {
        this.room = room;
        return room;
      });
    });
  }
  
  cancel() {
    if (!this.room) return Promise.resolve();
    return this.transport.delete("/api/room", { id: this.room.id }).then(() => {
      this.room = null;
      this.isOwner = false;
    });
  }
  
}

RoomService.singleton = true;
