package com.example.jbmarks.comms.calling

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.media.AudioAttributes
import android.media.AudioManager
import android.media.MediaPlayer
import android.media.RingtoneManager
import android.os.Build
import android.os.IBinder
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import android.util.Log
import androidx.core.app.NotificationCompat
import com.example.jbmarks.MainActivity

/**
 * Foreground service that keeps the incoming call notification persistent.
 * Like WhatsApp — the notification stays until you answer or decline.
 * Also manages ringtone and vibration.
 */
class CallForegroundService : Service() {

    private val TAG = "CallForegroundService"
    private var mediaPlayer: MediaPlayer? = null
    private var vibrator: Vibrator? = null
    private var timeoutRunnable: Runnable? = null
    private val handler = android.os.Handler(android.os.Looper.getMainLooper())

    companion object {
        const val CHANNEL_ID = "incoming_call_channel"
        const val NOTIFICATION_ID = 3001
        const val ACTION_ACCEPT = "com.example.jbmarks.ACCEPT_CALL"
        const val ACTION_DECLINE = "com.example.jbmarks.DECLINE_CALL"
        const val ACTION_TIMEOUT = "com.example.jbmarks.CALL_TIMEOUT"
        const val EXTRA_CALLER_NAME = "caller_name"
        const val EXTRA_CALLER_ID = "caller_id"
        const val EXTRA_ROOM_ID = "room_id"
        const val RING_TIMEOUT_MS = 45_000L // 45 seconds

        fun start(context: Context, callerName: String, callerId: String, roomId: String = "") {
            val intent = Intent(context, CallForegroundService::class.java).apply {
                putExtra(EXTRA_CALLER_NAME, callerName)
                putExtra(EXTRA_CALLER_ID, callerId)
                putExtra(EXTRA_ROOM_ID, roomId)
            }
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(intent)
            } else {
                context.startService(intent)
            }
        }

        fun stop(context: Context) {
            context.stopService(Intent(context, CallForegroundService::class.java))
        }
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onCreate() {
        super.onCreate()
        createNotificationChannel()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val callerName = intent?.getStringExtra(EXTRA_CALLER_NAME) ?: "Unknown"
        val callerId = intent?.getStringExtra(EXTRA_CALLER_ID) ?: ""
        val roomId = intent?.getStringExtra(EXTRA_ROOM_ID) ?: ""

        Log.d(TAG, "📞 Starting call foreground service for: $callerName | Room: $roomId")

        // Build persistent notification with Accept/Decline actions
        val notification = buildCallNotification(callerName, callerId, roomId)
        startForeground(NOTIFICATION_ID, notification)

        // Start ringtone
        startRinging()

        // Start vibration
        startVibration()

        // Set timeout — auto-end after 45 seconds (missed call)
        timeoutRunnable = Runnable {
            Log.d(TAG, "⏰ Call timeout — no answer")
            CallingService.declineCall(this)
            stopSelf()
        }
        handler.postDelayed(timeoutRunnable!!, RING_TIMEOUT_MS)

        return START_NOT_STICKY
    }

    override fun onDestroy() {
        super.onDestroy()
        stopRinging()
        stopVibration()
        timeoutRunnable?.let { handler.removeCallbacks(it) }
        Log.d(TAG, "Call foreground service stopped")
    }

    private fun buildCallNotification(callerName: String, callerId: String, roomId: String): Notification {
        // Full-screen intent to show the incoming call UI. Carries all call data
        // so the UI can be restored even if the app process was killed.
        val fullScreenIntent = Intent(this, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            putExtra("incoming_call", true)
            putExtra(EXTRA_CALLER_NAME, callerName)
            putExtra(EXTRA_CALLER_ID, callerId)
            putExtra(EXTRA_ROOM_ID, roomId)
        }
        val fullScreenPi = PendingIntent.getActivity(
            this, 0, fullScreenIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        // Accept action — carries call data so accept works after process death.
        val acceptIntent = Intent(this, CallActionReceiver::class.java).apply {
            action = ACTION_ACCEPT
            putExtra(EXTRA_CALLER_NAME, callerName)
            putExtra(EXTRA_CALLER_ID, callerId)
            putExtra(EXTRA_ROOM_ID, roomId)
        }
        val acceptPi = PendingIntent.getBroadcast(
            this, 1, acceptIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        // Decline action
        val declineIntent = Intent(this, CallActionReceiver::class.java).apply {
            action = ACTION_DECLINE
        }
        val declinePi = PendingIntent.getBroadcast(
            this, 2, declineIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val builder = NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(android.R.drawable.ic_menu_call)
            .setContentTitle("Incoming Call")
            .setContentText(callerName)
            .setPriority(NotificationCompat.PRIORITY_MAX)
            .setCategory(NotificationCompat.CATEGORY_CALL)
            .setOngoing(true)
            .setAutoCancel(false)
            .setFullScreenIntent(fullScreenPi, true)
            .addAction(android.R.drawable.ic_menu_close_clear_cancel, "Decline", declinePi)
            .addAction(android.R.drawable.ic_menu_call, "Answer", acceptPi)

        // Use CallStyle on API 31+ for native call UI
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            val person = androidx.core.app.Person.Builder()
                .setName(callerName)
                .setImportant(true)
                .build()
            builder.setStyle(
                NotificationCompat.CallStyle.forIncomingCall(person, declinePi, acceptPi)
            )
        }

        return builder.build()
    }

    private fun startRinging() {
        try {
            val ringtoneUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE)
            mediaPlayer = MediaPlayer().apply {
                setDataSource(this@CallForegroundService, ringtoneUri)
                setAudioAttributes(
                    AudioAttributes.Builder()
                        .setUsage(AudioAttributes.USAGE_NOTIFICATION_RINGTONE)
                        .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                        .build()
                )
                isLooping = true
                prepare()
                start()
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error starting ringtone", e)
        }
    }

    private fun stopRinging() {
        mediaPlayer?.stop()
        mediaPlayer?.release()
        mediaPlayer = null
    }

    private fun startVibration() {
        vibrator = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            val vm = getSystemService(Context.VIBRATOR_MANAGER_SERVICE) as VibratorManager
            vm.defaultVibrator
        } else {
            @Suppress("DEPRECATION")
            getSystemService(Context.VIBRATOR_SERVICE) as Vibrator
        }

        val pattern = longArrayOf(0, 1000, 500, 1000, 500, 1000)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            vibrator?.vibrate(VibrationEffect.createWaveform(pattern, 0))
        } else {
            @Suppress("DEPRECATION")
            vibrator?.vibrate(pattern, 0)
        }
    }

    private fun stopVibration() {
        vibrator?.cancel()
        vibrator = null
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "Incoming Calls",
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "VoIP incoming call notifications"
                setSound(null, null) // We handle ringtone via MediaPlayer
                enableVibration(false) // We handle vibration manually
                lockscreenVisibility = Notification.VISIBILITY_PUBLIC
            }
            val nm = getSystemService(NotificationManager::class.java)
            nm.createNotificationChannel(channel)
        }
    }
}
