package com.example.jbmarks.calendar.ui

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import com.example.jbmarks.calendar.data.CalendarRepository
import com.example.jbmarks.calendar.domain.CalendarEvent
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch

sealed interface CalendarUiState {
    object Loading : CalendarUiState
    // The state now holds a list of the rich domain model
    data class Success(val events: List<CalendarEvent>) : CalendarUiState
    data class Error(val message: String) : CalendarUiState
}

class CalendarViewModel : ViewModel() {

    private val repository = CalendarRepository()

    private val _uiState = MutableStateFlow<CalendarUiState>(CalendarUiState.Loading)
    val uiState: StateFlow<CalendarUiState> = _uiState

    init {
        loadCalendarEvents()
    }

    fun loadCalendarEvents() {
        viewModelScope.launch {
            _uiState.value = CalendarUiState.Loading
            try {
                val events = repository.getCalendarEvents()
                android.util.Log.d("CalendarViewModel", "Loaded ${events.size} calendar events")
                _uiState.value = CalendarUiState.Success(events)
            } catch (t: Throwable) {
                android.util.Log.e("CalendarViewModel", "Error loading calendar events", t)
                _uiState.value = CalendarUiState.Error(t.message ?: "An unexpected error occurred")
            }
        }
    }
}

@Suppress("UNCHECKED_CAST")
class CalendarViewModelFactory : ViewModelProvider.Factory {
    override fun <T : ViewModel> create(modelClass: Class<T>): T {
        if (modelClass.isAssignableFrom(CalendarViewModel::class.java)) {
            return CalendarViewModel() as T
        }
        throw IllegalArgumentException("Unknown ViewModel class")
    }
}