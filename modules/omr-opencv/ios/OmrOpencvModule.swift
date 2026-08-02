import ExpoModulesCore

public class OmrOpencvModule: Module {
  public func definition() -> ModuleDefinition {
    Name("OmrOpencv")

    Function("isAvailable") { () -> Bool in
      return false
    }

    AsyncFunction("detectArucoCorners") { (_imageUri: String, _flipMode: String) -> [String: Any] in
      return [
        "available": false,
        "width": 0,
        "height": 0,
        "markers": [] as [[String: Any]],
        "complete": false,
      ]
    }

    AsyncFunction("detectAndWarpOmr") { (_imageUri: String, options: [String: Any]) -> [String: Any] in
      let outWidth = options["outWidth"] as? Int ?? 0
      let outHeight = options["outHeight"] as? Int ?? 0
      return [
        "available": false,
        "complete": false,
        "errorCode": "unavailable",
        "width": 0,
        "height": 0,
        "markers": [] as [[String: Any]],
        "flipMode": "none",
        "arucoScore": 0.0,
        "warpedWidth": outWidth,
        "warpedHeight": outHeight,
        "warpedGrayBase64": "",
      ]
    }
  }
}
