import RoveriOS
import Foundation
import React
import os.log

@objc(NativeRover)
class NativeRover: NSObject {
    private static var pendingGlobalSend: [String] = []
    private static var pendingGlobalSendLock = NSLock()
    private static var pendingGlobalSendDidUpdate: () -> () = { }
    
    @objc(initBackgroundCollection:)
    static func initBackgroundCollection(timeInterval: TimeInterval) {
        Rover.shared.scheduleBackgroundCollections(interval: timeInterval,
                                                   collectionWillStart: { taskIdentifier in
            struct Args: Codable {
                var taskIdentifier: String
            }
            let args = Args(taskIdentifier: taskIdentifier)
            guard let argsJson = try? args.json() else { return }
            pendingGlobalSendLock.lock()
            NativeRover.pendingGlobalSend.append(argsJson)
            pendingGlobalSendLock.unlock()
            
            pendingGlobalSendDidUpdate()
        },
                                                   collectionWillFinish: { taskIdentifier, connections in
            struct Args: Codable {
                var taskIdentifier: String
                var connections: [RoveriOS.Connection]
            }
            let args = Args(taskIdentifier: taskIdentifier,
                            connections: connections)
            guard let argsJson = try? args.json() else { return }
            pendingGlobalSendLock.lock()
            NativeRover.pendingGlobalSend.append(argsJson)
            pendingGlobalSendLock.unlock()
            
            pendingGlobalSendDidUpdate()
        })
    }
        
    private var delegates: [String: JSRoverDelegate] = [:]
    
    private var nextEventResolveBlock: RCTPromiseResolveBlock?
    private var nextEventRejectBlock: RCTPromiseRejectBlock?
    
    private var pendingSend: [String] = []
    private var pendingResults: [String: (String?, String?) -> ()] = [:]
    
    override init() {
        super.init()
    }
    
    func remove(delegateUUID: String) {
        delegates[delegateUUID] = nil
    }
    
    func send(_ delegateUUID: String,
              _ argsJson: String,
              _ returnCallback: @escaping (String?, String?) -> ()) {
        guard let _ = delegates[delegateUUID] else {
            return returnCallback(nil, "delegateUUID \(delegateUUID) does not exist")
        }
        
        pendingResults[delegateUUID] = returnCallback
        
        pendingSend.append(argsJson)
        
        checkSendQueue()
    }
    
    // MARK: - INTERNAL
    
    func checkSendQueue() {
        guard pendingSend.isEmpty == false else { return }
        guard let nextEventResolveBlock = nextEventResolveBlock else { return }
        
        self.nextEventResolveBlock = nil
        self.nextEventRejectBlock = nil
        
        nextEventResolveBlock(pendingSend.removeFirst())
    }
    
    @objc(uuidv4:)
    func uuidv4(response: @escaping RCTResponseSenderBlock) {
        response([UUID().uuidString])
    }
    
    @objc(sendResult:argsJson:error:)
    func sendResult(
        delegateUUID: String,
        argsJson: String?,
        error: String?
    ) {
        guard let pendingResult = pendingResults[delegateUUID] else {
            return
        }
        pendingResults[delegateUUID] = nil
        
        pendingResult(argsJson, error)
    }
    
    @objc(nextEvent:withRejecter:)
    func nextEvent(
        resolve: @escaping RCTPromiseResolveBlock,
        reject: @escaping RCTPromiseRejectBlock
    ) {
        nextEventResolveBlock = resolve
        nextEventRejectBlock = reject
        
        checkSendQueue()
    }
        
    // MARK: - PUBLIC
    
    @objc(featureFlags:withRejecter:)
    func featureFlags(
        resolve: @escaping RCTPromiseResolveBlock,
        reject: @escaping RCTPromiseRejectBlock
    ) {
        guard let result = try? Rover.shared.featureFlags.json() else {
            return reject("ERROR", "Failed to serialize feature flags", nil)
        }
        return resolve(result)
    }
    
    @objc(coreVersion:withRejecter:)
    func coreVersion(
        resolve: @escaping RCTPromiseResolveBlock,
        reject: @escaping RCTPromiseRejectBlock
    ) {
        resolve(Rover.shared.coreVersion)
    }
    
