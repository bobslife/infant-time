import Foundation
import SwiftUI
import UIKit
import WidgetKit

struct InfantTimeWidgetEntry: TimelineEntry {
    let date: Date
    let babyName: String
    let babyBirthDate: String?
    let babyGender: BabyGender
    let feedIntervalMinutes: Int
    let feedingMl: Int
    let sleepMinutes: Int
    let lastFeedAt: Date?
    let lastFeedAmountMl: Int?
    let activeSleepStartedAt: Date?
    let awakeStartedAt: Date?
}

struct InfantTimeWidgetProvider: TimelineProvider {
    func placeholder(in context: Context) -> InfantTimeWidgetEntry {
        InfantTimeWidgetEntry(
            date: Date(),
            babyName: "아기천사",
            babyBirthDate: "2026-05-01",
            babyGender: .boy,
            feedIntervalMinutes: 180,
            feedingMl: 720,
            sleepMinutes: 520,
            lastFeedAt: Calendar.current.date(byAdding: .minute, value: -135, to: Date()),
            lastFeedAmountMl: 120,
            activeSleepStartedAt: nil,
            awakeStartedAt: Calendar.current.date(byAdding: .minute, value: -50, to: Date())
        )
    }

    func getSnapshot(in context: Context, completion: @escaping (InfantTimeWidgetEntry) -> Void) {
        completion(loadEntry(date: Date()))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<InfantTimeWidgetEntry>) -> Void) {
        let now = Date()
        let entries = (0..<60).map { offset in
            let entryDate = Calendar.current.date(byAdding: .minute, value: offset, to: now) ?? now
            return loadEntry(date: entryDate)
        }
        let nextRefresh = Calendar.current.date(byAdding: .minute, value: 60, to: now) ?? now
        completion(Timeline(entries: entries, policy: .after(nextRefresh)))
    }

    private func loadEntry(date: Date) -> InfantTimeWidgetEntry {
        let defaults = UserDefaults(suiteName: "group.com.infanttime.app")
        let summary = defaults?.dictionary(forKey: "todayWidgetSummary")
        let babyName = summary?["babyName"] as? String ?? defaults?.string(forKey: "babyName") ?? "앙팡타임"
        let babyBirthDate = summary?["babyBirthDate"] as? String ?? defaults?.string(forKey: "babyBirthDate")
        let babyGender = BabyGender(rawValue: summary?["babyGender"] as? String ?? defaults?.string(forKey: "babyGender") ?? "boy") ?? .boy
        let feedIntervalMinutes = summary?["feedIntervalMinutes"] as? Int ?? defaults?.integer(forKey: "feedIntervalMinutes") ?? 180
        let feedingMl = summary?["feedingMl"] as? Int ?? defaults?.integer(forKey: "todayFeedingMl") ?? 0
        let sleepMinutes = summary?["sleepMinutes"] as? Int ?? defaults?.integer(forKey: "todaySleepMinutes") ?? 0
        let lastFeedAtString = summary?["lastFeedAt"] as? String ?? defaults?.string(forKey: "lastFeedAt")
        let lastFeedAmountMl = summary?["lastFeedAmountMl"] as? Int ?? defaults?.integer(forKey: "lastFeedAmountMl")
        let activeSleepStartedAtString = summary?["activeSleepStartedAt"] as? String ?? defaults?.string(forKey: "activeSleepStartedAt")
        let awakeStartedAtString = summary?["awakeStartedAt"] as? String ?? defaults?.string(forKey: "awakeStartedAt")

        return InfantTimeWidgetEntry(
            date: date,
            babyName: babyName,
            babyBirthDate: babyBirthDate,
            babyGender: babyGender,
            feedIntervalMinutes: feedIntervalMinutes > 0 ? feedIntervalMinutes : 180,
            feedingMl: feedingMl,
            sleepMinutes: sleepMinutes,
            lastFeedAt: parseDate(lastFeedAtString),
            lastFeedAmountMl: lastFeedAmountMl == 0 ? nil : lastFeedAmountMl,
            activeSleepStartedAt: parseDate(activeSleepStartedAtString),
            awakeStartedAt: parseDate(awakeStartedAtString)
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
    @Environment(\.widgetFamily) private var family

    private var model: FeedingWidgetViewModel {
        FeedingWidgetViewModel(entry: entry)
    }

    var body: some View {
        Group {
            if family == .systemSmall {
                BabyDayCard(model: model)
            } else {
                mediumBody
            }
        }
        .widgetBackground(model.palette.background)
    }

    private var mediumBody: some View {
        VStack(alignment: .leading, spacing: WidgetTheme.Spacing.section) {
            Header(model: model)
            MainCountdown(model: model)
            ProgressBar(model: model)
            MetricGrid(model: model)
        }
        .padding(WidgetTheme.Spacing.mediumPadding)
    }
}

private struct WidgetTheme {
    static let cardBackground = dynamicColor(light: UIColor(red: 1.0, green: 1.0, blue: 1.0, alpha: 0.72), dark: UIColor(red: 0.18, green: 0.19, blue: 0.22, alpha: 0.72))
    static let widgetBackground = Color.white
    static let primaryText = Color(UIColor(red: 0.09, green: 0.10, blue: 0.12, alpha: 1.0))
    static let secondaryText = Color(UIColor(red: 0.56, green: 0.56, blue: 0.58, alpha: 1.0))
    static let separator = Color(UIColor(red: 0.90, green: 0.90, blue: 0.92, alpha: 1.0))
    static let calm = dynamicColor(light: UIColor(red: 0.25, green: 0.58, blue: 0.74, alpha: 1.0), dark: UIColor(red: 0.43, green: 0.76, blue: 0.86, alpha: 1.0))
    static let soon = dynamicColor(light: UIColor(red: 0.79, green: 0.54, blue: 0.10, alpha: 1.0), dark: UIColor(red: 0.98, green: 0.74, blue: 0.28, alpha: 1.0))
    static let overdue = dynamicColor(light: UIColor(red: 0.88, green: 0.34, blue: 0.32, alpha: 1.0), dark: UIColor(red: 1.0, green: 0.52, blue: 0.48, alpha: 1.0))
    static let sleep = dynamicColor(light: UIColor(red: 0.43, green: 0.45, blue: 0.78, alpha: 1.0), dark: UIColor(red: 0.65, green: 0.66, blue: 0.94, alpha: 1.0))

    struct Spacing {
        static let mediumPadding: CGFloat = 16
        static let smallPadding: CGFloat = 18
        static let section: CGFloat = 8
        static let tight: CGFloat = 4
    }

    struct Radius {
        static let card: CGFloat = 30
        static let pill: CGFloat = 999
        static let bar: CGFloat = 5
    }

    fileprivate static func dynamicColor(light: UIColor, dark: UIColor) -> Color {
        Color(UIColor { traits in
            traits.userInterfaceStyle == .dark ? dark : light
        })
    }
}

enum BabyGender: String {
    case boy
    case girl
}

private struct WidgetPalette {
    let background: Color
    let accent: Color
    let accentSoft: Color
    let profileBorder: Color

    static func palette(for gender: BabyGender) -> WidgetPalette {
        switch gender {
        case .boy:
            return WidgetPalette(
                background: WidgetTheme.widgetBackground,
                accent: WidgetTheme.dynamicColor(light: UIColor(red: 0.27, green: 0.58, blue: 0.78, alpha: 1.0), dark: UIColor(red: 0.50, green: 0.78, blue: 0.92, alpha: 1.0)),
                accentSoft: WidgetTheme.dynamicColor(light: UIColor(red: 0.78, green: 0.90, blue: 0.98, alpha: 1.0), dark: UIColor(red: 0.16, green: 0.27, blue: 0.34, alpha: 1.0)),
                profileBorder: WidgetTheme.dynamicColor(light: UIColor(red: 0.65, green: 0.84, blue: 0.95, alpha: 1.0), dark: UIColor(red: 0.34, green: 0.55, blue: 0.68, alpha: 1.0))
            )
        case .girl:
            return WidgetPalette(
                background: WidgetTheme.widgetBackground,
                accent: WidgetTheme.dynamicColor(light: UIColor(red: 0.86, green: 0.42, blue: 0.59, alpha: 1.0), dark: UIColor(red: 1.0, green: 0.63, blue: 0.76, alpha: 1.0)),
                accentSoft: WidgetTheme.dynamicColor(light: UIColor(red: 1.0, green: 0.82, blue: 0.89, alpha: 1.0), dark: UIColor(red: 0.36, green: 0.18, blue: 0.25, alpha: 1.0)),
                profileBorder: WidgetTheme.dynamicColor(light: UIColor(red: 0.96, green: 0.70, blue: 0.82, alpha: 1.0), dark: UIColor(red: 0.68, green: 0.38, blue: 0.51, alpha: 1.0))
            )
        }
    }
}

private enum FeedUrgency {
    case calm
    case soon
    case overdue
    case empty

    var label: String {
        switch self {
        case .calm:
            return "수유 여유"
        case .soon:
            return "곧 수유"
        case .overdue:
            return "수유 필요"
        case .empty:
            return "기록 필요"
        }
    }

    var color: Color {
        switch self {
        case .calm:
            return WidgetTheme.calm
        case .soon:
            return WidgetTheme.soon
        case .overdue:
            return WidgetTheme.overdue
        case .empty:
            return WidgetTheme.secondaryText
        }
    }
}

private struct FeedingWidgetViewModel {
    let entry: InfantTimeWidgetEntry
    let ageDays: Int?
    let birthDate: Date?
    let elapsedFeedMinutes: Int?
    let remainingFeedMinutes: Int?
    let feedProgress: Double
    let urgency: FeedUrgency
    let sleepAnchorDate: Date?
    let sleepDurationMinutes: Int?
    let isSleeping: Bool
    let palette: WidgetPalette

    init(entry: InfantTimeWidgetEntry) {
        self.entry = entry
        self.birthDate = Self.parseBirthDate(entry.babyBirthDate)
        self.ageDays = Self.calculateAgeDays(birthDate: birthDate, now: entry.date)
        self.palette = WidgetPalette.palette(for: entry.babyGender)

        if let lastFeedAt = entry.lastFeedAt {
            let elapsed = max(0, Int(entry.date.timeIntervalSince(lastFeedAt) / 60))
            let remaining = entry.feedIntervalMinutes - elapsed
            self.elapsedFeedMinutes = elapsed
            self.remainingFeedMinutes = remaining
            self.feedProgress = min(1, max(0, Double(elapsed) / Double(max(entry.feedIntervalMinutes, 1))))

            if remaining <= 0 {
                self.urgency = .overdue
            } else if remaining <= 30 {
                self.urgency = .soon
            } else {
                self.urgency = .calm
            }
        } else {
            self.elapsedFeedMinutes = nil
            self.remainingFeedMinutes = nil
            self.feedProgress = 0
            self.urgency = .empty
        }

        self.isSleeping = entry.activeSleepStartedAt != nil
        if let activeSleepStartedAt = entry.activeSleepStartedAt {
            self.sleepAnchorDate = activeSleepStartedAt
            self.sleepDurationMinutes = max(0, Int(entry.date.timeIntervalSince(activeSleepStartedAt) / 60))
        } else if let awakeStartedAt = entry.awakeStartedAt {
            self.sleepAnchorDate = awakeStartedAt
            self.sleepDurationMinutes = max(0, Int(entry.date.timeIntervalSince(awakeStartedAt) / 60))
        } else {
            self.sleepAnchorDate = nil
            self.sleepDurationMinutes = nil
        }
    }

    var babyName: String {
        entry.babyName.isEmpty ? "아기" : entry.babyName
    }

    var profileImageName: String {
        entry.babyGender == .girl ? "default-profile-girl" : "default-profile-boy"
    }

    var urgencyColor: Color {
        switch urgency {
        case .calm:
            return palette.accent
        case .soon:
            return WidgetTheme.soon
        case .overdue:
            return WidgetTheme.overdue
        case .empty:
            return WidgetTheme.secondaryText
        }
    }

    var ageDaysText: String {
        guard let ageDays else {
            return "생후 -일"
        }
        return "생후 \(ageDays)일"
    }

    var birthDateText: String {
        guard let birthDate else {
            return "생일 미등록"
        }

        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "ko_KR")
        formatter.dateFormat = "M월 d일 출생"
        return formatter.string(from: birthDate)
    }

    var compactBirthDateText: String {
        guard let birthDate else {
            return "생일 미등록"
        }

        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "ko_KR")
        formatter.dateFormat = "yyyy.MM.dd 출생"
        return formatter.string(from: birthDate)
    }

    var nextMilestoneText: String {
        guard let ageDays else {
            return "오늘의 기록을 남겨보세요"
        }

        let milestones = [50, 100, 365]
        if let next = milestones.first(where: { $0 > ageDays }) {
            let remainingDays = next - ageDays
            if next == 365 {
                return "첫돌까지 \(remainingDays)일 남았어요"
            }

            return "\(next)일까지 \(remainingDays)일 남았어요"
        }

        if ageDays == 365 {
            return "오늘 첫돌이에요"
        }

        guard let birthDate else {
            return "다음 생일을 기다리고 있어요"
        }

        let daysUntilBirthday = Self.daysUntilNextBirthday(birthDate: birthDate, now: entry.date)
        return "\(daysUntilBirthday)일 후 생일이에요"
    }

    var countdownText: String {
        guard let remainingFeedMinutes else {
            return "첫 수유를 기록해 주세요"
        }

        if remainingFeedMinutes <= 0 {
            return "\(Self.formatDuration(abs(remainingFeedMinutes))) 지났어요"
        }

        return "\(Self.formatDuration(remainingFeedMinutes)) 남았어요"
    }

    var isFeedOverdue: Bool {
        guard let nextFeedDueAt else {
            return false
        }

        return nextFeedDueAt <= entry.date
    }

    var elapsedFeedText: String {
        guard let elapsedFeedMinutes else {
            return "수유 기록 없음"
        }

        return "마지막 수유 후 \(Self.formatDuration(elapsedFeedMinutes)) 경과"
    }

    var lastFeedTimeText: String {
        guard let lastFeedAt = entry.lastFeedAt else {
            return "기록 없음"
        }

        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "ko_KR")
        formatter.dateFormat = "a h:mm"
        return formatter.string(from: lastFeedAt)
    }

    var sleepSummaryText: String {
        guard let sleepDurationMinutes else {
            return isSleeping ? "수면중" : "깨어있음"
        }

        if isSleeping {
            return "\(Self.formatDuration(sleepDurationMinutes))째 수면중"
        }

        return "\(Self.formatDuration(sleepDurationMinutes))째 깨어있음"
    }

    var sleepMetricValue: String {
        guard let sleepDurationMinutes else {
            return isSleeping ? "수면중" : "깨어있음"
        }

        return Self.formatDuration(sleepDurationMinutes)
    }

    var feedIntervalText: String {
        Self.formatDuration(entry.feedIntervalMinutes)
    }

    var widgetUpdateText: String {
        "1분마다 업데이트"
    }

    var nextFeedDueAt: Date? {
        guard let lastFeedAt = entry.lastFeedAt else {
            return nil
        }

        return Calendar.current.date(byAdding: .minute, value: entry.feedIntervalMinutes, to: lastFeedAt)
    }

    static func formatDuration(_ minutes: Int) -> String {
        if minutes < 60 {
            return "\(minutes)분"
        }

        let hours = minutes / 60
        let remainingMinutes = minutes % 60

        if remainingMinutes == 0 {
            return "\(hours)시간"
        }

        return "\(hours)시간 \(remainingMinutes)분"
    }

    private static func parseBirthDate(_ value: String?) -> Date? {
        guard let value else {
            return nil
        }

        let formatter = DateFormatter()
        formatter.calendar = Calendar(identifier: .gregorian)
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.dateFormat = "yyyy-MM-dd"
        return formatter.date(from: value)
    }

    private static func calculateAgeDays(birthDate: Date?, now: Date) -> Int? {
        guard let birthDate else {
            return nil
        }

        let calendar = Calendar.current
        let birthStart = calendar.startOfDay(for: birthDate)
        let todayStart = calendar.startOfDay(for: now)
        return max(0, calendar.dateComponents([.day], from: birthStart, to: todayStart).day ?? 0) + 1
    }

    private static func daysUntilNextBirthday(birthDate: Date, now: Date) -> Int {
        let calendar = Calendar.current
        let today = calendar.startOfDay(for: now)
        let birthComponents = calendar.dateComponents([.month, .day], from: birthDate)
        let currentYear = calendar.component(.year, from: today)

        var nextBirthdayComponents = DateComponents()
        nextBirthdayComponents.year = currentYear
        nextBirthdayComponents.month = birthComponents.month
        nextBirthdayComponents.day = birthComponents.day

        var nextBirthday = calendar.date(from: nextBirthdayComponents) ?? today
        if nextBirthday < today {
            nextBirthdayComponents.year = currentYear + 1
            nextBirthday = calendar.date(from: nextBirthdayComponents) ?? today
        }

        return max(0, calendar.dateComponents([.day], from: today, to: nextBirthday).day ?? 0)
    }
}

