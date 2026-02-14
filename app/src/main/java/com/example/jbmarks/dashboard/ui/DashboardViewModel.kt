package com.example.jbmarks.dashboard.ui

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.example.jbmarks.activity_feed.data.ActivityFeedRepository
import com.example.jbmarks.activity_feed.domain.BlogPost
import com.example.jbmarks.dashboard.data.DashboardRepository
import com.example.jbmarks.dashboard.data.DashboardStats
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch

/**
 * ViewModel for Dashboard screen
 */
class DashboardViewModel(application: Application) : AndroidViewModel(application) {
    
    private val dashboardRepository = DashboardRepository(application)
    private val activityFeedRepository = ActivityFeedRepository()
    
    private val _uiState = MutableStateFlow<DashboardUiState>(DashboardUiState.Loading)
    val uiState: StateFlow<DashboardUiState> = _uiState
    
    init {
        // Don't auto-load in init - let the screen trigger it
    }
    
    fun loadDashboard() {
        viewModelScope.launch {
            _uiState.value = DashboardUiState.Loading
            
            try {
                android.util.Log.d("DashboardViewModel", "Loading dashboard stats...")
                
                // Fetch dashboard stats
                val statsResult = dashboardRepository.getDashboardStats()
                
                if (statsResult.isFailure) {
                    android.util.Log.e("DashboardViewModel", "Failed to get stats: ${statsResult.exceptionOrNull()}")
                }
                
                val stats = statsResult.getOrNull() ?: DashboardStats()
                
                android.util.Log.d("DashboardViewModel", "Loaded stats: activeTasks=${stats.activeTasks}, completedToday=${stats.completedToday}, unreadMessages=${stats.unreadMessages}, upcomingEvents=${stats.upcomingEvents}")
                
                // Fetch recent activity
                val recentPosts = try {
                    activityFeedRepository.getFeed().take(5)
                } catch (e: Exception) {
                    android.util.Log.w("DashboardViewModel", "Failed to load activity feed", e)
                    emptyList()
                }
                
                _uiState.value = DashboardUiState.Success(
                    stats = stats,
                    recentActivity = recentPosts
                )
                
                android.util.Log.d("DashboardViewModel", "Dashboard loaded successfully")
            } catch (e: Exception) {
                android.util.Log.e("DashboardViewModel", "Failed to load dashboard", e)
                e.printStackTrace()
                _uiState.value = DashboardUiState.Error(
                    e.message ?: "Failed to load dashboard"
                )
            }
        }
    }
}

/**
 * UI State for Dashboard
 */
sealed class DashboardUiState {
    object Loading : DashboardUiState()
    data class Success(
        val stats: DashboardStats,
        val recentActivity: List<BlogPost>
    ) : DashboardUiState()
    data class Error(val message: String) : DashboardUiState()
}
