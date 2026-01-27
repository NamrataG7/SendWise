package com.safekeyboard.ui

import android.content.Context
import android.graphics.PixelFormat
import android.os.Build
import android.provider.Settings
import android.view.Gravity
import android.view.LayoutInflater
import android.view.View
import android.view.WindowManager
import android.widget.Button
import android.widget.TextView
import android.widget.Toast
import com.safekeyboard.R
import com.safekeyboard.nlp.ToxicityAnalyzer

/**
 * WarningOverlayManager - Manages the pre-send blocking popup
 *
 * REQUIREMENTS:
 * - System overlay (not dialog)
 * - Blocks interaction temporarily
 * - Emotionally neutral wording
 * - No shaming language
 *
 * Buttons:
 * 1. Edit message - Dismiss popup, return to keyboard, no server call
 * 2. Send anyway - Allow send, log violation metadata
 */
class WarningOverlayManager(private val context: Context) {

    private var windowManager: WindowManager? = null
    private var overlayView: View? = null
    private var isShowing = false

    // Callback for user decision
    var onUserDecision: ((sendAnyway: Boolean) -> Unit)? = null

    // Store current analysis result for logging
    var currentAnalysisResult: ToxicityAnalyzer.AnalysisResult? = null

    init {
        windowManager = context.getSystemService(Context.WINDOW_SERVICE) as WindowManager
    }

    /**
     * Shows the warning overlay
     */
    fun showWarning(category: String, severity: String) {
        // Check if we have overlay permission
        if (!hasOverlayPermission()) {
            Toast.makeText(
                context,
                R.string.toast_overlay_permission_needed,
                Toast.LENGTH_LONG
            ).show()
            return
        }

        // Don't show if already showing
        if (isShowing) {
            return
        }

        // Inflate the overlay view
        val inflater = LayoutInflater.from(context)
        overlayView = inflater.inflate(R.layout.warning_overlay, null)

        // Set up the view
        setupOverlayView(category, severity)

        // Configure window parameters
        val params = WindowManager.LayoutParams(
            WindowManager.LayoutParams.MATCH_PARENT,
            WindowManager.LayoutParams.MATCH_PARENT,
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
            } else {
                @Suppress("DEPRECATION")
                WindowManager.LayoutParams.TYPE_PHONE
            },
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or
                    WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN or
                    WindowManager.LayoutParams.FLAG_WATCH_OUTSIDE_TOUCH,
            PixelFormat.TRANSLUCENT
        )

        params.gravity = Gravity.CENTER

        // Add the overlay to window
        try {
            windowManager?.addView(overlayView, params)
            isShowing = true
        } catch (e: Exception) {
            e.printStackTrace()
            Toast.makeText(
                context,
                R.string.toast_overlay_permission_needed,
                Toast.LENGTH_SHORT
            ).show()
        }
    }

    /**
     * Sets up the overlay view with buttons and content
     */
    private fun setupOverlayView(category: String, severity: String) {
        overlayView?.let { view ->
            // Optional: Show category badge
            val categoryBadge = view.findViewById<TextView>(R.id.category_badge)
            categoryBadge.text = category.uppercase()
            categoryBadge.visibility = View.VISIBLE

            // Set up Edit button
            val editButton = view.findViewById<Button>(R.id.button_edit)
            editButton.setOnClickListener {
                dismissOverlay()
                onUserDecision?.invoke(false) // User chose to edit
            }

            // Set up Send Anyway button
            val sendAnywayButton = view.findViewById<Button>(R.id.button_send_anyway)
            sendAnywayButton.setOnClickListener {
                dismissOverlay()
                onUserDecision?.invoke(true) // User chose to send anyway
            }
        }
    }

    /**
     * Dismisses the overlay
     */
    private fun dismissOverlay() {
        try {
            if (overlayView != null && isShowing) {
                windowManager?.removeView(overlayView)
                overlayView = null
                isShowing = false
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    /**
     * Checks if the app has overlay permission
     */
    private fun hasOverlayPermission(): Boolean {
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            Settings.canDrawOverlays(context)
        } else {
            true
        }
    }

    /**
     * Cleanup resources
     */
    fun cleanup() {
        dismissOverlay()
        onUserDecision = null
        currentAnalysisResult = null
    }

    /**
     * Checks if overlay is currently showing
     */
    fun isOverlayShowing(): Boolean {
        return isShowing
    }
}