private struct Header: View {
    let model: FeedingWidgetViewModel

    var body: some View {
        HStack(alignment: .center, spacing: 8) {
            HStack(spacing: 7) {
                ProfileImage(model: model, size: 28)

                VStack(alignment: .leading, spacing: 1) {
                    Text(model.babyName)
                        .font(.system(size: 16, weight: .semibold, design: .rounded))
                        .foregroundStyle(WidgetTheme.primaryText)
                        .lineLimit(1)
                        .minimumScaleFactor(0.78)

                    Text(model.ageDaysText)
                        .font(.system(size: 11, weight: .medium, design: .rounded))
                        .foregroundStyle(WidgetTheme.secondaryText)
                        .lineLimit(1)
                }
            }

            Spacer(minLength: 6)

            StatusBadge(urgency: model.urgency, color: model.urgencyColor)
        }
    }
}

private struct ProfileImage: View {
    let model: FeedingWidgetViewModel
    let size: CGFloat

    private var image: UIImage? {
        if let url = Bundle.main.url(forResource: model.profileImageName, withExtension: "png"),
           let image = UIImage(contentsOfFile: url.path) {
            return image
        }

        return UIImage(named: model.profileImageName)
    }

    var body: some View {
        Group {
            if let image {
                Image(uiImage: image)
                    .resizable()
                    .scaledToFill()
            } else {
                Circle()
                    .fill(model.palette.accentSoft)
                    .overlay(
                        Text(String(model.babyName.prefix(1)))
                            .font(.system(size: size * 0.42, weight: .bold, design: .rounded))
                            .foregroundStyle(model.palette.accent)
                    )
            }
        }
        .frame(width: size, height: size)
        .clipShape(Circle())
        .overlay(
            Circle()
                .stroke(model.palette.profileBorder, lineWidth: 1.5)
        )
        .shadow(color: model.palette.accent.opacity(0.16), radius: 5, x: 0, y: 2)
    }
}

