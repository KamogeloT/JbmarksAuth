package com.example.jbmarks.auth.ui

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.TextFieldValue
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp

@Composable
fun LoginScreen(
    onLoginClick: (portalUrl: String) -> Unit,
    isLoading: Boolean = false,
    errorMessage: String? = null
) {
    var portalUrl by remember { mutableStateOf(TextFieldValue("https://jbmarks.sdinmotion.co.za")) }

    Surface(
        modifier = Modifier.fillMaxSize(),
        color = MaterialTheme.colorScheme.background
    ) {
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(24.dp),
            contentAlignment = Alignment.Center
        ) {
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 8.dp),
                shape = RoundedCornerShape(24.dp),
                elevation = CardDefaults.cardElevation(defaultElevation = 8.dp),
                colors = CardDefaults.cardColors(
                    containerColor = MaterialTheme.colorScheme.surface
                )
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(32.dp),
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.spacedBy(24.dp)
                ) {
                    // Logo/Title Section
                    Column(
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Text(
                            text = "JBmarks",
                            style = MaterialTheme.typography.displaySmall,
                            color = MaterialTheme.colorScheme.primary,
                            fontWeight = FontWeight.Bold
                        )
                        
                        Text(
                            text = "Local Municipality",
                            style = MaterialTheme.typography.titleMedium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            textAlign = TextAlign.Center
                        )
                    }
                    
                    Spacer(modifier = Modifier.height(8.dp))
                    
                    HorizontalDivider(
                        color = MaterialTheme.colorScheme.outlineVariant,
                        thickness = 1.dp
                    )
                    
                    Spacer(modifier = Modifier.height(8.dp))
                    
                    // Login Form
                    Column(
                        modifier = Modifier.fillMaxWidth(),
                        verticalArrangement = Arrangement.spacedBy(16.dp)
                    ) {
                        Text(
                            text = "Sign in to Bitrix24",
                            style = MaterialTheme.typography.titleLarge,
                            color = MaterialTheme.colorScheme.onSurface,
                            fontWeight = FontWeight.SemiBold
                        )
                        
                        OutlinedTextField(
                            value = portalUrl,
                            onValueChange = { portalUrl = it },
                            label = { 
                                Text(
                                    "Bitrix24 Portal URL",
                                    style = MaterialTheme.typography.bodyMedium
                                ) 
                            },
                            modifier = Modifier.fillMaxWidth(),
                            singleLine = true,
                            enabled = !isLoading,
                            shape = RoundedCornerShape(12.dp),
                            colors = OutlinedTextFieldDefaults.colors(
                                focusedBorderColor = MaterialTheme.colorScheme.primary,
                                unfocusedBorderColor = MaterialTheme.colorScheme.outlineVariant
                            )
                        )
                        
                        if (errorMessage != null) {
                            Card(
                                modifier = Modifier.fillMaxWidth(),
                                colors = CardDefaults.cardColors(
                                    containerColor = MaterialTheme.colorScheme.errorContainer
                                ),
                                shape = RoundedCornerShape(12.dp)
                            ) {
                                Column(
                                    modifier = Modifier.padding(12.dp),
                                    verticalArrangement = Arrangement.spacedBy(8.dp)
                                ) {
                                    Text(
                                        text = errorMessage,
                                        color = MaterialTheme.colorScheme.onErrorContainer,
                                        style = MaterialTheme.typography.bodyMedium
                                    )
                                    Text(
                                        text = "Tap 'Sign In' to try again",
                                        color = MaterialTheme.colorScheme.onErrorContainer.copy(alpha = 0.7f),
                                        style = MaterialTheme.typography.bodySmall,
                                        fontWeight = FontWeight.Medium
                                    )
                                }
                            }
                        }
                        
                        Button(
                            onClick = { onLoginClick(portalUrl.text) },
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(56.dp),
                            enabled = !isLoading && portalUrl.text.isNotBlank(),
                            shape = RoundedCornerShape(12.dp),
                            colors = ButtonDefaults.buttonColors(
                                containerColor = MaterialTheme.colorScheme.primary,
                                contentColor = MaterialTheme.colorScheme.onPrimary
                            )
                        ) {
                            if (isLoading) {
                                CircularProgressIndicator(
                                    modifier = Modifier.size(20.dp),
                                    color = MaterialTheme.colorScheme.onPrimary,
                                    strokeWidth = 2.dp
                                )
                                Spacer(modifier = Modifier.width(12.dp))
                                Text(
                                    "Signing in...",
                                    style = MaterialTheme.typography.labelLarge
                                )
                            } else {
                                Text(
                                    "Sign In",
                                    style = MaterialTheme.typography.labelLarge,
                                    fontWeight = FontWeight.SemiBold
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}
