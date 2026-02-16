package com.example.jbmarks

import android.app.Application
import android.util.Log
import com.example.jbmarks.network.RetrofitInstance
import com.example.jbmarks.notifications.sync.SyncManager

class JBmarksApplication : Application() {
    
    private var syncManager: SyncManager? = null
    
    override fun onCreate() {
        super.onCreate()
        // Initialize RetrofitInstance with application context
        RetrofitInstance.initialize(this)
        
        // Initialize and start sync manager for notifications
        syncManager = SyncManager(this)
        syncManager?.startPeriodicSync()
        Log.d("JBmarksApplication", "Sync manager started")
    }
    
    override fun onTerminate() {
        super.onTerminate()
        syncManager?.stopPeriodicSync()
    }
}
