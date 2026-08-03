package expo.modules.omropencv

import expo.modules.kotlin.records.Field
import expo.modules.kotlin.records.Record
import expo.modules.kotlin.types.OptimizedRecord
import java.io.Serializable

@OptimizedRecord
class DetectAndWarpOptions(
  @Field var outWidth: Int = 1000,
  @Field var outHeight: Int = 1000,
  @Field var tlXPct: Double = 0.0,
  @Field var tlYPct: Double = 0.0,
  @Field var trXPct: Double = 1.0,
  @Field var trYPct: Double = 0.0,
  @Field var brXPct: Double = 1.0,
  @Field var brYPct: Double = 1.0,
  @Field var blXPct: Double = 0.0,
  @Field var blYPct: Double = 1.0,
) : Record, Serializable
