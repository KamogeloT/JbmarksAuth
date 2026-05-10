package com.example.jbmarks.utils

import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Matrix
import androidx.exifinterface.media.ExifInterface
import java.io.ByteArrayOutputStream
import java.io.File
import java.io.FileOutputStream

/**
 * Compresses and resizes images before upload to avoid HTTP 413 errors.
 * Target: max 1280px on longest side, JPEG quality 80 → typically 200-400KB.
 */
object ImageCompressor {

    private const val MAX_DIMENSION = 1280
    private const val JPEG_QUALITY = 80
    private const val MAX_BYTES = 1_500_000L // 1.5MB hard cap

    /**
     * Compresses the image at [inputPath], writes the result to [outputFile],
     * and returns the output file. Falls back to the original if it's already small enough.
     */
    fun compress(inputPath: String, outputFile: File): File {
        val inputFile = File(inputPath)
        if (!inputFile.exists()) return inputFile

        // If already small enough, skip compression
        if (inputFile.length() <= MAX_BYTES && !isImage(inputFile.name)) return inputFile

        return try {
            // Decode with inSampleSize to avoid OOM on large images
            val options = BitmapFactory.Options().apply { inJustDecodeBounds = true }
            BitmapFactory.decodeFile(inputPath, options)

            val (origW, origH) = options.outWidth to options.outHeight
            val sampleSize = calculateSampleSize(origW, origH, MAX_DIMENSION)

            val decodeOptions = BitmapFactory.Options().apply {
                inSampleSize = sampleSize
                inPreferredConfig = Bitmap.Config.RGB_565 // saves memory
            }
            var bitmap = BitmapFactory.decodeFile(inputPath, decodeOptions) ?: return inputFile

            // Correct rotation from EXIF
            bitmap = correctRotation(bitmap, inputPath)

            // Scale down if still too large
            val (w, h) = bitmap.width to bitmap.height
            val maxDim = maxOf(w, h)
            if (maxDim > MAX_DIMENSION) {
                val scale = MAX_DIMENSION.toFloat() / maxDim
                bitmap = Bitmap.createScaledBitmap(
                    bitmap,
                    (w * scale).toInt(),
                    (h * scale).toInt(),
                    true
                )
            }

            // Compress to JPEG
            val out = ByteArrayOutputStream()
            bitmap.compress(Bitmap.CompressFormat.JPEG, JPEG_QUALITY, out)
            bitmap.recycle()

            outputFile.parentFile?.mkdirs()
            FileOutputStream(outputFile).use { it.write(out.toByteArray()) }

            android.util.Log.d("ImageCompressor",
                "Compressed ${inputFile.length() / 1024}KB → ${outputFile.length() / 1024}KB")

            outputFile
        } catch (e: Exception) {
            android.util.Log.e("ImageCompressor", "Compression failed, using original", e)
            inputFile // fall back to original
        }
    }

    private fun calculateSampleSize(width: Int, height: Int, maxDim: Int): Int {
        var size = 1
        val maxOrigDim = maxOf(width, height)
        while (maxOrigDim / (size * 2) > maxDim) size *= 2
        return size
    }

    private fun correctRotation(bitmap: Bitmap, path: String): Bitmap {
        return try {
            val exif = ExifInterface(path)
            val orientation = exif.getAttributeInt(
                ExifInterface.TAG_ORIENTATION,
                ExifInterface.ORIENTATION_NORMAL
            )
            val degrees = when (orientation) {
                ExifInterface.ORIENTATION_ROTATE_90 -> 90f
                ExifInterface.ORIENTATION_ROTATE_180 -> 180f
                ExifInterface.ORIENTATION_ROTATE_270 -> 270f
                else -> 0f
            }
            if (degrees == 0f) return bitmap
            val matrix = Matrix().apply { postRotate(degrees) }
            val rotated = Bitmap.createBitmap(bitmap, 0, 0, bitmap.width, bitmap.height, matrix, true)
            bitmap.recycle()
            rotated
        } catch (e: Exception) {
            bitmap
        }
    }

    private fun isImage(name: String): Boolean {
        val lower = name.lowercase()
        return lower.endsWith(".jpg") || lower.endsWith(".jpeg") ||
               lower.endsWith(".png") || lower.endsWith(".webp") ||
               lower.endsWith(".bmp")
    }
}
