
// Codable Request/Reponse structures for communicating from the facade to RoverCore. RoveriOS and RoverServer can
// use these verbatim, but we use https://github.com/KittyMac/Transom to autotranslate to Kotlin data classes
// for RoverAndroid. Please keep the complexity of this file to a minimum, and if you encounter any compile
// errors report them to Rocco.










// dart:
// dart-ignore: ScrapeRequest
// dart-ignore: ScrapeStatus
// dart-ignore: ScrapeServiceGroupStatus
// dart-ignore: MerchantId
// dart-ignore: ServiceGroupRequest
// dart-ignore: MerchantId
// dart-ignore: InternalMerchantId
export interface Connection {
    merchantId: number
    account: string
    password?: string
    cookiesBase64?: string
    fromDate?: Date
    collectedDate?: Date
    attemptedDate?: Date
    appInfo?: string
    featureFlags?: Array<String>
    userInteractionRequired: boolean
}

export interface Merchant {
    merchantId: number
    name: string
    category?: string
    subcategory?: string
    locales?: string
    version: number
    logoLight?: string
    logoDark?: string
}

// MARK: - ScrapeStatus
// MARK: ScrapeRequest
// MARK: - Receipt
export interface ReceiptFlight {
    number?: string
    departureName?: string
    departureCode?: string
    arrivalName?: string
    arrivalCode?: string
    departureDate?: string
    arrivalDate?: string
}

export interface ReceiptAccomodation {
    agent?: string
    name?: string
    address?: ReceiptAddress
    arrivalDate?: string
    departureDate?: string
}

export interface ReceiptCarRental {
    pickupDate?: string
    dropoffDate?: string
    dropoffLocation?: string
    pickupLocation?: string
}

export interface ReceiptTrain {
    departureCity?: string
    departureState?: string
    departureStation?: string
    departureDate?: string
    arrivalCity?: string
    arrivalState?: string
    arrivalStation?: string
    arrivalDate?: string
    ticketNumber?: string
    trainNumber?: string
}

export interface ReceiptBus {
    departureDate?: string
    departureCity?: string
    departureStation?: string
    arrivalDate?: string
    arrivalCity?: string
    arrivalStation?: string
}

export interface ReceiptFee {
    price?: string
    name?: string
}

export interface ReceiptAddress {
    original?: string
    name?: string
    address1?: string
    address2?: string
    city?: string
    state?: string
    zip?: string
    country?: string
}

export interface ReceiptItemOption {
    title?: string
    itemId?: string
    upc?: string
    quantity?: string
    weight?: string
    itemOptionIndex?: string
    unitPrice?: string
    totalPrice?: string
}

export interface ReceiptItem {
    titleOriginal?: string
    title?: string
    titleOther?: Array<String>
    titleAuthors?: Array<String>
    quantity?: string
    weight?: string
    asin?: string
    imageUrl?: string
    productUrl?: string
    condition?: string
    soldBy?: string
    deliveryStatus?: string
    itemIndex?: string
    itemId?: string
    upc?: string
    brand?: string
    category?: string
    manufacturer?: string
    originalUnitPrice?: string
    unitPrice?: string
    totalPrice?: string
    notAvailable?: string
    substitution?: string
    substitutionPrice?: string
    color?: string
    size?: string
    type?: string
    trackingId?: string
    itemOptions?: Array<ReceiptItemOption>
}

export interface Receipt {
    roverMerchantId?: number
    roverUserId?: string
    roverAccountId?: string
    roverSessionUUID?: string
    transportId?: string
    emailProviderId?: string
    duplicationId?: string
    receiptId?: string
    emailId?: string
    receiptDomain?: string
    receiptFormat?: string
    deviceLocale?: string
    deviceTimezone?: string
    error?: string
    validationError?: string
    storeName?: string
    contentStoreName?: string
    serviceGroup?: string
    collectedDate?: string
    purchasedDate?: string
    completedDate?: string
    continuationDate?: string
    membershipInfo?: string
    orderUrl?: string
    additionalOrderUrl?: string
    fees?: Array<ReceiptFee>
    tax?: string
    total?: string
    totalWithoutTax?: string
    deliveryCharge?: string
    deliveryDistance?: string
    deliveryDuration?: string
    discounts?: string
    giftCards?: string
    tip?: string
    currency?: string
    paymentMethod?: string
    paymentChannel?: string
    shippingAddress?: ReceiptAddress
    merchantAddress?: ReceiptAddress
    merchantLocationType?: string
    billingAddress?: ReceiptAddress
    items: Array<ReceiptItem>
    sourceData?: string
    clientInfo?: string
    auxData?: string
    merchantLocalPurchaseDate?: string
    emlOriginatingDate?: string
    emlOriginatingDateMerchantLocal?: string
    emlSubjectKeywords?: Array<String>
    cancelled?: string
    preorder?: string
    returned?: string
    trackingId?: string
    travelFlights?: Array<ReceiptFlight>
    travelAccomodations?: Array<ReceiptAccomodation>
    travelCarRentals?: Array<ReceiptCarRental>
    travelTrains?: Array<ReceiptTrain>
    travelBuses?: Array<ReceiptBus>
    streamingVideo?: ReceiptStreamingVideo
}

export interface ReceiptStreamingVideoProfile {
    id?: string
    name?: string
    isKids?: string
    isMain?: string
    birthday?: string
    gender?: string
    createdDate?: string
}

export interface ReceiptStreamingVideoExtraValue {
    service?: string
    key?: string
    value?: string
}

export interface ReceiptStreamingVideo {
    profile?: ReceiptStreamingVideoProfile
    extraValues?: Array<ReceiptStreamingVideoExtraValue>
    seriesTitle?: string
    seriesAsin?: string
    seriesId?: string
    seriesDescription?: string
    seriesUrl?: string
    seriesImage?: string
    seasonTitle?: string
    seasonAsin?: string
    seasonId?: string
    seasonDescription?: string
    seasonUrl?: string
    seasonImage?: string
    videoTitle?: string
    videoAsin?: string
    videoId?: string
    videoDescription?: string
    videoUrl?: string
    videoImage?: string
    videoLengthSeconds?: string
    videoWatchedSeconds?: string
    viewDate?: string
    videoType?: string
}
