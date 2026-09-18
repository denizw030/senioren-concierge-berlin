import AVFoundation
import Foundation

@MainActor
final class VoiceMemoRecorder: ObservableObject {
    enum Phase: Equatable {
        case idle
        case recording
        case ready
        case processing
    }

    @Published private(set) var phase: Phase = .idle
    @Published private(set) var duration: TimeInterval = 0
    @Published private(set) var isPlaying = false
    @Published var errorMessage: String?

    private var recorder: AVAudioRecorder?
    private var player: AVAudioPlayer?
    private var timer: Timer?
    private(set) var recordingURL: URL?

    let maximumDuration: TimeInterval = 120

    var durationText: String {
        let total = max(0, Int(duration.rounded(.down)))
        return String(format: "%d:%02d", total / 60, total % 60)
    }

    func start() async {
        guard phase == .idle else { return }
        errorMessage = nil

        guard await microphonePermission() else {
            errorMessage = "Bitte erlaube NAHWERK den Mikrofonzugriff in den iPhone-Einstellungen."
            return
        }

        do {
            let session = AVAudioSession.sharedInstance()
            try session.setCategory(
                .playAndRecord,
                mode: .spokenAudio,
                options: [.defaultToSpeaker, .allowBluetooth]
            )
            try session.setActive(true)

            let url = FileManager.default.temporaryDirectory
                .appendingPathComponent("nahwerk-voice-\(UUID().uuidString.lowercased()).m4a")

            let settings: [String: Any] = [
                AVFormatIDKey: Int(kAudioFormatMPEG4AAC),
                AVSampleRateKey: 32_000,
                AVNumberOfChannelsKey: 1,
                AVEncoderBitRateKey: 64_000,
                AVEncoderAudioQualityKey: AVAudioQuality.medium.rawValue
            ]

            let audioRecorder = try AVAudioRecorder(url: url, settings: settings)
            audioRecorder.prepareToRecord()
            guard audioRecorder.record() else {
                throw VoiceMemoError.recordingFailed
            }

            recorder = audioRecorder
            recordingURL = url
            duration = 0
            phase = .recording
            startTimer()
        } catch {
            resetAudioSession()
            errorMessage = "Die Aufnahme konnte gerade nicht gestartet werden."
        }
    }

    func stop() {
        guard phase == .recording else { return }
        recorder?.stop()
        recorder = nil
        stopTimer()
        phase = recordingURL == nil ? .idle : .ready
        resetAudioSession()
    }

    func cancel() {
        if phase == .recording {
            recorder?.stop()
        }
        recorder = nil
        stopTimer()
        player?.stop()
        player = nil
        isPlaying = false

        if let url = recordingURL {
            try? FileManager.default.removeItem(at: url)
        }
        recordingURL = nil
        duration = 0
        phase = .idle
        errorMessage = nil
        resetAudioSession()
    }

    func togglePreview() {
        guard phase == .ready, let url = recordingURL else { return }

        if let player, player.isPlaying {
            player.stop()
            self.player = nil
            isPlaying = false
            return
        }

        do {
            let audioPlayer = try AVAudioPlayer(contentsOf: url)
            audioPlayer.prepareToPlay()
            audioPlayer.play()
            player = audioPlayer
            isPlaying = true

            let playbackDuration = audioPlayer.duration
            Task {
                try? await Task.sleep(for: .seconds(playbackDuration))
                guard self.player === audioPlayer else { return }
                self.player = nil
                self.isPlaying = false
            }
        } catch {
            errorMessage = "Die Sprachmemo konnte gerade nicht abgespielt werden."
        }
    }

    func markProcessing() {
        guard phase == .ready else { return }
        player?.stop()
        player = nil
        isPlaying = false
        phase = .processing
        errorMessage = nil
    }

    func restoreReady(message: String? = nil) {
        guard recordingURL != nil else {
            phase = .idle
            return
        }
        phase = .ready
        errorMessage = message
    }

    func finishSending() {
        let url = recordingURL
        recorder = nil
        player?.stop()
        player = nil
        isPlaying = false
        stopTimer()
        recordingURL = nil
        duration = 0
        phase = .idle
        errorMessage = nil
        if let url {
            try? FileManager.default.removeItem(at: url)
        }
    }

    private func startTimer() {
        stopTimer()
        timer = Timer.scheduledTimer(withTimeInterval: 0.25, repeats: true) { [weak self] _ in
            Task { @MainActor in
                guard let self, self.phase == .recording else { return }
                self.duration = self.recorder?.currentTime ?? self.duration
                if self.duration >= self.maximumDuration {
                    self.stop()
                }
            }
        }
    }

    private func stopTimer() {
        timer?.invalidate()
        timer = nil
    }

    private func microphonePermission() async -> Bool {
        let session = AVAudioSession.sharedInstance()
        switch session.recordPermission {
        case .granted:
            return true
        case .denied:
            return false
        case .undetermined:
            return await withCheckedContinuation { continuation in
                session.requestRecordPermission { granted in
                    continuation.resume(returning: granted)
                }
            }
        @unknown default:
            return false
        }
    }

    private func resetAudioSession() {
        try? AVAudioSession.sharedInstance().setActive(
            false,
            options: [.notifyOthersOnDeactivation]
        )
    }
}

private enum VoiceMemoError: Error {
    case recordingFailed
}
