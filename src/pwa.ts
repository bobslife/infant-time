import { registerSW } from "virtual:pwa-register";

registerSW({
  immediate: true,
  onRegisteredSW(_swScriptUrl, registration) {
    if (!registration) {
      return;
    }

    const checkForUpdate = () => {
      if (!navigator.onLine) {
        return;
      }

      void registration.update().catch(() => undefined);
    };

    window.addEventListener("focus", checkForUpdate);
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") {
        checkForUpdate();
      }
    });

    checkForUpdate();
  },
  onRegisterError(error) {
    console.error("Service worker registration failed", error);
  },
});
