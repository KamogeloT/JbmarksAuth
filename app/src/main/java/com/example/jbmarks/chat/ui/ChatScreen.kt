package com.example.jbmarks.chat.ui

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Person
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
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.example.jbmarks.chat.domain.Chat

@Composable
fun ChatScreen() {
    val viewModel: ChatViewModel = viewModel(factory = ChatViewModelFactory())

    val uiState by viewModel.uiState.collectAsState()

    when (val state = uiState) {
        is ChatUiState.Loading -> {
            Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                CircularProgressIndicator()
            }
        }

        is ChatUiState.Success -> {
            if (state.conversations.isEmpty()) {
                EmptyState(onLoadClick = { viewModel.loadRecentChats() })
            } else {
                LazyColumn(
                    modifier = Modifier.padding(vertical = 16.dp),
                    verticalArrangement = Arrangement.spacedBy(4.dp)
                ) {
                    items(state.conversations) { conversation ->
                        ConversationItem(conversation)
                    }
                }
            }
        }

        is ChatUiState.Error -> {
            ErrorState(errorMessage = state.message, onRetryClick = { viewModel.loadRecentChats() })
        }
    }
}

@Composable
fun EmptyState(onLoadClick: () -> Unit) {
    Box(modifier = Modifier.fillMaxSize().padding(16.dp), contentAlignment = Alignment.Center) {
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            Text(text = "No Conversations Loaded", style = MaterialTheme.typography.headlineSmall, textAlign = TextAlign.Center)
            Spacer(modifier = Modifier.height(8.dp))
            Text(text = "Press the button to load your recent chats.", style = MaterialTheme.typography.bodyMedium, textAlign = TextAlign.Center)
            Spacer(modifier = Modifier.height(16.dp))
            Button(onClick = onLoadClick) {
                Text("Load Chats")
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
fun ConversationItem(conversation: Chat) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 8.dp, vertical = 4.dp)
            .clickable { /* TODO: Navigate to individual chat */ },
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
    ) {
        Row(modifier = Modifier.padding(12.dp), verticalAlignment = Alignment.CenterVertically) {
            Icon(
                imageVector = Icons.Default.Person, // Placeholder icon
                contentDescription = "Conversation",
                modifier = Modifier
                    .size(48.dp)
                    .clip(CircleShape)
            )
            Column(modifier = Modifier.padding(start = 12.dp)) {
                Text(text = conversation.name, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                Spacer(modifier = Modifier.height(2.dp))
                Text(
                    text = conversation.lastMessage?.text ?: "",
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.7f),
                    maxLines = 1
                )
            }
        }
    }
}
