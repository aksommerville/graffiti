/* store.js
 * Trying something like "Ngrx Junior" to get a reactive store for the server.
 * This will be the source of truth for users, sessions, and rooms.
 * Some rules:
 *   - All entities contain a unique string field "id", same as their canonical id.
 *   - Entities are immutable.
 *   - All entities belong to a slice which must be declared at init.
 *   - IDs are unique across all slices.
 *   - Clients may listen to existing entities.
 */
 
const crypto = require("crypto");
 
/* Globals.
 **************************************************************/

const schema = {};
 
const store = {};

/* { listenerId, type, id, callback }
 */
const listeners = [];
let nextListenerId = 1;

/* Init.
 *************************************************************/
 
function init(slices) {
  if (Object.keys(store).length) throw new Error("Already initialized");
  
  for (const slice of slices) {
    if (!slice.name) {
      throw new Error(`Store slices must contain 'name'`);
    }
    if (schema[slice.name]) {
      throw new Error(`duplicate slice name '${slice.name}'`);
    }
    schema[slice.name] = slice.schema || {};
    store[slice.name] = {};
  }
}

/* Mass retrieval.
 ************************************************************/

function examineFullContent() {
  return store;
}

function getEntitiesOfType(type) {
  if (!store[type]) return [];
  return Object.values(store[type]);
}

function getEntityOfAnyTypeById(id) {
  for (const sliceName of Object.keys(store)) {
    const entity = store[sliceName][id];
    if (entity) return entity;
  }
  return null;
}

/* Random IDs.
 * IDs must be unique across *all* slices.
 * I'm also making them cryptographically secure to be on the safe side.
 **************************************************************/
 
function generateRandomId() {
  const raw = crypto.randomBytes(5);
  const text = Buffer.alloc(8);
  const alphabet = "abcdefghjkmnpqrstuwxyz0123456789"; // skip (i,l,o,v) because i don't love them.
  text[0] = alphabet.charCodeAt(((raw[0] >> 3)                ) & 0x1f);
  text[1] = alphabet.charCodeAt(((raw[0] << 2) | (raw[1] >> 6)) & 0x1f);
  text[2] = alphabet.charCodeAt(((raw[1] >> 1)                ) & 0x1f);
  text[3] = alphabet.charCodeAt(((raw[1] << 4) | (raw[2] >> 4)) & 0x1f);
  text[4] = alphabet.charCodeAt(((raw[2] << 1) | (raw[3] >> 7)) & 0x1f);
  text[5] = alphabet.charCodeAt(((raw[3] >> 2)                ) & 0x1f);
  text[6] = alphabet.charCodeAt(((raw[3] << 3) | (raw[4] >> 5)) & 0x1f);
  text[7] = alphabet.charCodeAt(((raw[4]     )                ) & 0x1f);
  return text.toString("ascii");
}

function normalizeId(input) {
  return input
    .toLowerCase()
    .replace(/[il]/g, '1')
    .replace(/o/g, '0')
    .replace(/v/g, 'u')
    .replace(/[^a-z0-9]/g, '');
}

function generateUniqueId() {
  while (1) {
    const id = generateRandomId();
    if (!getEntityOfAnyTypeById(id)) return id;
  }
}

// Only normalized IDs will pass validation.
function validateId(id) {
  if (typeof(id) !== "string") return false;
  return !!id.match(/^[a-hjkmnp-uw-z0-9]{8}$/);
}

/* Listeners.
 *************************************************************/
 
function listen(type, id, callback) {
  if (!callback) return 0;
  const slice = store[type];
  if (!slice || !slice[id]) return 0;
  const listenerId = nextListenerId++;
  listeners.push({ listenerId, type, id, callback });
  return listenerId;
}

function unlisten(listenerId) {
  for (let i=listeners.length; i-->0; ) {
    if (listeners[i].listenerId === listenerId) {
      listeners.splice(i, 1);
      return true;
    }
  }
  return false;
}

function updateListeners(type, id, entity) {
  for (let i=listeners.length; i-->0; ) {
    const listener = listeners[i];
    if (listener.type !== type) continue;
    if (listener.id !== id) continue;
    try {
      listener.callback(entity);
    } catch (e) {
      console.error(`Store listener for '${type}' '${id}' failed!`, e);
      listeners.splice(i, 1);
      continue;
    }
    if (!entity) {
      listeners.splice(i, 1);
    }
  }
}