private struct StatusBadge: View {
    let urgency: FeedUrgency
    let color: Color

    var body: some View {
        HStack(spacing: 5) {
            Circle()
                .fill(color)
                .frame(width: 6, height: 6)
            Text(urgency.label)
                .font(.system(size: 11, weight: .semibold, design: .rounded))
                .lineLimit(1)
        }
        .foregroundStyle(color)
        .padding(.horizontal, 9)
        .padding(.vertical, 5)
        .background(color.opacity(0.13), in: Capsule())
    }
}

private struct MainCountdown: View {
    let model: FeedingWidgetViewModel

    var body: some View {
        VStack(alignment: .leading, spacing: 2) {
            HStack(alignment: .top, spacing: 8) {
                Text("다음 수유까지")
                    .font(.system(size: 12, weight: .medium, design: .rounded))
                    .foregroundStyle(WidgetTheme.secondaryText)

                Spacer(minLength: 6)

                VStack(alignment: .trailing, spacing: 1) {
                    Text(model.widgetUpdateText)
                        .font(.system(size: 9.5, weight: .medium, design: .rounded))
                        .foregroundStyle(WidgetTheme.secondaryText)
                        .lineLimit(1)
                        .minimumScaleFactor(0.75)
                }
                .frame(maxWidth: .infinity, alignment: .trailing)
            }

            if let nextFeedDueAt = model.nextFeedDueAt {
                (Text(nextFeedDueAt, style: .relative) + Text(model.isFeedOverdue ? " 지남" : ""))
                .font(.system(size: 31, weight: .bold, design: .rounded))
                .monospacedDigit()
                .foregroundStyle(model.urgencyColor)
                .lineLimit(1)
                .minimumScaleFactor(0.62)

                if let lastFeedAt = model.entry.lastFeedAt {
                    HStack(spacing: 4) {
                        Text("마지막 수유")
                        Text(lastFeedAt, style: .relative) + Text(" 전")
                    }
                    .font(.system(size: 11, weight: .medium, design: .rounded))
                    .foregroundStyle(WidgetTheme.secondaryText)
                    .lineLimit(1)
                    .minimumScaleFactor(0.8)
                } else {
                    Text("수유 기록 없음")
                        .font(.system(size: 11, weight: .medium, design: .rounded))
                        .foregroundStyle(WidgetTheme.secondaryText)
                        .lineLimit(1)
                        .minimumScaleFactor(0.8)
                }
            } else {
                Text(model.countdownText)
                    .font(.system(size: 31, weight: .bold, design: .rounded))
                    .monospacedDigit()
                    .foregroundStyle(model.urgencyColor)
                    .lineLimit(1)
                    .minimumScaleFactor(0.62)

                Text(model.elapsedFeedText)
                    .font(.system(size: 11, weight: .medium, design: .rounded))
                    .foregroundStyle(WidgetTheme.secondaryText)
                    .lineLimit(1)
                    .minimumScaleFactor(0.8)
            }
        }
    }
}

