/* Transport.js
 */
 
export class Transport {

  static getDependencies() {
    return [Window];
  }
  constructor(window) {
    this.window = window;
    
    this.schemeAndHost = "http://localhost:8080";
    this.accessToken = "";
  }
  
  /* Friendly typed requests.
   ****************************************************/
  
  get(path, params) {
    return this.request("GET", path, params);
  }
  
  post(path, params, type, body) {
    return this.request("POST", path, params, {
      "Content-Type": type,
    }, body);
  }
  
  put(path, params, type, body) {
    return this.request("PUT", path, params, {
      "Content-Type": type,
    }, body);
  }
  
  delete(path, params) {
    return this.request("DELETE", path, params);
  }
  
  /* Generic HTTP request.
   ****************************************************/
   
  request(method, path, params, headers, body) {
    const url = this.composeUrl(path, params);
    if (!headers) headers = {};
    if (this.accessToken) headers["Authorization"] = `Bearer ${this.accessToken}`;
    return this.window.fetch(url, {
      method,
      headers,
      body,
    }).then((response) => {
      if (!response.ok) throw response;
      return response;
    });
  }
  
  composeUrl(path, params) {
    path = this.schemeAndHost + path;
    if (params) {
      let separator = '?';
      for (const key of Object.keys(params)) {
        const value = params[key];
        if ((value === null) || (value === undefined) || (value === "")) continue;
        path += separator;
        separator = '&';
        path += encodeURIComponent(key);
        path += '=';
        path += encodeURIComponent(value);
      }
    }
    return path;
  }
  
}

Transport.singleton = true;
