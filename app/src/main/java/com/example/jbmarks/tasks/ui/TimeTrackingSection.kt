package com.example.jbmarks.tasks.ui

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.List
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import com.example.jbmarks.tasks.domain.ElapsedTimeEntry
import java.text.SimpleDateFormat
import java.util.*

/**
 * Time tracking section displayed on the Task Detail screen.
 * Shows logged time entries and a form to log new time.
 */
@Composable
fun TimeTrackingSection(
    entries: List<ElapsedTimeEntry>,
    isLoading: Boolean,
    isLoggingTime: Boolean,
    onLogTime: (hours: Int, minutes: Int, comment: String) -> Unit
) {
    var showForm by remember { mutableStateOf(false) }

    Column(modifier = Modifier.fillMaxWidth()) {

        // ── Header ───────────────────────────────────────────────────────────
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(
                    imageVector = Icons.Default.List,
                    contentDescription = null,
                    tint = MaterialTheme.colorScheme.primary,
                    modifier = Modifier.size(20.dp)
                )
                Spacer(modifier = Modifier.width(6.dp))
                Text(
                    text = "Time Tracking",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.onSurface
                )
                if (entries.isNotEmpty()) {
                    Spacer(modifier = Modifier.width(6.dp))
                    val totalSeconds = entries.sumOf { it.seconds }
                    Text(
                        text = "· ${formatTotalTime(totalSeconds)}",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }

            IconButton(onClick = { showForm = !showForm }) {
                Icon(
                    imageVector = Icons.Default.Add,
                    contentDescription = if (showForm) "Cancel" else "Log time",
                    tint = MaterialTheme.colorScheme.primary
                )
            }
        }

        // ── Log Time Form ────────────────────────────────────────────────────
        AnimatedVisibility(visible = showForm) {
            LogTimeForm(
                isLoggingTime = isLoggingTime,
                onSubmit = { hours, minutes, comment ->
                    onLogTime(hours, minutes, comment)
                    showForm = false
                },
                onCancel = { showForm = false }
            )
        }

        Spacer(modifier = Modifier.height(8.dp))

        // ── Entries List ─────────────────────────────────────────────────────
        if (isLoading) {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(vertical = 12.dp),
                contentAlignment = Alignment.Center
            ) {
                CircularProgressIndicator(modifier = Modifier.size(24.dp))
            }
        } else if (entries.isEmpty()) {
            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(
                    containerColor = MaterialTheme.colorScheme.surfaceVariant
                )
            ) {
                Text(
                    text = "No time logged yet. Tap + to log time.",
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.padding(16.dp)
                )
            }
        } else {
            LazyColumn(
                modifier = Modifier
                    .fillMaxWidth()
                    .heightIn(max = 320.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                items(entries) { entry ->
                    TimeEntryItem(entry = entry)
                }
            }
        }
    }
}

// ── Log Time Form ─────────────────────────────────────────────────────────────

