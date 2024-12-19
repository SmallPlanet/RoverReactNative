
// Codable Request/Reponse structures for communicating from the facade to RoverCore. RoveriOS and RoverServer can
// use these verbatim, but we use https://github.com/KittyMac/Transom to autotranslate to Kotlin data classes
// for RoverAndroid. Please keep the complexity of this file to a minimum, and if you encounter any compile
// errors report them to Rocco.










export interface Connection {
    merchantId: number
    account: string
    password?: string
    cookiesBase64?: string
    fromDate?: Date
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
export interface ReceiptFee {
    price?: string
    name?: string
}

export interface ReceiptAddress {
    name?: string
    address1?: string
    address2?: string
    city?: string
    state?: string
    zip?: string
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
}

export interface Receipt {
    roverMerchantId?: number
    roverUserId?: string
    roverAccountId?: string
    roverSessionUUID?: string
    transportId?: string
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
    continuationDate?: string
    membershipInfo?: string
    orderUrl?: string
    additionalOrderUrl?: string
    fees?: Array<ReceiptFee>
    tax?: string
    total?: string
    totalWithoutTax?: string
    deliveryCharge?: string
    discounts?: string
    giftCards?: string
    tip?: string
    currency?: string
    paymentMethod?: string
    paymentChannel?: string
    shippingAddress?: ReceiptAddress
    merchantAddress?: ReceiptAddress
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
}