    @objc(version:withRejecter:)
    func version(
        resolve: @escaping RCTPromiseResolveBlock,
        reject: @escaping RCTPromiseRejectBlock
    ) {
        resolve(Rover.shared.version)
    }
    
    @objc(syslog:withResolver:withRejecter:)
    func syslog(
        message: String,
        resolve: @escaping RCTPromiseResolveBlock,
        reject: @escaping RCTPromiseRejectBlock
    ) {
        os_log("ROVER: %{public}@", message)
        resolve(message)
    }

    @objc(didScheduleBackgroundCollections:withRejecter:)
    func didScheduleBackgroundCollections(
        resolve: @escaping RCTPromiseResolveBlock,
        reject: @escaping RCTPromiseRejectBlock
    ) {
        NativeRover.pendingGlobalSendDidUpdate = {
            NativeRover.pendingGlobalSendLock.lock()
            for event in NativeRover.pendingGlobalSend {
                self.pendingSend.append(event)
            }
            NativeRover.pendingGlobalSend = []
            NativeRover.pendingGlobalSendLock.unlock()
            self.checkSendQueue()
        }
        
        NativeRover.pendingGlobalSendDidUpdate()
        
        resolve("")
    }
    
    @objc(configure:withResolver:withRejecter:)
    func configure(
        argsJson: String,
        resolve: @escaping RCTPromiseResolveBlock,
        reject: @escaping RCTPromiseRejectBlock
    ) {
        struct Args: Codable {
            var licenseKey: String
            var environment: String
            var deviceId: String?
            var maxConcurrentCollections: Int?
        }
        guard let args: Args = try? argsJson.decoded() else {
            return reject("ERROR", argsJson.decodedError(Args.self), nil)
        }
        
        guard let roverEnvironment = Rover.Environment(rawValue: args.environment) else {
            return reject("ERROR", "Unknown environment: \(args.environment)", nil)
        }
        Rover.shared.configure(licenseKey: args.licenseKey,
                               environment: roverEnvironment,
                               deviceId: args.deviceId ?? "unknown",
                               maxConcurrentCollections: args.maxConcurrentCollections ?? 4) { merchants, error in
            if let error = error {
                return reject("ERROR", error, nil)
            }
            guard let result = try? merchants.json() else {
                return reject("ERROR", "Failed to serialize merchants", nil)
            }
            return resolve(result)
        }
    }
    
    @objc(collect:delegateUUID:withResolver:withRejecter:)
    func collect(argsJson: String,
                 delegateUUID: String,
                 resolve: @escaping RCTPromiseResolveBlock,
                 reject: @escaping RCTPromiseRejectBlock
    ) {
        struct Args: Codable {
            var userId: String?
            var account: String?
            var password: String?
            var cookiesBase64: String?
            var merchantId: Int
            var javascript: Data?
            var javascriptUrl: String?
            var javascriptVersion: Int?
            var fromDate: Date
            var toDate: Date?
            var tier1BatchSize: Int?
            var tier2BatchSize: Int?
            var tier3BatchSize: Int?
            var receiptsBatchSize: Int?
            var collectItemInfo: Bool?
            var collectSourceData: Bool?
            var isEphemeral: Bool?
            var hasBackend: Bool?
            var allowUserInteractionRequired: Bool?
            var appInfo: String?
            var featureFlags: [String]?
            var overrideMimicDesktopIfPossible: Bool?
            var overrideWebviewBlockImageLoading: Bool?
        }
        guard let args: Args = try? argsJson.decoded() else {
            return reject("ERROR", argsJson.decodedError(Args.self), nil)
        }
        guard delegateUUID.isEmpty == false else {
            return reject("ERROR", "invalid delegate uuid", nil)
        }
        guard delegates[delegateUUID] == nil else {
            return reject("ERROR", "delegateUUID \(delegateUUID) already exists", nil)
        }
        
        let delegate = JSRoverDelegate(uuid: delegateUUID,
                                       nativeRover: self)
        
        delegates[delegateUUID] = delegate
        
        Rover.shared.collect(userId: args.userId,
                             account: args.account,
                             password: args.password,
                             cookiesBase64: args.cookiesBase64,
                             merchantId: args.merchantId,
                             javascript: args.javascript,
                             javascriptUrl: args.javascriptUrl,
                             javascriptVersion: args.javascriptVersion,
                             fromDate: args.fromDate,
                             toDate: args.toDate,
                             serviceGroupRequests: nil,
                             tier1BatchSize: args.tier1BatchSize ?? 16,
                             tier2BatchSize: args.tier2BatchSize ?? 16,
                             tier3BatchSize: args.tier3BatchSize ?? 16,
                             receiptsBatchSize: args.receiptsBatchSize ?? 8,
                             collectItemInfo: args.collectItemInfo ?? false,
                             collectSourceData: args.collectSourceData ?? false,
                             isEphemeral: args.isEphemeral ?? false,
                             hasBackend: args.hasBackend ?? false,
                             allowUserInteractionRequired: args.allowUserInteractionRequired ?? true,
                             appInfo: args.appInfo,
                             featureFlags: args.featureFlags,
                             overrideMimicDesktopIfPossible: args.overrideMimicDesktopIfPossible,
                             overrideWebviewBlockImageLoading: args.overrideWebviewBlockImageLoading,
                             delegate: delegate)
        resolve(nil)
    }
    
