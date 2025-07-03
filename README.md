## Usage

```javascript
import { Rover, RoverDelegate } from 'react-native-rover';
import type { Merchant, Connection, Receipt } from 'react-native-rover';

// To interact with a Rover collector you provide a RoverDelegate. A minimal
// delegate would know when the collection is finished (either successfully or
// as a result of an error) and be able to process any receipts collected.
//
// IMPORTANT NOTE: Some delegate methods provide a callback. Collection will not continue
// until the callback is made.
class MyRoverDelegate extends RoverDelegate {
    roverDidFinish(
        sessionUUID: string, 
        error?: string, 
        userError?: string, 
        verboseError?: string)
    {
        
    }
    roverDidCollect(
        sessionUUID: string,
        receipts: Array<Receipt>
    ) {
        
    }
}
```

```javascript

// Note: You will need to call configure to provide your license key
// and receive the list of merchants you will be able to collect from.
// Each merchant will be an int identifier and a user facing name
// You may call configure multiple times if you wish.
Rover.configure({
    licenseKey: "MY_ROVER_LICENSE_KEY",
    environment: Rover.ROVER_STAGING,
    deviceId: undefined,
    maxConcurrentCollections: 4
}).then(function(merchants) {
    
}).catch(function(error) {
    
});

// When you are ready to connect and collect from a merchant, call 
// Rover.collect() with the desired merchant id, the date back to
// which Rover should collect from, and your delegate instance
// to collect the results with
let date = new Date('2023-01-01T00:00:00Z');

// 1. Create a new connection to a merchant
// userId: [optional] identifier you provide and passed through by Rover
// account: [optional] account name for this merchant to connect to (nil for new connection)
// merchantId: the identifier for the merchant to connect to (passed back in configure merchants array)
// fromDate: how far back you'd like to collect receipts
// collectItemInfo: [optional] collect extra information about items when possible (like UPC)
// isEphemeral: [optional] encrypt and store this connection locally to reconnect at later date
// note: see header for full list of parameters

let delegate = MyRoverDelegate();
Rover.collect({
    account: undefined,
    merchantId: merchant.merchantId,
    fromDate: date,
    collectItemInfo: true,
    isEphemeral: false,
    allowUserInteractionRequired: true
}, delegate).catch(function(error) {
    
});

// 2. List current merchant connections
// connections: array of existing merchant connections
Rover.connections().then(function(connections) {
    
}).catch(function(error) {
    
});

// 3. Recollect from an existing connection
let delegate = MyRoverDelegate();
Rover.collect({
    account: connection.account,
    merchantId: connection.merchantId,
    fromDate: connection.fromDate,
    collectItemInfo: true,
    isEphemeral: false,
    allowUserInteractionRequired: true
}, delegate).catch(function(error) {
    
});

// 4. Remove a connection
Rover.remove({
    account: connection.account,
    merchantId: connection.merchantId
}).then(function() {
    
}).catch(function(error) {
    
});

```

## Background Collection

