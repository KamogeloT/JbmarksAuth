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
                CallingService.acceptIncomingCall()
                CallForegroundService.stop(context)
                
                // Launch app to show in-call screen
                val launchIntent = Intent(context, com.example.jbmarks.MainActivity::class.java).apply {
                    flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
                    putExtra("in_call", true)
                }
                context.startActivity(launchIntent)
            }

            CallForegroundService.ACTION_DECLINE -> {
                Log.d(TAG, "❌ Call declined from notification")
                CallingService.rejectIncomingCall()
                CallForegroundService.stop(context)
                
                // Clear the notification
                val nm = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
                nm.cancel(CallForegroundService.NOTIFICATION_ID)
            }
        }
    }
}
