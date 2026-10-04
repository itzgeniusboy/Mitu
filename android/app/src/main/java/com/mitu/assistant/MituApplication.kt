package com.mitu.assistant

import android.app.Application
import dagger.hilt.android.HiltAndroidApp

@HiltAndroidApp
class MituApplication : Application() {
    override fun onCreate() {
        super.onCreate()
        // Initialization of secure storage & crash logger
    }
}
