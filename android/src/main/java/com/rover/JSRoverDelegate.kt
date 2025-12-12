package com.rover

import android.util.Log
import com.smallplanet.roverandroid.Private.RNRJsonAny
import com.smallplanet.roverandroid.Receipt
import com.smallplanet.roverandroid.RoverDelegate
import com.smallplanet.roverandroid.ScrapeRequest
import com.smallplanet.roverandroid.ScrapeServiceGroupStatus

class JSRoverDelegate(
  val uuid: String,
  val nativeRover: RoverModule
) : RoverDelegate() {

  override fun roverDidFinish(
    sessionUUID: String,
    resultsGzip: ByteArray,
    error: String?,
    userError: String?,
    verboseError: String?) {
    data class Args (
      val delegateUUID: String,
      val delegateFunc: String,
      val sessionUUID: String,
      val error: String?,
      val userError: String?,
      val verboseError : String?
    )
    val args = Args(
      delegateUUID = uuid,
      delegateFunc = "roverDidFinish",
      sessionUUID = sessionUUID,
      error = error,
      userError = userError,
      verboseError = verboseError)

    val argsJson = RNRJsonAny.toJson(args) ?: return

    nativeRover.send(uuid, argsJson) { resultJson, resultError ->
      nativeRover.remove(delegateUUID = uuid)
    }
  }

  override fun roverDidInit(
    sessionUUID: String,
    scrapeRequest: ScrapeRequest,
    callback: (ScrapeRequest, String?) -> Unit) {
    data class Args (
      val delegateUUID: String,
      val delegateFunc: String,
      val sessionUUID: String,
      val scrapeRequest : ScrapeRequest
    )
    val args = Args(
      delegateUUID = uuid,
      delegateFunc = "roverDidInit",
      sessionUUID = sessionUUID,
      scrapeRequest = scrapeRequest
    )

    val argsJson = RNRJsonAny.toJson(args) ?:
    return callback(scrapeRequest, "failed to serialize args")

    nativeRover.send(uuid, argsJson) callback@{ resultJson, resultError ->
      val newScrapeRequest = RNRJsonAny.parse(resultJson ?: "", ScrapeRequest::class.java) ?:
      return@callback callback(scrapeRequest, resultError)
      callback(newScrapeRequest, resultError)
    }
  }

  override fun roverDidCollect(sessionUUID: String,
                               receipts: MutableList<Receipt>) {
    data class Args (
      val delegateUUID: String,
      val delegateFunc: String,
      val sessionUUID: String,
      val receipts: MutableList<Receipt>
    )
    val args = Args(
      delegateUUID = uuid,
      delegateFunc = "roverDidCollect",
      sessionUUID = sessionUUID,
      receipts = receipts
    )

    val argsJson = RNRJsonAny.toJson(args) ?:  return

    nativeRover.send(uuid, argsJson) { resultJson, resultError -> }
  }

  override fun roverHasStatus(sessionUUID: String,
                              progress: Double,
                              stepProgress: Double,
                              currentStep: Long,
                              maxSteps: Long,
                              serviceGroupStatus: MutableList<ScrapeServiceGroupStatus>,
                              merchantVersion: String?,
                              tagLog: MutableList<String>,
                              userTag: String) {
    data class Args (
      val delegateUUID: String,
      val delegateFunc: String,
      val sessionUUID: String,
      val progress: Double,
      val stepProgress: Double,
      val currentStep: Long,
      val maxSteps: Long,
      val merchantVersion: String?,
      val tagLog: MutableList<String>,
      val userTag : String
    )
    val args = Args(
      delegateUUID = uuid,
      delegateFunc = "roverHasStatus",
      sessionUUID = sessionUUID,
      progress = progress,
      stepProgress = stepProgress,
      currentStep = currentStep,
      maxSteps = maxSteps,
      merchantVersion = merchantVersion,
      tagLog = tagLog,
      userTag = userTag
    )

    val argsJson = RNRJsonAny.toJson(args) ?:  return

    nativeRover.send(uuid, argsJson) { resultJson, resultError -> }
  }

  override fun roverAccountDidLogin(sessionUUID: String,
                                  oldAccount: String,
                                  newAccount: String,
                                  password: String,
                                  cookiesBase64: String?,
                                  wasUserInteractionRequired: Boolean,
                                  callback: (String?, String?) -> Unit) {
    data class Args(
      val delegateUUID: String,
      val delegateFunc: String,
      val sessionUUID: String,
      val oldAccount: String,
      val newAccount: String,
      val password: String,
      val cookiesBase64 : String?,
      val wasUserInteractionRequired: Boolean
    )
    val args = Args(
      delegateUUID = uuid,
      delegateFunc = "roverAccountDidLogin",
      sessionUUID = sessionUUID,
      oldAccount = oldAccount,
      newAccount = newAccount,
      password = password,
      cookiesBase64 = cookiesBase64,
      wasUserInteractionRequired = wasUserInteractionRequired
    )

    val argsJson = RNRJsonAny.toJson(args) ?:
    return callback("failed to serialize args", null)

    nativeRover.send(uuid, argsJson) { resultJson, resultError ->
      callback(resultError, resultJson)
    }
  }

}
