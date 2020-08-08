/* BackgroundImageService.js
 */
 
export class BackgroundImageService {

  static getDependencies() {
    return [Window];
  }
  constructor(window) {
    this.window = window;
  }
  
  loadRandomImage() {
    const url = "https://picsum.photos/800/600";
    return this.window.fetch(url).then((response) => {
      if (!response.ok) throw response;
      return response.blob().then((blob) => {
        return new Promise((resolve, reject) => {
          const image = new Image();
          image.src = URL.createObjectURL(blob);
          image.addEventListener("load", (event) => {
            image.setAttribute("permanent-url", response.url);
            resolve(image);
          });
          image.addEventListener("error", (error) => {
            reject(error);
          });
        });
      });
    });
  }
  
}

BackgroundImageService.singleton = true;
