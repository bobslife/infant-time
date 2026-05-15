import Foundation
import SwiftUI
import WidgetKit

struct InfantTimeWidgetEntry: TimelineEntry {
    let date: Date
    let feedingMl: Int
    let sleepMinutes: Int
    let lastFeedAt: Date?
    let lastFeedAmountMl: Int?
}

struct InfantTimeWidgetProvider: TimelineProvider {
    func placeholder(in context: Context) -> InfantTimeWidgetEntry {
        InfantTimeWidgetEntry(
            date: Date(),
            feedingMl: 720,
            sleepMinutes: 520,
            lastFeedAt: Calendar.current.date(byAdding: .minute, value: -135, to: Date()),
            lastFeedAmountMl: 120
        )
    }

    func getSnapshot(in context: Context, completion: @escaping (InfantTimeWidgetEntry) -> Void) {
        completion(loadEntry())
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<InfantTimeWidgetEntry>) -> Void) {
        let entry = loadEntry()
        let nextRefresh = Calendar.current.date(byAdding: .minute, value: 30, to: Date()) ?? Date()
        completion(Timeline(entries: [entry], policy: .after(nextRefresh)))
    }

    private func loadEntry() -> InfantTimeWidgetEntry {
        let defaults = UserDefaults(suiteName: "group.com.infanttime.app")
        let summary = defaults?.dictionary(forKey: "todayWidgetSummary")
        let feedingMl = summary?["feedingMl"] as? Int ?? defaults?.integer(forKey: "todayFeedingMl") ?? 0
        let sleepMinutes = summary?["sleepMinutes"] as? Int ?? defaults?.integer(forKey: "todaySleepMinutes") ?? 0
        let lastFeedAtString = summary?["lastFeedAt"] as? String ?? defaults?.string(forKey: "lastFeedAt")
        let lastFeedAmountMl = summary?["lastFeedAmountMl"] as? Int ?? defaults?.integer(forKey: "lastFeedAmountMl")

        return InfantTimeWidgetEntry(
            date: Date(),
            feedingMl: feedingMl,
            sleepMinutes: sleepMinutes,
            lastFeedAt: parseDate(lastFeedAtString),
            lastFeedAmountMl: lastFeedAmountMl == 0 ? nil : lastFeedAmountMl
        )
    }

    private func parseDate(_ value: String?) -> Date? {
        guard let value else {
            return nil
        }

        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        if let date = formatter.date(from: value) {
            return date
        }

        formatter.formatOptions = [.withInternetDateTime]
        return formatter.date(from: value)
    }
}

struct InfantTimeWidgetView: View {
    var entry: InfantTimeWidgetProvider.Entry

    private var sleepText: String {
        let hours = entry.sleepMinutes / 60
        let minutes = entry.sleepMinutes % 60
        return hours > 0 ? "\(hours)시간 \(minutes)분" : "\(minutes)분"
    }

    private var lastFeedText: String {
        guard let lastFeedAt = entry.lastFeedAt else {
            return "마지막 수유 기록 없음"
        }

        let elapsedMinutes = max(0, Int(entry.date.timeIntervalSince(lastFeedAt) / 60))
        let hours = elapsedMinutes / 60
        let minutes = elapsedMinutes % 60
        let elapsedText: String

        if hours > 0 {
            elapsedText = minutes > 0 ? "\(hours)시간 \(minutes)분 전" : "\(hours)시간 전"
        } else if minutes > 0 {
            elapsedText = "\(minutes)분 전"
        } else {
            elapsedText = "방금 전"
        }

        return "마지막 수유 \(elapsedText)"
    }

    private var lastFeedAmountText: String? {
        guard let amount = entry.lastFeedAmountMl else {
            return nil
        }

        return "\(amount)ml"
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("오늘의 기록")
                .font(.caption)
                .fontWeight(.semibold)
                .foregroundStyle(.secondary)

            Text(lastFeedText)
                .font(.headline)
                .fontWeight(.bold)
                .lineLimit(1)

            HStack(spacing: 12) {
                VStack(alignment: .leading, spacing: 2) {
                    Text("오늘 수유")
                        .font(.caption2)
                        .foregroundStyle(.secondary)
                    Text("\(entry.feedingMl)ml")
                        .font(.headline)
                        .fontWeight(.bold)
                }

                VStack(alignment: .leading, spacing: 2) {
                    Text("수면")
                        .font(.caption2)
                        .foregroundStyle(.secondary)
                    Text(sleepText)
                        .font(.headline)
                        .fontWeight(.bold)
                }
            }

            Spacer(minLength: 0)

            if let lastFeedAmountText = lastFeedAmountText {
                Text("최근 수유량 \(lastFeedAmountText)")
                    .font(.caption2)
                    .fontWeight(.semibold)
                    .foregroundStyle(.secondary)
                    .lineLimit(1)
            }
        }
        .padding()
        .background(Color(red: 0.96, green: 0.98, blue: 1.0))
    }
}

struct InfantTimeWidgetHome: Widget {
    let kind: String = "InfantTimeWidgetHome"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: InfantTimeWidgetProvider()) { entry in
            InfantTimeWidgetView(entry: entry)
        }
        .configurationDisplayName("앙팡타임")
        .description("오늘의 수유와 수면 기록을 확인해요.")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}
