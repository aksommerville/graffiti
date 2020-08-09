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
    this.listeners = [];
    this.nextListenerId = 1;
  }
  
  create() {
    return this.transport.post("/api/room/new").then((response) => {
      return response.json().then((room) => {
        this.room = room;
        this.isOwner = true;
        this.broadcastRoom();
        return room;
      });
    });
  }
  
  join(id) {
    return this.transport.post("/api/room/join", { id }).then((response) => {
      return response.json().then((room) => {
        this.room = room;
        this.isOwner = false;
        this.broadcastRoom();
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
        this.broadcastRoom();
        return room;
      });
    });
  }
  
  cancel() {
    if (!this.room) return Promise.resolve();
    return this.transport.delete("/api/room", { id: this.room.id }).then(() => {
      this.room = null;
      this.isOwner = false;
      this.broadcastRoom();
    });
  }
  
  receiveRoomFromPoll(room) {
    this.room = room;
    this.broadcastRoom();
  }
  
  broadcastRoom() {
    for (const listener of this.listeners) {
      listener.callback(this.room);
    }
  }
  
  listen(callback) {
    const listenerId = this.nextListenerId++;
    this.listeners.push({ listenerId, callback });
  }
  
  unlisten(listenerId) {
    const index = this.listeners.findIndex(l => l.listenerId === listenerId);
    if (index >= 0) this.listeners.splice(index, 1);
  }
  
}

RoomService.singleton = true;
