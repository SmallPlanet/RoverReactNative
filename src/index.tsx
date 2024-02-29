import { NativeModules, Platform } from 'react-native';
import type { Merchant, Connection, Receipt } from './Receipt'

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

function ISODateString(d: Date) {
    function pad(n: number) {return n<10 ? '0'+n : n}
    return d.getUTCFullYear()+'-'
         + pad(d.getUTCMonth()+1)+'-'
         + pad(d.getUTCDate())+'T'
         + pad(d.getUTCHours())+':'
         + pad(d.getUTCMinutes())+':'
         + pad(d.getUTCSeconds())+'Z'
}

let dateConverter = function(this: any, key: string, value: any) {
    if (this[key] instanceof Date) {
       return ISODateString(this[key]);
    }
    return value;
}

let delegates: { [key: string]: RoverDelegate } = {};

class RoverClass {
    ROVER_STAGING = "ROVER_STAGING";
    ROVER_PRODUCTION = "ROVER_PRODUCTION";
    
    featureFlags(): Promise<object> {
        return new Promise((resolve, reject) => {
            NativeRover.featureFlags(
            ).then(function(flagsJson: string) {
                resolve(JSON.parse(flagsJson));
            }).catch(function(error: any) {
                reject(error);
            });
        });
    }
    
    coreVersion(): Promise<object> {
        return NativeRover.coreVersion()
    }

