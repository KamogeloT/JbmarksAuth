package com.example.jbmarks.utils

import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import java.io.IOException

/**
 * Utility class for loading assets from the assets folder
 */
object AssetLoader {
    
    /**
     * Load a bitmap image from assets
     * @param context The context to access assets
     * @param fileName The name of the file in the assets folder
     * @return The bitmap, or null if not found
     */
    fun loadBitmap(context: Context, fileName: String): Bitmap? {
        return try {
            val inputStream = context.assets.open(fileName)
            val bitmap = BitmapFactory.decodeStream(inputStream)
            inputStream.close()
            bitmap
        } catch (e: IOException) {
            null
        }
    }
    
    /**
     * Check if an asset file exists
     * @param context The context to access assets
     * @param fileName The name of the file in the assets folder
     * @return True if the file exists, false otherwise
     */
    fun assetExists(context: Context, fileName: String): Boolean {
        return try {
            context.assets.open(fileName).use { true }
        } catch (e: IOException) {
            false
        }
    }
}
