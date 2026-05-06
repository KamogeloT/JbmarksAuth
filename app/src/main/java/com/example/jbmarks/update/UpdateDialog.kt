package com.example.jbmarks.update

import android.app.Application
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import androidx.lifecycle.viewmodel.compose.viewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch

// ── ViewModel ────────────────────────────────────────────────────────────────

sealed interface UpdateUiState {
    object Idle : UpdateUiState
    object Checking : UpdateUiState
    data class UpdateAvailable(val info: UpdateInfo) : UpdateUiState
    data class Downloading(val progress: Int) : UpdateUiState
    object ReadyToInstall : UpdateUiState
    object UpToDate : UpdateUiState
    data class Error(val message: String) : UpdateUiState
}

class UpdateViewModel(application: Application) : AndroidViewModel(application) {

    private val _state = MutableStateFlow<UpdateUiState>(UpdateUiState.Idle)
    val state: StateFlow<UpdateUiState> = _state

    private var pendingApkFile: java.io.File? = null

    fun checkForUpdate() {
        viewModelScope.launch {
            _state.value = UpdateUiState.Checking
            val info = UpdateChecker.checkForUpdate(getApplication())
            _state.value = if (info != null) UpdateUiState.UpdateAvailable(info)
                           else UpdateUiState.UpToDate
        }
    }

    fun downloadAndInstall(info: UpdateInfo) {
        viewModelScope.launch {
            try {
                _state.value = UpdateUiState.Downloading(0)
                val file = UpdateDownloader.download(
                    context = getApplication(),
                    apkUrl = info.apkUrl,
                    onProgress = { progress ->
                        _state.value = UpdateUiState.Downloading(progress)
                    }
                )
                pendingApkFile = file
                _state.value = UpdateUiState.ReadyToInstall
                // Trigger install immediately
                UpdateDownloader.installApk(getApplication(), file)
            } catch (e: Exception) {
                android.util.Log.e("UpdateViewModel", "Download failed", e)
                _state.value = UpdateUiState.Error("Download failed: ${e.message}")
            }
        }
    }

    fun retryInstall() {
        pendingApkFile?.let { UpdateDownloader.installApk(getApplication(), it) }
    }
}

// ── Composable ───────────────────────────────────────────────────────────────

/**
 * Drop this into SplashActivity or MainActivity.
 * It auto-checks for updates on first composition.
 * With force_update = true the dialog cannot be dismissed.
 */
@Composable
fun UpdateDialogHost() {
    val context = LocalContext.current
    val vm: UpdateViewModel = viewModel(
        factory = ViewModelProvider.AndroidViewModelFactory.getInstance(
            context.applicationContext as Application
        )
    )
    val state by vm.state.collectAsState()

    // Kick off check once
    LaunchedEffect(Unit) { vm.checkForUpdate() }

    when (val s = state) {
        is UpdateUiState.UpdateAvailable -> {
            UpdateAvailableDialog(
                info = s.info,
                onUpdate = { vm.downloadAndInstall(s.info) }
                // No onDismiss — force_update is always true per requirements
            )
        }
        is UpdateUiState.Downloading -> {
            DownloadProgressDialog(progress = s.progress)
        }
        is UpdateUiState.ReadyToInstall -> {
            ReadyToInstallDialog(onInstall = { vm.retryInstall() })
        }
        is UpdateUiState.Error -> {
            UpdateErrorDialog(
                message = s.message,
                onRetry = {
                    val prev = (state as? UpdateUiState.Error)
                    vm.checkForUpdate()
                }
            )
        }
        else -> { /* Idle / Checking / UpToDate — show nothing */ }
    }
}

@Composable
private fun UpdateAvailableDialog(info: UpdateInfo, onUpdate: () -> Unit) {
    AlertDialog(
        onDismissRequest = { /* force update — cannot dismiss */ },
        icon = { Icon(Icons.Default.Refresh, contentDescription = null, tint = MaterialTheme.colorScheme.primary) },
        title = {
            Text("Update Available — v${info.versionName}", fontWeight = FontWeight.Bold)
        },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                if (info.releaseNotes.isNotBlank()) {
                    Text(info.releaseNotes, style = MaterialTheme.typography.bodyMedium)
                }
                Text(
                    "This update is required to continue using the app.",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
        },
        confirmButton = {
            Button(onClick = onUpdate, modifier = Modifier.fillMaxWidth()) {
                Text("Update Now")
            }
        },
        shape = RoundedCornerShape(16.dp)
    )
}

@Composable
private fun DownloadProgressDialog(progress: Int) {
    AlertDialog(
        onDismissRequest = { /* cannot dismiss during download */ },
        title = { Text("Downloading Update…", fontWeight = FontWeight.Bold) },
        text = {
            Column(
                verticalArrangement = Arrangement.spacedBy(12.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
                modifier = Modifier.fillMaxWidth()
            ) {
                LinearProgressIndicator(
                    progress = { progress / 100f },
                    modifier = Modifier.fillMaxWidth()
                )
                Text("$progress%", style = MaterialTheme.typography.bodyMedium)
            }
        },
        confirmButton = {},
        shape = RoundedCornerShape(16.dp)
    )
}

@Composable
private fun ReadyToInstallDialog(onInstall: () -> Unit) {
    AlertDialog(
        onDismissRequest = { /* force update */ },
        title = { Text("Ready to Install", fontWeight = FontWeight.Bold) },
        text = { Text("The update has been downloaded. Tap Install to apply it.") },
        confirmButton = {
            Button(onClick = onInstall, modifier = Modifier.fillMaxWidth()) {
                Text("Install")
            }
        },
        shape = RoundedCornerShape(16.dp)
    )
}

@Composable
private fun UpdateErrorDialog(message: String, onRetry: () -> Unit) {
    AlertDialog(
        onDismissRequest = { /* force update */ },
        title = { Text("Update Failed", fontWeight = FontWeight.Bold) },
        text = { Text(message, style = MaterialTheme.typography.bodyMedium) },
        confirmButton = {
            Button(onClick = onRetry, modifier = Modifier.fillMaxWidth()) {
                Text("Retry")
            }
        },
        shape = RoundedCornerShape(16.dp)
    )
}