    version(): Promise<object> {
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
    configure(args: {
        licenseKey: string
        environment: string
        deviceId?: string
        maxConcurrentCollections?: number
    }): Promise<Array<Merchant>> {
        return new Promise((resolve, reject) => {
            NativeRover.configure(
                JSON.stringify(args, dateConverter)
            ).then(function(merchantsJson: string) {
                resolve(JSON.parse(merchantsJson));
            }).catch(function(error: any) {
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
    collect(args: {
        userId?: string,
        account?: string,
        password?: string,
        cookiesBase64?: string,
        merchantId: number,
        javascript?: ArrayBuffer,
        javascriptUrl?: string,
        javascriptVersion?: number,
        fromDate: Date,
        toDate?: Date,
        tier1BatchSize?: number,
        tier2BatchSize?: number,
        tier3BatchSize?: number,
        receiptsBatchSize?: number,
        collectItemInfo?: boolean,
        collectSourceData?: boolean,
        isEphemeral?: boolean,
        hasBackend?: boolean,
        allowUserInteractionRequired?: boolean,
        appInfo?: string,
        featureFlags?: Array<string>,
        overrideMimicDesktopIfPossible?: boolean,
        overrideWebviewBlockImageLoading?: boolean
    }, delegate: RoverDelegate): Promise<object> {
        if (delegate.uuid != undefined) {
            return new Promise((_, reject) => {
                reject("You should create a unique RoverDelegate for each call to Rover.collect()")
            });
        }

        return new Promise((resolve, reject) => {
            NativeRover.uuidv4(function(uuid: string) {
                delegate.uuid = uuid;
                delegates[delegate.uuid] = delegate;

                NativeRover.collect(
                    JSON.stringify(args, dateConverter),
                    delegate.uuid
                ).then(function(response: object) {
                    resolve(response);
                }).catch(function(error: any) {
                    reject(error);
                });
            });
        });
    }
    
    /**
     * Cancel a collection session. sessionUUID is returned in the RoverDelegate
     * Pass in the sessionUUID of the active collection
     */
    cancel(args: {
        sessionUUID: string
    }): Promise<object> {
        return new Promise((resolve, reject) => {
            NativeRover.cancel(
                JSON.stringify(args, dateConverter)
            ).then(function() {
                resolve({});
            }).catch(function(error: any) {
                reject(error);
            });
        });
    }

    /**
     * Cancel all collection sessions
     */
    cancelAll(): Promise<object> {
        return new Promise((resolve, reject) => {
            NativeRover.cancelAll(
            ).then(function() {
                resolve({});
            }).catch(function(error: any) {
                reject(error);
            });
        });
    }
    
    /**
     * Retrieve the preconfig for a specific merchant
     */
    preconfig(args: {
        userId?: string,
        merchantId?: number,
        javascript?: ArrayBuffer,
        javascriptUrl?: string,
        javascriptVersion?: number
    }): Promise<object> {
        let delegate = new RoverDelegate();

        return new Promise((resolve, reject) => {
            NativeRover.uuidv4(function(uuid: string) {
                delegate.uuid = uuid;
                delegates[delegate.uuid] = delegate;
        
                NativeRover.preconfig(
                    JSON.stringify(args, dateConverter),
                    delegate.uuid
                ).then(function(preconfigJson: string) {
                    resolve(JSON.parse(preconfigJson));
                }).catch(function(error: any) {
                    reject(error);
                });
            });
        });
    }

    /**
     * Retrieve a list of connections. When a successful connection is made during a collection where isEphemeral set to false,
     * the connection information is stored locally and encrypted.
     */
    connections(): Promise<Array<Connection>> {
        return new Promise((resolve, reject) => {
            NativeRover.connections(
            ).then(function(connectionsJson: string) {
                resolve(JSON.parse(connectionsJson));
            }).catch(function(error: any) {
                reject(error);
            });
        });
    }

    /**
     * Removes a connection stored locally to this device.
     * Pass in account and merchantid
     * or pass in valid connection object
     */
    remove(args: {
        account: string,
        merchantId: number
    }): Promise<object> {
        return new Promise((resolve, reject) => {
            NativeRover.remove(
                JSON.stringify(args, dateConverter)
            ).then(function() {
                resolve({});
            }).catch(function(error: any) {
                reject(error);
            });
        });
    }
}

export const Rover = new RoverClass();

function nextEvent(eventJson?: string) {
    if (eventJson != undefined) {
        try {
            let event = JSON.parse(eventJson);
            let delegateUUID = event.delegateUUID;
            let delegateFunc: string = event.delegateFunc;
            let delegate = delegates[delegateUUID];

            if (delegate != undefined && (delegate as any)[delegateFunc] != undefined) {
                console.log("delegate has property");

                switch (delegateFunc) {
                case "roverDidFinish":
                    delegate.roverDidFinish(
                        event.sessionUUID,
                        event.error,
                        event.userError,
                        event.verboseError
                    );
                    NativeRover.sendResult(delegate?.uuid, undefined, undefined);
                    requestAnimationFrame(function() {
                        delete delegates[delegateUUID];
                    });
                    break;
                case "roverDidInit":
                    delegate.roverDidInit(
                        event.sessionUUID,
                        event.scrapeRequest,
                        function(scrapeRequest: object, error?: string) {
                            NativeRover.sendResult(delegate?.uuid, JSON.stringify(scrapeRequest), error);
                        }
                    );
                    break;
                case "roverDidCollect":
                    delegate.roverDidCollect(
                        event.sessionUUID,
                        event.receipts
                    );
                    NativeRover.sendResult(delegate?.uuid, undefined, undefined);
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
                    NativeRover.sendResult(delegate?.uuid, undefined, undefined);
                    break;
                case "roverAccountDidLogin":
                    delegate.roverAccountDidLogin(
                        event.sessionUUID,
                        event.oldAccount,
                        event.newAccount,
                        event.password,
                        event.cookiesBase64,
                        function(error?: string, appInfo?: string) {
                            NativeRover.sendResult(delegate?.uuid, appInfo, error);
                        }
                    );
                    break;
                }
            }
        } catch(e: any) {
            console.log("Rover delegate error: " + e.message);
        }
    }
    
    NativeRover.nextEvent().then(function(eventJson?: any) {
        nextEvent(eventJson);
    });
}
nextEvent();

export class RoverDelegate {
    uuid?: string
    
    roverDidInit(
        _sessionUUID: string, 
        request: object,
        callback: ((request: object, error?: string) => void)
    ) {
        console.log("roverDidInit");
        callback(request, undefined);
    }
    
    roverAccountDidLogin(
        _sessionUUID: string, 
        _oldAccount: string, 
        _newAccount: string, 
        _password: string, 
        _cookiesBase64: string, 
        callback: ((error?: string, appInfo?: string) => void)
    ) {
        callback(undefined, undefined);
    }
    
    roverHasStatus(
        _sessionUUID: string, 
        _progress: number, 
        _stepProgress: number, 
        _currentStep: number, 
        _maxSteps: number, 
        _merchantVersion: string, 
        _tagLog: Array<string>, 
        _userTag: string
    ) {
        
    }
    
    roverDidCollect(
        _sessionUUID: string,
        _receipts: Array<Receipt>
    ) {
        
    }
    
    roverDidFinish(
        _sessionUUID: string, 
        _error?: string, 
        _userError?: string, 
        _verboseError?: string)
    {
        
    }
}


