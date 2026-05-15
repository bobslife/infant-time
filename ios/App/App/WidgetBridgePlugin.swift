import Foundation
import Capacitor
import WidgetKit

@objc(WidgetBridgePlugin)
public class WidgetBridgePlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "WidgetBridgePlugin"
    public let jsName = "WidgetBridge"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "saveSummary", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "clearSummary", returnType: CAPPluginReturnPromise)
    ]

    private let suiteName = "group.com.infanttime.app"
    private let summaryKey = "todayWidgetSummary"

    @objc func saveSummary(_ call: CAPPluginCall) {
        guard let summary = call.getObject("summary") else {
            call.reject("요약 데이터를 받지 못했어요.")
            return
        }

        let defaults = UserDefaults(suiteName: suiteName)
        defaults?.set(summary, forKey: summaryKey)
        defaults?.set(summary["feedingMl"] as? Int ?? 0, forKey: "todayFeedingMl")
        defaults?.set(summary["sleepMinutes"] as? Int ?? 0, forKey: "todaySleepMinutes")
        defaults?.set(summary["lastFeedAt"] as? String, forKey: "lastFeedAt")
        defaults?.set(summary["lastFeedAmountMl"] as? Int ?? 0, forKey: "lastFeedAmountMl")
        defaults?.set(summary["diaperCount"] as? Int ?? 0, forKey: "todayDiaperCount")
        defaults?.set(summary["mealCount"] as? Int ?? 0, forKey: "todayMealCount")
        defaults?.set(summary["playMinutes"] as? Int ?? 0, forKey: "todayPlayMinutes")
        defaults?.set(summary["medicineCount"] as? Int ?? 0, forKey: "todayMedicineCount")
        defaults?.set(summary["temperatureCount"] as? Int ?? 0, forKey: "todayTemperatureCount")
        defaults?.set(summary["lastEventLabel"] as? String ?? "기록 없음", forKey: "lastEventLabel")
        defaults?.set(summary["lastEventTime"] as? String ?? "-", forKey: "lastEventTime")
        defaults?.set(summary["updatedAt"] as? String ?? ISO8601DateFormatter().string(from: Date()), forKey: "todayWidgetUpdatedAt")

        WidgetCenter.shared.reloadAllTimelines()
        call.resolve()
    }

    @objc func clearSummary(_ call: CAPPluginCall) {
        let defaults = UserDefaults(suiteName: suiteName)
        defaults?.removeObject(forKey: summaryKey)
        defaults?.removeObject(forKey: "todayFeedingMl")
        defaults?.removeObject(forKey: "todaySleepMinutes")
        defaults?.removeObject(forKey: "lastFeedAt")
        defaults?.removeObject(forKey: "lastFeedAmountMl")
        defaults?.removeObject(forKey: "todayDiaperCount")
        defaults?.removeObject(forKey: "todayMealCount")
        defaults?.removeObject(forKey: "todayPlayMinutes")
        defaults?.removeObject(forKey: "todayMedicineCount")
        defaults?.removeObject(forKey: "todayTemperatureCount")
        defaults?.removeObject(forKey: "lastEventLabel")
        defaults?.removeObject(forKey: "lastEventTime")
        defaults?.removeObject(forKey: "todayWidgetUpdatedAt")

        WidgetCenter.shared.reloadAllTimelines()
        call.resolve()
    }
}
