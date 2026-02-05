package com.example.jbmarks.activity_feed.ui

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import com.example.jbmarks.activity_feed.data.ActivityFeedRepository
import com.example.jbmarks.activity_feed.domain.BlogPost
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch

sealed interface ActivityFeedUiState {
    object Loading : ActivityFeedUiState
    // The state now holds a list of the rich domain model
    data class Success(val posts: List<BlogPost>) : ActivityFeedUiState
    data class Error(val message: String) : ActivityFeedUiState
}

class ActivityFeedViewModel : ViewModel() {

    private val repository = ActivityFeedRepository()

    private val _uiState = MutableStateFlow<ActivityFeedUiState>(ActivityFeedUiState.Loading)
    val uiState: StateFlow<ActivityFeedUiState> = _uiState

    init {
        loadFeed()
    }

    fun loadFeed() {
        viewModelScope.launch {
            _uiState.value = ActivityFeedUiState.Loading
            try {
                val feed = repository.getFeed()
                _uiState.value = ActivityFeedUiState.Success(feed)
            } catch (t: Throwable) {
                _uiState.value = ActivityFeedUiState.Error(t.message ?: "An unexpected error occurred")
            }
        }
    }
}

@Suppress("UNCHECKED_CAST")
class ActivityFeedViewModelFactory : ViewModelProvider.Factory {
    override fun <T : ViewModel> create(modelClass: Class<T>): T {
        if (modelClass.isAssignableFrom(ActivityFeedViewModel::class.java)) {
            return ActivityFeedViewModel() as T
        }
        throw IllegalArgumentException("Unknown ViewModel class")
    }
}