private struct ProgressBar: View {
    let model: FeedingWidgetViewModel

    var body: some View {
        GeometryReader { proxy in
            ZStack(alignment: .leading) {
                Capsule()
                    .fill(WidgetTheme.separator.opacity(0.75))

                Capsule()
                    .fill(model.urgencyColor)
                    .frame(width: max(6, proxy.size.width * model.feedProgress))
            }
        }
        .frame(height: 6)
        .clipShape(Capsule())
        .accessibilityLabel("수유 텀 진행률 \(Int(model.feedProgress * 100))퍼센트")
    }
}

private struct MetricGrid: View {
    let model: FeedingWidgetViewModel

    var body: some View {
        HStack(alignment: .top, spacing: 7) {
            MetricCell(title: "오늘", value: "\(model.entry.feedingMl)ml")
            MetricCell(title: "마지막", value: model.lastFeedTimeText)
            SleepMetricCell(model: model)
            MetricCell(title: "기준 간격", value: model.feedIntervalText)
        }
    }
}

private struct SleepMetricCell: View {
    let model: FeedingWidgetViewModel

    private var accent: Color {
        model.isSleeping ? WidgetTheme.sleep : model.palette.accent
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(model.isSleeping ? "수면" : "깨어있음")
                .font(.system(size: 9.5, weight: .medium, design: .rounded))
                .foregroundStyle(WidgetTheme.secondaryText)
                .lineLimit(1)
                .minimumScaleFactor(0.75)

            if let sleepAnchorDate = model.sleepAnchorDate {
                Text(sleepAnchorDate, style: .relative)
                    .font(.system(size: 13.5, weight: .semibold, design: .rounded))
                    .monospacedDigit()
                    .foregroundStyle(accent)
                    .lineLimit(1)
                    .minimumScaleFactor(0.58)
            } else {
                Text(model.sleepMetricValue)
                    .font(.system(size: 13.5, weight: .semibold, design: .rounded))
                    .monospacedDigit()
                    .foregroundStyle(accent)
                    .lineLimit(1)
                    .minimumScaleFactor(0.58)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }
}

private struct MetricCell: View {
    let title: String
    let value: String
    var accent: Color = WidgetTheme.primaryText

