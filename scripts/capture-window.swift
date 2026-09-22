// macOS 15+: actual, silent ScreenCaptureKit capture of ONE explicitly selected window.
// UI interaction belongs to the documented computer-use tools, not this helper.
import Foundation
import AppKit
import CoreGraphics
import ScreenCaptureKit
import AVFoundation
import Darwin

struct CaptureError: LocalizedError {
    let message: String
    var errorDescription: String? { message }
}

func emit(_ value: [String: Any]) {
    if let data = try? JSONSerialization.data(withJSONObject: value, options: [.sortedKeys]),
       let line = String(data: data, encoding: .utf8) {
        print(line)
        fflush(stdout)
    }
}

final class CaptureState: NSObject, SCRecordingOutputDelegate, SCStreamDelegate, SCStreamOutput, @unchecked Sendable {
    private let lock = NSLock()
    private var started = false
    private var finished = false
    private var stopRequested = false
    private var failure: String?
    private var completeFrames = 0
    private var firstFrameTime: Double?
    private var lastFrameTime: Double?

    func snapshot() -> (started: Bool, finished: Bool, stop: Bool, failure: String?, frames: Int, first: Double?, last: Double?) {
        lock.lock(); defer { lock.unlock() }
        return (started, finished, stopRequested, failure, completeFrames, firstFrameTime, lastFrameTime)
    }
    func requestStop() { lock.lock(); stopRequested = true; lock.unlock() }
    func recordingOutputDidStartRecording(_ recordingOutput: SCRecordingOutput) {
        lock.lock(); started = true; lock.unlock()
        emit(["event": "RECORDING_STARTED", "timestamp": ISO8601DateFormatter().string(from: Date())])
    }
    func recordingOutputDidFinishRecording(_ recordingOutput: SCRecordingOutput) {
        lock.lock(); finished = true; lock.unlock()
    }
    func recordingOutput(_ recordingOutput: SCRecordingOutput, didFailWithError error: Error) {
        lock.lock(); failure = error.localizedDescription; finished = true; lock.unlock()
    }
    func stream(_ stream: SCStream, didStopWithError error: Error) {
        lock.lock(); failure = error.localizedDescription; stopRequested = true; lock.unlock()
    }
    func stream(_ stream: SCStream, didOutputSampleBuffer sampleBuffer: CMSampleBuffer, of type: SCStreamOutputType) {
        guard type == .screen, sampleBuffer.isValid,
              let attachments = CMSampleBufferGetSampleAttachmentsArray(sampleBuffer, createIfNecessary: false) as? [[SCStreamFrameInfo: Any]],
              let status = attachments.first?[.status] as? Int,
              status == SCFrameStatus.complete.rawValue else { return }
        let pts = CMTimeGetSeconds(CMSampleBufferGetPresentationTimeStamp(sampleBuffer))
        lock.lock()
        completeFrames += 1
        if firstFrameTime == nil { firstFrameTime = pts }
        lastFrameTime = pts
        lock.unlock()
    }
}

@main struct Main {
    static func main() async {
        do {
            // ScreenCaptureKit's window compositor requires an initialized
            // AppKit/WindowServer connection even for a command-line capture.
            await MainActor.run { _ = NSApplication.shared }
            try await run()
        }
        catch {
            emit(["event": "ERROR", "message": error.localizedDescription])
            exit(1)
        }
    }

