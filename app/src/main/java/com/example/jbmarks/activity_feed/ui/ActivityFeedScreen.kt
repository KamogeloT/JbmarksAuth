package com.example.jbmarks.activity_feed.ui

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
import com.example.jbmarks.activity_feed.domain.BlogPost

@Composable
fun ActivityFeedScreen() {
    val viewModel: ActivityFeedViewModel = viewModel(factory = ActivityFeedViewModelFactory())

    val uiState by viewModel.uiState.collectAsState()

    when (val state = uiState) {
        is ActivityFeedUiState.Loading -> {
            Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                CircularProgressIndicator()
            }
        }

        is ActivityFeedUiState.Success -> {
            if (state.posts.isEmpty()) {
                EmptyState(onLoadClick = { viewModel.loadFeed() })
            } else {
                LazyColumn(
                    modifier = Modifier.padding(horizontal = 8.dp, vertical = 16.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    items(state.posts) { post ->
                        BlogPostItem(post)
                    }
                }
            }
        }

        is ActivityFeedUiState.Error -> {
            ErrorState(errorMessage = state.message, onRetryClick = { viewModel.loadFeed() })
        }
    }
}

@Composable
fun EmptyState(onLoadClick: () -> Unit) {
    Box(modifier = Modifier.fillMaxSize().padding(16.dp), contentAlignment = Alignment.Center) {
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            Text(
                text = "Activity Feed is Empty",
                style = MaterialTheme.typography.headlineSmall,
                textAlign = TextAlign.Center
            )
            Spacer(modifier = Modifier.height(8.dp))
            Text(
                text = "Press the button to load the feed.",
                style = MaterialTheme.typography.bodyMedium,
                textAlign = TextAlign.Center
            )
            Spacer(modifier = Modifier.height(16.dp))
            Button(onClick = onLoadClick) {
                Text("Load Feed")
            }
        }
    }
}

@Composable
fun ErrorState(errorMessage: String, onRetryClick: () -> Unit) {
    Box(modifier = Modifier.fillMaxSize().padding(16.dp), contentAlignment = Alignment.Center) {
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            Text(
                text = "An Error Occurred",
                style = MaterialTheme.typography.headlineSmall,
                textAlign = TextAlign.Center,
                color = MaterialTheme.colorScheme.error
            )
            Spacer(modifier = Modifier.height(8.dp))
            Text(
                text = errorMessage,
                style = MaterialTheme.typography.bodyMedium,
                textAlign = TextAlign.Center
            )
            Spacer(modifier = Modifier.height(16.dp))
            Button(onClick = onRetryClick) {
                Text("Retry")
            }
        }
    }
}

@Composable
fun BlogPostItem(post: BlogPost) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(
                    imageVector = Icons.Default.Person, // Placeholder icon
                    contentDescription = "Author",
                    modifier = Modifier
                        .size(40.dp)
                        .clip(CircleShape)
                )
                Column(modifier = Modifier.padding(start = 12.dp)) {
                    Text(text = "User ${post.authorId}", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                    Text(text = post.date, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f))
                }
            }
            Spacer(modifier = Modifier.height(12.dp))
            Text(text = post.title, style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
            Spacer(modifier = Modifier.height(4.dp))
            Text(text = post.text, style = MaterialTheme.typography.bodyLarge)
        }
    }
}
