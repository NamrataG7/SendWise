package com.safekeyboard.network

import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.POST

/**
 * ApiService - Retrofit interface for backend communication
 *
 * API CONTRACT (STRICT):
 * POST /logViolation
 * {
 *   "user_id_hash": "string",
 *   "category": "string",
 *   "severity": "string",
 *   "action": "sent_anyway | warning_only"
 * }
 *
 * ABSOLUTELY FORBIDDEN:
 * - Message text
 * - Recipient info
 * - App name
 * - IP storage
 */
interface ApiService {

    @POST("/api/logViolation")
    suspend fun logViolation(
        @Body request: ViolationLogRequest
    ): Response<ViolationLogResponse>
}

/**
 * Request model for logging violations
 */
data class ViolationLogRequest(
    val user_id_hash: String,
    val category: String,
    val severity: String,
    val action: String
)

/**
 * Response model for violation logging
 */
data class ViolationLogResponse(
    val success: Boolean,
    val message: String? = null,
    val current_count: Int? = null,
    val escalation_flag: Boolean? = null
)
