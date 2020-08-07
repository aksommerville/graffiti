const fs = require('fs');
const http = require('http');
const https = require('https');
const { guessMimeType } = require("./mime.js");

const serverInterface = process.env["INTF"] || "localhost";
const serverPort = +(process.env["PORT"] || "8080");
const htdocsDir = process.env["HTDOCS"];

// Call after response.end()
function logTransaction(request, response) {
  console.log(`${new Date().toISOString()} ${response.statusCode} ${request.method} ${request.url}`);
}

function serveError(request, response, error) {
  if (!error) error = {};
  response.statusCode = error.statusCode || 500;
  response.status = error.statusMessage || `Internal Server Error`;
  response.end();
  logTransaction(request, response);
}

function serveStaticFile(request, response, root) {
  fs.realpath(`${root}/${request.url}`, (error, path) => {
    if (error || !path.startsWith(root)) return serveError(request, response, {
      ...error,
      statusCode: 404,
      statusMessage: "Not found",
    });
    fs.readFile(path, (error, data) => {
      if (error) return serveError(request, response, {
        ...error,
        statusCode: 404,
        statusMessage: "Not found",
      });
      
      response.setHeader("Content-Type", guessMimeType(path, data));
      response.statusCode = 200;
      response.status = "OK";
      response.end(data);
    });
  });
}

function serve(request, response) {
  try {
    
    //TODO serve things other than regular files
    
    if (htdocsDir) {
      serveStaticFile(request, response, htdocsDir);
      return;
    }
    
    serveError(request, response, { statusCode: 404, statusMessage: "Not found" });
    
  } catch (e) {
    console.error(e);
    serveError(request, response, e);
  }
}

const server = http.createServer();
server.listen(serverPort, serverInterface, (error) => {
  if (error) {
    console.error(error);
  } else {
    console.log(`Serving on ${serverInterface}:${serverPort}.`);
    if (htdocsDir) {
      console.log(`Serving static files from '${htdocsDir}'.`);
    } else {
      console.log(`Will not serve static files due to HTDOCS unset.`);
    }
    server.on("request", serve);
  }
});
