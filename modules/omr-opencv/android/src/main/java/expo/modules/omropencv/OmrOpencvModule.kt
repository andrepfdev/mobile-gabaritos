package expo.modules.omropencv

import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Matrix
import android.media.ExifInterface
import android.net.Uri
import android.util.Base64
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import org.opencv.android.OpenCVLoader
import org.opencv.android.Utils
import org.opencv.core.Core
import org.opencv.core.Mat
import org.opencv.core.MatOfPoint2f
import org.opencv.core.Point
import org.opencv.core.Size
import org.opencv.imgproc.Imgproc
import org.opencv.objdetect.ArucoDetector
import org.opencv.objdetect.DetectorParameters
import org.opencv.objdetect.Objdetect
import java.io.ByteArrayInputStream
import java.io.File
import java.io.FileInputStream
import java.io.InputStream

/**
 * Production-grade OpenCV ArUco OMR bridge:
 * - Full EXIF orientation
 * - CLAHE + tuned DetectorParameters (SUBPIX)
 * - Per-pass selection requiring IDs 0–3 (no Frankenstein merge)
 * - warpPerspective so bubble sampling shares the detection coordinate space
 */
class OmrOpencvModule : Module() {
  @Volatile
  private var openCvReady = false

  @Volatile
  private var openCvFailed = false

  private data class MarkerHit(
    val id: Int,
    val center: Point,
    val corners: List<Point>,
    val area: Double,
  )

  private data class DetectionResult(
    val markers: Map<Int, MarkerHit>,
    val score: Double,
  )

  private fun ensureOpenCv(): Boolean {
    if (openCvReady) return true
    if (openCvFailed) return false
    synchronized(this) {
      if (openCvReady) return true
      if (openCvFailed) return false
      return try {
        if (!OpenCVLoader.initLocal()) {
          openCvFailed = true
          false
        } else {
          openCvReady = true
          true
        }
      } catch (_: Exception) {
        openCvFailed = true
        false
      }
    }
  }

  private fun requireOpenCv() {
    if (!ensureOpenCv()) {
      throw Exception("Falha ao inicializar OpenCV nativo.")
    }
  }

  private fun openInputStream(imageUri: String): InputStream {
    val context = appContext.reactContext ?: throw Exceptions.ReactContextLost()
    val uri = Uri.parse(imageUri)
    return when (uri.scheme) {
      "content" -> context.contentResolver.openInputStream(uri)
        ?: throw Exception("Não foi possível abrir a imagem (content URI).")
      "file" -> FileInputStream(File(uri.path ?: throw Exception("URI file:// sem path.")))
      null -> FileInputStream(File(imageUri))
      else -> FileInputStream(File(imageUri.removePrefix("file://")))
    }
  }

  /** Apply full EXIF orientation (rotate + mirror), not only 90/180/270. */
  private fun applyExifOrientation(bitmap: Bitmap, bytes: ByteArray): Bitmap {
    val orientation = try {
      ExifInterface(ByteArrayInputStream(bytes))
        .getAttributeInt(ExifInterface.TAG_ORIENTATION, ExifInterface.ORIENTATION_NORMAL)
    } catch (_: Exception) {
      ExifInterface.ORIENTATION_NORMAL
    }

    val matrix = Matrix()
    when (orientation) {
      ExifInterface.ORIENTATION_FLIP_HORIZONTAL -> matrix.setScale(-1f, 1f)
      ExifInterface.ORIENTATION_ROTATE_180 -> matrix.setRotate(180f)
      ExifInterface.ORIENTATION_FLIP_VERTICAL -> matrix.setScale(1f, -1f)
      ExifInterface.ORIENTATION_TRANSPOSE -> {
        matrix.setRotate(90f)
        matrix.postScale(-1f, 1f)
      }
      ExifInterface.ORIENTATION_ROTATE_90 -> matrix.setRotate(90f)
      ExifInterface.ORIENTATION_TRANSVERSE -> {
        matrix.setRotate(-90f)
        matrix.postScale(-1f, 1f)
      }
      ExifInterface.ORIENTATION_ROTATE_270 -> matrix.setRotate(270f)
      else -> return bitmap
    }

    val transformed = Bitmap.createBitmap(bitmap, 0, 0, bitmap.width, bitmap.height, matrix, true)
    if (transformed !== bitmap && !bitmap.isRecycled) bitmap.recycle()
    return transformed
  }

