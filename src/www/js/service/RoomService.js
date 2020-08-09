/* RoomService.js
 */
 
import { Transport } from "/js/service/Transport.js";

export class RoomService {

  static getDependencies() {
    return [Transport, Window];
  }
  constructor(transport, window) {
    this.transport = transport;
    this.window = window;
    
    this.DEFAULT_GAME_DURATION = 60 * 1000; // 60 seems ok, maybe a little short
    
    this.room = null;
    this.isOwner = false;
    this.clockExpired = false;
    this.clockTimeout = null;
    this.clockTimeoutTime = 0;
    this.listeners = [];
    this.nextListenerId = 1;
  }
  
  create() {
    return this.transport.post("/api/room/new").then((response) => {
      return response.json().then((room) => {
        this.room = room;
        this.isOwner = true;
        this.clockExpired = false;
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
        this.clockExpired = false;
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
      startTime: Date.now(),
      endTime: Date.now() + this.DEFAULT_GAME_DURATION,
    })).then((response) => {
      return response.json().then((room) => {
        this.room = room;
        this.resetClock();
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
  
  deliverEncodedImage(serial) {
    return this.transport.post("/api/image", null, "text/plain", serial);
  }
  
  resetClock() {
    this.clockExpired = false;
    if (this.room && this.room.endTime) {
      if (this.clockTimeout && (this.clockTimeoutTime === this.room.endTime)) return;
      const msRemaining = this.room.endTime - Date.now();
      this.clockTimeout = this.window.setTimeout(() => this.onClockExpired(), msRemaining);
      this.clockTimeoutTime = this.room.endTime;
    } else if (this.clockTimeout) {
      this.window.clearTimeout(this.clockTimeout);
      this.clockTimeout = null;
    }
  }
  
  onClockExpired() {
    this.clockTimeout = null;
    if (!this.room) return;
    if (this.clockExpired) return;
    this.clockExpired = true;
    this.room.endTime = Date.now() - 1; // Fudge the end time to ensure it's in the past.
    this.broadcastRoom();
  }
  
  receiveRoomFromPoll(room) {
    this.room = room;
    this.broadcastRoom();
    this.resetClock();
  }
  
  broadcastRoom() {
    for (const listener of this.listeners) {
      try {
        listener.callback(this.room);
      } catch (e) {
        console.error(`Caught in room change listener`, e);
      }
    }
  }
  
  listen(callback) {
    const listenerId = this.nextListenerId++;
    this.listeners.push({ listenerId, callback });
    return listenerId;
  }
  
  unlisten(listenerId) {
    const index = this.listeners.findIndex(l => l.listenerId === listenerId);
    if (index >= 0) this.listeners.splice(index, 1);
  }
  
}

RoomService.singleton = true;