    @objc(cancel:withResolver:withRejecter:)
    func cancel(
        argsJson: String,
        resolve: @escaping RCTPromiseResolveBlock,
        reject: @escaping RCTPromiseRejectBlock
    ) {
        struct Args: Codable {
            var sessionUUID: String
        }
        guard let args: Args = try? argsJson.decoded() else {
            return reject("ERROR", argsJson.decodedError(Args.self), nil)
        }
        Rover.shared.cancel(sessionUUID: args.sessionUUID) { (error) in
            if let error = error {
                return reject("ERROR", error, nil)
            }
            return resolve(nil)
        }
    }
    
    @objc(cancelAll:withRejecter:)
    func cancelAll(
        resolve: @escaping RCTPromiseResolveBlock,
        reject: @escaping RCTPromiseRejectBlock
    ) {
        Rover.shared.cancelAll() { (error) in
            if let error = error {
                return reject("ERROR", error, nil)
            }
            return resolve(nil)
        }
    }
    
    @objc(preconfig:delegateUUID:withResolver:withRejecter:)
    func preconfig(argsJson: String,
                   delegateUUID: String,
                   resolve: @escaping RCTPromiseResolveBlock,
                   reject: @escaping RCTPromiseRejectBlock
    ) {
        struct Args: Codable {
            var userId: String?
            var merchantId: Int?
            var javascript: Data?
            var javascriptUrl: String?
            var javascriptVersion: Int?
        }
        guard let args: Args = try? argsJson.decoded() else {
            return reject("ERROR", argsJson.decodedError(Args.self), nil)
        }
        guard delegateUUID.isEmpty == false else {
            return reject("ERROR", "invalid delegate uuid", nil)
        }
        guard delegates[delegateUUID] == nil else {
            return reject("ERROR", "delegateUUID \(delegateUUID) already exists", nil)
        }
        
        let delegate = JSRoverDelegate(uuid: delegateUUID,
                                       nativeRover: self)
                
        Rover.shared.preconfig(userId: args.userId,
                               merchantId: args.merchantId,
                               javascript: args.javascript,
                               javascriptUrl: args.javascriptUrl,
                               javascriptVersion: args.javascriptVersion,
                               delegate: delegate) { result, error in
            if let error = error {
                return reject("ERROR", error, nil)
            }
            return resolve(result)
        }
    }
    
    @objc(connections:withRejecter:)
    func connections(
        resolve: @escaping RCTPromiseResolveBlock,
        reject: @escaping RCTPromiseRejectBlock
    ) {
        Rover.shared.connections { connections in
            guard let connectionsJson = try? connections.json() else {
                return reject("ERROR", "failed to serialize connections", nil)
            }
            return resolve(connectionsJson)
        }
    }
    
    @objc(remove:withResolver:withRejecter:)
    func remove(
        argsJson: String,
        resolve: @escaping RCTPromiseResolveBlock,
        reject: @escaping RCTPromiseRejectBlock
    ) {
        struct Args: Codable {
            var account: String
            var merchantId: Int
        }
        guard let args: Args = try? argsJson.decoded() else {
            return reject("ERROR", argsJson.decodedError(Args.self), nil)
        }

        Rover.shared.remove(account: args.account,
                            merchantId: args.merchantId) {
            return resolve(nil)
        }
    }
    
}
