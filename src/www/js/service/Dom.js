/* Dom.js
 */
 
import { Injector } from "/js/service/Injector.js";

export class Dom {

  static getDependencies() {
    return [Window, Document, Injector];
  }
  constructor(window, document, injector) {
    this.window = window;
    this.document = document;
    this.injector = injector;
    
    this.dismissListeners = [];
    this.mutationObserver = new this.window.MutationObserver((mutations) => this.onMutations(mutations));
  }
  
  /* Create elements.
   ******************************************************************/
   
  spawn(parent, tagName, classNames, attributes, text) {
    if (typeof(tagName) !== "string") throw new Error(`Expected tag name, found ${typeof(tagName)}: ${tagName}`);
    const element = this.document.createElement(tagName);
    if (classNames) {
      element.classList.add(...classNames);
    }
    if (attributes) {
      for (const k of Object.keys(attributes)) {
        element.setAttribute(k, attributes[k]);
      }
    }
    if ((text !== null) && (text !== undefined)) {
      element.innerText = text;
    }
    parent.appendChild(element);
    return element;
  }
  
  spawnController(parent, clazz) {
    if (clazz.singleton) throw new Error(`Class '${clazz.name}' is a singleton; not allowed as UI controller`);
    const element = this.spawn(parent, clazz.tagName || "DIV", [clazz.name]);
    try {
      const controller = this.injector.getInstance(clazz, [element]);
      element._graffiti_controller = controller;
      this.mutationObserver.observe(parent, { childList: true });
      return controller;
    } catch (e) {
      element.remove();
      throw e;
    }
  }
   
  /* Manage removal of elements.
   ***************************************************************************/
   
  listenForControllerDismissal(controller, callback) {
    this.dismissListeners.push({ controller, callback });
  }
  
  /* Inform the DOM that this element is going to be detached and reattached.
   * eg using Node.insertBefore().
   * Mutation events are delivered asynchronously, so we can't just set a flag, do the thing, and unset it.
   * This applies to the given element and all of its descendants.
   */
  ignoreRemovalEventsTemporarily(element) {
    if (!element) return;
    element._graffiti_ignoreRemovalEvents = true;
    this.window.setTimeout(() => element._graffiti_ignoreRemovalEvents = false, 100);
  }
  
  onMutations(mutations) {
    for (const mutation of mutations) {
      for (const node of mutation.removedNodes) {
        this._recursivelyDetachControllers(node);
      }
    }
  }
  
  _recursivelyDetachControllers(node) {
    if (node._graffiti_ignoreRemovalEvents) return;
    if (node._graffiti_controller) {
      this._triggerDismissListeners(node._graffiti_controller);
      if (node._graffiti_controller.onDetachFromDom) {
        node._graffiti_controller.onDetachFromDom();
      }
      node._graffiti_controller.element = null;
      node._graffiti_controller = null;
    }
    if (node.children) {
      for (let i=node.children.length; i-->0; ) {
        this._recursivelyDetachControllers(node.children[i]);
      }
    }
  }
  
  _triggerDismissListeners(controller) {
    for (let i=this.dismissListeners.length; i-->0; ) {
      const listener = this.dismissListeners[i];
      if (listener.controller !== controller) continue;
      this.dismissListeners.splice(i, 1);
      listener.callback(controller);
    }
  }
   
}

Dom.singleton = true;
