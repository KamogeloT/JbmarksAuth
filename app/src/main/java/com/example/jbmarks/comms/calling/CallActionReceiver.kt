package com.example.jbmarks.comms.calling

import android.app.NotificationManager
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log

/**
 * Handles Accept/Decline actions from the incoming call notification.
 */
class CallActionReceiver : BroadcastReceiver() {

    private val TAG = "CallActionReceiver"

    override fun onReceive(context: Context, intent: Intent) {
        when (intent.action) {
            CallForegroundService.ACTION_ACCEPT -> {
                Log.d(TAG, "✅ Call accepted from notification")
                // Launch app to show the call screen — it will handle accepting
                val launchIntent = Intent(context, com.example.jbmarks.MainActivity::class.java).apply {
                    flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
                    putExtra("accept_call", true)
                }
                context.startActivity(launchIntent)
                CallForegroundService.stop(context)
            }

            CallForegroundService.ACTION_DECLINE -> {
                Log.d(TAG, "❌ Call declined from notification")
                CallingService.declineCall(context)
                CallForegroundService.stop(context)
                
                val nm = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
                nm.cancel(CallForegroundService.NOTIFICATION_ID)
            }
        }
    }
}
