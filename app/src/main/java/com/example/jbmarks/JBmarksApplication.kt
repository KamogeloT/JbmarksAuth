package com.example.jbmarks

import android.app.Application
import com.example.jbmarks.network.RetrofitInstance

class JBmarksApplication : Application() {
    
    override fun onCreate() {
        super.onCreate()
        // Initialize RetrofitInstance with application context
        RetrofitInstance.initialize(this)
    }
}
