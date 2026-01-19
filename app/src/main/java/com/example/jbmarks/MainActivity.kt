package com.example.jbmarks

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import com.example.jbmarks.navigation.AppNavigation
import com.example.jbmarks.ui.theme.JBmarksTheme

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            JBmarksTheme {
                AppNavigation()
            }
        }
    }
}