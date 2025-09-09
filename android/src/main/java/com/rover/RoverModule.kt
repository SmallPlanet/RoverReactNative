package com.rover

import android.content.Context
import androidx.appcompat.app.AppCompatActivity
import androidx.fragment.app.FragmentManager
import com.facebook.react.bridge.Callback
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.Promise
import com.smallplanet.roverandroid.Private.RNRJsonAny
import com.smallplanet.roverandroid.Private.ScrapeResponse
import com.smallplanet.roverandroid.Rover
import com.smallplanet.roverandroid.WebViews.RoverWebView
import android.content.pm.PackageManager
import android.util.Log
import androidx.work.ListenableWorker
import com.facebook.react.ReactApplication
import com.facebook.react.ReactInstanceManager
import com.facebook.react.bridge.ReactContext
import com.smallplanet.roverandroid.Connection
import java.util.Date
import java.util.UUID
import java.util.concurrent.CountDownLatch
import java.util.concurrent.TimeUnit

public class RoverModule(private val reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {
  override fun getName(): String {
    return NAME
  }

  private fun getFragmentManager(): FragmentManager? {
    val activity = reactContext.currentActivity
    return if (activity is AppCompatActivity) {
      activity.supportFragmentManager
    } else {
      null
    }
  }

  private var delegates: HashMap<String, JSRoverDelegate> = hashMapOf()
  private var nextEventPromise: Promise? = null

  private var pendingSend = mutableListOf<String>()
  private var pendingResults: HashMap<String, ((String?, String?) -> Unit)> = hashMapOf()

  fun remove(delegateUUID: String) {
    delegates.remove(delegateUUID)
  }

  fun send(delegateUUID: String,
           argsJson: String,
           returnCallback: (String?, String?) -> Unit) {
    if (delegates[delegateUUID] == null) {
      return returnCallback(null, "delegateUUID $delegateUUID does not exist")
    }

    pendingResults[delegateUUID] = returnCallback

    pendingSend.add(argsJson)

    checkSendQueue()
  }

  // MARK: - INTERNAL

  fun checkSendQueue() {
    if (pendingSend.isEmpty() == false) else { return }
    val nextEventPromise = nextEventPromise ?: return

    this.nextEventPromise = null

    nextEventPromise.resolve(pendingSend.removeAt(0))
  }

  @ReactMethod
  fun uuidv4(successCallback: Callback) {
    val uuid = UUID.randomUUID().toString().uppercase()
    successCallback(uuid)
  }

  @ReactMethod
  fun sendResult(
    delegateUUID: String,
    argsJson: String?,
    error: String?
  ) {
    val pendingResult = pendingResults[delegateUUID] ?: return
    pendingResults.remove(delegateUUID)
    pendingResult(argsJson, error)
  }

  @ReactMethod
  fun nextEvent(
    promise:  Promise
  ) {
    nextEventPromise = promise

    checkSendQueue()
  }

  // MARK: - PUBLIC

  @ReactMethod
  fun featureFlags(
    promise: Promise
  ) {
    val result = RNRJsonAny.toJson(Rover.featureFlags) ?:
    return promise.reject("ERROR", "Failed to serialize feature flags")
    return promise.resolve(result)
  }

  @ReactMethod
  fun coreVersion(
    promise: Promise
  ) {
    promise.resolve(Rover.coreVersion)
  }

  @ReactMethod
  fun version(
    promise: Promise
  ) {
    promise.resolve(Rover.version)
  }

  @ReactMethod
  fun syslog(
    message: String,
    promise: Promise
  ) {
    Log.e("ROVER", "ROVER: " + message)
    promise.resolve(message)
  }

  @ReactMethod
  fun didScheduleBackgroundCollections(
    promise: Promise
  ) {
    pendingGlobalSendDidUpdate = {
      synchronized(pendingGlobalSend) {
        for (event in pendingGlobalSend) {
          pendingSend.add(event)
        }
        pendingGlobalSend = mutableListOf()
      }
      checkSendQueue()
    }
    pendingGlobalSendDidUpdate()
    promise.resolve("")
  }

  @ReactMethod
  fun configure(
    argsJson: String,
    promise: Promise
  ) {
    val fragmentManager = getFragmentManager()

    data class Args(var licenseKey: String,
                    var environment: String,
                    var deviceId: String?,
					          var clearAndroidWebStorage: Boolean?,
                    var maxConcurrentCollections: Long?)

    val args = RNRJsonAny.parse(argsJson, Args::class.java) ?:
    return promise.reject("ERROR", RNRJsonAny.parseError(argsJson, Args::class.java))

    val roverEnvironment = when(args.environment) {
      Rover.Environment.staging.rawValue -> Rover.Environment.staging
      Rover.Environment.production.rawValue -> Rover.Environment.production
      else -> return promise.reject("ERROR", "Unknown environment: ${args.environment}")
    }

    Rover.configure(
      licenseKey = args.licenseKey,
      environment = roverEnvironment,
      deviceId = args.deviceId ?: "unknown",
      clearAndroidWebStorage = args.clearAndroidWebStorage ?: true,
      maxConcurrentCollections = args.maxConcurrentCollections ?: 4,
      suppressVersionNotice = false,
      context = reactApplicationContext,
      supportFragmentManager = fragmentManager) callback@{ merchants, error ->
      if (error != null) {
        return@callback promise.reject("ERROR", error)
      }
      val result = RNRJsonAny.toJson(merchants) ?:
      return@callback promise.reject("ERROR", "Failed to serialize merchants")
      promise.resolve(result)
    }
  }

  @ReactMethod
  fun collect(
    argsJson: String,
    delegateUUID: String,
    promise: Promise
  ) {
    data class Args(
      var userId: String?,
      var account: String?,
      var password: String?,
      var cookiesBase64: String?,
      var merchantId: Long,
      var javascript: ByteArray?,
      var javascriptUrl: String?,
      var javascriptVersion: Long?,
      var fromDate: Date,
      var toDate: Date?,
      var tier1BatchSize: Long?,
      var tier2BatchSize: Long?,
      var tier3BatchSize: Long?,
      var receiptsBatchSize: Long?,
      var collectItemInfo: Boolean?,
      var collectSourceData: Boolean?,
      var isEphemeral: Boolean?,
      var hasBackend: Boolean?,
      var allowUserInteractionRequired: Boolean?,
      var appInfo: String?,
      var featureFlags: MutableList<String>?,
      var overrideMimicDesktopIfPossible: Boolean?,
      var overrideWebviewBlockImageLoading: Boolean?
    )
    val args = RNRJsonAny.parse(argsJson, Args::class.java) ?:
    return promise.reject("ERROR", RNRJsonAny.parseError(argsJson, Args::class.java))

    if (delegateUUID.isEmpty()) {
      return promise.reject("ERROR", "invalid delegate uuid")
    }
    if (delegates[delegateUUID] != null) {
      return promise.reject("ERROR", "delegateUUID $delegateUUID already exists")
    }

    val delegate = JSRoverDelegate(
      uuid = delegateUUID,
      nativeRover = this
    )

    delegates[delegateUUID] = delegate

    Rover.collect(
      userId = args.userId,
      account = args.account,
      password = args.password,
      cookiesBase64 = args.cookiesBase64,
      merchantId = args.merchantId,
      javascript = args.javascript,
      javascriptUrl = args.javascriptUrl,
      javascriptVersion = args.javascriptVersion,
      fromDate = args.fromDate,
      toDate = args.toDate,
      serviceGroupRequests = null,
      tier1BatchSize = args.tier1BatchSize ?: 16,
      tier2BatchSize = args.tier2BatchSize ?: 16,
      tier3BatchSize = args.tier3BatchSize ?: 16,
      receiptsBatchSize = args.receiptsBatchSize ?: 8,
      collectItemInfo = args.collectItemInfo ?: false,
      collectSourceData = args.collectSourceData ?: false,
      isEphemeral = args.isEphemeral ?: false,
      hasBackend = args.hasBackend ?: false,
      allowUserInteractionRequired = args.allowUserInteractionRequired ?: true,
      appInfo = args.appInfo,
      featureFlags = args.featureFlags,
      overrideMimicDesktopIfPossible = args.overrideMimicDesktopIfPossible,
      overrideWebviewBlockImageLoading = args.overrideWebviewBlockImageLoading,
      delegate = delegate
    )

    promise.resolve(null)
  }

  @ReactMethod
  fun cancel(
    argsJson: String,
    promise: Promise,
  ) {
    data class Args(
      var sessionUUID: String
    )
    val args = RNRJsonAny.parse(argsJson, Args::class.java) ?:
    return promise.reject("ERROR", RNRJsonAny.parseError(argsJson, Args::class.java))

    Rover.cancel(sessionUUID = args.sessionUUID) callback@{ error ->
      if (error != null) {
        return@callback promise.reject("ERROR", error)
      }
      return@callback promise.resolve(null)
    }
  }

  @ReactMethod
  fun cancelAll(
    promise: Promise
  ) {
    Rover.cancelAll() callback@{ error ->
      if (error != null) {
        return@callback promise.reject("ERROR", error)
      }
      return@callback promise.resolve(null)
    }
  }

  @ReactMethod
  fun preconfig(
    argsJson: String,
    delegateUUID: String,
    promise: Promise
  ) {
    data class Args(
      var userId: String?,
      var merchantId: Long?,
      var javascript: ByteArray?,
      var javascriptUrl: String?,
      var javascriptVersion: Long?
    )
    val args = RNRJsonAny.parse(argsJson, Args::class.java) ?:
    return promise.reject("ERROR", RNRJsonAny.parseError(argsJson, Args::class.java))

    if (delegateUUID.isEmpty()) {
      return promise.reject("ERROR", "invalid delegate uuid")
    }
    if (delegates[delegateUUID] != null) {
      return promise.reject("ERROR", "delegateUUID $delegateUUID already exists")
    }

    val delegate = JSRoverDelegate(
      uuid = delegateUUID,
      nativeRover = this
    )

    Rover.preconfig(
      userId = args.userId,
      merchantId = args.merchantId,
      javascript = args.javascript,
      javascriptUrl = args.javascriptUrl,
      javascriptVersion = args.javascriptVersion,
      delegate = delegate
    ) callback@{ result, error ->
      if (error != null) {
        return@callback promise.reject("ERROR", error)
      }
      return@callback promise.resolve(result)
    }
  }

  @ReactMethod
  fun connections(
    promise: Promise
  ) {
    Rover.connections callback@{ connections ->
      val connectionsJson = RNRJsonAny.toJson(connections) ?:
      return@callback promise.reject("ERROR", "Failed to serialize connections")
      return@callback promise.resolve(connectionsJson)
    }
  }

  @ReactMethod
  fun remove(
    argsJson: String,
    promise: Promise
  ) {
    data class Args(
      var account: String,
      var merchantId: Long
    )
    val args = RNRJsonAny.parse(argsJson, Args::class.java) ?:
    return promise.reject("ERROR", RNRJsonAny.parseError(argsJson, Args::class.java))

    Rover.remove(
      account = args.account,
      merchantId = args.merchantId) callback@{
      return@callback promise.resolve(null)
    }
  }

  companion object {
    const val NAME = "NativeRover"

    public fun getPackageName(): String? {
      return Rover.getPackageName()
    }

    public fun getPackageManager(appPackageName: String,
                          appPackageManager: PackageManager): PackageManager? {
      return Rover.getPackageManager(appPackageName, appPackageManager)
    }

    internal var pendingGlobalSend = mutableListOf<String>()
    internal var pendingGlobalSendDidUpdate:() -> Unit = { }

    suspend fun scheduleBackgroundCollections(context: Context): ListenableWorker.Result {
      // ensure ReactNative JS is started, then call the RoverBackgroundInit
      // Log.e("ROVER", "Rover createReactContextInBackground")
      val application = context.applicationContext as ReactApplication
      val reactNativeHost = application.reactNativeHost
      val reactInstanceManager = reactNativeHost.reactInstanceManager

      // wait for the JS to finish starting
      if (reactInstanceManager.currentReactContext == null) {
        val latch = CountDownLatch(1)
        reactInstanceManager.addReactInstanceEventListener(object :
          ReactInstanceManager.ReactInstanceEventListener {
          override fun onReactContextInitialized(ctx: ReactContext) {
            reactInstanceManager.removeReactInstanceEventListener(this)
            latch.countDown()
          }
        })
        reactInstanceManager.createReactContextInBackground()
        // Log.e("ROVER", "Rover waiting for JS to start")
        latch.await(30, TimeUnit.SECONDS)
      }

      // Log.e("ROVER", "Rover scheduleBackgroundCollections")
      return Rover.scheduleBackgroundCollections(collectionWillStart@{
        data class Args(
          var taskIdentifier: String,
        )
        val args = Args("com.smallplanet.rover.processing")
        val argsJson = RNRJsonAny.toJson(args) ?: return@collectionWillStart
        synchronized(pendingGlobalSend) {
          pendingGlobalSend.add(argsJson)
        }
        pendingGlobalSendDidUpdate()
      }, collectionWillFinish@{ connections ->
        data class Args(
          var taskIdentifier: String,
          var connections: MutableList<Connection>
        )
        val args = Args("com.smallplanet.rover.processing", connections)
        val argsJson = RNRJsonAny.toJson(args) ?: return@collectionWillFinish
        synchronized(pendingGlobalSend) {
          pendingGlobalSend.add(argsJson)
        }
        pendingGlobalSendDidUpdate()
      })
    }
  }
}
