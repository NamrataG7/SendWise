package com.safekeyboard.utils

import android.annotation.SuppressLint
import android.content.Context
import android.provider.Settings
import java.security.MessageDigest

/**
 * UserIdGenerator - Generates privacy-preserving anonymous user IDs
 *
 * IDENTITY RULES (NON-NEGOTIABLE):
 * - No login
 * - No phone number
 * - No email
 * - No Android account
 *
 * IMPLEMENTATION:
 * - Hash(AndroidID + AppSalt)
 * - SHA-256
 * - One-way
 * - Stable across sessions
 *
 * Properties:
 * - Not a real identity
 * - Not reversible
 * - No PII
 * - Stable per device
 * - Countable over time
 *
 * This allows the system to say:
 * "The same anonymous actor has violated policies 27 times."
 * But you still don't know who they are — and that's correct.
 */
object UserIdGenerator {

    // App-specific salt (should be unique per app instance)
    private const val APP_SALT = "SafeKeyboard_v1_2024_Privacy_Salt"

    /**
     * Generates an anonymous user ID hash
     *
     * @param context Application context
     * @return SHA-256 hash of (AndroidID + AppSalt)
     */
    @SuppressLint("HardwareIds")
    fun getAnonymousUserId(context: Context): String {
        // Get Android ID
        val androidId = Settings.Secure.getString(
            context.contentResolver,
            Settings.Secure.ANDROID_ID
        ) ?: "UNKNOWN"

        // Combine with app salt
        val combined = androidId + APP_SALT

        // Generate SHA-256 hash
        return sha256(combined)
    }

    /**
     * Computes SHA-256 hash of the input string
     */
    private fun sha256(input: String): String {
        val bytes = input.toByteArray()
        val digest = MessageDigest.getInstance("SHA-256")
        val hashBytes = digest.digest(bytes)

        // Convert to hex string
        return hashBytes.joinToString("") { byte ->
            "%02x".format(byte)
        }
    }

    /**
     * Validates that a user ID looks like a valid hash
     */
    fun isValidUserId(userId: String): Boolean {
        // SHA-256 produces 64 hex characters
        return userId.matches(Regex("^[a-f0-9]{64}$"))
    }

    /**
     * Gets a shortened version of the user ID (for display purposes only)
     * Shows first 8 and last 4 characters
     */
    fun getShortenedUserId(userId: String): String {
        if (userId.length < 12) return userId
        return "${userId.substring(0, 8)}...${userId.substring(userId.length - 4)}"
    }
}
