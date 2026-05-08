import { useEffect, useState } from "react";
import {
  AppUpdateState,
  getInstalledAppVersion,
  getUpdateUrl,
  isVersionLessThan,
  MIN_SUPPORTED_APP_VERSION,
} from "../../lib/appUpdate";

export function useAppUpdateGate(): AppUpdateState {
  const [state, setState] = useState<AppUpdateState>({
    currentVersion: null,
    isChecking: true,
    isRequired: false,
    updateUrl: getUpdateUrl(),
  });

  useEffect(() => {
    let mounted = true;

    async function checkVersion() {
      try {
        const currentVersion = await getInstalledAppVersion();
        const isRequired = currentVersion
          ? isVersionLessThan(currentVersion, MIN_SUPPORTED_APP_VERSION)
          : false;

        if (mounted) {
          setState({
            currentVersion,
            isChecking: false,
            isRequired,
            updateUrl: getUpdateUrl(),
          });
        }
      } catch {
        if (mounted) {
          setState((current) => ({
            ...current,
            isChecking: false,
            isRequired: false,
          }));
        }
      }
    }

    void checkVersion();
    return () => {
      mounted = false;
    };
  }, []);

  return state;
}
