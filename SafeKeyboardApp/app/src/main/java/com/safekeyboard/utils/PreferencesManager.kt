package com.safekeyboard.utils

import android.content.Context
import android.content.SharedPreferences
import androidx.preference.PreferenceManager

/**
 * PreferencesManager - Manages user preferences and settings
 *
 * Settings include:
 * - Enable/disable moderation
 * - Sensitivity threshold
 * - Local statistics
 */
class PreferencesManager(context: Context) {

    private val prefs: SharedPreferences = PreferenceManager.getDefaultSharedPreferences(context)

    companion object {
        private const val KEY_MODERATION_ENABLED = "moderation_enabled"
        private const val KEY_SENSITIVITY_THRESHOLD = "sensitivity_threshold"
        private const val KEY_VIOLATION_COUNT = "violation_count"
        private const val KEY_WARNING_COUNT = "warning_count"
        private const val KEY_LAST_CATEGORY = "last_category"

        // Default values
        private const val DEFAULT_MODERATION_ENABLED = true
        private const val DEFAULT_SENSITIVITY_THRESHOLD = 0.5f
    }

    /**
     * Checks if moderation is enabled
     */
    fun isModerationEnabled(): Boolean {
        return prefs.getBoolean(KEY_MODERATION_ENABLED, DEFAULT_MODERATION_ENABLED)
    }

    /**
     * Sets moderation enabled/disabled
     */
    fun setModerationEnabled(enabled: Boolean) {
        prefs.edit().putBoolean(KEY_MODERATION_ENABLED, enabled).apply()
    }

    /**
     * Gets the sensitivity threshold (0.0 to 1.0)
     */
    fun getSensitivityThreshold(): Float {
        return prefs.getFloat(KEY_SENSITIVITY_THRESHOLD, DEFAULT_SENSITIVITY_THRESHOLD)
    }

    /**
     * Sets the sensitivity threshold
     */
    fun setSensitivityThreshold(threshold: Float) {
        val clampedThreshold = threshold.coerceIn(0f, 1f)
        prefs.edit().putFloat(KEY_SENSITIVITY_THRESHOLD, clampedThreshold).apply()
    }

    /**
     * Gets the local violation count
     */
    fun getViolationCount(): Int {
        return prefs.getInt(KEY_VIOLATION_COUNT, 0)
    }

    /**
     * Increments the violation count
     */
    fun incrementViolationCount(amount: Int = 1) {
        val currentCount = getViolationCount()
        prefs.edit().putInt(KEY_VIOLATION_COUNT, currentCount + amount).apply()
    }

    /**
     * Gets the local warning count
     */
    fun getWarningCount(): Int {
        return prefs.getInt(KEY_WARNING_COUNT, 0)
    }

    /**
     * Increments the warning count
     */
    fun incrementWarningCount(amount: Int = 1) {
        val currentCount = getWarningCount()
        prefs.edit().putInt(KEY_WARNING_COUNT, currentCount + amount).apply()
    }

    /**
     * Gets the last detected category
     */
    fun getLastCategory(): String? {
        return prefs.getString(KEY_LAST_CATEGORY, null)
    }

    /**
     * Sets the last detected category
     */
    fun setLastCategory(category: String) {
        prefs.edit().putString(KEY_LAST_CATEGORY, category).apply()
    }

    /**
     * Resets all statistics
     */
    fun resetStatistics() {
        prefs.edit()
            .putInt(KEY_VIOLATION_COUNT, 0)
            .putInt(KEY_WARNING_COUNT, 0)
            .remove(KEY_LAST_CATEGORY)
            .apply()
    }

    /**
     * Gets all preferences for export/debugging
     */
    fun getAllPreferences(): Map<String, Any?> {
        return mapOf(
            "moderationEnabled" to isModerationEnabled(),
            "sensitivityThreshold" to getSensitivityThreshold(),
            "violationCount" to getViolationCount(),
            "warningCount" to getWarningCount(),
            "lastCategory" to getLastCategory()
        )
    }
}
