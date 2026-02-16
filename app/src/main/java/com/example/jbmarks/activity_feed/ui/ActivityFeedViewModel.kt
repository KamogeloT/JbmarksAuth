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
    
    private val _isPosting = MutableStateFlow(false)
    val isPosting: StateFlow<Boolean> = _isPosting
    
    private val _feedEvents = MutableStateFlow<Map<String, com.example.jbmarks.activity_feed.data.FeedEventType>>(emptyMap())
    val feedEvents: StateFlow<Map<String, com.example.jbmarks.activity_feed.data.FeedEventType>> = _feedEvents

    init {
        loadFeed()
    }

    /**
     * Load the main feed
     */
    fun loadFeed(postId: String? = null) {
        viewModelScope.launch {
            _uiState.value = ActivityFeedUiState.Loading
            try {
                val feed = repository.getFeed(postId)
                _uiState.value = ActivityFeedUiState.Success(feed)
            } catch (t: Throwable) {
                _uiState.value = ActivityFeedUiState.Error(t.message ?: "An unexpected error occurred")
            }
        }
    }
    
    /**
     * Add a new post to the feed
     */
    fun addFeedPost(
        message: String,
        title: String? = null,
        destinations: List<String>? = null,
        files: List<String>? = null
    ) {
        viewModelScope.launch {
            _isPosting.value = true
            repository.addFeedPost(message, title, destinations, files)
                .onSuccess {
                    // Refresh feed after posting
                    loadFeed()
                    _isPosting.value = false
                }
                .onFailure { throwable ->
                    _isPosting.value = false
                    android.util.Log.e("ActivityFeedViewModel", "Failed to add feed post", throwable)
                }
        }
    }
    
    /**
     * Get feed posts for specific users
     */
    fun loadUsersFeed(userIds: List<String>? = null, groupIds: List<String>? = null) {
        viewModelScope.launch {
            _uiState.value = ActivityFeedUiState.Loading
            try {
                val feed = repository.getUsersFeed(userIds, groupIds)
                _uiState.value = ActivityFeedUiState.Success(feed)
            } catch (t: Throwable) {
                _uiState.value = ActivityFeedUiState.Error(t.message ?: "An unexpected error occurred")
            }
        }
    }
    
    /**
     * Load feed events (types of events that trigger feed updates)
     */
    fun loadFeedEvents() {
        viewModelScope.launch {
            repository.getFeedEvents()
                .onSuccess { events ->
                    _feedEvents.value = events
                }
                .onFailure { throwable ->
                    android.util.Log.e("ActivityFeedViewModel", "Failed to load feed events", throwable)
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