const preventDefault = (event: Event) => {
  event.preventDefault();
};

document.addEventListener("gesturestart", preventDefault, { passive: false });
document.addEventListener("gesturechange", preventDefault, { passive: false });
document.addEventListener("gestureend", preventDefault, { passive: false });
