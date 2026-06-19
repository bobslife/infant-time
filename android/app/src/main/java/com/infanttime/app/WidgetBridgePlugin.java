package com.infanttime.app;

import android.appwidget.AppWidgetManager;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "WidgetBridge")
public class WidgetBridgePlugin extends Plugin {
    private static final String PREFERENCES_NAME = "infant_time_widget";
    private static final String SUMMARY_KEY = "today_widget_summary";

    @PluginMethod
    public void saveSummary(PluginCall call) {
        JSObject summary = call.getObject("summary");
        if (summary == null) {
            call.reject("위젯 요약 정보가 없습니다.");
            return;
        }

        preferences().edit().putString(SUMMARY_KEY, summary.toString()).apply();
        refreshWidgets();
        call.resolve();
    }

    @PluginMethod
    public void clearSummary(PluginCall call) {
        preferences().edit().remove(SUMMARY_KEY).apply();
        refreshWidgets();
        call.resolve();
    }

    private SharedPreferences preferences() {
        return getContext().getSharedPreferences(PREFERENCES_NAME, Context.MODE_PRIVATE);
    }

    private void refreshWidgets() {
        Context context = getContext();
        AppWidgetManager manager = AppWidgetManager.getInstance(context);
        ComponentName provider = new ComponentName(context, InfantTimeWidgetProvider.class);
        int[] widgetIds = manager.getAppWidgetIds(provider);
        Intent intent = new Intent(context, InfantTimeWidgetProvider.class);
        intent.setAction(AppWidgetManager.ACTION_APPWIDGET_UPDATE);
        intent.putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, widgetIds);
        context.sendBroadcast(intent);
    }
}
