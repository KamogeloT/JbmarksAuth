package com.example.jbmarks.shared.network

import io.ktor.client.engine.darwin.Darwin

actual fun createHttpClientEngine(): io.ktor.client.engine.HttpClientEngine {
    return Darwin.create()
}
