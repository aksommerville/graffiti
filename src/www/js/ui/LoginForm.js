/* LoginForm.js
 */
 
import { Dom } from "/js/service/Dom.js";

export class LoginForm {

  static getDependencies() {
    return [HTMLElement, Dom];
  }
  constructor(element, dom) {
    this.element = element;
    this.dom = dom;
    
    this.USE_ACCOUNTS = false; // It works and all, but why?
    
    this.onsubmit = null; // (name, id, password)
    this.onpractice = null; // ()
    
    this.buildUi();
    this.element.querySelector("input[name='Name']").focus();
  }
  
  buildUi() {
    this.element.innerHTML = "";
    const form = this.dom.spawn(this.element, "FORM");
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      if (this.onsubmit) this.onsubmit(
        this.getName(),
        this.getId(),
        this.getPassword()
      );
    });
    const table = this.dom.spawn(form, "TABLE");
    this.spawnKvRow(table, "Name");
    if (this.USE_ACCOUNTS) {
      this.spawnKvRow(table, "ID");
      this.spawnKvRow(table, "Password");
    }
    this.spawnSubmitRow(table);
    
    if (this.USE_ACCOUNTS) {
      const help = this.dom.spawn(this.element, "DIV", ["help"], null,
        "To login without an account, enter any Name.\n" +
        "To use existing account, enter ID and Password.\n" +
        "To create an account, enter all three.\n"
      );
    } else {
      const help = this.dom.spawn(this.element, "DIV", ["help"], null,
        "Pick any name you like."
      );
    }
    
    if (true) { // enable practice mode
      const practiceButton = this.dom.spawn(this.element, "INPUT", null, {
        type: "button",
        value: "Local Practice Mode",
      });
      practiceButton.addEventListener("click", () => {
        if (this.onpractice) this.onpractice();
      });
    }
  }
  
  spawnKvRow(table, label) {
    const tr = this.dom.spawn(table, "TR");
    const tdKey = this.dom.spawn(tr, "TD");
    tdKey.innerText = label;
    const tdValue = this.dom.spawn(tr, "TD");
    const input = this.dom.spawn(tdValue, "INPUT", null, {
      type: (label === "Password") ? "password" : "text",
      name: label,
    });
  }
  
  spawnSubmitRow(table) {
    const tr = this.dom.spawn(table, "TR", ["submit"]);
    const td = this.dom.spawn(tr, "TD", null, { colspan: 2 });
    const input = this.dom.spawn(td, "INPUT", null, {
      type: "submit",
      value: "Login",
    });
  }
  
  getName() {
    return this.element.querySelector("input[name='Name']").value;
  }
  
  getId() {
    const element = this.element.querySelector("input[name='ID']");
    return element && element.value;
  }
  
  getPassword() {
    const element = this.element.querySelector("input[name='Password']");
    return element && element.value;
  }
  
}