    var body: some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(title)
                .font(.system(size: 9.5, weight: .medium, design: .rounded))
                .foregroundStyle(WidgetTheme.secondaryText)
                .lineLimit(1)
                .minimumScaleFactor(0.75)

            Text(value)
                .font(.system(size: 13.5, weight: .semibold, design: .rounded))
                .monospacedDigit()
                .foregroundStyle(accent)
                .lineLimit(1)
                .minimumScaleFactor(0.58)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }
}

private struct BabyDayCard: View {
    let model: FeedingWidgetViewModel

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack(spacing: 6) {
                ProfileImage(model: model, size: 30)
                Text("앙팡타임")
                    .font(.system(size: 12, weight: .semibold, design: .rounded))
                    .foregroundStyle(WidgetTheme.secondaryText)
                    .lineLimit(1)
                Spacer(minLength: 4)
                Text("♡")
                    .font(.system(size: 12, weight: .semibold, design: .rounded))
                    .foregroundStyle(model.palette.accent)
            }

            Spacer(minLength: 0)

            VStack(alignment: .leading, spacing: 3) {
                Text(model.babyName)
                    .font(.system(size: 18, weight: .semibold, design: .rounded))
                    .foregroundStyle(WidgetTheme.primaryText)
                    .lineLimit(1)
                    .minimumScaleFactor(0.72)

                Text(model.ageDaysText)
                    .font(.system(size: 26, weight: .bold, design: .rounded))
                    .monospacedDigit()
                    .foregroundStyle(WidgetTheme.primaryText)
                    .lineLimit(1)
                    .minimumScaleFactor(0.68)
            }

            VStack(alignment: .leading, spacing: 2) {
                Text(model.birthDateText)
                    .font(.system(size: 11, weight: .medium, design: .rounded))
                    .foregroundStyle(WidgetTheme.secondaryText)
                    .lineLimit(1)
                    .minimumScaleFactor(0.72)

                Text(model.nextMilestoneText)
                    .font(.system(size: 11, weight: .semibold, design: .rounded))
                    .foregroundStyle(model.palette.accent)
                    .lineLimit(1)
                    .minimumScaleFactor(0.68)
            }
        }
        .padding(WidgetTheme.Spacing.smallPadding)
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
    }
}

private extension View {
    @ViewBuilder
    func widgetBackground(_ color: Color) -> some View {
        if #available(iOSApplicationExtension 17.0, *) {
            self.containerBackground(color, for: .widget)
        } else {
            self.background(color)
        }
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
        .contentMarginsDisabled()
    }
}
