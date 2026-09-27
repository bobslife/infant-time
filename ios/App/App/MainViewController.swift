import Capacitor
import UIKit
import WidgetKit

class MainViewController: CAPBridgeViewController {
    private var appDidBecomeActiveObserver: NSObjectProtocol?

    override open func capacitorDidLoad() {
        super.capacitorDidLoad()
        bridge?.registerPluginInstance(WidgetBridgePlugin())

        appDidBecomeActiveObserver = NotificationCenter.default.addObserver(
            forName: UIApplication.didBecomeActiveNotification,
            object: nil,
            queue: .main
        ) { _ in
            WidgetCenter.shared.reloadTimelines(ofKind: "InfantTimeWidgetHome")
            WidgetCenter.shared.reloadAllTimelines()
        }
    }

    deinit {
        if let appDidBecomeActiveObserver {
            NotificationCenter.default.removeObserver(appDidBecomeActiveObserver)
        }
    }
}
