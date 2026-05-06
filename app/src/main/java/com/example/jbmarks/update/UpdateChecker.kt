package com.example.jbmarks.update

import android.content.Context
import android.content.pm.PackageManager
import com.google.gson.Gson
import com.google.gson.annotations.SerializedName
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.net.URL

/**
 * Manifest hosted on Azure Blob Storage.
 * URL: https://jbmarksoauthredirecb0ce.blob.core.windows.net/jbmarks-releases/version.json
 */
data class UpdateInfo(
    @SerializedName("version_code") val versionCode: Int,
    @SerializedName("version_name") val versionName: String,
    @SerializedName("apk_url") val apkUrl: String,
    @SerializedName("release_notes") val releaseNotes: String = "",
    @SerializedName("force_update") val forceUpdate: Boolean = true
)

object UpdateChecker {

    private const val VERSION_JSON_URL =
        "https://jbmarksoauthredirecb0ce.blob.core.windows.net/jbmarks-releases/version.json"

    /**
     * Fetches the remote version manifest and returns UpdateInfo if an update
     * is available, or null if the app is already up to date.
     */
    suspend fun checkForUpdate(context: Context): UpdateInfo? = withContext(Dispatchers.IO) {
        try {
            val json = URL(VERSION_JSON_URL).readText(Charsets.UTF_8)
            val info = Gson().fromJson(json, UpdateInfo::class.java)
            // Get installed versionCode via PackageManager (works without BuildConfig)
            val installedVersionCode = try {
                val pInfo = context.packageManager.getPackageInfo(context.packageName, 0)
                @Suppress("DEPRECATION")
                pInfo.versionCode
            } catch (e: PackageManager.NameNotFoundException) { 0 }
            android.util.Log.d("UpdateChecker", "Remote version: ${info.versionCode}, local: $installedVersionCode")
            if (info.versionCode > installedVersionCode) info else null
        } catch (e: Exception) {
            android.util.Log.w("UpdateChecker", "Update check failed: ${e.message}")
            null
        }
    }
}
