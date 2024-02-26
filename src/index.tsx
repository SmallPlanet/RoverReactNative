import { NativeModules, Platform } from 'react-native';

const LINKING_ERROR =
`The package 'react-native-rover' doesn't seem to be linked. Make sure: \n\n` +
Platform.select({ ios: "- You have run 'pod install'\n", default: '' }) +
'- You rebuilt the app after installing the package\n' +
'- You are not using Expo Go\n';

export const NativeRover = NativeModules.NativeRover
? NativeModules.NativeRover
: new Proxy(
    {},
    {
        get() {
            throw new Error(LINKING_ERROR);
        },
    }
);

let JSRover = { };

JSRover.ROVER_STAGING = "ROVER_STAGING";
JSRover.ROVER_PRODUCTION = "ROVER_PRODUCTION";

JSRover.delegates = [];

function ISODateString(d) {
    function pad(n) {return n<10 ? '0'+n : n}
    return d.getUTCFullYear()+'-'
         + pad(d.getUTCMonth()+1)+'-'
         + pad(d.getUTCDate())+'T'
         + pad(d.getUTCHours())+':'
         + pad(d.getUTCMinutes())+':'
         + pad(d.getUTCSeconds())+'Z'
}

let dateConverter = function(key, value) {
   if (this[key] instanceof Date) {
      return ISODateString(this[key]);
   }
   return value;
}

JSRover.featureFlags = function(): Promise<object> {
    return new Promise((resolve, reject) => {
        NativeRover.featureFlags(
        ).then(function(flagsJson) {
            resolve(JSON.parse(flagsJson));
        }).catch(function(error) {
            reject(error);
        });
    });
}

JSRover.coreVersion = function(): Promise<object> {
    return NativeRover.coreVersion()
}

JSRover.version = function(): Promise<object> {
    return NativeRover.version()
}

JSRover.configure = function(args: object): Promise<object> {
    return new Promise((resolve, reject) => {
        NativeRover.configure(
            JSON.stringify(args, dateConverter)
        ).then(function(merchantsJson) {
            resolve(JSON.parse(merchantsJson));
        }).catch(function(error) {
            reject(error);
        });
    });
}

JSRover.collect = function(args: object, delegate: RoverDelegate): Promise<object> {
    return new Promise((resolve, reject) => {
        NativeRover.uuidv4(function(uuid) {
            delegate.uuid = uuid;
            JSRover.delegates[delegate.uuid] = delegate;
        
            NativeRover.collect(
                JSON.stringify(args, dateConverter),
                delegate.uuid
            ).then(function(response) {
                resolve(response);
            }).catch(function(error) {
                reject(error);
            });
        });
    });
}

JSRover.cancel = function(args: object): Promise<object> {
    return new Promise((resolve, reject) => {
        NativeRover.cancel(
            JSON.stringify(args, dateConverter)
        ).then(function() {
            resolve();
        }).catch(function(error) {
            reject(error);
        });
    });
}

JSRover.cancelAll = function(): Promise<object> {
    return new Promise((resolve, reject) => {
        NativeRover.cancelAll(
        ).then(function() {
            resolve();
        }).catch(function(error) {
            reject(error);
        });
    });
}

JSRover.preconfig = function(args: object, delegate: RoverDelegate): Promise<object> {
    return new Promise((resolve, reject) => {
        NativeRover.uuidv4(function(uuid) {
            delegate.uuid = uuid;
            JSRover.delegates[delegate.uuid] = delegate;
        
            NativeRover.preconfig(
                JSON.stringify(args, dateConverter),
                delegate.uuid
            ).then(function(preconfigJson) {
                resolve(JSON.parse(preconfigJson));
            }).catch(function(error) {
                reject(error);
            });
        });
    });
}

JSRover.connections = function(): Promise<object> {
    return new Promise((resolve, reject) => {
        NativeRover.connections(
        ).then(function(connectionsJson) {
            resolve(JSON.parse(connectionsJson));
        }).catch(function(error) {
            reject(error);
        });
    });
}

JSRover.remove = function(args: object): Promise<object> {
    return new Promise((resolve, reject) => {
        NativeRover.remove(
            JSON.stringify(args, dateConverter)
        ).then(function() {
            resolve();
        }).catch(function(error) {
            reject(error);
        });
    });
}

function nextEvent(eventJson) {
    if (eventJson != undefined) {
        try {
            let event = JSON.parse(eventJson);
            let delegateUUID = event.delegateUUID;
            let delegateFunc = event.delegateFunc;
            let delegate = JSRover.delegates[delegateUUID];
            
            if (delegate[delegateFunc] != undefined) {
                switch (delegateFunc) {
                case "roverDidFinish":
                    delegate.roverDidFinish(
                        event.sessionUUID,
                        event.error,
                        event.userError,
                        event.verboseError
                    );
                    NativeRover.sendResult(delegate.uuid, undefined, undefined);
                    requestAnimationFrame(function() {
                        JSRover.delegates[delegateUUID] = undefined;
                    });
                    break;
                case "roverDidInit":
                    delegate.roverDidInit(
                        event.sessionUUID,
                        event.scrapeRequest,
                        function(scrapeRequest, error) {
                            NativeRover.sendResult(delegate.uuid, JSON.stringify(scrapeRequest), error);
                        }
                    );
                    break;
                case "roverDidCollect":
                    delegate.roverDidCollect(
                        event.sessionUUID,
                        event.receipts
                    );
                    NativeRover.sendResult(delegate.uuid, undefined, undefined);
                    break;
                case "roverHasStatus":
                    delegate.roverHasStatus(
                        event.sessionUUID,
                        event.progress,
                        event.stepProgress,
                        event.currentStep,
                        event.maxSteps,
                        event.merchantVersion,
                        event.tagLog,
                        event.userTag
                    );
                    NativeRover.sendResult(delegate.uuid, undefined, undefined);
                    break;
                case "roverAccountDidLogin":
                    delegate.roverAccountDidLogin(
                        event.sessionUUID,
                        event.oldAccount,
                        event.newAccount,
                        event.password,
                        event.cookiesBase64,
                        function(error, appInfo) {
                            NativeRover.sendResult(delegate.uuid, appInfo, error);
                        }
                    );
                    break;
                }
            }
        } catch(e) {
            console.log("Rover delegate error: " + e.message);
        }
    }
    
    NativeRover.nextEvent().then(function(eventJson) {
        nextEvent(eventJson);
    });
}
nextEvent();


export const Rover = JSRover;

export class RoverDelegate {
    roverDidInit(
        sessionUUID: string, 
        request: object,
        callback: ((request: object, error?: string) => string)
    ) {
        callback(request, undefined);
    }
    
    roverAccountDidLogin(
        sessionUUID: string, 
        oldAccount: string, 
        newAccount: string, 
        password: string, 
        cookiesBase64?: string, 
        callback: ((error?: string, appInfo?: string) => string)
    ) {
        callback(undefined, undefined);
    }
    
    roverHasStatus(
        sessionUUID: string, 
        progress: number, 
        stepProgress: number, 
        currentStep: number, 
        maxSteps: number, 
        merchantVersion?: string, 
        tagLog: Array<string>, 
        userTag: string
    ) {
        
    }
    
    roverDidCollect(
        sessionUUID: string,
        receipts: Array<object>
    ) {
        
    }
    
    roverDidFinish(
        sessionUUID: string, 
        error?: string, 
        userError?: string, 
        verboseError?: string)
    {
        
    }
}


