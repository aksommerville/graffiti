/* respond.js
 * Helpers for HTTP responses.
 */
 
const fs = require("fs");
const { guessMimeType } = require("./mime.js");
 
// Call after response.end()
function logTransaction(request, response) {
  console.log(`${new Date().toISOString()} ${response.statusCode} ${request.method} ${request.url}`);
}

function cannedErrorMessage(statusCode) {
  switch (statusCode) {
    case 401: return "Unauthorized";
    case 403: return "Forbidden";
    case 404: return "Not Found";
    case 405: return "Method Not Allowed";
    case 599: return "TODO";
  }
  switch (Math.floor(statusCode / 100)) {
    case 200: return "OK";
    case 300: return "Redirect";
    case 400: return "Client Error";
    case 500: return "Internal Server Error";
  }
  return "";
}

function serveError(request, response, error) {
  if (typeof(error) === "number") error = { statusCode: error };
  else if (!error) error = {};
  response.statusCode = error.statusCode || 500;
  response.statusMessage = error.statusMessage || cannedErrorMessage(response.statusCode);
  response.end();
  logTransaction(request, response);
}

function serveVoid(request, response) {
  response.statusCode = 200;
  response.statusMessage = "OK";
  response.end();
  logTransaction(request, response);
}

function serveText(request, response, text) {
  response.statusCode = 200;
  response.statusMessage = "OK";
  response.end(text);
  logTransaction(request, response);
}

function serveJson(request, response, object) {
  const json = JSON.stringify(object);
  response.statusCode = 200;
  response.statusMessage = "OK";
  response.end(json);
  logTransaction(request, response);
}

function serveStaticFile(request, response, root) {
  if (request.method !== "GET") {
    return serveError(request, response, 405);
  }
  fs.realpath(`${root}/${request.url}`, (error, path) => {
    if (error || !path.startsWith(root)) return serveError(request, response, {
      ...error,
      statusCode: 404,
    });
    fs.readFile(path, (error, data) => {
      if (error) return serveError(request, response, {
        ...error,
        statusCode: 404,
      });
      
      response.setHeader("Content-Type", guessMimeType(path, data));
      response.statusCode = 200;
      response.status = "OK";
      response.end(data);
      logTransaction(request, response);
    });
  });
}

module.exports = {
  logTransaction,
  cannedErrorMessage,
  serveError,
  serveVoid,
  serveText,
  serveJson,
  serveStaticFile,
};
