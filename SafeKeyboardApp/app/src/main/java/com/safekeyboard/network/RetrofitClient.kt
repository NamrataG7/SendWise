package com.safekeyboard.network

import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import java.util.concurrent.TimeUnit

/**
 * RetrofitClient - Singleton Retrofit instance
 */
object RetrofitClient {

    // TODO: Replace with your SecureDashboard Vercel deployment URL
    // After deploying SecureDashboard to Vercel, update this URL
    // Example: https://secure-dashboard-xyz.vercel.app
    // The API endpoints will be at:
    // - /api/logViolation (for logging violations)
    // - /api/getStats (for retrieving user stats)
    private const val BASE_URL = "https://your-secure-dashboard.vercel.app"

    private val loggingInterceptor = HttpLoggingInterceptor().apply {
        level = HttpLoggingInterceptor.Level.BODY
    }

    private val okHttpClient = OkHttpClient.Builder()
        .addInterceptor(loggingInterceptor)
        .connectTimeout(10, TimeUnit.SECONDS)
        .readTimeout(10, TimeUnit.SECONDS)
        .writeTimeout(10, TimeUnit.SECONDS)
        .build()

    private val retrofit = Retrofit.Builder()
        .baseUrl(BASE_URL)
        .client(okHttpClient)
        .addConverterFactory(GsonConverterFactory.create())
        .build()

    val apiService: ApiService = retrofit.create(ApiService::class.java)
}
