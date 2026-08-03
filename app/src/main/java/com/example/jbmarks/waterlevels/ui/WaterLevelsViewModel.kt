package com.example.jbmarks.waterlevels.ui

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.example.jbmarks.waterlevels.data.WaterLevelRepository
import com.example.jbmarks.waterlevels.domain.ReservoirReading
import com.example.jbmarks.waterlevels.domain.ReservoirStatus
import com.example.jbmarks.waterlevels.domain.Reservoirs
import com.example.jbmarks.waterlevels.domain.WaterLevelSubmission
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

data class ReservoirInputState(
    val reservoirId: String,
    val levelText: String = "",
    val status: ReservoirStatus = ReservoirStatus.STABLE
)

data class WaterLevelsUiState(
    val inputs: List<ReservoirInputState> = Reservoirs.all.map {
        ReservoirInputState(reservoirId = it.id)
    },
    val isSubmitting: Boolean = false,
    val submitSuccess: Boolean = false,
    val submitError: String? = null,
    val history: List<WaterLevelSubmission> = emptyList(),
    val isLoadingHistory: Boolean = false,
    val hasAccess: Boolean = false,
    val isCheckingAccess: Boolean = true
)

class WaterLevelsViewModel(application: Application) : AndroidViewModel(application) {

    private val repository = WaterLevelRepository(application.applicationContext)
    private val userRepository = com.example.jbmarks.user.data.UserRepository(application.applicationContext)

    private val _uiState = MutableStateFlow(WaterLevelsUiState())
    val uiState: StateFlow<WaterLevelsUiState> = _uiState.asStateFlow()

    companion object {
        private val ALLOWED_WORKGROUP_IDS = setOf("2", "6")
    }

    init {
        checkAccess()
    }

    private fun checkAccess() {
        viewModelScope.launch {
            try {
                val workgroups = userRepository.getUserWorkgroups().getOrNull() ?: emptyList()
                val userGroupIds = workgroups.map { it.id }.toSet()
                val hasAccess = userGroupIds.intersect(ALLOWED_WORKGROUP_IDS).isNotEmpty()
                _uiState.value = _uiState.value.copy(hasAccess = hasAccess, isCheckingAccess = false)
                if (hasAccess) {
                    loadHistory()
                }
            } catch (e: Exception) {
                _uiState.value = _uiState.value.copy(hasAccess = false, isCheckingAccess = false)
            }
        }
    }

    fun updateLevel(reservoirId: String, text: String) {
        if (text.isNotEmpty() && !text.matches(Regex("^\\d{0,3}(\\.\\d{0,2})?$"))) return
        val current = _uiState.value
        val updated = current.inputs.map {
            if (it.reservoirId == reservoirId) it.copy(levelText = text) else it
        }
        _uiState.value = current.copy(inputs = updated, submitSuccess = false, submitError = null)
    }

    fun updateStatus(reservoirId: String, status: ReservoirStatus) {
        val current = _uiState.value
        val updated = current.inputs.map {
            if (it.reservoirId == reservoirId) it.copy(status = status) else it
        }
        _uiState.value = current.copy(inputs = updated, submitSuccess = false, submitError = null)
    }

    fun submit() {
        val current = _uiState.value

        val filledFields = current.inputs.filter { it.levelText.isNotBlank() }
        if (filledFields.isEmpty()) {
            _uiState.value = current.copy(submitError = "Please fill in at least one reservoir level")
            return
        }

        val invalidFields = filledFields.filter {
            val value = it.levelText.toDoubleOrNull()
            value == null || value < 0 || value > 100
        }
        if (invalidFields.isNotEmpty()) {
            _uiState.value = current.copy(submitError = "Levels must be between 0 and 100")
            return
        }

        val readings = filledFields.map { input ->
            ReservoirReading(
                reservoirId = input.reservoirId,
                levelPercent = input.levelText.toDouble(),
                status = input.status
            )
        }

        _uiState.value = current.copy(isSubmitting = true, submitError = null)

        viewModelScope.launch {
            repository.submitReadings(readings)
                .onSuccess {
                    _uiState.value = _uiState.value.copy(
                        isSubmitting = false,
                        submitSuccess = true
                    )
                    loadHistory()
                }
                .onFailure { e ->
                    _uiState.value = _uiState.value.copy(
                        isSubmitting = false,
                        submitError = e.message ?: "Submission failed"
                    )
                }
        }
    }

    fun resetForm() {
        _uiState.value = WaterLevelsUiState(history = _uiState.value.history, hasAccess = true, isCheckingAccess = false)
    }

    private fun loadHistory() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoadingHistory = true)
            repository.getSubmissions()
                .onSuccess { submissions ->
                    _uiState.value = _uiState.value.copy(
                        history = submissions,
                        isLoadingHistory = false
                    )
                }
                .onFailure {
                    _uiState.value = _uiState.value.copy(isLoadingHistory = false)
                }
        }
    }
}