  /**
   * Ink-aware grayscale: blue ballpoint looks almost white under BT.601 because
   * luminance weights B lightly. Using min(R,G) keeps blue and black pens dark
   * while paper stays bright — critical for phone OMR of ENEM-style sheets.
   */
  private fun rgbaToInkGray(src: Mat): Mat {
    if (src.channels() == 1) {
      val copy = Mat()
      src.copyTo(copy)
      return copy
    }
    val channels = ArrayList<Mat>(src.channels())
    Core.split(src, channels)
    try {
      val ink = Mat()
      Core.min(channels[0], channels[1], ink)
      return ink
    } finally {
      for (ch in channels) ch.release()
    }
  }

  private fun loadGrayMat(imageUri: String): Mat {
    openInputStream(imageUri).use { stream ->
      val bytes = stream.readBytes()
      val decoded = BitmapFactory.decodeByteArray(bytes, 0, bytes.size)
        ?: throw Exception("Não foi possível decodificar a imagem.")
      val bitmap = applyExifOrientation(decoded, bytes)
      val rgba = Mat()
      try {
        Utils.bitmapToMat(bitmap, rgba)
        return rgbaToInkGray(rgba)
      } finally {
        rgba.release()
        if (!bitmap.isRecycled) bitmap.recycle()
      }
    }
  }

  private fun applyFlip(src: Mat, flipMode: String): Mat {
    if (flipMode == "none" || flipMode.isEmpty()) return src
    val dst = Mat()
    when (flipMode) {
      "x" -> Core.flip(src, dst, 1)
      "y" -> Core.flip(src, dst, 0)
      "xy" -> Core.flip(src, dst, -1)
      else -> src.copyTo(dst)
    }
    return dst
  }

  private fun buildDetector(): ArucoDetector {
    val dictionary = Objdetect.getPredefinedDictionary(Objdetect.DICT_4X4_50)
    val params = DetectorParameters()
    params.set_cornerRefinementMethod(Objdetect.CORNER_REFINE_SUBPIX)
    params.set_cornerRefinementWinSize(5)
    params.set_cornerRefinementMaxIterations(40)
    params.set_cornerRefinementMinAccuracy(0.05)
    params.set_relativeCornerRefinmentWinSize(0.25f)
    params.set_minMarkerPerimeterRate(0.01)
    params.set_maxMarkerPerimeterRate(4.0)
    params.set_minDistanceToBorder(1)
    params.set_minMarkerDistanceRate(0.05)
    params.set_polygonalApproxAccuracyRate(0.04)
    params.set_adaptiveThreshWinSizeMin(3)
    params.set_adaptiveThreshWinSizeMax(53)
    params.set_adaptiveThreshWinSizeStep(8)
    params.set_adaptiveThreshConstant(7.0)
    params.set_errorCorrectionRate(0.85)
    params.set_maxErroneousBitsInBorderRate(0.4)
    params.set_detectInvertedMarker(true)
    params.set_useAruco3Detection(true)
    params.set_minSideLengthCanonicalImg(24)
    params.set_minMarkerLengthRatioOriginalImg(0.005f)
    params.set_perspectiveRemovePixelPerCell(8)
    return ArucoDetector(dictionary, params)
  }

  private fun detectOnGray(gray: Mat, detector: ArucoDetector): DetectionResult {
    val corners = ArrayList<Mat>()
    val ids = Mat()
    try {
      detector.detectMarkers(gray, corners, ids)
      val byId = LinkedHashMap<Int, MarkerHit>()
      val count = if (ids.empty()) 0 else ids.rows()
      for (i in 0 until count) {
        val id = ids.get(i, 0)[0].toInt()
        if (id !in 0..3) continue
        val cornerMat = corners[i]
        val points = ArrayList<Point>(4)
        var sumX = 0.0
        var sumY = 0.0
        for (j in 0 until 4) {
          val xy = cornerMat.get(0, j)
          val p = Point(xy[0], xy[1])
          points.add(p)
          sumX += p.x
          sumY += p.y
        }
        val area = markerArea(points)
        val hit = MarkerHit(id, Point(sumX / 4.0, sumY / 4.0), points, area)
        val prev = byId[id]
        if (prev == null || hit.area > prev.area) byId[id] = hit
      }
      var score = byId.size * 1000.0
      for (hit in byId.values) score += hit.area
      return DetectionResult(byId, score)
    } finally {
      ids.release()
      for (m in corners) m.release()
    }
  }

  private fun markerArea(points: List<Point>): Double {
    if (points.size < 4) return 0.0
    var minX = Double.POSITIVE_INFINITY
    var maxX = Double.NEGATIVE_INFINITY
    var minY = Double.POSITIVE_INFINITY
    var maxY = Double.NEGATIVE_INFINITY
    for (p in points) {
      minX = minOf(minX, p.x)
      maxX = maxOf(maxX, p.x)
      minY = minOf(minY, p.y)
      maxY = maxOf(maxY, p.y)
    }
    return maxOf(0.0, maxX - minX) * maxOf(0.0, maxY - minY)
  }

