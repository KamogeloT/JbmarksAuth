package com.example.jbmarks

import android.app.Application
import android.util.Log
import com.example.jbmarks.network.RetrofitInstance
import com.example.jbmarks.notifications.fcm.FCMTokenManager
import com.example.jbmarks.notifications.sync.SyncManager
import com.google.firebase.FirebaseApp

class JBmarksApplication : Application() {
    
    private var syncManager: SyncManager? = null
    
    override fun onCreate() {
        super.onCreate()
        
        // Initialize Firebase
        FirebaseApp.initializeApp(this)
        Log.d("JBmarksApplication", "Firebase initialized")
        
        // Initialize RetrofitInstance with application context
        RetrofitInstance.initialize(this)
        
        // Initialize and start sync manager for notifications
        syncManager = SyncManager(this)
        syncManager?.startPeriodicSync()
        Log.d("JBmarksApplication", "Sync manager started")
        
        // Initialize FCM token manager and register token
        val fcmTokenManager = FCMTokenManager(this)
        fcmTokenManager.checkAndRegisterToken()
        Log.d("JBmarksApplication", "FCM token manager initialized")
    }
    
    override fun onTerminate() {
        super.onTerminate()
        syncManager?.stopPeriodicSync()
    }
}
