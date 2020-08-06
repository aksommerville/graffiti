import { Injector } from "/js/service/Injector.js";
import { Dom } from "/js/service/Dom.js";
import { RootController } from "/js/ui/RootController.js";

window.addEventListener("error", (event) => {
  if (event.error._graffiti_instantiationStack) {
    console.error(
      `Error thrown by injector. Root cause at the top.`,
      event.error._graffiti_instantiationStack
    );
  }
  console.error(`Uncaught error`, event.error);
  event.preventDefault();
});

window.addEventListener("load", () => {
  const injector = new Injector(window);
  const dom = injector.getInstance(Dom);
  const root = dom.spawnController(document.body, RootController);
});
