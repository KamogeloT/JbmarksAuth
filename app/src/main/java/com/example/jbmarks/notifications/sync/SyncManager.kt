package com.example.jbmarks.notifications.sync

import android.content.Context
import android.util.Log
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlinx.coroutines.isActive

/**
 * Manages periodic syncing for notifications
 */
class SyncManager(private val context: Context) {
    
    private val TAG = "SyncManager"
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    private val syncService = UpdateSyncService(context)
    
    private var isRunning = false
    
    companion object {
        private const val SYNC_INTERVAL_MS = 300_000L // 5 minutes
    }
    
    /**
     * Start periodic syncing
     */
    fun startPeriodicSync() {
        if (isRunning) {
            Log.d(TAG, "Sync already running")
            return
        }
        
        isRunning = true
        Log.d(TAG, "Starting periodic sync (interval: ${SYNC_INTERVAL_MS}ms)")
        
        scope.launch {
            // Initial sync
            syncService.syncAll()
            
            // Periodic sync
            while (isActive && isRunning) {
                delay(SYNC_INTERVAL_MS)
                if (isRunning) {
                    syncService.syncAll()
                }
            }
        }
    }
    
    /**
     * Stop periodic syncing
     */
    fun stopPeriodicSync() {
        Log.d(TAG, "Stopping periodic sync")
        isRunning = false
    }
    
    /**
     * Trigger immediate sync
     */
    fun syncNow() {
        scope.launch {
            syncService.syncAll()
        }
    }
}
