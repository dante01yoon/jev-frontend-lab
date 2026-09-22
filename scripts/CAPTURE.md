# Actual browser-window recording

`capture-window.swift` records the pixels of one explicitly selected macOS window using ScreenCaptureKit. It does not automate the browser. Operate the demo through the documented computer-use tool APIs.

It requires macOS 15+, Xcode command-line tools and existing Screen Recording permission. It captures H.264 MP4 at 1920×1080, up to 30 fps, with aspect ratio preserved. Audio and microphone capture are disabled. A differently shaped window is letterboxed, so prepare a dedicated demo browser window and inspect a short test clip before filming. Window chrome and every tab shown in that window are in the capture; use only the demo there.

## Build and select

Run from the `demo` directory:

```sh
swiftc -parse-as-library -O scripts/capture-window.swift -o /tmp/jev-capture-window
/tmp/jev-capture-window --list --title 'Jev' --bundle com.google.Chrome
```

Only windows matching the title and application bundle are listed. Re-list after reopening or recreating the browser window. Never copy an old window ID into a fresh session. A permission error means no capture was attempted.

## Capture

Replace `WINDOW_ID` with the currently observed matching ID. Use a fresh filename for every take; existing recordings are never overwritten.

```sh
/tmp/jev-capture-window \
  --window WINDOW_ID --title 'Jev' --bundle com.google.Chrome \
  --output ../production/raw/demo-take-01.mp4 \
  --seconds 900 --width 1920 --height 1080 --fps 30
```

Wait for `RECORDING_STARTED` before the first action. `CAPTURE_STARTING` includes the recorder PID and absolute stop-marker path. Keep all operations inside this dedicated browser window, including failures and generation progress. Do not claim an edited wait is real-time latency; preserve the original and show the measured run timings separately.

Stop and finalize safely from another terminal/tool call:

```sh
touch ../production/raw/demo-take-01.mp4.stop
```

Alternatively send `SIGINT` or `SIGTERM` to the exact PID emitted at launch. Do not use `kill -9`, because that prevents MP4 finalization. Recording also stops automatically at `--seconds`. Wait for `CAPTURE_FINISHED` and process exit. The adjacent `.capture.json` records the selected window, timestamps, duration, bytes, frame-update count, stop reason, and explicit QA items that remain `NOT_RUN`.

For a pilot take, use `--seconds 15`, show a real click, scroll and changing generation state, then inspect the video. `--show-clicks` asks ScreenCaptureKit to mark actual system mouse clicks; it does not fabricate clicks. Programmatic DOM clicks may not produce a cursor marker. `--hide-cursor` is available when the browser's automation cursor is unsuitable.

## Verify the exact output

```sh
ffprobe -v error -show_entries stream=codec_name,width,height,r_frame_rate,avg_frame_rate,nb_frames:format=duration,size -of json ../production/raw/demo-take-01.mp4
ffmpeg -v error -i ../production/raw/demo-take-01.mp4 -fps_mode passthrough -enc_time_base demux -f null -
ffmpeg -v error -i ../production/raw/demo-take-01.mp4 -vf 'fps=1,scale=960:-1' -f framemd5 ../production/raw/demo-take-01.frames.md5
```

Successful decode, frame differences, visual privacy/framing inspection and continuous 1× playback are separate checks. Different frame hashes are evidence of changing pixels, not evidence that every intended interaction or model call succeeded. Inspect actual frames and compare with the app's run records. Full playback remains `NOT_RUN` until performed.

ScreenCaptureKit records variable frame timing. The decode command retains the demuxer's timebase to avoid rounding frame timestamps into a lower-rate null-output timebase. Use ffprobe for exact file duration; the capture lifecycle metadata can report a shorter rounded duration. Preserve the raw capture when creating a constant-30-fps edit.

The recording is silent raw footage. A finished narrated video needs editorial cuts, captions/narration as requested, and new output-specific QA. Keep source start/end time, speed and crop for every edited segment. No fabricated generation animations or screenshot sequences may replace this footage.

## Sources and current preparation status

- [Apple: scalesToFit](https://developer.apple.com/documentation/screencapturekit/scstreamconfiguration/scalestofit) and [preservesAspectRatio](https://developer.apple.com/documentation/screencapturekit/scstreamconfiguration/preservesaspectratio): official dimensions behavior, checked 2026-09-22.
- Local macOS 26 SDK `ScreenCaptureKit.framework/Headers/SCStream.h` and `SCRecordingOutput.h`: single-window capture, recording lifecycle and cursor options.
- Capture protocol: real input → execution → result, dedicated window framing and independent decode, motion, privacy and playback checks.

2026-09-22 preparation: Swift 6.3 and ffmpeg/ffprobe 9.0.1 found. Helper compilation passed without warnings. AppKit is initialized on the main actor before capture; without that initialization the first pilot hit a WindowServer assertion. The corrected helper recorded an actual dedicated demo browser: H.264, 1920×1080, 14.775 seconds, 434 frames. Full decoding with the source timebase passed; all 15 one-second samples differed. Three inspected frames showed only the demo browser and real comparison-to-focus navigation. Browser chrome/debugging bar and a bottom letterbox were visible. This is a pilot capture; full playback and the final edited video remain `NOT_RUN`.
