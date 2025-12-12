import RoveriOS
import Foundation
import React

class JSRoverDelegate: RoverDelegate {
    private let uuid: String
    private let nativeRover: NativeRover
    
    init(uuid: String,
         nativeRover: NativeRover) {
        self.uuid = uuid
        self.nativeRover = nativeRover
    }
    
    override func roverDidFinish(sessionUUID: String,
                                 resultsGzip: Data,
                                 error: String?,
                                 userError: String?,
                                 verboseError: String?) {
        struct Args: Codable {
            let delegateUUID: String
            let delegateFunc: String
            let sessionUUID: String
            let error: String?
            let userError: String?
            let verboseError: String?
        }
        let args = Args(delegateUUID: uuid,
                        delegateFunc: "roverDidFinish",
                        sessionUUID: sessionUUID,
                        error: error,
                        userError: userError,
                        verboseError: verboseError)
        
        guard let argsJson = try? args.json() else {
            return
        }
        
        nativeRover.send(uuid, argsJson) { args, error in
            self.nativeRover.remove(delegateUUID: self.uuid)
        }
    }

    override func roverDidInit(sessionUUID: String,
                               scrapeRequest: RoveriOS.ScrapeRequest,
                               callback: @escaping (_ scrapeRequest: RoveriOS.ScrapeRequest, _ error: String?) -> ()) {
        struct Args: Codable {
            let delegateUUID: String
            let delegateFunc: String
            let sessionUUID: String
            let scrapeRequest: RoveriOS.ScrapeRequest
        }
        let args = Args(delegateUUID: uuid,
                        delegateFunc: "roverDidInit",
                        sessionUUID: sessionUUID,
                        scrapeRequest: scrapeRequest)
        
        guard let argsJson = try? args.json() else {
            return callback(scrapeRequest, "failed to serialize args")
        }
        
        nativeRover.send(uuid, argsJson) { args, error in
            callback((try? args?.decoded()) ?? scrapeRequest, error)
        }
    }

    override func roverDidCollect(sessionUUID: String,
                                  receipts: [RoveriOS.Receipt]) {
        struct Args: Codable {
            let delegateUUID: String
            let delegateFunc: String
            let sessionUUID: String
            let receipts: [RoveriOS.Receipt]
        }
        let args = Args(delegateUUID: uuid,
                        delegateFunc: "roverDidCollect",
                        sessionUUID: sessionUUID,
                        receipts: receipts)
        
        guard let argsJson = try? args.json() else {
            return
        }
        
        nativeRover.send(uuid, argsJson) { args, error in }
    }

    override func roverHasStatus(sessionUUID: String,
                                 progress: Double,
                                 stepProgress: Double,
                                 currentStep: Int,
                                 maxSteps: Int,
                                 serviceGroupStatus: [RoveriOS.ScrapeServiceGroupStatus],
                                 merchantVersion: String?,
                                 tagLog: [String],
                                 userTag: String) {
        struct Args: Codable {
            let delegateUUID: String
            let delegateFunc: String
            let sessionUUID: String
            let progress: Double
            let stepProgress: Double
            let currentStep: Int
            let maxSteps: Int
            let merchantVersion: String?
            let tagLog: [String]
            let userTag: String
        }
        let args = Args(delegateUUID: uuid,
                        delegateFunc: "roverHasStatus",
                        sessionUUID: sessionUUID,
                        progress: progress,
                        stepProgress: stepProgress,
                        currentStep: currentStep,
                        maxSteps: maxSteps,
                        merchantVersion: merchantVersion,
                        tagLog: tagLog,
                        userTag: userTag)
        
        guard let argsJson = try? args.json() else {
            return
        }
        
        nativeRover.send(uuid, argsJson) { args, error in }
    }

    override func roverAccountDidLogin(sessionUUID: String,
                                       oldAccount: String,
                                       newAccount: String,
                                       password: String,
                                       cookiesBase64: String?,
                                       wasUserInteractionRequired: Bool,
                                       callback: @escaping (_ error: String?, _ appInfo: String?) -> ()) {
        struct Args: Codable {
            let delegateUUID: String
            let delegateFunc: String
            let sessionUUID: String
            let oldAccount: String
            let newAccount: String
            let password: String
            let cookiesBase64: String?
            let wasUserInteractionRequired: Bool
        }
        let args = Args(delegateUUID: uuid,
                        delegateFunc: "roverAccountDidLogin",
                        sessionUUID: sessionUUID,
                        oldAccount: oldAccount,
                        newAccount: newAccount,
                        password: password,
                        cookiesBase64: cookiesBase64,
                        wasUserInteractionRequired: wasUserInteractionRequired)
        
        guard let argsJson = try? args.json() else {
            return callback("failed to serialize args", nil)
        }
        
        nativeRover.send(uuid, argsJson) { args, error in
            callback(error, args)
        }
    }
}
