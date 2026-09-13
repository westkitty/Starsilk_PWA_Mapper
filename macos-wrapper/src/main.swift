import Cocoa
import WebKit
import Darwin
import Foundation

// MARK: - Logging Helper
final class Logger {
    static let shared = Logger()
    private let logFileHandle: FileHandle?
    private let dateFormatter: DateFormatter

    private init() {
        self.dateFormatter = DateFormatter()
        self.dateFormatter.dateFormat = "yyyy-MM-dd HH:mm:ss.SSS"

        let fileManager = FileManager.default
        let homeDir = fileManager.homeDirectoryForCurrentUser
        let logDir = homeDir.appendingPathComponent("Library/Logs/StarsilkSystemPlanner")

        try? fileManager.createDirectory(at: logDir, withIntermediateDirectories: true, attributes: nil)
        let logFilePath = logDir.appendingPathComponent("launcher.log")

        if !fileManager.fileExists(atPath: logFilePath.path) {
            fileManager.createFile(atPath: logFilePath.path, contents: nil, attributes: nil)
        }

        self.logFileHandle = try? FileHandle(forWritingTo: logFilePath)
        self.logFileHandle?.seekToEndOfFile()
        log("=== Starsilk System Planner Session Started ===")
    }

    func log(_ message: String) {
        let timestamp = dateFormatter.string(from: Date())
        let line = "[\(timestamp)] \(message)\n"
        print(line, terminator: "")
        if let data = line.data(using: .utf8) {
            logFileHandle?.write(data)
        }
    }

    deinit {
        logFileHandle?.closeFile()
    }
}

// MARK: - Port Availability Checker
func isLoopbackPortAvailable(_ port: UInt16) -> Bool {
    let socketFD = socket(AF_INET, SOCK_STREAM, 0)
    if socketFD < 0 { return false }
    defer { close(socketFD) }

    var yes: Int32 = 1
    setsockopt(socketFD, SOL_SOCKET, SO_REUSEADDR, &yes, socklen_t(MemoryLayout<Int32>.size))

    var addr = sockaddr_in()
    addr.sin_family = sa_family_t(AF_INET)
    addr.sin_port = in_port_t(port.bigEndian)
    addr.sin_addr.s_addr = inet_addr("127.0.0.1")

    let bindResult = withUnsafePointer(to: &addr) {
        $0.withMemoryRebound(to: sockaddr.self, capacity: 1) {
            bind(socketFD, $0, socklen_t(MemoryLayout<sockaddr_in>.size))
        }
    }
    return bindResult == 0
}

func selectPort(startPort: UInt16 = 4173, endPort: UInt16 = 4185) -> UInt16? {
    for port in startPort...endPort {
        if isLoopbackPortAvailable(port) {
            return port
        }
    }
    return nil
}

// MARK: - Application Delegate
class AppDelegate: NSObject, NSApplicationDelegate, NSWindowDelegate, WKNavigationDelegate {
    private var window: NSWindow!
    private var webView: WKWebView!
    private var childProcess: Process?
    private var childPID: pid_t = 0
    private var repoPath: String = ""
    private var nodePath: String = ""
    private var selectedPort: UInt16 = 4173
    private var isTerminating: Bool = false

    func applicationDidFinishLaunching(_ notification: Notification) {
        Logger.shared.log("Application launched.")
        setupMainMenu()
        setupWindow()
        resolveEnvironmentAndStartServer()
    }

    func applicationShouldHandleReopen(_ sender: NSApplication, hasVisibleWindows flag: Bool) -> Bool {
        Logger.shared.log("Reopen requested from Dock. Re-activating existing window.")
        if let win = window {
            if !win.isVisible {
                win.makeKeyAndOrderFront(nil)
            }
            win.orderFrontRegardless()
            NSApp.activate(ignoringOtherApps: true)
        }
        return true
    }

    func applicationShouldTerminateAfterLastWindowClosed(_ sender: NSApplication) -> Bool {
        return true
    }

