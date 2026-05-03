package com.example.jbmarks.dashboard.ui

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.example.jbmarks.activity_feed.data.ActivityFeedRepository
import com.example.jbmarks.activity_feed.domain.BlogPost
import com.example.jbmarks.dashboard.data.DashboardRepository
import com.example.jbmarks.dashboard.data.DashboardStats
import com.example.jbmarks.user.data.UserRepository
import com.example.jbmarks.user.data.Workgroup
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch

class DashboardViewModel(application: Application) : AndroidViewModel(application) {

    private val dashboardRepository = DashboardRepository(application)
    private val activityFeedRepository = ActivityFeedRepository()
    private val userRepository = UserRepository(application.applicationContext)

    private val _uiState = MutableStateFlow<DashboardUiState>(DashboardUiState.Loading)
    val uiState: StateFlow<DashboardUiState> = _uiState

    fun loadDashboard() {
        viewModelScope.launch {
            _uiState.value = DashboardUiState.Loading
            try {
                val stats = dashboardRepository.getDashboardStats().getOrNull() ?: DashboardStats()

                val recentPosts = try {
                    activityFeedRepository.getFeed().take(5)
                } catch (e: Exception) {
                    emptyList()
                }

                val pendingInvitations = userRepository.getPendingInvitations().getOrNull() ?: emptyList()

                _uiState.value = DashboardUiState.Success(
                    stats = stats,
                    recentActivity = recentPosts,
                    pendingInvitations = pendingInvitations
                )
            } catch (e: Exception) {
                android.util.Log.e("DashboardViewModel", "Failed to load dashboard", e)
                _uiState.value = DashboardUiState.Error(e.message ?: "Failed to load dashboard")
            }
        }
    }

    fun acceptInvitation(groupId: String) {
        viewModelScope.launch {
            userRepository.acceptInvitation(groupId)
                .onSuccess {
                    android.util.Log.d("DashboardViewModel", "Accepted invitation to group $groupId")
                    loadDashboard() // Refresh to remove the accepted invite
                }
                .onFailure { e ->
                    android.util.Log.e("DashboardViewModel", "Failed to accept invitation", e)
                }
        }
    }

    fun declineInvitation(groupId: String) {
        viewModelScope.launch {
            userRepository.declineInvitation(groupId)
                .onSuccess {
                    android.util.Log.d("DashboardViewModel", "Declined invitation to group $groupId")
                    loadDashboard() // Refresh to remove the declined invite
                }
                .onFailure { e ->
                    android.util.Log.e("DashboardViewModel", "Failed to decline invitation", e)
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
        val recentActivity: List<BlogPost>,
        val pendingInvitations: List<com.example.jbmarks.user.data.Workgroup> = emptyList()
    ) : DashboardUiState()
    data class Error(val message: String) : DashboardUiState()
}