    static func run() async throws {
        let args = Array(CommandLine.arguments.dropFirst())
        if args.isEmpty || args.contains("--help") {
            print("""
            Capture only an explicit browser window using ScreenCaptureKit (macOS 15+).
            List:    capture-window --list --title TEXT [--bundle com.google.Chrome]
            Record:  capture-window --window ID --title TEXT --output FILE.mp4 [--seconds 900]
                     [--bundle com.google.Chrome] [--width 1920] [--height 1080] [--fps 30]
                     [--stop-file FILE] [--hide-cursor] [--show-clicks]
            Stop cleanly: touch FILE.mp4.stop (or send SIGINT/SIGTERM to the emitted pid).
            Requires existing macOS Screen Recording access. No desktop/audio/microphone capture.
            """)
            return
        }
        let flags: Set<String> = ["--list", "--hide-cursor", "--show-clicks"]
        let values: Set<String> = ["--title", "--bundle", "--window", "--output", "--seconds", "--width", "--height", "--fps", "--stop-file"]
        var options = [String: String]()
        var index = 0
        while index < args.count {
            let key = args[index]
            if flags.contains(key) { options[key] = "true"; index += 1; continue }
            guard values.contains(key), index + 1 < args.count else {
                throw CaptureError(message: "Unknown or incomplete argument: \(key)")
            }
            options[key] = args[index + 1]; index += 2
        }
        guard let title = options["--title"], !title.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
            throw CaptureError(message: "--title is required; unrelated window titles are never listed.")
        }
        guard CGPreflightScreenCaptureAccess() else {
            throw CaptureError(message: "SCREEN_RECORDING_PERMISSION_REQUIRED: existing Screen Recording permission is unavailable; no capture attempted.")
        }
        let bundle = options["--bundle"] ?? "com.google.Chrome"
        let content = try await SCShareableContent.excludingDesktopWindows(true, onScreenWindowsOnly: true)
        let matches = content.windows.filter {
            $0.owningApplication?.bundleIdentifier == bundle &&
            ($0.title ?? "").localizedCaseInsensitiveContains(title) &&
            $0.frame.width > 0 && $0.frame.height > 0
        }
        func description(_ window: SCWindow) -> [String: Any] {
            ["windowId": window.windowID, "bundle": bundle, "title": window.title ?? "",
             "widthPoints": window.frame.width, "heightPoints": window.frame.height]
        }
        if options["--list"] != nil {
            emit(["event": "MATCHING_WINDOWS", "matches": matches.map(description)])
            return
        }
        guard let rawID = options["--window"], let windowID = UInt32(rawID),
              let window = matches.first(where: { $0.windowID == windowID }) else {
            throw CaptureError(message: "--window must identify a currently visible window matching the supplied title and bundle.")
        }
        guard let path = options["--output"], path.lowercased().hasSuffix(".mp4") else {
            throw CaptureError(message: "--output must name a new .mp4 file.")
        }
        let output = URL(fileURLWithPath: path).standardizedFileURL
        guard !FileManager.default.fileExists(atPath: output.path) else {
            throw CaptureError(message: "Refusing to overwrite existing recording: \(output.path)")
        }
        guard let width = Int(options["--width"] ?? "1920"), width >= 320, width % 2 == 0,
              let height = Int(options["--height"] ?? "1080"), height >= 180, height % 2 == 0,
              let fps = Int32(options["--fps"] ?? "30"), (1...60).contains(fps),
              let seconds = Double(options["--seconds"] ?? "900"), seconds.isFinite, (1...3600).contains(seconds) else {
            throw CaptureError(message: "Invalid dimensions, fps, or duration. Even dimensions, 1–60 fps, 1–3600 seconds required.")
        }
        try FileManager.default.createDirectory(at: output.deletingLastPathComponent(), withIntermediateDirectories: true)
        let stopFile = options["--stop-file"] ?? output.path + ".stop"
        guard !FileManager.default.fileExists(atPath: stopFile) else {
            throw CaptureError(message: "Stop file already exists: \(stopFile). Choose a fresh output or remove the old stop marker.")
        }
        let filter = SCContentFilter(desktopIndependentWindow: window)
        let config = SCStreamConfiguration()
        config.width = width
        config.height = height
        config.minimumFrameInterval = CMTime(value: 1, timescale: fps)
        config.queueDepth = 6
        config.scalesToFit = true
        config.preservesAspectRatio = true
        config.captureResolution = .best
        config.ignoreShadowsSingleWindow = true
        config.ignoreGlobalClipSingleWindow = true
        config.showsCursor = options["--hide-cursor"] == nil
        config.showMouseClicks = options["--show-clicks"] != nil
        config.pixelFormat = kCVPixelFormatType_32BGRA
        let background = CGColor(gray: 0, alpha: 1)
        config.backgroundColor = background
        defer { withExtendedLifetime(background) {} }
        config.capturesAudio = false
        config.captureMicrophone = false
        config.streamName = "Jev Laya frontend demo — selected window only"
        let recordingConfig = SCRecordingOutputConfiguration()
        recordingConfig.outputURL = output
        recordingConfig.videoCodecType = .h264
        recordingConfig.outputFileType = .mp4
        let state = CaptureState()
        let recording = SCRecordingOutput(configuration: recordingConfig, delegate: state)
        let stream = SCStream(filter: filter, configuration: config, delegate: state)
        let frameQueue = DispatchQueue(label: "jev-demo.capture-frames")
        try stream.addStreamOutput(state, type: .screen, sampleHandlerQueue: frameQueue)
        try stream.addRecordingOutput(recording)
        signal(SIGINT, SIG_IGN)
        signal(SIGTERM, SIG_IGN)
        let signals = [SIGINT, SIGTERM].map { signalNumber -> DispatchSourceSignal in
            let source = DispatchSource.makeSignalSource(signal: signalNumber, queue: .global())
            source.setEventHandler { state.requestStop() }
            source.resume()
            return source
        }
        defer { for source in signals { source.cancel() } }
        let startedAt = Date()
        emit(["event": "CAPTURE_STARTING", "pid": getpid(), "window": description(window),
              "output": output.path, "stopFile": stopFile, "width": width, "height": height,
              "maxFPS": fps, "maxSeconds": seconds, "audio": false, "timestamp": ISO8601DateFormatter().string(from: startedAt)])
        try await stream.startCapture()
        var reason = "duration_limit"
        while Date().timeIntervalSince(startedAt) < seconds {
            let status = state.snapshot()
            if status.failure != nil { reason = "capture_error"; break }
            if status.stop { reason = "signal"; break }
            if FileManager.default.fileExists(atPath: stopFile) { reason = "stop_file"; break }
            if !status.started && Date().timeIntervalSince(startedAt) > 10 { reason = "start_timeout"; break }
            try await Task.sleep(for: .milliseconds(100))
        }
        try await stream.stopCapture()
        let deadline = Date().addingTimeInterval(20)
        while !state.snapshot().finished && Date() < deadline { try await Task.sleep(for: .milliseconds(100)) }
        frameQueue.sync {}
        let status = state.snapshot()
        let duration = CMTimeGetSeconds(recording.recordedDuration)
        let validDuration = duration.isFinite ? duration : 0
        let metadata: [String: Any] = [
            "event": "CAPTURE_FINISHED", "window": description(window), "output": output.path,
            "width": width, "height": height, "maxFPS": fps, "audio": false,
            "startedAt": ISO8601DateFormatter().string(from: startedAt),
            "finishedAt": ISO8601DateFormatter().string(from: Date()), "stopReason": reason,
            "durationSeconds": validDuration, "recordedBytes": recording.recordedFileSize,
            "observedCompleteFrameUpdates": status.frames,
            "completed": status.finished && status.failure == nil && status.frames > 0,
            "error": status.failure ?? "", "captureMethod": "ScreenCaptureKit desktopIndependentWindow",
            "qa": ["decode": "NOT_RUN", "motion": "NOT_RUN", "visualPrivacy": "NOT_RUN", "fullPlayback": "NOT_RUN"]
        ]
        let data = try JSONSerialization.data(withJSONObject: metadata, options: [.prettyPrinted, .sortedKeys])
        try data.write(to: URL(fileURLWithPath: output.path + ".capture.json"), options: .atomic)
        emit(metadata)
        guard status.finished && status.failure == nil && status.frames > 0 else {
            throw CaptureError(message: status.failure ?? "Recording did not finish successfully with complete frames.")
        }
    }
}
