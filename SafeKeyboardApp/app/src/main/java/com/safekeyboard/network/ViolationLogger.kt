package com.safekeyboard.network

import android.content.Context
import android.net.ConnectivityManager
import android.net.NetworkCapabilities
import android.os.Build
import com.safekeyboard.utils.PreferencesManager
import com.safekeyboard.utils.UserIdGenerator
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONArray
import org.json.JSONObject
import java.io.File

/**
 * ViolationLogger - Handles logging violations to the server
 *
 * RULES:
 * - Only when user chooses "Send anyway"
 * - Fire-and-forget
 * - Retry when online
 * - HTTPS only
 * - JSON only
 *
 * OFFLINE HANDLING:
 * - Queue locally (count only)
 * - Sync later
 * - Never queue text
 */
class ViolationLogger(private val context: Context) {

    private val apiService = RetrofitClient.apiService
    private val preferencesManager = PreferencesManager(context)
    private val queueFile = File(context.filesDir, "violation_queue.json")

    /**
     * Logs a violation to the server
     * If offline, queues for later sync
     */
    suspend fun logViolation(
        category: String,
        severity: String,
        action: String
    ) = withContext(Dispatchers.IO) {
        try {
            // Get anonymous user ID
            val userId = UserIdGenerator.getAnonymousUserId(context)

            // Create request
            val request = ViolationLogRequest(
                user_id_hash = userId,
                category = category,
                severity = severity,
                action = action
            )

            // Check network connectivity
            if (isNetworkAvailable()) {
                // Try to send immediately
                sendViolation(request)

                // Also try to sync any queued violations
                syncQueuedViolations()
            } else {
                // Queue for later
                queueViolation(request)
            }

            // Update local statistics
            updateLocalStatistics(action, category)

        } catch (e: Exception) {
            e.printStackTrace()
            // Fail silently - don't block user
        }
    }

    /**
     * Sends a violation to the server
     */
    private suspend fun sendViolation(request: ViolationLogRequest) {
        try {
            val response = apiService.logViolation(request)

            if (response.isSuccessful) {
                val body = response.body()
                // Handle escalation flag if present
                body?.escalation_flag?.let { flagged ->
                    if (flagged) {
                        handleEscalationFlag(body.current_count ?: 0)
                    }
                }
            } else {
                // Queue if server returns error
                queueViolation(request)
            }
        } catch (e: Exception) {
            e.printStackTrace()
            // Queue if network error
            queueViolation(request)
        }
    }

    /**
     * Queues a violation for later sync
     */
    private fun queueViolation(request: ViolationLogRequest) {
        try {
            val queue = loadQueue()
            queue.put(createQueueItem(request))
            saveQueue(queue)
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    /**
     * Syncs queued violations when network is available
     */
    suspend fun syncQueuedViolations() = withContext(Dispatchers.IO) {
        try {
            if (!isNetworkAvailable()) return@withContext

            val queue = loadQueue()
            if (queue.length() == 0) return@withContext

            val successfulIndices = mutableListOf<Int>()

            for (i in 0 until queue.length()) {
                try {
                    val item = queue.getJSONObject(i)
                    val request = ViolationLogRequest(
                        user_id_hash = item.getString("user_id_hash"),
                        category = item.getString("category"),
                        severity = item.getString("severity"),
                        action = item.getString("action")
                    )

                    val response = apiService.logViolation(request)
                    if (response.isSuccessful) {
                        successfulIndices.add(i)
                    }
                } catch (e: Exception) {
                    e.printStackTrace()
                    // Continue with other items
                }
            }

            // Remove successfully synced items
            if (successfulIndices.isNotEmpty()) {
                val newQueue = JSONArray()
                for (i in 0 until queue.length()) {
                    if (i !in successfulIndices) {
                        newQueue.put(queue.getJSONObject(i))
                    }
                }
                saveQueue(newQueue)
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    /**
     * Creates a queue item from a request
     */
    private fun createQueueItem(request: ViolationLogRequest): JSONObject {
        return JSONObject().apply {
            put("user_id_hash", request.user_id_hash)
            put("category", request.category)
            put("severity", request.severity)
            put("action", request.action)
            put("timestamp", System.currentTimeMillis())
        }
    }

    /**
     * Loads the violation queue from disk
     */
    private fun loadQueue(): JSONArray {
        return try {
            if (queueFile.exists()) {
                val json = queueFile.readText()
                JSONArray(json)
            } else {
                JSONArray()
            }
        } catch (e: Exception) {
            e.printStackTrace()
            JSONArray()
        }
    }

    /**
     * Saves the violation queue to disk
     */
    private fun saveQueue(queue: JSONArray) {
        try {
            queueFile.writeText(queue.toString())
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    /**
     * Updates local statistics
     */
    private fun updateLocalStatistics(action: String, category: String) {
        when (action) {
            "sent_anyway" -> {
                preferencesManager.incrementViolationCount(2) // +2 for send anyway
            }
            "warning_only" -> {
                preferencesManager.incrementWarningCount(1) // +1 for warning
            }
        }
        preferencesManager.setLastCategory(category)
    }

    /**
     * Handles escalation flag from server
     */
    private fun handleEscalationFlag(count: Int) {
        // This could trigger additional UI warnings or notifications
        // For now, just log it
        println("Escalation flag received. Total count: $count")
    }

    /**
     * Checks if network is available
     */
    private fun isNetworkAvailable(): Boolean {
        val connectivityManager = context.getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager

        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            val network = connectivityManager.activeNetwork ?: return false
            val capabilities = connectivityManager.getNetworkCapabilities(network) ?: return false
            capabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)
        } else {
            @Suppress("DEPRECATION")
            val networkInfo = connectivityManager.activeNetworkInfo
            @Suppress("DEPRECATION")
            networkInfo?.isConnected == true
        }
    }

    /**
     * Gets the current queue size
     */
    fun getQueueSize(): Int {
        return try {
            loadQueue().length()
        } catch (e: Exception) {
            0
        }
    }

    /**
     * Clears the queue (for testing/debugging)
     */
    fun clearQueue() {
        try {
            queueFile.delete()
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }
}