    func applicationWillTerminate(_ notification: Notification) {
        terminateChildProcess()
    }

    func windowWillClose(_ notification: Notification) {
        Logger.shared.log("Main window closing. Terminating application.")
        NSApp.terminate(nil)
    }

    // MARK: - Menu Setup
    private func setupMainMenu() {
        let mainMenu = NSMenu()

        // App Menu
        let appMenuItem = NSMenuItem()
        let appMenu = NSMenu(title: "Starsilk System Planner")
        appMenu.addItem(withTitle: "About Starsilk System Planner", action: #selector(NSApplication.orderFrontStandardAboutPanel(_:)), keyEquivalent: "")
        appMenu.addItem(NSMenuItem.separator())
        appMenu.addItem(withTitle: "Hide Starsilk System Planner", action: #selector(NSApplication.hide(_:)), keyEquivalent: "h")
        let hideOthersItem = appMenu.addItem(withTitle: "Hide Others", action: #selector(NSApplication.hideOtherApplications(_:)), keyEquivalent: "h")
        hideOthersItem.keyEquivalentModifierMask = [.command, .option]
        appMenu.addItem(withTitle: "Show All", action: #selector(NSApplication.unhideAllApplications(_:)), keyEquivalent: "")
        appMenu.addItem(NSMenuItem.separator())
        appMenu.addItem(withTitle: "Quit Starsilk System Planner", action: #selector(NSApplication.terminate(_:)), keyEquivalent: "q")
        appMenuItem.submenu = appMenu
        mainMenu.addItem(appMenuItem)

        // Edit Menu (crucial for shortcuts in WKWebView)
        let editMenuItem = NSMenuItem()
        let editMenu = NSMenu(title: "Edit")
        editMenu.addItem(withTitle: "Undo", action: Selector(("undo:")), keyEquivalent: "z")
        let redoItem = editMenu.addItem(withTitle: "Redo", action: Selector(("redo:")), keyEquivalent: "z")
        redoItem.keyEquivalentModifierMask = [.command, .shift]
        editMenu.addItem(NSMenuItem.separator())
        editMenu.addItem(withTitle: "Cut", action: #selector(NSText.cut(_:)), keyEquivalent: "x")
        editMenu.addItem(withTitle: "Copy", action: #selector(NSText.copy(_:)), keyEquivalent: "c")
        editMenu.addItem(withTitle: "Paste", action: #selector(NSText.paste(_:)), keyEquivalent: "v")
        editMenu.addItem(withTitle: "Select All", action: #selector(NSText.selectAll(_:)), keyEquivalent: "a")
        editMenuItem.submenu = editMenu
        mainMenu.addItem(editMenuItem)

        // View Menu
        let viewMenuItem = NSMenuItem()
        let viewMenu = NSMenu(title: "View")
        viewMenu.addItem(withTitle: "Reload", action: #selector(reloadWebView), keyEquivalent: "r")
        let toggleFullscreenItem = viewMenu.addItem(withTitle: "Toggle Full Screen", action: #selector(NSWindow.toggleFullScreen(_:)), keyEquivalent: "f")
        toggleFullscreenItem.keyEquivalentModifierMask = [.command, .control]
        viewMenuItem.submenu = viewMenu
        mainMenu.addItem(viewMenuItem)

        // Window Menu
        let windowMenuItem = NSMenuItem()
        let windowMenu = NSMenu(title: "Window")
        windowMenu.addItem(withTitle: "Minimize", action: #selector(NSWindow.miniaturize(_:)), keyEquivalent: "m")
        windowMenu.addItem(withTitle: "Zoom", action: #selector(NSWindow.performZoom(_:)), keyEquivalent: "")
        windowMenuItem.submenu = windowMenu
        mainMenu.addItem(windowMenuItem)

        NSApp.mainMenu = mainMenu
    }

    @objc private func reloadWebView() {
        Logger.shared.log("Reloading web view.")
        webView?.reload()
    }

    // MARK: - Window Setup
    private func setupWindow() {
        let initialRect = NSRect(x: 0, y: 0, width: 1440, height: 900)
        window = NSWindow(
            contentRect: initialRect,
            styleMask: [.titled, .closable, .miniaturizable, .resizable, .fullSizeContentView],
            backing: .buffered,
            defer: false
        )
        window.title = "Starsilk System Planner"
        window.minSize = NSSize(width: 960, height: 600)
        window.isReleasedWhenClosed = false
        window.delegate = self
        window.titleVisibility = .hidden
        window.titlebarAppearsTransparent = true

        // Dark obsidian background (#03050a) to prevent white flash
        let darkColor = NSColor(calibratedRed: 3.0/255.0, green: 5.0/255.0, blue: 10.0/255.0, alpha: 1.0)
        window.backgroundColor = darkColor

        let config = WKWebViewConfiguration()
        config.preferences.setValue(true, forKey: "developerExtrasEnabled")
        // Allow local storage and IndexedDB
        config.websiteDataStore = WKWebsiteDataStore.default()

        webView = WKWebView(frame: window.contentView!.bounds, configuration: config)
        webView.autoresizingMask = [.width, .height]
        webView.navigationDelegate = self
        webView.setValue(false, forKey: "drawsBackground") // Transparent until page loads dark background

        window.contentView!.addSubview(webView)
        window.center()
        window.makeKeyAndOrderFront(nil)
        NSApp.activate(ignoringOtherApps: true)
    }

    // MARK: - Server Resolution and Launch
    private func resolveEnvironmentAndStartServer() {
        // 1. Resolve Repository Root
        let possibleRepoPaths = [
            "/Users/andrew/Star_System_Planner",
            NSString(string: "~/Star_System_Planner").expandingTildeInPath,
            Bundle.main.bundleURL.deletingLastPathComponent().deletingLastPathComponent().path
        ]

        var foundRepo: String?
        for path in possibleRepoPaths {
            let pkgPath = (path as NSString).appendingPathComponent("package.json")
            if FileManager.default.fileExists(atPath: pkgPath) {
                foundRepo = path
                break
            }
        }

        guard let repo = foundRepo else {
            showFatalError(
                title: "Repository Not Found",
                message: "Could not locate Starsilk System Planner repository at /Users/andrew/Star_System_Planner.\nChecked paths:\n" + possibleRepoPaths.joined(separator: "\n")
            )
            return
        }
        self.repoPath = repo
        Logger.shared.log("Resolved repository root: \(repo)")

        // 2. Resolve Node Binary
        let possibleNodePaths = [
            "/opt/homebrew/bin/node",
            "/usr/local/bin/node",
            "/usr/bin/node"
        ]

        var foundNode: String?
        for path in possibleNodePaths {
            if FileManager.default.isExecutableFile(atPath: path) {
                foundNode = path
                break
            }
        }

        if foundNode == nil {
            // Check PATH environment variable
            if let envPath = ProcessInfo.processInfo.environment["PATH"] {
                for dir in envPath.split(separator: ":") {
                    let full = String(dir) + "/node"
                    if FileManager.default.isExecutableFile(atPath: full) {
                        foundNode = full
                        break
                    }
                }
            }
        }

        guard let node = foundNode else {
            showFatalError(
                title: "Node.js Not Found",
                message: "Node executable could not be found at /opt/homebrew/bin/node or in PATH.\nPlease ensure Node is installed."
            )
            return
        }
        self.nodePath = node
        Logger.shared.log("Resolved Node binary: \(node)")

        // 3. Verify dist freshness via build identity stamp and git source state
        ensureFreshDistributionOrRebuild()

        // 4. Select Port
        guard let port = selectPort(startPort: 4173, endPort: 4185) else {
            showFatalError(
                title: "Loopback Port Unavailable",
                message: "All ports in range 4173..4185 on 127.0.0.1 are currently occupied.\nPlease close conflicting servers."
            )
            return
        }
        self.selectedPort = port
        Logger.shared.log("Selected free loopback port: \(port)")

        // 5. Start Child Vite Preview Process
        startViteChildProcess(port: port)

        // 6. Poll loopback URL until ready
        waitForServerReady(port: port, timeout: 12.0) { [weak self] success in
            guard let self = self else { return }
            if success {
                let targetURLString = "http://127.0.0.1:\(port)/Star_System_Planner/"
                Logger.shared.log("Server responsive! Loading: \(targetURLString)")
                if let url = URL(string: targetURLString) {
                    let request = URLRequest(url: url, cachePolicy: .useProtocolCachePolicy, timeoutInterval: 15.0)
                    DispatchQueue.main.async {
                        self.webView.load(request)
                    }
                }
            } else {
                self.showFatalError(
                    title: "Server Startup Timeout",
                    message: "The local Vite preview server on 127.0.0.1:\(port) failed to become responsive within 12 seconds.\nCheck logs at ~/Library/Logs/StarsilkSystemPlanner/vite.log."
                )
            }
        }
    }

    private func ensureFreshDistributionOrRebuild() {
        let freshnessScript = (repoPath as NSString).appendingPathComponent("scripts/check-build-freshness.mjs")

        let checkProcess = Process()
        checkProcess.executableURL = URL(fileURLWithPath: nodePath)
        checkProcess.arguments = [freshnessScript]
        checkProcess.currentDirectoryURL = URL(fileURLWithPath: repoPath)

        var env = ProcessInfo.processInfo.environment
        env["PATH"] = "/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:" + (env["PATH"] ?? "")
        env["VITE_PUBLIC_BASE"] = "/Star_System_Planner/"
        checkProcess.environment = env

        let pipe = Pipe()
        checkProcess.standardOutput = pipe
        checkProcess.standardError = pipe

        var isFresh = false
        do {
            try checkProcess.run()
            checkProcess.waitUntilExit()
            let data = pipe.fileHandleForReading.readDataToEndOfFile()
            let output = String(data: data, encoding: .utf8)?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""

            if checkProcess.terminationStatus == 0 {
                Logger.shared.log("Build freshness verified: \(output)")
                isFresh = true
            } else {
                Logger.shared.log("Build freshness check indicated rebuild required: \(output)")
            }
        } catch {
            Logger.shared.log("Error checking freshness: \(error.localizedDescription)")
        }

        if isFresh { return }

        Logger.shared.log("Triggering production rebuild...")
        let rebuildSuccess = buildProductionBundleSync()
        if !rebuildSuccess {
            showFatalError(
                title: "Build Failed",
                message: "Starsilk System Planner production bundle is out of date and failed to rebuild.\nCannot launch stale application.\nCheck ~/Library/Logs/StarsilkSystemPlanner/launcher.log."
            )
            return
        }

        // Verify freshness after rebuild
        let verifyCheck = Process()
        verifyCheck.executableURL = URL(fileURLWithPath: nodePath)
        verifyCheck.arguments = [freshnessScript]
        verifyCheck.currentDirectoryURL = URL(fileURLWithPath: repoPath)
        verifyCheck.environment = env
        let verifyPipe = Pipe()
        verifyCheck.standardOutput = verifyPipe
        verifyCheck.standardError = verifyPipe

        try? verifyCheck.run()
        verifyCheck.waitUntilExit()

        if verifyCheck.terminationStatus != 0 {
            showFatalError(
                title: "Build Verification Failed",
                message: "Production bundle was rebuilt but failed freshness verification.\nCannot launch application."
            )
            return
        }
        Logger.shared.log("Rebuild completed successfully and verified fresh.")
    }

    private func buildProductionBundleSync() -> Bool {
        Logger.shared.log("Building production bundle via node/vite build and stamp...")
        let viteScript = (repoPath as NSString).appendingPathComponent("node_modules/vite/bin/vite.js")
        let stampScript = (repoPath as NSString).appendingPathComponent("scripts/stamp-build.mjs")

        var env = ProcessInfo.processInfo.environment
        env["PATH"] = "/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:" + (env["PATH"] ?? "")
        env["VITE_PUBLIC_BASE"] = "/Star_System_Planner/"

        // Step 1: Vite build
        let buildProcess = Process()
        buildProcess.executableURL = URL(fileURLWithPath: nodePath)
        buildProcess.arguments = [viteScript, "build"]
        buildProcess.currentDirectoryURL = URL(fileURLWithPath: repoPath)
        buildProcess.environment = env

        let pipe = Pipe()
        buildProcess.standardOutput = pipe
        buildProcess.standardError = pipe

        do {
            try buildProcess.run()
            buildProcess.waitUntilExit()
            let data = pipe.fileHandleForReading.readDataToEndOfFile()
            if let output = String(data: data, encoding: .utf8), !output.isEmpty {
                Logger.shared.log("Vite build output:\n\(output)")
            }
            if buildProcess.terminationStatus != 0 {
                Logger.shared.log("Vite build exited with error code: \(buildProcess.terminationStatus)")
                return false
            }
        } catch {
            Logger.shared.log("Failed to launch vite build: \(error.localizedDescription)")
            return false
        }

        // Step 2: Stamp build
        let stampProcess = Process()
        stampProcess.executableURL = URL(fileURLWithPath: nodePath)
        stampProcess.arguments = [stampScript]
        stampProcess.currentDirectoryURL = URL(fileURLWithPath: repoPath)
        stampProcess.environment = env

        do {
            try stampProcess.run()
            stampProcess.waitUntilExit()
            return stampProcess.terminationStatus == 0
        } catch {
            Logger.shared.log("Failed to launch stamp script: \(error.localizedDescription)")
            return false
        }
    }

    private func startViteChildProcess(port: UInt16) {
        let viteScript = (repoPath as NSString).appendingPathComponent("node_modules/vite/bin/vite.js")
        guard FileManager.default.fileExists(atPath: viteScript) else {
            showFatalError(
                title: "Vite Not Found",
                message: "Could not find Vite executable at \(viteScript).\nPlease run `npm ci` in the repository."
            )
            return
        }

        let process = Process()
        process.executableURL = URL(fileURLWithPath: nodePath)
        process.arguments = [
            viteScript,
            "preview",
            "--host", "127.0.0.1",
            "--port", String(port),
            "--strictPort"
        ]
        process.currentDirectoryURL = URL(fileURLWithPath: repoPath)

        var env = ProcessInfo.processInfo.environment
        env["PATH"] = "/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:" + (env["PATH"] ?? "")
        env["NO_PROXY"] = "*"
        env["no_proxy"] = "*"
        env["VITE_PUBLIC_BASE"] = "/Star_System_Planner/"
        process.environment = env

        // Setup log file for Vite output
        let homeDir = FileManager.default.homeDirectoryForCurrentUser
        let logDir = homeDir.appendingPathComponent("Library/Logs/StarsilkSystemPlanner")
        let viteLogPath = logDir.appendingPathComponent("vite.log")
        if !FileManager.default.fileExists(atPath: viteLogPath.path) {
            FileManager.default.createFile(atPath: viteLogPath.path, contents: nil, attributes: nil)
        }
        if let logHandle = try? FileHandle(forWritingTo: viteLogPath) {
            logHandle.seekToEndOfFile()
            let pipe = Pipe()
            process.standardOutput = pipe
            process.standardError = pipe
            pipe.fileHandleForReading.readabilityHandler = { handle in
                let data = handle.availableData
                if !data.isEmpty {
                    logHandle.write(data)
                }
            }
        }

        process.terminationHandler = { [weak self] proc in
            guard let self = self else { return }
            if !self.isTerminating {
                Logger.shared.log("Vite child process exited unexpectedly with code \(proc.terminationStatus).")
                DispatchQueue.main.async {
                    self.showFatalError(
                        title: "Server Process Terminated",
                        message: "The local server process exited unexpectedly with code \(proc.terminationStatus).\nCheck logs at ~/Library/Logs/StarsilkSystemPlanner/vite.log."
                    )
                }
            }
        }

        do {
            try process.run()
            self.childProcess = process
            self.childPID = process.processIdentifier
            Logger.shared.log("Spawned child Vite process PID: \(childPID) on 127.0.0.1:\(port)")
        } catch {
            showFatalError(
                title: "Failed to Start Server",
                message: "Unable to launch Vite preview process: \(error.localizedDescription)"
            )
        }
    }

    private func waitForServerReady(port: UInt16, timeout: TimeInterval, completion: @escaping (Bool) -> Void) {
        let startTime = Date()
        let probeURL = URL(string: "http://127.0.0.1:\(port)/Star_System_Planner/")!
        let sessionConfig = URLSessionConfiguration.ephemeral
        sessionConfig.timeoutIntervalForRequest = 0.5
        sessionConfig.timeoutIntervalForResource = 0.5
        let session = URLSession(configuration: sessionConfig)

        func check() {
            if Date().timeIntervalSince(startTime) > timeout {
                completion(false)
                return
            }

            var request = URLRequest(url: probeURL)
            request.httpMethod = "GET"

            let task = session.dataTask(with: request) { (_, response, error) in
                if let httpResp = response as? HTTPURLResponse, (200...399).contains(httpResp.statusCode) {
                    completion(true)
                } else {
                    DispatchQueue.global().asyncAfter(deadline: .now() + 0.1) {
                        check()
                    }
                }
            }
            task.resume()
        }

        check()
    }

    // MARK: - Child Process Termination
    private func terminateChildProcess() {
        guard !isTerminating else { return }
        isTerminating = true

        if let proc = childProcess, proc.isRunning {
            let pid = proc.processIdentifier
            Logger.shared.log("Terminating child Vite process (PID: \(pid))...")
            proc.terminate()

            // Wait up to 1.5 seconds for graceful shutdown
            for _ in 0..<15 {
                if !proc.isRunning { break }
                Thread.sleep(forTimeInterval: 0.1)
            }

            if proc.isRunning {
                Logger.shared.log("Child process did not exit gracefully. Sending SIGKILL to PID: \(pid).")
                kill(pid, SIGKILL)
            }
            Logger.shared.log("Child process terminated cleanly.")
        }
        childProcess = nil
    }

    // MARK: - WKNavigationDelegate
    func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) {
        Logger.shared.log("Web view provisional navigation failed: \(error.localizedDescription)")
        showFatalError(
            title: "Failed to Load Application",
            message: "The planner failed to load: \(error.localizedDescription)\nTarget URL: \(webView.url?.absoluteString ?? "unknown")"
        )
    }

    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        Logger.shared.log("Web view finished loading URL: \(webView.url?.absoluteString ?? "unknown")")
    }

    // MARK: - Error Presentation
    private func showFatalError(title: String, message: String) {
        Logger.shared.log("ERROR: [\(title)] \(message)")
        terminateChildProcess()

        let alert = NSAlert()
        alert.messageText = title
        alert.informativeText = message
        alert.alertStyle = .critical
        alert.addButton(withTitle: "Quit")
        alert.runModal()
        NSApp.terminate(nil)
    }
}

// MARK: - Entry Point
let app = NSApplication.shared
app.setActivationPolicy(.regular)

let delegate = AppDelegate()
app.delegate = delegate

// Signal Trapping for clean shutdown
let sigSourceInt = DispatchSource.makeSignalSource(signal: SIGINT, queue: .main)
sigSourceInt.setEventHandler {
    Logger.shared.log("Caught SIGINT. Exiting cleanly.")
    NSApp.terminate(nil)
}
signal(SIGINT, SIG_IGN)
sigSourceInt.resume()

let sigSourceTerm = DispatchSource.makeSignalSource(signal: SIGTERM, queue: .main)
sigSourceTerm.setEventHandler {
    Logger.shared.log("Caught SIGTERM. Exiting cleanly.")
    NSApp.terminate(nil)
}
signal(SIGTERM, SIG_IGN)
sigSourceTerm.resume()

app.run()