/* Apply changes to entity generically.
 ***************************************************************/
 
function applyGenericChanges(original, changes) {
  let reallyChanged = false;
  const modified = {...original};
  for (const key of Object.keys(changes)) {
    if (changes[key] === undefined) {
      if (delete modified[key]) reallyChanged = true;
    } else if (modified[key] !== changes[key]) {
      modified[key] = changes[key];
      reallyChanged = true;
    }
  }
  if (!reallyChanged) return original;
  return modified;
}

/* CRUD ops.
 *************************************************************/
 
function getEntity(type, id) {
  const slice = store[type];
  if (!slice) return null;
  return slice[id] || null;
}

function addEntity(type, entity) {
  const slice = store[type];
  if (!slice) throw new Error(`slice '${type}' not found`);
  if (entity) {
    entity = {...entity};
  } else if (schema[type].newEntity) {
    const id = generateUniqueId();
    entity = schema[type].newEntity(id);
  } else {
    entity = {};
  }
  if (!validateId(entity.id) || getEntityOfAnyTypeById(entity.id)) {
    entity.id = generateUniqueId();
  }
  if (schema[type].validateEntity) {
    if (!schema[type].validateEntity(entity)) {
      throw new Error(`'${type}' entity failed validation`, entity);
    }
  }
  slice[entity.id] = entity;
  return entity;
}

function removeEntity(type, id) {
  const slice = store[type];
  if (!slice) throw new Error(`slice '${type}' not found`);
  if (!slice[id]) throw new Error(`entity '${id}' not found in slice '${type}'`);
  if (schema[type].cleanupEntity) {
    schema[type].cleanupEntity(slice[id]);
  }
  delete slice[id];
  updateListeners(type, id, null);
}

function updateEntity(type, id, changes) {
  const slice = store[type];
  if (!slice) throw new Error(`slice '${type}' not found`);
  const original = slice[id];
  if (!original) throw new Error(`entity '${id}' not found in slice '${type}'`);
  let modified;
  if (schema[type].applyChanges) {
    modified = schema[type].applyChanges(original, changes);
  } else {
    modified = applyGenericChanges(original, changes);
  }
  if (modified === original) return original; // no change
  if (!modified || (modified.id !== id)) {
    throw new Error(`failed to update '${type}' entity '${id}'`);
  }
  if (schema[type].validateEntity) {
    if (!schema[type].validateEntity(modified)) {
      throw new Error(`'${type}' entity '${id}' failed validation after update`);
    }
  }
  slice[id] = modified;
  updateListeners(type, id, modified);
  return modified;
}

function upsertEntity(type, entity) {
  const slice = store[type];
  if (!slice) throw new Error(`slice '${type}' not found`);
  if (!entity.id) {
    entity.id = generateUniqueId();
  } else if (slice[entity.id]) {
    return updateEntity(type, entity.id, entity);
  } else if (!validateId(entity.id) || getEntityOfAnyTypeById(entity.id)) {
    throw new Error(`new '${type}' entity id '${entity.id}' invalid or in use by another slice`);
  }
  return addEntity(type, entity);
}
 
/* TOC
 *************************************************************/

module.exports = {

  /* Takes one argument, an array of slice definitions:
   * {
   *   name: string // must be unique
   *   schema: { // optional
   *     validateEntity(entity) => boolean (or throw)
   *     newEntity(id) => entity
   *     applyChanges(original, changes) => modified ; return (original) if redundant, see applyGenericChanges
   *     cleanupEntity(entity)
   *   }
   * }
   */
  init,

  generateUniqueId, // prefer this
  generateRandomId, // not necessarily unique
  normalizeId,
  validateId, // => boolean
  
  getEntityOfAnyTypeById,
  examineFullContent,
  getEntitiesOfType, // => array
  
  getEntity, // (type,id) => entity
  addEntity, // (type,entity?) => entity
  removeEntity, // (type,id)
  updateEntity, // (type,id,changes) => entity ; use value (undefined) to remove a field
  upsertEntity, // (type,entity) => entity
  
  /* Listening to an entity that doesn't exist will fail and return zero.
   * The initial state of an entity is not sent to the callback. Use getEntity() for that.
   * Listeners are automatically removed when the entity is removed, and send a farewell null first.
   * If your listener throws an exception, we log it and drop the listener (without a farewell).
   */
  listen, // (type,id,callback(entity)) => listenerId
  unlisten, // (listenerId)
  
};