  private fun hasRequiredIds(markers: Map<Int, MarkerHit>): Boolean {
    return markers.containsKey(0) && markers.containsKey(1) &&
      markers.containsKey(2) && markers.containsKey(3)
  }

  private fun quadLooksPlausible(markers: Map<Int, MarkerHit>): Boolean {
    if (!hasRequiredIds(markers)) return false
    val tl = markers[0]!!.center
    val tr = markers[1]!!.center
    val br = markers[2]!!.center
    val bl = markers[3]!!.center
    if (tl.x >= tr.x || bl.x >= br.x) return false
    if (tl.y >= bl.y || tr.y >= br.y) return false
    val left = Math.hypot(bl.x - tl.x, bl.y - tl.y)
    val right = Math.hypot(br.x - tr.x, br.y - tr.y)
    val top = Math.hypot(tr.x - tl.x, tr.y - tl.y)
    val bottom = Math.hypot(br.x - bl.x, br.y - bl.y)
    val sideRatio = maxOf(left, right) / maxOf(1.0, minOf(left, right))
    val topBottomRatio = maxOf(top, bottom) / maxOf(1.0, minOf(top, bottom))
    return sideRatio <= 3.5 && topBottomRatio <= 3.5 && top > 20 && left > 20
  }

  private fun isComplete(detection: DetectionResult): Boolean {
    return hasRequiredIds(detection.markers) && quadLooksPlausible(detection.markers)
  }

  /**
   * Prefer a single complete pass (direct → CLAHE → blur).
   * Only merge across passes when no pass alone has 4/4 plausible IDs.
   */
  private fun detectRobust(gray: Mat, detector: ArucoDetector): DetectionResult {
    val direct = detectOnGray(gray, detector)
    if (isComplete(direct)) return direct

    val clahe = Imgproc.createCLAHE(2.5, Size(8.0, 8.0))
    val enhanced = Mat()
    try {
      clahe.apply(gray, enhanced)
      val viaClahe = detectOnGray(enhanced, detector)
      if (isComplete(viaClahe)) return viaClahe

      val blurred = Mat()
      try {
        Imgproc.GaussianBlur(enhanced, blurred, Size(3.0, 3.0), 0.0)
        val viaBlur = detectOnGray(blurred, detector)
        if (isComplete(viaBlur)) return viaBlur

        // Last resort: merge only when every pass is incomplete.
        return listOf(direct, viaClahe, viaBlur).maxBy { it.score }
      } finally {
        blurred.release()
      }
    } finally {
      enhanced.release()
    }
  }

  private fun markersToList(markers: Map<Int, MarkerHit>): List<Map<String, Any?>> {
    return markers.values.sortedBy { it.id }.map { hit ->
      mapOf(
        "id" to hit.id,
        "center" to mapOf("x" to hit.center.x, "y" to hit.center.y),
        "corners" to hit.corners.map { p -> mapOf("x" to p.x, "y" to p.y) },
      )
    }
  }

  private fun warpToCanonical(
    gray: Mat,
    markers: Map<Int, MarkerHit>,
    outWidth: Int,
    outHeight: Int,
    tlXPct: Double,
    tlYPct: Double,
    trXPct: Double,
    trYPct: Double,
    brXPct: Double,
    brYPct: Double,
    blXPct: Double,
    blYPct: Double,
  ): Mat {
    val tl = markers[0]!!.center
    val tr = markers[1]!!.center
    val br = markers[2]!!.center
    val bl = markers[3]!!.center

    val maxX = maxOf(1, outWidth - 1).toDouble()
    val maxY = maxOf(1, outHeight - 1).toDouble()

    val src = MatOfPoint2f(
      Point(tl.x, tl.y),
      Point(tr.x, tr.y),
      Point(br.x, br.y),
      Point(bl.x, bl.y),
    )
    val dst = MatOfPoint2f(
      Point(tlXPct * maxX, tlYPct * maxY),
      Point(trXPct * maxX, trYPct * maxY),
      Point(brXPct * maxX, brYPct * maxY),
      Point(blXPct * maxX, blYPct * maxY),
    )
    try {
      val transform = Imgproc.getPerspectiveTransform(src, dst)
      val warped = Mat()
      try {
        Imgproc.warpPerspective(
          gray,
          warped,
          transform,
          Size(outWidth.toDouble(), outHeight.toDouble()),
          Imgproc.INTER_LINEAR,
          Core.BORDER_REPLICATE,
        )
        return warped
      } catch (e: Exception) {
        warped.release()
        throw e
      } finally {
        transform.release()
      }
    } finally {
      src.release()
      dst.release()
    }
  }

