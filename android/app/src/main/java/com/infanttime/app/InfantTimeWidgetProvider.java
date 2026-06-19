package com.infanttime.app;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.view.View;
import android.widget.RemoteViews;

import org.json.JSONException;
import org.json.JSONObject;

public class InfantTimeWidgetProvider extends AppWidgetProvider {
    private static final String PREFERENCES_NAME = "infant_time_widget";
    private static final String SUMMARY_KEY = "today_widget_summary";

    @Override
    public void onUpdate(Context context, AppWidgetManager manager, int[] widgetIds) {
        for (int widgetId : widgetIds) {
            manager.updateAppWidget(widgetId, buildViews(context));
        }
    }

    private RemoteViews buildViews(Context context) {
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.infant_time_widget);
        Intent launchIntent = new Intent(context, MainActivity.class);
        PendingIntent pendingIntent = PendingIntent.getActivity(
            context,
            0,
            launchIntent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
        views.setOnClickPendingIntent(R.id.widget_root, pendingIntent);

        SharedPreferences preferences = context.getSharedPreferences(PREFERENCES_NAME, Context.MODE_PRIVATE);
        String rawSummary = preferences.getString(SUMMARY_KEY, null);
        if (rawSummary == null) {
            showEmptyState(views);
            return views;
        }

        try {
            JSONObject summary = new JSONObject(rawSummary);
            String babyName = summary.optString("babyName", "아기");
            String lastFeedAt = summary.isNull("lastFeedAt") ? "" : summary.optString("lastFeedAt", "");
            int bottleMl = summary.optInt("feedingMl", 0);
            int breastMinutes = summary.optInt("breastfeedingMinutes", 0);
            int sleepMinutes = summary.optInt("sleepMinutes", 0);
            int diaperCount = summary.optInt("diaperCount", 0);
            boolean sleeping =
                !summary.isNull("activeSleepStartedAt") &&
                !summary.optString("activeSleepStartedAt", "").isEmpty();

            views.setTextViewText(R.id.widget_baby_name, babyName);
            views.setTextViewText(
                R.id.widget_feed_value,
                lastFeedAt.isEmpty() ? "기록 없음" : summary.optString("lastFeedTime", "-") + " 마지막 수유"
            );
            views.setTextViewText(
                R.id.widget_today_feed,
                bottleMl + "ml · 모유 " + breastMinutes + "분"
            );
            views.setTextViewText(
                R.id.widget_sleep_value,
                formatMinutes(sleepMinutes) + (sleeping ? " · 수면 중" : "")
            );
            views.setTextViewText(R.id.widget_diaper_value, "기저귀 " + diaperCount + "회");
            views.setViewVisibility(R.id.widget_empty_copy, View.GONE);
            views.setViewVisibility(R.id.widget_content, View.VISIBLE);
        } catch (JSONException error) {
            showEmptyState(views);
        }

        return views;
    }

    private void showEmptyState(RemoteViews views) {
        views.setTextViewText(R.id.widget_baby_name, "앙팡타임");
        views.setViewVisibility(R.id.widget_content, View.GONE);
        views.setViewVisibility(R.id.widget_empty_copy, View.VISIBLE);
    }

    private String formatMinutes(int minutes) {
        int hours = minutes / 60;
        int remaining = minutes % 60;
        if (hours == 0) {
            return remaining + "분";
        }
        if (remaining == 0) {
            return hours + "시간";
        }
        return hours + "시간 " + remaining + "분";
    }
}
