package com.example.jbmarks.shared.network

import io.ktor.client.engine.android.Android

actual fun createHttpClientEngine(): io.ktor.client.engine.HttpClientEngine {
    return Android.create()
}
