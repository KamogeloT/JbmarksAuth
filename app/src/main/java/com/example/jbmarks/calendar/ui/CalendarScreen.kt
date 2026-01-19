package com.example.jbmarks.calendar.ui

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.DateRange
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.example.jbmarks.calendar.domain.CalendarEvent

@Composable
fun CalendarScreen() {
    val viewModel: CalendarViewModel = viewModel(factory = CalendarViewModelFactory())

    val uiState by viewModel.uiState.collectAsState()

    when (val state = uiState) {
        is CalendarUiState.Loading -> {
            Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                CircularProgressIndicator()
            }
        }

        is CalendarUiState.Success -> {
            if (state.events.isEmpty()) {
                EmptyState(onLoadClick = { viewModel.loadCalendarEvents() })
            } else {
                LazyColumn(
                    modifier = Modifier.padding(horizontal = 8.dp, vertical = 16.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    items(state.events) { event ->
                        EventItem(event)
                    }
                }
            }
        }

        is CalendarUiState.Error -> {
            ErrorState(errorMessage = state.message, onRetryClick = { viewModel.loadCalendarEvents() })
        }
    }
}

@Composable
fun EmptyState(onLoadClick: () -> Unit) {
    Box(modifier = Modifier.fillMaxSize().padding(16.dp), contentAlignment = Alignment.Center) {
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            Text(text = "No Events Found", style = MaterialTheme.typography.headlineSmall, textAlign = TextAlign.Center)
            Spacer(modifier = Modifier.height(8.dp))
            Text(text = "Press the button to load your calendar events.", style = MaterialTheme.typography.bodyMedium, textAlign = TextAlign.Center)
            Spacer(modifier = Modifier.height(16.dp))
            Button(onClick = onLoadClick) {
                Text("Load Events")
            }
        }
    }
}

@Composable
fun ErrorState(errorMessage: String, onRetryClick: () -> Unit) {
    Box(modifier = Modifier.fillMaxSize().padding(16.dp), contentAlignment = Alignment.Center) {
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            Text(text = "An Error Occurred", style = MaterialTheme.typography.headlineSmall, textAlign = TextAlign.Center, color = MaterialTheme.colorScheme.error)
            Spacer(modifier = Modifier.height(8.dp))
            Text(text = errorMessage, style = MaterialTheme.typography.bodyMedium, textAlign = TextAlign.Center)
            Spacer(modifier = Modifier.height(16.dp))
            Button(onClick = onRetryClick) {
                Text("Retry")
            }
        }
    }
}

@Composable
fun EventItem(event: CalendarEvent) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
    ) {
        Row(modifier = Modifier.padding(16.dp), verticalAlignment = Alignment.CenterVertically) {
            Icon(imageVector = Icons.Default.DateRange, contentDescription = "Event")

            Column(modifier = Modifier.padding(start = 16.dp).weight(1f)) {
                Text(text = event.name, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                Spacer(modifier = Modifier.height(4.dp))
                Text(text = "From: ${event.fromDate}", style = MaterialTheme.typography.bodySmall)
                Text(text = "To: ${event.toDate}", style = MaterialTheme.typography.bodySmall)
                if (event.location != null) {
                    Text(text = "Location: ${event.location}", style = MaterialTheme.typography.bodySmall)
                }
            }
        }
    }
}
