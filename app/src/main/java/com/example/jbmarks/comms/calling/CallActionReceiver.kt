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
                val callerName = intent.getStringExtra(CallForegroundService.EXTRA_CALLER_NAME) ?: "Unknown"
                val callerId = intent.getStringExtra(CallForegroundService.EXTRA_CALLER_ID) ?: ""
                val roomId = intent.getStringExtra(CallForegroundService.EXTRA_ROOM_ID) ?: ""
                Log.d(TAG, "✅ Call accepted from notification | Room: $roomId")

                // Restore the incoming-call state in case the process was killed,
                // so the UI can rejoin the room once MainActivity is up.
                CallingService.onIncomingCallPush(callerName, callerId, roomId)

                // Launch app to show the call screen and auto-accept.
                val launchIntent = Intent(context, com.example.jbmarks.MainActivity::class.java).apply {
                    flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP
                    putExtra("accept_call", true)
                    putExtra(CallForegroundService.EXTRA_CALLER_NAME, callerName)
                    putExtra(CallForegroundService.EXTRA_CALLER_ID, callerId)
                    putExtra(CallForegroundService.EXTRA_ROOM_ID, roomId)
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
