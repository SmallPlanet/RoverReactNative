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

/**
 * When you call configure, you supply the license key associated with your Rover account. Rover will then
 * confirm your license key is valid, and return to you the list of Merchants authorized by your license key.
 * It is advisable that you use this array of merchants to drive the merchants available in your app, as
 * opposed to hard coding merchants in your app. By doing this, your Rover installation can automatically
 * use new merchants as they are released without needing a native update to your app.
 *
 * Configure may be safely called multiple times and as often as you like. Actually checks to the license
 * server will be throttled to once every 30 seconds when a cached version is available.
 *
 * [Optional] Set enviroment to .production when building the production version of your app.
 * [Optional] Set deviceId to a "unique identifier" for this app installation
 * [Optional] Set maxConcurrentCollections to the number of concurrent collections to allow
 * Callback will return an array of merchants and an optional error.
 */
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

/**
 * Call collect when you are ready for a collection to take place. Override the specific options
 * you need to achieve the behaviour your want.
 *
 * userId: a unique identifier to reference this user of your app. This is typically a value from
 *         your own backend services and is used to perform troubleshooting at your request.
 *         (ie "our user 12345 experienced this issue please help")
 * account: (override) the account name for the merchant you want to connect to. If this is a new connection
 *          then leave this value as nil.
 * password: (override) the password for the account you want to connect to. If this is unknown then leave as nil.
 * cookiesBase64: (override) the cookies session used for this connection. If this is unknown then leave as nil.
 * merchantId: the integer id for the merchant you want to connect to. As Rover supports adding new merchants dynamically,
 *             you should send the raw value you receive from the Merchants array return of configure call
 * javascript: (override) the logic specific to this merchant. If this is unknown then leave as nil.
 * javascriptUrl: (override) url to the logic specific to this merchant. If this is unknown then leave as nil.
 * javascriptVersion: (override) specify a specific version of this merchant to use. If this is unknown then leave as nil. Set to 0 to use local version.
 * fromDate: (required) specify how far back in the account you want to collect from.
 * toDate: (optional) don't return data for dates >= this value
 * serviceGroupRequests: (optional) service group specific continuation data. If this is unknown then leave as nil.
 * tier1BatchSize: (default) how many T1 data results to return at a time. What "T1" means is specific to each merchant.
 * tier2BatchSize: (default) how many T2 data results to return at a time. What "T2" means is specific to each merchant.
 * tier3BatchSize: (default) how many T3 data results to return at a time. What "T3" means is specific to each merchant.
 * receiptsBatchSize: (default) how many receipts should be returned to your delegate at a time
 * collectItemInfo: (optional) instruct Rover to collect detailed item info. "Item info" is specific to each merchant. Collecting item info can negatively impact collection times and is disabled by default.
 * collectSourceData: (optional) instruct Rover to return the sourceData used to create the normalized data. This is typically JSON specific to each merchant. Source data can increase data payloads and is disabled by default.
 * isEphemeral: (default false) If false then a encrypted connection data will be stored to this device. This connection can then be reused in the future to re-collect from the same account.
 * hasBackend: (default false) For simple integrations Rover will perform all of the collection locally. More advanced integrations might want to integrate with server-side services to store collection state at various points in the collection process. Set to true to enable the various roverPull/roverPush delegate callbacks.
 * allowUserInteractionRequired (default true) Collection might encounter an error for which the user needs to resolve (for example, signing in). If allowUserInteractionRequired is enabled then Rover will automatically display a modal for the user to interact with. If you want Rover to collect solely in the background, then set this value to false.
 * appInfo: (optional) application specific info for this specific merchant. If this is unknown then leave as nil.
 * overrideMimicDesktopIfPossible: (optional) If this is unknown then leave as nil.
 * overrideWebviewBlockImageLoading: (optional) If this is unknown then leave as nil.
 * delegate: (required) An instance of RoverDelegate() to service this collection.
 */
JSRover.collect = function(args: object, delegate: RoverDelegate): Promise<object> {
    if (delegate.uuid != undefined) {
        return new Promise((resolve, reject) => {
            reject("You should create a unique RoverDelegate for each call to Rover.collect()")
        });
    }
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

/**
 * Cancel a collection session. sessionUUID is returned in the RoverDelegate
 * Pass in the sessionUUID of the active collection
 */
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

/**
 * Cancel all collection sessions
 */
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

/**
 * Retrieve the preconfig for a specific merchant
 * Pass in the same object sent to Rover.collect().
 */
JSRover.preconfig = function(args: object): Promise<object> {
    let delegate = new RoverDelegate();
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

/**
 * Retrieve a list of connections. When a successful connection is made during a collection where isEphemeral set to false,
 * the connection information is stored locally and encrypted.
 */
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

/**
 * Removes a connection stored locally to this device.
 * Pass in account and merchantid
 * or pass in valid connection object
 */
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


