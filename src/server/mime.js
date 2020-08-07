function guessMimeType(path, data) {
  const ext = path.split('.').pop().toLowerCase();
  switch (ext) {
    case "html": return "text/html";
    case "js": return "application/javascript";
    case "css": return "text/css";
    case "png": return "image/png";
    case "jpeg": return "image/jpeg";
  }
  return "application/octet-stream";
}

module.exports = {
  guessMimeType,
};
