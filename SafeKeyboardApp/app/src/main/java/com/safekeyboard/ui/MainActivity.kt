package com.safekeyboard.ui

import android.content.Context
import android.content.Intent
import android.os.Bundle
import android.provider.Settings
import android.view.View
import android.view.inputmethod.InputMethodManager
import android.widget.Button
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import androidx.cardview.widget.CardView
import com.safekeyboard.R

/**
 * MainActivity - Main entry point of the app
 *
 * Provides:
 * - Enable keyboard instructions
 * - Settings access
 * - Privacy information
 */
class MainActivity : AppCompatActivity() {

    private lateinit var buttonEnableKeyboard: Button
    private lateinit var buttonSettings: Button
    private lateinit var buttonPrivacy: Button
    private lateinit var statusCard: CardView

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        // Initialize views
        buttonEnableKeyboard = findViewById(R.id.button_enable_keyboard)
        buttonSettings = findViewById(R.id.button_settings)
        buttonPrivacy = findViewById(R.id.button_privacy)
        statusCard = findViewById(R.id.status_card)

        // Set up click listeners
        buttonEnableKeyboard.setOnClickListener {
            openKeyboardSettings()
        }

        buttonSettings.setOnClickListener {
            openSettings()
        }

        buttonPrivacy.setOnClickListener {
            showPrivacyDialog()
        }
    }

    override fun onResume() {
        super.onResume()
        // Check keyboard status
        updateKeyboardStatus()
    }

    /**
     * Opens the system keyboard settings
     */
    private fun openKeyboardSettings() {
        startActivity(Intent(Settings.ACTION_INPUT_METHOD_SETTINGS))
    }

    /**
     * Opens the app settings
     */
    private fun openSettings() {
        startActivity(Intent(this, SettingsActivity::class.java))
    }

    /**
     * Shows privacy information dialog
     */
    private fun showPrivacyDialog() {
        AlertDialog.Builder(this)
            .setTitle(R.string.privacy_title)
            .setMessage(buildPrivacyMessage())
            .setPositiveButton("OK", null)
            .show()
    }

    /**
     * Builds the privacy message
     */
    private fun buildPrivacyMessage(): String {
        return getString(R.string.privacy_what_analyzed) + "\n\n" +
                getString(R.string.privacy_what_not_stored) + "\n\n" +
                getString(R.string.privacy_what_sent)
    }

    /**
     * Updates the keyboard status display
     */
    private fun updateKeyboardStatus() {
        if (isKeyboardEnabled()) {
            statusCard.visibility = View.VISIBLE
        } else {
            statusCard.visibility = View.GONE
        }
    }

    /**
     * Checks if SafeKeyboard is enabled in system settings
     */
    private fun isKeyboardEnabled(): Boolean {
        val imm = getSystemService(Context.INPUT_METHOD_SERVICE) as InputMethodManager
        val enabledInputMethods = Settings.Secure.getString(
            contentResolver,
            Settings.Secure.ENABLED_INPUT_METHODS
        ) ?: ""

        return enabledInputMethods.contains(packageName)
    }
}
