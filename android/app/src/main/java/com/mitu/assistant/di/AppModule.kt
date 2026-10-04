package com.mitu.assistant.di

import android.content.Context
import android.content.pm.ApplicationInfo
import androidx.room.Room
import com.mitu.assistant.core.logging.SafeLogger
import com.mitu.assistant.data.room.AppDatabase
import com.mitu.assistant.data.room.ChatMessageDao
import com.mitu.assistant.data.room.NoteDao
import com.mitu.assistant.data.settings.GeminiConfig
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import java.util.concurrent.TimeUnit
import javax.inject.Singleton

/**
 * AppModule: the single Hilt graph for MITU.
 *
 * Everything below is a dependency that is constructor-injected elsewhere
 * (GeminiProvider / OpenAiCompatibleProvider need OkHttpClient, GeminiLiveClient needs
 * GeminiConfig, screens need the Room DAOs) and would otherwise fail DAG analysis at compile time.
 */
@Module
@InstallIn(SingletonComponent::class)
object AppModule {

    /**
     * Read/debug builds only. Using the application flag instead of BuildConfig.DEBUG keeps us
     * from having to enable the buildConfig feature for one boolean.
     */
    private fun isDebuggable(context: Context): Boolean =
        (context.applicationInfo.flags and ApplicationInfo.FLAG_DEBUGGABLE) != 0

    @Provides
    @Singleton
    fun provideOkHttpClient(@ApplicationContext context: Context): OkHttpClient {
        val builder = OkHttpClient.Builder()
            .connectTimeout(30, TimeUnit.SECONDS)
            // Streaming (SSE) responses must not be cut off by a read timeout.
            .readTimeout(0, TimeUnit.MILLISECONDS)
            .writeTimeout(30, TimeUnit.SECONDS)
            .pingInterval(20, TimeUnit.SECONDS)

        if (isDebuggable(context)) {
            // Bodies are logged only in debug builds, and every line goes through SafeLogger so
            // API keys in URLs/bodies never reach logcat.
            val logging = HttpLoggingInterceptor { message -> SafeLogger.d("HTTP", message) }
            logging.level = HttpLoggingInterceptor.Level.BODY
            builder.addInterceptor(logging)
        }

        return builder.build()
    }

    @Provides
    @Singleton
    fun provideGeminiConfig(): GeminiConfig = GeminiConfig()

    @Provides
    @Singleton
    fun provideAppDatabase(@ApplicationContext context: Context): AppDatabase =
        Room.databaseBuilder(context, AppDatabase::class.java, "mitu.db")
            .fallbackToDestructiveMigration()
            .build()

    @Provides
    @Singleton
    fun provideNoteDao(database: AppDatabase): NoteDao = database.noteDao()

    @Provides
    @Singleton
    fun provideChatMessageDao(database: AppDatabase): ChatMessageDao = database.chatMessageDao()
}
