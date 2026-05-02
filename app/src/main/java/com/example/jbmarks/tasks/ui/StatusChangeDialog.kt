package com.example.jbmarks.tasks.ui

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.example.jbmarks.tasks.domain.TaskStatus

@Composable
fun StatusChangeDialog(
    currentStatus: TaskStatus,
    onStatusSelected: (TaskStatus) -> Unit,
    onDismiss: () -> Unit
) {
    AlertDialog(
        onDismissRequest = onDismiss,
        title = {
            Text(
                text = "Change Task Status",
                style = MaterialTheme.typography.titleLarge,
                fontWeight = FontWeight.Bold
            )
        },
        text = {
            Column(
                modifier = Modifier.fillMaxWidth(),
                verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                // Current Status
                val currentStatusColor = getStatusColor(currentStatus)
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    colors = CardDefaults.cardColors(
                        containerColor = currentStatusColor.copy(alpha = 0.2f)
                    ),
                    shape = RoundedCornerShape(8.dp)
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(12.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Icon(
                            imageVector = getStatusIcon(currentStatus),
                            contentDescription = null,
                            tint = currentStatusColor
                        )
                        Text(
                            text = "Current: ${currentStatus.displayName}",
                            style = MaterialTheme.typography.bodyMedium,
                            fontWeight = FontWeight.SemiBold,
                            color = currentStatusColor
                        )
                    }
                }
                
                Spacer(modifier = Modifier.height(8.dp))
                
                Text(
                    text = "Select new status:",
                    style = MaterialTheme.typography.labelLarge,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
                
                // Available Status Options
                Column(
                    modifier = Modifier.fillMaxWidth(),
                    verticalArrangement = Arrangement.spacedBy(4.dp)
                ) {
                    getAvailableStatuses(currentStatus).forEach { status ->
                        StatusOptionItem(
                            status = status,
                            isSelected = false,
                            onClick = {
                                onStatusSelected(status)
                                onDismiss()
                            }
                        )
                    }
                }
            }
        },
        confirmButton = {
            TextButton(onClick = onDismiss) {
                Text("Cancel")
            }
        },
        shape = RoundedCornerShape(16.dp)
    )
}

@Composable
fun StatusOptionItem(
    status: TaskStatus,
    isSelected: Boolean,
    onClick: () -> Unit
) {
    val statusColor = getStatusColor(status)
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick),
        colors = CardDefaults.cardColors(
            containerColor = if (isSelected)
                statusColor.copy(alpha = 0.2f)
            else
                MaterialTheme.colorScheme.surfaceVariant
        ),
        shape = RoundedCornerShape(8.dp)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(12.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Icon(
                imageVector = getStatusIcon(status),
                contentDescription = null,
                tint = statusColor,
                modifier = Modifier.size(24.dp)
            )
            
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = status.displayName,
                    style = MaterialTheme.typography.bodyLarge,
                    fontWeight = FontWeight.Medium,
                    color = MaterialTheme.colorScheme.onSurface
                )
                Text(
                    text = getStatusDescription(status),
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
            
            if (isSelected) {
                Icon(
                    imageVector = Icons.Default.Check,
                    contentDescription = "Selected",
                    tint = statusColor
                )
            }
        }
    }
}

/**
 * Get available status transitions from current status
 * Aligned with Bitrix24 actual allowed transitions
 */
private fun getAvailableStatuses(currentStatus: TaskStatus): List<TaskStatus> {
    return when (currentStatus) {
        TaskStatus.NEW -> listOf(TaskStatus.IN_PROGRESS)
        TaskStatus.IN_PROGRESS -> listOf(TaskStatus.COMPLETED)
        TaskStatus.COMPLETED -> listOf(TaskStatus.NEW)
        TaskStatus.DEFERRED -> listOf(TaskStatus.IN_PROGRESS)
        TaskStatus.SUPPOSEDLY_COMPLETED -> listOf(TaskStatus.COMPLETED, TaskStatus.NEW)
    }
}

/**
 * Get status color
 */
@Composable
private fun getStatusColor(status: TaskStatus): Color {
    return when (status) {
        TaskStatus.NEW -> MaterialTheme.colorScheme.primary
        TaskStatus.IN_PROGRESS -> MaterialTheme.colorScheme.primary
        TaskStatus.COMPLETED -> MaterialTheme.colorScheme.tertiary
        TaskStatus.DEFERRED -> MaterialTheme.colorScheme.secondary
        TaskStatus.SUPPOSEDLY_COMPLETED -> MaterialTheme.colorScheme.primary
    }
}

/**
 * Get status icon
 */
private fun getStatusIcon(status: TaskStatus): ImageVector {
    return when (status) {
        TaskStatus.NEW -> Icons.Default.Star
        TaskStatus.IN_PROGRESS -> Icons.Default.PlayArrow
        TaskStatus.COMPLETED -> Icons.Default.CheckCircle
        TaskStatus.DEFERRED -> Icons.Default.DateRange
        TaskStatus.SUPPOSEDLY_COMPLETED -> Icons.Default.Done
    }
}

/**
 * Get status description
 */
private fun getStatusDescription(status: TaskStatus): String {
    return when (status) {
        TaskStatus.NEW -> "Task is newly created and not started"
        TaskStatus.IN_PROGRESS -> "Task is currently being worked on"
        TaskStatus.COMPLETED -> "Task has been completed"
        TaskStatus.DEFERRED -> "Task has been postponed"
        TaskStatus.SUPPOSEDLY_COMPLETED -> "Task is awaiting approval"
    }
}