  private fun matToGrayBase64(mat: Mat): String {
    val continuous = if (mat.isContinuous) mat else mat.clone()
    try {
      val cols = continuous.cols()
      val rows = continuous.rows()
      val bytes = ByteArray(cols * rows)
      continuous.get(0, 0, bytes)
      return Base64.encodeToString(bytes, Base64.NO_WRAP)
    } finally {
      if (continuous !== mat) continuous.release()
    }
  }

  override fun definition() = ModuleDefinition {
    Name("OmrOpencv")

    Function("isAvailable") {
      ensureOpenCv()
    }

    AsyncFunction("detectArucoCorners") { imageUri: String, flipMode: String ->
      requireOpenCv()
      val base = loadGrayMat(imageUri)
      val gray = applyFlip(base, flipMode)
      val ownsGray = gray !== base
      if (ownsGray) base.release()
      try {
        val detector = buildDetector()
        val detection = detectRobust(gray, detector)
        return@AsyncFunction mapOf(
          "available" to true,
          "width" to gray.cols(),
          "height" to gray.rows(),
          "markers" to markersToList(detection.markers),
          "arucoScore" to detection.score,
          "complete" to isComplete(detection),
          "errorCode" to if (isComplete(detection)) "" else "incomplete_markers",
        )
      } finally {
        gray.release()
      }
    }

    AsyncFunction("detectAndWarpOmr") { imageUri: String, options: DetectAndWarpOptions ->
      requireOpenCv()
      val outWidth = options.outWidth
      val outHeight = options.outHeight
      if (outWidth < 64 || outHeight < 64) {
        throw Exception("Dimensões canônicas inválidas.")
      }

      val base = loadGrayMat(imageUri)
      val detector = buildDetector()
      val flipModes = listOf("none", "x", "y", "xy")

      var bestFlip = "none"
      var bestDetection: DetectionResult? = null
      var bestGray: Mat? = null
      var bestPartial: DetectionResult? = null

      try {
        for (flipMode in flipModes) {
          val flipped = applyFlip(base, flipMode)
          val ownsFlipped = flipped !== base
          try {
            val detection = detectRobust(flipped, detector)
            val partial = bestPartial
            if (partial == null || detection.score > partial.score) {
              bestPartial = detection
            }
            if (!isComplete(detection)) continue
            val currentBest = bestDetection
            if (currentBest == null || detection.score > currentBest.score) {
              bestGray?.release()
              bestDetection = detection
              bestFlip = flipMode
              bestGray = flipped.clone()
            }
          } finally {
            if (ownsFlipped) flipped.release()
          }
        }

        val detection = bestDetection
        val gray = bestGray
        if (detection == null || gray == null) {
          val partialMarkers = bestPartial?.markers ?: emptyMap()
          return@AsyncFunction mapOf(
            "available" to true,
            "complete" to false,
            "errorCode" to "incomplete_markers",
            "width" to base.cols(),
            "height" to base.rows(),
            "markers" to markersToList(partialMarkers),
            "flipMode" to "none",
            "arucoScore" to (bestPartial?.score ?: 0.0),
            "warpedWidth" to outWidth,
            "warpedHeight" to outHeight,
            "warpedGrayBase64" to "",
          )
        }

        try {
          val warped = warpToCanonical(
            gray,
            detection.markers,
            outWidth,
            outHeight,
            options.tlXPct,
            options.tlYPct,
            options.trXPct,
            options.trYPct,
            options.brXPct,
            options.brYPct,
            options.blXPct,
            options.blYPct,
          )
          // ENEM-like scanners normalize illumination before mark density; CLAHE on canonical
          // sheet makes bubble fill-ratio stable under phone shadows.
          val normalized = Mat()
          try {
            val clahe = Imgproc.createCLAHE(2.0, Size(8.0, 8.0))
            clahe.apply(warped, normalized)
            return@AsyncFunction mapOf(
              "available" to true,
              "complete" to true,
              "errorCode" to "",
              "width" to gray.cols(),
              "height" to gray.rows(),
              "markers" to markersToList(detection.markers),
              "flipMode" to bestFlip,
              "arucoScore" to detection.score,
              "warpedWidth" to normalized.cols(),
              "warpedHeight" to normalized.rows(),
              "warpedGrayBase64" to matToGrayBase64(normalized),
            )
          } finally {
            normalized.release()
            warped.release()
          }
        } finally {
          gray.release()
        }
      } finally {
        base.release()
      }
    }
  }
}
