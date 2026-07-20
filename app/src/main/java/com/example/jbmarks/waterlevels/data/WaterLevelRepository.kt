package com.example.jbmarks.waterlevels.data

import android.content.Context
import android.util.Log
import com.example.jbmarks.auth.data.TokenManager
import com.example.jbmarks.user.data.UserRepository
import com.example.jbmarks.waterlevels.domain.ReservoirReading
import com.example.jbmarks.waterlevels.domain.WaterLevelSubmission
import com.google.gson.Gson
import com.google.gson.reflect.TypeToken
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.net.HttpURLConnection
import java.net.URL
import java.time.LocalDate
import java.time.LocalDateTime
import java.time.format.DateTimeFormatter

class WaterLevelRepository(private val context: Context) {

    private val TAG = "WaterLevelRepo"
    private val gson = Gson()
    private val tokenManager = TokenManager(context)
    private val userRepository = UserRepository(context)

    companion object {
        private const val API_BASE = "https://jbmarksauth-production.up.railway.app/api/water-levels"
    }

    suspend fun submitReadings(readings: List<ReservoirReading>): Result<WaterLevelSubmission> {
        return withContext(Dispatchers.IO) {
            try {
                val user = userRepository.getCurrentUser().getOrNull()
                val userId = user?.id ?: "unknown"
                val userName = "${user?.name ?: ""} ${user?.lastName ?: ""}".trim()

                val now = LocalDateTime.now()
                val submission = WaterLevelSubmission(
                    id = "${LocalDate.now()}_${System.currentTimeMillis()}",
                    submittedBy = userId,
                    submittedByName = userName,
                    submittedAt = now.format(DateTimeFormatter.ISO_LOCAL_DATE_TIME),
                    date = LocalDate.now().format(DateTimeFormatter.ISO_LOCAL_DATE),
                    readings = readings
                )

                val json = gson.toJson(submission)
                Log.d(TAG, "Submitting readings: $json")

                val url = URL(API_BASE)
                val connection = url.openConnection() as HttpURLConnection
                connection.requestMethod = "POST"
                connection.setRequestProperty("Content-Type", "application/json")
                connection.doOutput = true
                connection.connectTimeout = 30000
                connection.readTimeout = 30000

                connection.outputStream.use { it.write(json.toByteArray()) }

                val responseCode = connection.responseCode
                if (responseCode in 200..201) {
                    Log.d(TAG, "Readings submitted successfully")
                    Result.success(submission)
                } else {
                    val error = connection.errorStream?.bufferedReader()?.use { it.readText() } ?: "Unknown error"
                    Log.e(TAG, "Submit failed: $responseCode - $error")
                    Result.failure(Exception("Submit failed: $responseCode"))
                }
            } catch (e: Exception) {
                Log.e(TAG, "Error submitting readings", e)
                Result.failure(e)
            }
        }
    }

    suspend fun getSubmissions(limit: Int = 10): Result<List<WaterLevelSubmission>> {
        return withContext(Dispatchers.IO) {
            try {
                val today = LocalDate.now().format(DateTimeFormatter.ISO_LOCAL_DATE)
                val url = URL("$API_BASE?date=$today&limit=$limit")
                val connection = url.openConnection() as HttpURLConnection
                connection.requestMethod = "GET"
                connection.setRequestProperty("Accept", "application/json")
                connection.connectTimeout = 30000
                connection.readTimeout = 30000

                val responseCode = connection.responseCode
                if (responseCode == 200) {
                    val body = connection.inputStream.bufferedReader().use { it.readText() }
                    val type = object : TypeToken<List<WaterLevelSubmission>>() {}.type
                    val submissions: List<WaterLevelSubmission> = gson.fromJson(body, type)
                    Result.success(submissions)
                } else {
                    Result.failure(Exception("Fetch failed: $responseCode"))
                }
            } catch (e: Exception) {
                Log.e(TAG, "Error fetching submissions", e)
                Result.failure(e)
            }
        }
    }
}
