const { expect, ...test } = require("../test.js");
const store = require("../../server/store.js");

store.init([
  { name: "onesies" },
  { name: "twosies" },
]);

/* ID normalization and validation.
 *********************************************************/
 
expect(store.normalizeId("AbracaDonkey!")).toBe("abracad0nkey");
expect(store.normalizeId("I love NY.")).toBe("110ueny");

expect(store.validateId("abcdefgh")).toBe(true);
expect(store.validateId("jkmnpqrs")).toBe(true);
expect(store.validateId("tuwxyz01")).toBe(true);
expect(store.validateId("23456789")).toBe(true);
expect(store.validateId("aaaaaaaa")).toBe(true);
expect(store.validateId("Aaaaaaaa")).toBe(false);
expect(store.validateId("iaaaaaaa")).toBe(false);
expect(store.validateId("laaaaaaa")).toBe(false);
expect(store.validateId("oaaaaaaa")).toBe(false);
expect(store.validateId("vaaaaaaa")).toBe(false);
expect(store.validateId("aaaaaaa")).toBe(false);
expect(store.validateId("aaaaaaaaa")).toBe(false);
expect(store.validateId("aaaaaaaa ")).toBe(false);

/* CRUD
 **********************************************************/
 
const one = store.addEntity("onesies");
expect(!!one).toBe(true);
expect(store.validateId(one.id)).toBe(true);
expect(store.getEntity("onesies", one.id)).toBe(one);
store.removeEntity("onesies", one.id);
expect(store.getEntity("onesies", one.id)).toBe(null);

/* Listen
 ********************************************************/
 
const received = [];
const entity = store.addEntity("onesies", { name: "Abbott" });
const listener = store.listen("onesies", entity.id, (entity) => received.push(entity));
expect(received.length).toBe(0); // no initial callback

store.updateEntity("onesies", entity.id, { name: "Bud" });
expect(received.length).toBe(1);
expect(received[received.length - 1].name).toBe("Bud");

store.upsertEntity("onesies", entity.id, { name: "Bud" });
expect(received.length).toBe(1); // Different object but redundant -- must not call

store.updateEntity("onesies", entity.id, { name: "Bud" });
expect(received.length).toBe(1); // Different object but redundant -- must not call

store.addEntity("onesies", { name: "Charlie" });
expect(received.length).toBe(1); // Touch other entities, none of our business.

expect(store.unlisten(listener)).toBe(true);
store.updateEntity("onesies", entity.id, { name: "Dave" });
expect(received.length).toBe(1); // We're not listening anymore.

const listener2 = store.listen("onesies", entity.id, (entity) => received.push(entity));
store.updateEntity("onesies", entity.id, { name: "Ellen" });
expect(received.length).toBe(2);
expect(received[received.length - 1].name).toBe("Ellen");

store.removeEntity("onesies", entity.id);
expect(received.length).toBe(3);
expect(received[received.length - 1]).toBe(null); // the farewell notice
expect(store.getEntity("onesies", entity.id)).toBe(null);
store.addEntity("onesies", { id: entity.id, name: "Frances" }); // reuse this id, that's legal
expect(!!store.getEntity("onesies", entity.id)).toBe(true);
expect(received.length).toBe(3); // we don't see the new one; listening ends at removal
