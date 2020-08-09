/* Require.
 *****************************************************/
 
const realRequire = module.__proto__.require;

const stubModules = {};
const dontStubModules = [];

module.__proto__.require = function (name) {
  if (stubModules[name]) return stubModules[name];
  if (this.id !== ".") {
    if (dontStubModules.indexOf(name) < 0) {
      if (name.indexOf("./") >= 0) {
        // Warn about what looks like in-project modules; unit tests shouldn't include more than one file.
        // But there's exceptions to that of course.
        console.warn(`WARNING: Requiring '${name}' from '${this.id}' normally`);
        console.warn(`WARNING: Call test.noThanksIDontWantToStubIt("${name}") to silence this warning.`);
      }
    }
  }
  return realRequire.apply(this, arguments);
};

function stubModule(name, content) {
  if (content) {
    stubModules[name] = content;
  } else {
    delete stubModules[name];
  }
}

function noThanksIDontWantToStubIt(name) {
  if (dontStubModules.indexOf(name) < 0) {
    dontStubModules.push(name);
  }
}

/* Expect.
 *****************************************************/
 
class Expectation {
  constructor(actual) {
    this.actual = actual;
    this.positive = true;
  }
  
  get not() {
    this.positive = false;
    return this;
  }
  
  assert(condition, message) {
    if (!!condition !== this.positive) {
      throw new Error(message || "Assertion failed");
    }
    return this;
  }
  
  toBe(expected) {
    return this.assert(
      this.actual === expected,
      `Expected ${typeof(this.actual)} ${this.actual} to be ${typeof(expected)} ${expected}`
    );
  }
}
 
function expect(actual) {
  return new Expectation(actual);
}

/* TOC
 ******************************************************/
 
module.exports = {
  stubModule,
  noThanksIDontWantToStubIt,
  realRequire,
  expect,
};