[Rover iOS](https://github.com/SmallPlanet/RoveriOS) supports BGProcessingTask and [Rover Android](https://github.com/SmallPlanet/RoverAndroid) supports WorkManager for performing periodic collections without user interaction.

- In your App.tsx code you will add the logic for which connections to collect from when the time for periodic collection happens. This code should be run at the global level, such that Rover.scheduleBackgroundCollections is run when your application's JS is first loaded.

```javascript
// Note: the callbacks provided to Rover.scheduleBackgroundCollections may be called during times
// where there is no application UI present (when the application is relaunched in the background
// on Android, for example). The code in Rover.scheduleBackgroundCollections() should be written
// in such a way that it does not rely on your UI.
Rover.scheduleBackgroundCollections(
    (taskIdentifier) => {
        // When the time comes to collect in the background this code will run.
        // You should call Rover.collect() for the connections you would like to refresh.
        // This allows you to implement custom logic to fit your business needs (for example, 
        // if one connection is higher priority than another or needs to be refreshed more
        // often than another). Note that the amount of time allowed to collections is
        // typically limited to a few minutes.

        // Be certain to call Rover.configure() here as there is no garauntee it will
        // be run elsewhere when running from the background.
        Rover.configure({
            licenseKey: "MY_ROVER_LICENSE_KEY",
            environment: Rover.ROVER_STAGING,
        }).then((_) => {
            Rover.connections().then((connections) => {
                for (let connection of connections) {

                    let collectionArgs = {
                        userId: undefined,
                        account: connection.account,
                        merchantId: connection.merchantId,
                        fromDate: connection.fromDate ?? new Date('2023-01-01T00:00:00Z'),
                        isEphemeral: false,
                        allowUserInteractionRequired: false
                    };
                    
                    let delegate = new MyRoverBackgroundDelegate();
                    Rover.collect(collectionArgs, delegate).then(() => {
                        console.log(`background collection scheduled for [${connection.merchantId}] ${connection.account}`);
                    }).catch(function(error) {
                        Rover.syslog(error);
                    });
                }
            }).catch(function(error) {
                Rover.syslog(error);
            });
        });
    },
    (taskIdentifier, connections) => {
        console.log(`background collection finished for ${connections.length} connections`);
    }
);
```

### iOS

- Follow the instructions on [Rover iOS](https://github.com/SmallPlanet/RoveriOS) for enabling background capabilities and adding **com.smallplanet.rover.processing** to your Info.plist.
- Add the initialization call to your iOS AppDelegate's didFinishLaunchingWithOptions callback.

```
#import <react-native-rover/NativeRover-Bridging-Header.h>

- (BOOL)application:(UIApplication *)application didFinishLaunchingWithOptions:(NSDictionary *)launchOptions
{
  self.moduleName = @"RoverExample";
  self.initialProps = @{};
  
  // Add this call to initilize periodic background collection every 24 hours
  [NativeRover initBackgroundCollection: 60 * 60 * 24];

  return [super application:application didFinishLaunchingWithOptions:launchOptions];
}
```

### Android

- Create a Worker class in which you will call RoverModule.scheduleBackgroundCollections()
- Schedule your Worker class for periodic work via WorkManager API

```
// In your MainApplication.onCreate(), use the WorkManager API to schedule periodic background collections
val manager = WorkManager.getInstance(this.applicationContext)
val constraints = Constraints.Builder()
  .setRequiredNetworkType(NetworkType.CONNECTED)
  .setRequiresBatteryNotLow(true)
  .build()
val request = PeriodicWorkRequestBuilder<BackgroundCollectionWorker>(24, TimeUnit.HOURS)
  .setConstraints(constraints)
  .build()
manager.enqueueUniquePeriodicWork("BackgroundCollectionWorker", ExistingPeriodicWorkPolicy.CANCEL_AND_REENQUEUE, request)

// BackgroundCollectionWorker subclass to use with WorkManager API; call RoverModule.scheduleBackgroundCollections(context)
class BackgroundCollectionWorker(val context: Context, params: WorkerParameters) : CoroutineWorker(context, params) {
  override suspend fun doWork(): Result {
    return RoverModule.scheduleBackgroundCollections(context)
  }
}
```


## Android Setup

In your Android project, please add the following overrides to a custom subclass of Application.

```kotlin
import com.rover.RoverModule

// Create a custom subclass of Application and provide the following overrides
class ReferenceApplication(): Application() {
	override fun getPackageName(): String? {
		return RoverModule.getPackageName() ?: super.getPackageName()
	}
	
	override fun getPackageManager(): PackageManager {
		return RoverModule.getPackageManager(
			super.getPackageName(),
			super.getPackageManager()
		) ?: super.getPackageManager()
	}
}
```
In your project ```build.gradle``` file, add the following repository:
```
allprojects {
    repositories {
        flatDir { dirs "$rootDir/../node_modules/react-native-rover/android/libs" }
    }
}
```

## Proguard

If your Android app has proguard enabled, please add the following rules:

```
-keep class com.smallplanet.** { *; }
-keep class com.rover.** { *; }
```

## SDK Integration

To use Rover in your React Native application:

```sh
npm install react-native-rover
```



Latest version: v0.2.11
