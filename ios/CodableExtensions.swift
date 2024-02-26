import Foundation

struct RuntimeError: Error {
    let message: String

    init(_ message: String) {
        self.message = message
    }

    public var localizedDescription: String {
        return message
    }
}

private let suppressDefaultValuesKey = CodingUserInfoKey(rawValue: "SuppressDefaultValues")!

public extension Encodable {

    func cloned<T: Decodable>() throws -> T {
        return try self.encoded().decoded()
    }
    
    func compare<T: Encodable>(to other: T) -> Bool {
        let encoder = JSONEncoder()
        encoder.outputFormatting = .sortedKeys
        encoder.dateEncodingStrategy = .iso8601
        encoder.nonConformingFloatEncodingStrategy = .convertToString(positiveInfinity: "+Infinity", negativeInfinity: "-Infinity", nan: "NaN")
        
        guard let json1 = try? encoder.encode(self) else { return false }
        guard let json2 = try? encoder.encode(other) else { return false }
        return json1 == json2
    }

    func encoded() throws -> Data {
        let encoder = JSONEncoder()
        encoder.dateEncodingStrategy = .iso8601
        encoder.nonConformingFloatEncodingStrategy = .convertToString(positiveInfinity: "+Infinity", negativeInfinity: "-Infinity", nan: "NaN")
        return try encoder.encode(self)
    }
        
    func json(pretty: Bool = false) throws -> String {
        let encoder = JSONEncoder()
        if pretty {
            encoder.outputFormatting = [.prettyPrinted, .sortedKeys]
        } else {
            encoder.outputFormatting = [.sortedKeys]
        }
        encoder.dateEncodingStrategy = .iso8601
        encoder.nonConformingFloatEncodingStrategy = .convertToString(positiveInfinity: "+Infinity", negativeInfinity: "-Infinity", nan: "NaN")
        return try String(data: encoder.encode(self), encoding: .utf8)!
    }
    
    func json(error errorString: String) -> String {
        do {
            let encoder = JSONEncoder()
            encoder.outputFormatting = [.sortedKeys]
            encoder.dateEncodingStrategy = .iso8601
            encoder.nonConformingFloatEncodingStrategy = .convertToString(positiveInfinity: "+Infinity", negativeInfinity: "-Infinity", nan: "NaN")
            return try String(data: encoder.encode(self), encoding: .utf8)!
        } catch {
            let noQuotes = errorString.replacingOccurrences(of: "\"", with: "'")
            return "{\"error\":\"\(noQuotes)\"}"
        }
    }
}

public extension Data {
    func decoded<T: Decodable>() throws -> T {
        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .iso8601
        decoder.nonConformingFloatDecodingStrategy = .convertFromString(positiveInfinity: "+Infinity", negativeInfinity: "-Infinity", nan: "NaN")
        return try decoder.decode(T.self, from: self)
    }
}

public extension String {
    func decoded<T: Decodable>() throws -> T {
        guard let jsonData = self.data(using: .utf8) else {
            throw RuntimeError("Unable to convert json String to Data")
        }
        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .iso8601
        decoder.nonConformingFloatDecodingStrategy = .convertFromString(positiveInfinity: "+Infinity", negativeInfinity: "-Infinity", nan: "NaN")
        return try decoder.decode(T.self, from: jsonData)
    }
    
    func decodedError(_ t: Decodable.Type) -> String? {
        do {
            guard let jsonData = self.data(using: .utf8) else {
                throw RuntimeError("Unable to convert json String to Data")
            }
            let decoder = JSONDecoder()
            decoder.dateDecodingStrategy = .iso8601
            decoder.nonConformingFloatDecodingStrategy = .convertFromString(positiveInfinity: "+Infinity", negativeInfinity: "-Infinity", nan: "NaN")
            let _ = try decoder.decode(t, from: jsonData)
        } catch {
            return "\(error)"
        }
        return nil
    }
}

public func jsonSerialization(any: Any, pretty: Bool = false) throws -> String? {
    let options: JSONSerialization.WritingOptions = pretty ? [.prettyPrinted] : []
    let jsonData = try JSONSerialization.data(withJSONObject: any, options: options)
    return String(data: jsonData, encoding: String.Encoding.utf8)
}

public extension Dictionary {
    func jsonSerialization(pretty: Bool = false) throws -> String? {
        let options: JSONSerialization.WritingOptions = pretty ? [.prettyPrinted] : []
        let jsonData = try JSONSerialization.data(withJSONObject: self, options: options)
        return String(data: jsonData, encoding: String.Encoding.utf8)
    }
}

public extension Array {
    func jsonSerialization(pretty: Bool = false) throws -> String? {
        let options: JSONSerialization.WritingOptions = pretty ? [.prettyPrinted] : []
        let jsonData = try JSONSerialization.data(withJSONObject: self, options: options)
        return String(data: jsonData, encoding: String.Encoding.utf8)
    }
}

public extension Data {
    func jsonObject() -> Any? {
        return try? JSONSerialization.jsonObject(with: self, options: [])
    }
}

public extension String {
    func jsonObject() -> Any? {
        guard let data = self.data(using: .utf8) else { return nil }
        return try? JSONSerialization.jsonObject(with: data, options: [])
    }
}