@Composable
private fun LogTimeForm(
    isLoggingTime: Boolean,
    onSubmit: (hours: Int, minutes: Int, comment: String) -> Unit,
    onCancel: () -> Unit
) {
    var hoursText by remember { mutableStateOf("") }
    var minutesText by remember { mutableStateOf("") }
    var commentText by remember { mutableStateOf("") }
    var hoursError by remember { mutableStateOf(false) }
    var minutesError by remember { mutableStateOf(false) }

    Card(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 8.dp),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surfaceVariant
        ),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Text(
                text = "Log Time",
                style = MaterialTheme.typography.titleSmall,
                fontWeight = FontWeight.SemiBold
            )

            // Hours + Minutes row
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                OutlinedTextField(
                    value = hoursText,
                    onValueChange = {
                        hoursText = it.filter { c -> c.isDigit() }.take(3)
                        hoursError = false
                    },
                    label = { Text("Hours") },
                    isError = hoursError,
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                    singleLine = true,
                    modifier = Modifier.weight(1f)
                )
                OutlinedTextField(
                    value = minutesText,
                    onValueChange = {
                        minutesText = it.filter { c -> c.isDigit() }.take(2)
                        minutesError = false
                    },
                    label = { Text("Minutes") },
                    isError = minutesError,
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                    singleLine = true,
                    modifier = Modifier.weight(1f)
                )
            }

            // Comment field
            OutlinedTextField(
                value = commentText,
                onValueChange = { commentText = it },
                label = { Text("Comment (optional)") },
                maxLines = 3,
                modifier = Modifier.fillMaxWidth()
            )

            // Action buttons
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.End,
                verticalAlignment = Alignment.CenterVertically
            ) {
                TextButton(onClick = onCancel, enabled = !isLoggingTime) {
                    Text("Cancel")
                }
                Spacer(modifier = Modifier.width(8.dp))
                Button(
                    onClick = {
                        val hours = hoursText.toIntOrNull() ?: 0
                        val minutes = minutesText.toIntOrNull() ?: 0
                        hoursError = hoursText.isNotBlank() && (hoursText.toIntOrNull() == null)
                        minutesError = minutesText.isNotBlank() &&
                                (minutesText.toIntOrNull() == null || minutesText.toInt() > 59)
                        if (!hoursError && !minutesError && (hours > 0 || minutes > 0)) {
                            onSubmit(hours, minutes, commentText)
                        } else if (hours == 0 && minutes == 0) {
                            hoursError = true
                        }
                    },
                    enabled = !isLoggingTime
                ) {
                    if (isLoggingTime) {
                        CircularProgressIndicator(
                            modifier = Modifier.size(16.dp),
                            strokeWidth = 2.dp,
                            color = MaterialTheme.colorScheme.onPrimary
                        )
                    } else {
                        Text("Log Time")
                    }
                }
            }
        }
    }
}

// ── Single Entry Item ─────────────────────────────────────────────────────────

@Composable
private fun TimeEntryItem(entry: ElapsedTimeEntry) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surface
        ),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(12.dp),
            verticalAlignment = Alignment.Top
        ) {
            // Duration badge
            Surface(
                color = MaterialTheme.colorScheme.primaryContainer,
                shape = MaterialTheme.shapes.small
            ) {
                Text(
                    text = entry.formattedDuration(),
                    style = MaterialTheme.typography.labelLarge,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.onPrimaryContainer,
                    modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp)
                )
            }

            Spacer(modifier = Modifier.width(12.dp))

            Column(modifier = Modifier.weight(1f)) {
                // Author + date
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Text(
                        text = entry.userName ?: "User #${entry.userId}",
                        style = MaterialTheme.typography.bodyMedium,
                        fontWeight = FontWeight.Medium,
                        color = MaterialTheme.colorScheme.onSurface
                    )
                    entry.createdDate?.let { date ->
                        Text(
                            text = formatEntryDate(date),
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                }

                // Comment
                if (!entry.comment.isNullOrBlank()) {
                    Spacer(modifier = Modifier.height(4.dp))
                    Text(
                        text = entry.comment,
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }
        }
    }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

private fun formatTotalTime(totalSeconds: Long): String {
    val hours = totalSeconds / 3600
    val minutes = (totalSeconds % 3600) / 60
    return when {
        hours > 0 && minutes > 0 -> "${hours}h ${minutes}m total"
        hours > 0 -> "${hours}h total"
        minutes > 0 -> "${minutes}m total"
        else -> "${totalSeconds}s total"
    }
}

private fun formatEntryDate(dateStr: String): String {
    return try {
        val formats = listOf(
            "yyyy-MM-dd'T'HH:mm:ssXXX",
            "yyyy-MM-dd HH:mm:ss",
            "dd.MM.yyyy HH:mm:ss"
        )
        for (fmt in formats) {
            try {
                val sdf = SimpleDateFormat(fmt, Locale.getDefault())
                val date = sdf.parse(dateStr) ?: continue
                return SimpleDateFormat("MMM d, yyyy", Locale.getDefault()).format(date)
            } catch (_: Exception) { }
        }
        dateStr
    } catch (_: Exception) {
        dateStr
    }
}
