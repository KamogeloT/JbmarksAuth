package com.example.jbmarks.waterlevels.ui

import android.app.Application
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.example.jbmarks.waterlevels.domain.ReservoirStatus
import com.example.jbmarks.waterlevels.domain.Reservoirs
import java.time.LocalDate
import java.time.format.DateTimeFormatter

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun WaterLevelsScreen() {
    val context = LocalContext.current
    val viewModel: WaterLevelsViewModel = viewModel(
        factory = object : androidx.lifecycle.ViewModelProvider.Factory {
            @Suppress("UNCHECKED_CAST")
            override fun <T : androidx.lifecycle.ViewModel> create(modelClass: Class<T>): T {
                return WaterLevelsViewModel(context.applicationContext as Application) as T
            }
        }
    )

    val uiState by viewModel.uiState.collectAsState()

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Column {
                        Text("Water Levels")
                        Text(
                            text = LocalDate.now().format(DateTimeFormatter.ofPattern("dd MMMM yyyy")),
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                },
                actions = {
                    if (uiState.submitSuccess) {
                        IconButton(onClick = { viewModel.resetForm() }) {
                            Icon(Icons.Default.Refresh, contentDescription = "New reading")
                        }
                    }
                }
            )
        }
    ) { padding ->
        if (uiState.isCheckingAccess) {
            Box(modifier = Modifier.fillMaxSize().padding(padding), contentAlignment = Alignment.Center) {
                CircularProgressIndicator()
            }
        } else if (!uiState.hasAccess) {
            Box(modifier = Modifier.fillMaxSize().padding(padding), contentAlignment = Alignment.Center) {
                Column(
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.spacedBy(12.dp),
                    modifier = Modifier.padding(32.dp)
                ) {
                    Text("\uD83D\uDD12", style = MaterialTheme.typography.displaySmall)
                    Text(
                        text = "Access Restricted",
                        style = MaterialTheme.typography.titleLarge,
                        fontWeight = FontWeight.Bold
                    )
                    Text(
                        text = "Water level capture is only available to authorised workgroups.",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        modifier = Modifier.padding(horizontal = 16.dp)
                    )
                }
            }
        } else if (uiState.submitSuccess) {
            Box(modifier = Modifier.fillMaxSize().padding(padding), contentAlignment = Alignment.Center) {
                Column(
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.spacedBy(16.dp)
                ) {
                    Icon(Icons.Default.Check, contentDescription = null, modifier = Modifier.size(64.dp), tint = MaterialTheme.colorScheme.primary)
                    Text("Readings Submitted", style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold)
                    Text("Water level data has been saved successfully.", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    Spacer(modifier = Modifier.height(16.dp))
                    OutlinedButton(onClick = { viewModel.resetForm() }) { Text("Submit New Reading") }
                }
            }
        } else {
            Column(
                modifier = Modifier.fillMaxSize().padding(padding).verticalScroll(rememberScrollState()).padding(16.dp),
                verticalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                uiState.submitError?.let { error ->
                    Card(colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.errorContainer)) {
                        Text(text = error, modifier = Modifier.padding(12.dp), color = MaterialTheme.colorScheme.onErrorContainer, style = MaterialTheme.typography.bodyMedium)
                    }
                }

                Reservoirs.clusters.forEach { cluster ->
                    val clusterColor = when (cluster) {
                        "Vyfhoek" -> Color(0xFF1B5E20)
                        "Ventersdorp" -> Color(0xFF1A237E)
                        "Eesterandjies" -> Color(0xFFE65100)
                        "Ikageng" -> Color(0xFF004D40)
                        else -> MaterialTheme.colorScheme.primary
                    }

                    Card(modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(12.dp), elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)) {
                        Column(modifier = Modifier.padding(16.dp)) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Box(modifier = Modifier.size(8.dp).background(clusterColor, RoundedCornerShape(4.dp)))
                                Spacer(modifier = Modifier.width(8.dp))
                                Text(text = cluster.uppercase(), style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold, color = clusterColor)
                            }
                            Spacer(modifier = Modifier.height(12.dp))

                            Reservoirs.byCluster(cluster).forEach { reservoir ->
                                val input = uiState.inputs.find { it.reservoirId == reservoir.id } ?: return@forEach
                                var statusExpanded by remember { mutableStateOf(false) }

                                Column {
                                    Text(
                                        text = if (reservoir.capacityMl != null) "${reservoir.name} (${reservoir.capacityMl}ML)" else reservoir.name,
                                        style = MaterialTheme.typography.bodyLarge, fontWeight = FontWeight.Medium
                                    )
                                    Spacer(modifier = Modifier.height(8.dp))
                                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp), verticalAlignment = Alignment.CenterVertically) {
                                        OutlinedTextField(
                                            value = input.levelText,
                                            onValueChange = { viewModel.updateLevel(reservoir.id, it) },
                                            modifier = Modifier.weight(1f),
                                            label = { Text("%") },
                                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                                            singleLine = true,
                                            suffix = { Text("%") }
                                        )
                                        ExposedDropdownMenuBox(expanded = statusExpanded, onExpandedChange = { statusExpanded = it }, modifier = Modifier.weight(1.2f)) {
                                            OutlinedTextField(
                                                value = input.status.displayName,
                                                onValueChange = {},
                                                readOnly = true,
                                                modifier = Modifier.menuAnchor(),
                                                label = { Text("Status") },
                                                trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = statusExpanded) },
                                                singleLine = true
                                            )
                                            ExposedDropdownMenu(expanded = statusExpanded, onDismissRequest = { statusExpanded = false }) {
                                                ReservoirStatus.entries.forEach { option ->
                                                    DropdownMenuItem(text = { Text(option.displayName) }, onClick = { viewModel.updateStatus(reservoir.id, option); statusExpanded = false })
                                                }
                                            }
                                        }
                                    }
                                }

                                if (reservoir != Reservoirs.byCluster(cluster).last()) {
                                    Spacer(modifier = Modifier.height(12.dp))
                                    HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.5f))
                                    Spacer(modifier = Modifier.height(12.dp))
                                }
                            }
                        }
                    }
                }

                Button(
                    onClick = { viewModel.submit() },
                    modifier = Modifier.fillMaxWidth().height(56.dp),
                    enabled = !uiState.isSubmitting,
                    shape = RoundedCornerShape(12.dp)
                ) {
                    if (uiState.isSubmitting) {
                        CircularProgressIndicator(modifier = Modifier.size(24.dp), color = MaterialTheme.colorScheme.onPrimary, strokeWidth = 2.dp)
                        Spacer(modifier = Modifier.width(8.dp))
                        Text("Submitting...")
                    } else {
                        Text("Submit Readings", style = MaterialTheme.typography.titleMedium)
                    }
                }

                Spacer(modifier = Modifier.height(32.dp))
            }
        }
    }
}
