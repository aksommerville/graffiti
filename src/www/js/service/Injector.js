/* Injector.js
 */
 
export class Injector {

  static getDependencies() {
    // This is not used, we're just setting a good example.
    return [Window];
  }
  constructor(window) {
    this._singletons = {
      Injector: this,
      Window: window,
      Document: window.document,
    };
    this._instantiationInProgress = new Set();
    this._nextDiscriminator = 1;
  }
  
  getInstance(clazz, override) {
    
    if (override) {
      const index = override.findIndex((o) => o instanceof clazz);
      if (index >= 0) {
        const over = override[index];
        override.splice(index, 1);
        return over;
      }
    } else {
      override = [];
    }
    
    if (clazz === "discriminator") {
      return this._nextDiscriminator++;
    }
    
    let instance = this._singletons[clazz.name];
    if (instance) return instance;
    
    if (this._instantiationInProgress.has(clazz.name)) {
      throw new Error(`Dependency loop involving: ${Array.from(this._instantiationInProgress)}`);
    }
    this._instantiationInProgress.add(clazz.name);
    try {
      instance = this._instantiate(clazz, override);
    } finally {
      this._instantiationInProgress.delete(clazz.name);
    }
    return instance;
  }
  
  _instantiate(clazz, override) {
    try {
      this._requireConstructableClass(clazz);
      const dependencyClasses = clazz.getDependencies ? clazz.getDependencies() : [];
      const dependencies = [];
      for (const dependencyClass of dependencyClasses) {
        dependencies.push(this.getInstance(dependencyClass, override));
      }
      const instance = new clazz(...dependencies);
      if (clazz.singleton) {
        this._singletons[clazz.name] = instance;
      }
      return instance;
    } catch (e) {
      if (e._graffiti_instantiationStack) {
        e._graffiti_instantiationStack.push(clazz && clazz.name);
      } else {
        e._graffiti_instantiationStack = [clazz && clazz.name];
      }
      throw e;
    }
  }
  
  _requireConstructableClass(clazz) {
    if (typeof(clazz) !== "function") {
      throw new Error(`Expected class, found ${typeof(clazz)}: ${clazz}`);
    }
    if (HTMLElement.isPrototypeOf(clazz)) {
      throw new Error(`${clazz.name} must be provided in overrides; illegal to instantiate with 'new'.`);
    }
  }
  
}

Injector.singleton = true;
