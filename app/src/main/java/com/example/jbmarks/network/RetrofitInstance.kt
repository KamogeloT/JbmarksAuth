package com.example.jbmarks.network

import android.content.Context
import com.example.jbmarks.auth.data.TokenManager
import com.example.jbmarks.config.Config
import com.example.jbmarks.tasks.data.TasksListDeserializer
import com.example.jbmarks.tasks.data.TasksListResponse
import com.google.gson.Gson
import com.google.gson.GsonBuilder
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory

object RetrofitInstance {

    private var context: Context? = null
    private var tokenManager: TokenManager? = null
    private var retrofit: Retrofit? = null
    private var bitrixApi: BitrixApi? = null

    /**
     * Initialize RetrofitInstance with context
     * Should be called from Application class or early in app lifecycle
     */
    fun initialize(context: Context) {
        this.context = context.applicationContext
        if (tokenManager == null) {
            tokenManager = TokenManager(context)
            refreshRetrofitInstance()
        }
    }

    /**
     * Get or create BitrixApi instance
     * Will use stored portal URL or default
     */
    val api: BitrixApi
        get() {
            if (bitrixApi == null) {
                refreshRetrofitInstance()
            }
            return bitrixApi!!
        }

    /**
     * Refresh the Retrofit instance (useful when portal URL or token changes)
     */
    fun refreshRetrofitInstance() {
        val portalUrl = tokenManager?.getPortalUrl() ?: Config.DEFAULT_PORTAL_URL
        val baseUrl = if (portalUrl.endsWith("/")) {
            "${portalUrl}rest/"
        } else {
            "$portalUrl/rest/"
        }

        val logging = HttpLoggingInterceptor().apply {
            level = HttpLoggingInterceptor.Level.BASIC
        }

        val clientBuilder = OkHttpClient.Builder()
            .addInterceptor(logging)

        // Add AuthInterceptor if we have context and tokenManager
        val ctx = context
        val tm = tokenManager
        if (ctx != null && tm != null) {
            clientBuilder.addInterceptor(AuthInterceptor(ctx, tm))
        }

        // Create Gson with custom deserializer for tasks list
        val gson = GsonBuilder()
            .registerTypeAdapter(TasksListResponse::class.java, TasksListDeserializer())
            .create()

        retrofit = Retrofit.Builder()
            .baseUrl(baseUrl)
            .client(clientBuilder.build())
            .addConverterFactory(GsonConverterFactory.create(gson))
            .build()

        bitrixApi = retrofit!!.create(BitrixApi::class.java)
    }
}