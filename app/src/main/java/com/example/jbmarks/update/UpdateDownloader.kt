package com.example.jbmarks.update

import android.content.Context
import android.content.Intent
import android.net.Uri
import androidx.core.content.FileProvider
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.io.File
import java.io.FileOutputStream
import java.net.HttpURLConnection
import java.net.URL

object UpdateDownloader {

    /**
     * Downloads the APK from [apkUrl] into the app's cache directory,
     * reporting progress via [onProgress] (0–100).
     * Returns the local [File] on success, or throws on failure.
     */
    suspend fun download(
        context: Context,
        apkUrl: String,
        onProgress: (Int) -> Unit
    ): File = withContext(Dispatchers.IO) {
        val outFile = File(context.cacheDir, "jbmarks-update.apk")
        if (outFile.exists()) outFile.delete()

        val connection = URL(apkUrl).openConnection() as HttpURLConnection
        connection.connectTimeout = 15_000
        connection.readTimeout = 60_000
        connection.connect()

        val totalBytes = connection.contentLengthLong
        var downloadedBytes = 0L

        connection.inputStream.use { input ->
            FileOutputStream(outFile).use { output ->
                val buffer = ByteArray(8 * 1024)
                var read: Int
                while (input.read(buffer).also { read = it } != -1) {
                    output.write(buffer, 0, read)
                    downloadedBytes += read
                    if (totalBytes > 0) {
                        val progress = ((downloadedBytes * 100) / totalBytes).toInt()
                        withContext(Dispatchers.Main) { onProgress(progress) }
                    }
                }
            }
        }

        withContext(Dispatchers.Main) { onProgress(100) }
        outFile
    }

    /**
     * Triggers the Android system install prompt for the downloaded APK.
     */
    fun installApk(context: Context, apkFile: File) {
        val uri: Uri = FileProvider.getUriForFile(
            context,
            "${context.packageName}.fileprovider",
            apkFile
        )
        val intent = Intent(Intent.ACTION_VIEW).apply {
            setDataAndType(uri, "application/vnd.android.package-archive")
            addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        }
        context.startActivity(intent)
    }
}
