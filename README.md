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
    merchantId: merchantId,
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

## Android

There are some additional, native-level changes required for Android intengration. Please refer to the [Rover Android repository](https://github.com/SmallPlanet/RoverAndroid) for the latest instructions.

## SDK Integration

To use Rover in your React Native application:

```sh
npm install react-native-rover
```



Latest version: v0.1.17
