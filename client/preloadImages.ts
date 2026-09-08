// Warms the browser's cache for a list of image URLs in the background.
// Doesn't touch the DOM — just tells the browser to fetch and cache each
// image now, so that when it's actually rendered later (e.g. after
// pressing "التالي") it appears instantly instead of loading on demand.
export function preloadImages(urls: Array<string | undefined | null>) {
  urls.forEach((url) => {
    if (!url) return;
    const img = new Image();
    img.src = url;
  });
}
