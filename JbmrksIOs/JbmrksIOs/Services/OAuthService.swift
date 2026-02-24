//
//  OAuthService.swift
//  JbmrksIOs
//
//  Native Swift OAuth service for Bitrix24 authentication
//

import Foundation
import AuthenticationServices

struct TokenResponse: Codable {
    let access_token: String
    let refresh_token: String
    let expires_in: Int
    let token_type: String  // Default to "Bearer" if missing (handled in custom decoder)
    
    // Custom decoder to handle missing token_type (default to "Bearer" like Android)
    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        access_token = try container.decode(String.self, forKey: .access_token)
        refresh_token = try container.decode(String.self, forKey: .refresh_token)
        expires_in = try container.decode(Int.self, forKey: .expires_in)
        // Railway response doesn't include token_type, default to "Bearer" like Android
        token_type = try container.decodeIfPresent(String.self, forKey: .token_type) ?? "Bearer"
    }
    
    enum CodingKeys: String, CodingKey {
        case access_token
        case refresh_token
        case expires_in
        case token_type
    }
}

// Request body for server-side token exchange
struct TokenExchangeRequest: Codable {
    let oauth_code: String
    let domain: String
    let member_id: String?
}

// Error response from server-side token exchange
struct TokenExchangeErrorResponse: Codable {
    let error: String?
    let message: String?
    let details: [String: Bool]?
}

enum OAuthError: Error {
    case invalidURL
    case tokenExchangeFailed(String)
    case noRefreshToken
    case networkError(Error)
    case decodingError(Error)
}

class OAuthService {
    private let tokenStorage: TokenStorage
    private let httpClient: URLSession
    
    init(tokenStorage: TokenStorage, httpClient: URLSession = .shared) {
        self.tokenStorage = tokenStorage
        self.httpClient = httpClient
    }
    
    /**
     * Build authorization URL for OAuth flow
     */
    func buildAuthorizationUrl(portalUrl: String) -> String {
        return OAuthConfig.buildAuthorizationUrl(portalUrl: portalUrl)
    }
    
    /**
     * Exchange authorization code for tokens
     * Matches Android's exchangeCodeForTokens exactly
     */
    func exchangeCodeForTokens(
        portalUrl: String,
        code: String,
        domain: String? = nil,
        memberId: String? = nil
    ) async throws -> TokenResponse {
        let redirectUri = OAuthConfig.redirectUriHTTPS
        
        // Match Android logging exactly
        print("=== Token Exchange Request ===")
        print("Portal URL: \(portalUrl)")
        print("Client ID: \(OAuthConfig.clientId)")
        print("Redirect URI: \(redirectUri)")
        print("Domain: \(domain ?? "not provided")")
        print("Member ID: \(memberId ?? "not provided")")
        print("Code (first 20 chars): \(String(code.prefix(20)))...")
        
        // Match Android: local.* client IDs are on-prem/Box - use server-side proxy
        if OAuthConfig.clientId.hasPrefix("local.") {
            print("Detected local.* client ID - using Azure Function proxy (on-prem/Box)")
            return try await exchangeCodeViaServerProxy(portalUrl: portalUrl, code: code, domain: domain)
        }
        
        // For cloud apps (app.*), try oauth.bitrix.info first
        print("Cloud app detected - trying: \(OAuthConfig.bitrixOAuthTokenServer)")
        // TODO: Implement cloud app flow if needed
        throw OAuthError.tokenExchangeFailed("Cloud app flow not implemented yet")
    }
    
    /**
     * Exchange code via server-side proxy (Railway/BFF API)
     * Matches Android's tryAzureFunction exactly
     */
    private func exchangeCodeViaServerProxy(
        portalUrl: String,
        code: String,
        domain: String?
    ) async throws -> TokenResponse {
        print("=== tryAzureFunction called ===")
        print("About to try Railway token exchange...")
        
        // Match Android: Extract domain exactly as Android does
        // Android: domain ?: portalUrl.substringAfter("://").substringBefore("/")
        let extractedDomain: String
        if let domain = domain, !domain.isEmpty {
            extractedDomain = domain
        } else {
            // Replicate Android's substringAfter("://").substringBefore("/") exactly
            var domainPart = portalUrl
            // substringAfter("://")
            if let protocolRange = domainPart.range(of: "://") {
                domainPart = String(domainPart[protocolRange.upperBound...])
            }
            // substringBefore("/")
            if let slashIndex = domainPart.firstIndex(of: "/") {
                domainPart = String(domainPart[..<slashIndex])
            }
            extractedDomain = domainPart.isEmpty ? portalUrl : domainPart
        }
        
        // Match Android: Try Railway (only method, no fallback)
        let result = try await tryRailwayTokenExchange(code: code, domain: extractedDomain, portalUrl: portalUrl)
        print("Railway result: success=true")
        return result
    }
    
    /**
     * Try Railway token exchange server
     * Matches Android's tryRailwayTokenExchange exactly
     */
    private func tryRailwayTokenExchange(
        code: String,
        domain: String,
        portalUrl: String
    ) async throws -> TokenResponse {
        // Match Android: Extract base URL from token exchange URL
        // Android: tokenExchangeUrl.substringBefore("/api/exchangetoken")
        let tokenExchangeUrl = OAuthConfig.tokenExchangeUrl
        let baseUrl: String
        if let range = tokenExchangeUrl.range(of: "/api/exchangetoken") {
            baseUrl = String(tokenExchangeUrl[..<range.lowerBound])
        } else {
            baseUrl = tokenExchangeUrl
        }
        
        // Normalize base URL (ensure it ends with /)
        let normalizedBaseUrl = baseUrl.hasSuffix("/") ? baseUrl : "\(baseUrl)/"
        
        // Build full URL (match Android Retrofit behavior)
        let fullUrl = "\(normalizedBaseUrl)api/exchangetoken"
        
        guard let url = URL(string: fullUrl) else {
            throw OAuthError.invalidURL
        }
        
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        // Match Android exactly: AzureTokenExchangeRequest(oauth_code, domain, member_id = "")
        let requestBody = TokenExchangeRequest(
            oauth_code: code,
            domain: domain,
            member_id: "" // Not required by Railway server, but must be non-null
        )
        
        let jsonData = try JSONEncoder().encode(requestBody)
        request.httpBody = jsonData
        
        // Match Android logging
        print("=== Railway Token Exchange ===")
        print("Token Exchange URL: \(tokenExchangeUrl)")
        print("Sending token exchange request to Railway")
        print("Request: oauth_code=\(String(code.prefix(20)))..., domain=\(domain)")
        
        do {
            let (data, response) = try await httpClient.data(for: request)
            
            guard let httpResponse = response as? HTTPURLResponse else {
                throw OAuthError.networkError(NSError(domain: "OAuthService", code: -1))
            }
            
            // Match Android: Check response.isSuccessful first, then check body
            let isSuccessful = (200...299).contains(httpResponse.statusCode)
            print("Response code: \(httpResponse.statusCode), Success: \(isSuccessful)")
            
            if isSuccessful {
                // Match Android: Check if body is null (empty data)
                guard !data.isEmpty else {
                    print("Token exchange failed: Empty response from Railway")
                    throw OAuthError.tokenExchangeFailed("Token exchange failed: Empty response from Railway")
                }
                
                // Decode JSON (match Android Gson lenient mode)
                // Note: Railway response uses snake_case keys, so we don't need keyDecodingStrategy
                let decoder = JSONDecoder()
                
                do {
                    let tokenResponse = try decoder.decode(TokenResponse.self, from: data)
                    
                    // Save tokens
                    tokenStorage.saveAccessToken(token: tokenResponse.access_token)
                    tokenStorage.saveRefreshToken(token: tokenResponse.refresh_token)
                    tokenStorage.saveTokenExpiry(expiresIn: tokenResponse.expires_in)
                    tokenStorage.savePortalUrl(url: portalUrl)
                    
                    print("Token exchange successful via Railway")
                    return tokenResponse
                } catch {
                    // Match Android: Log decoding error
                    let responseBody = String(data: data, encoding: .utf8) ?? "<binary data>"
                    print("Failed to decode Railway response: \(error)")
                    print("Response body: \(responseBody)")
                    throw OAuthError.decodingError(error)
                }
            } else {
                // Match Android: Read error body
                let errorBody: String
                if data.isEmpty {
                    errorBody = "No error body"
                } else {
                    errorBody = String(data: data, encoding: .utf8) ?? "Unknown error"
                }
                
                print("Railway token exchange failed: HTTP \(httpResponse.statusCode)")
                print("Error body: \(errorBody)")
                throw OAuthError.tokenExchangeFailed("Token exchange failed (\(httpResponse.statusCode)): \(errorBody)")
            }
        } catch let urlError as URLError {
            print("Exception during Railway token exchange: \(urlError.localizedDescription)")
            throw OAuthError.networkError(urlError)
        } catch {
            print("Exception during Railway token exchange: \(error.localizedDescription)")
            throw error
        }
    }
    
    /**
     * Try BFF API token exchange (fallback)
     */
    private func tryBffApiTokenExchange(
        code: String,
        domain: String,
        portalUrl: String
    ) async throws -> TokenResponse {
        guard let url = URL(string: OAuthConfig.bffApiTokenExchangeUrl) else {
            throw OAuthError.invalidURL
        }
        
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        // BFF API requires member_id, but we don't have it from the redirect
        // Try without it first (some servers accept it as optional)
        let requestBody = TokenExchangeRequest(
            oauth_code: code,
            domain: domain,
            member_id: ""
        )
        
        request.httpBody = try JSONEncoder().encode(requestBody)
        
        print("🔄 BFF API Token Exchange Request:")
        print("   URL: \(OAuthConfig.bffApiTokenExchangeUrl)")
        print("   Domain: \(domain)")
        print("   Code length: \(code.count)")
        
        let (data, response) = try await httpClient.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse else {
            throw OAuthError.networkError(NSError(domain: "OAuthService", code: -1))
        }
        
        // Log response details for debugging
        let contentType = httpResponse.value(forHTTPHeaderField: "Content-Type") ?? "unknown"
        let responseBody = String(data: data, encoding: .utf8) ?? "<binary data>"
        
        print("📥 BFF API Response:")
        print("   Status: \(httpResponse.statusCode)")
        print("   Content-Type: \(contentType)")
        print("   Body length: \(data.count) bytes")
        if data.count < 500 {
            print("   Body: \(responseBody)")
        } else {
            print("   Body (first 500 chars): \(String(responseBody.prefix(500)))")
        }
        
        guard (200...299).contains(httpResponse.statusCode) else {
            print("❌ BFF API token exchange failed:")
            print("   Status: \(httpResponse.statusCode)")
            print("   Response: \(responseBody)")
            throw OAuthError.tokenExchangeFailed("HTTP \(httpResponse.statusCode): \(responseBody)")
        }
        
        // Check if response is empty
        guard !data.isEmpty else {
            print("❌ BFF API returned empty response")
            throw OAuthError.tokenExchangeFailed("Empty response from BFF API")
        }
        
        // Try to decode JSON
        let decoder = JSONDecoder()
        decoder.keyDecodingStrategy = .convertFromSnakeCase
        
        do {
            let tokenResponse = try decoder.decode(TokenResponse.self, from: data)
            
            // Save tokens
            tokenStorage.saveAccessToken(token: tokenResponse.access_token)
            tokenStorage.saveRefreshToken(token: tokenResponse.refresh_token)
            tokenStorage.saveTokenExpiry(expiresIn: tokenResponse.expires_in)
            tokenStorage.savePortalUrl(url: portalUrl)
            
            print("✅ Token exchange successful via BFF API")
            return tokenResponse
        } catch let decodingError as DecodingError {
            // Try to decode as error response to get better error message
            if let errorResponse = try? decoder.decode(TokenExchangeErrorResponse.self, from: data) {
                let errorMsg = errorResponse.message ?? errorResponse.error ?? "Unknown error"
                print("❌ BFF API returned error response:")
                print("   Error: \(errorResponse.error ?? "unknown")")
                print("   Message: \(errorMsg)")
                throw OAuthError.tokenExchangeFailed("BFF API error: \(errorMsg)")
            }
            
            print("❌ Failed to decode BFF API response:")
            print("   Error: \(decodingError)")
            print("   Response body: \(responseBody)")
            throw OAuthError.decodingError(decodingError)
        }
    }
    
    /**
     * Exchange code directly with Bitrix24 (for cloud apps)
     */
    private func exchangeCodeDirectly(
        portalUrl: String,
        code: String,
        domain: String?
    ) async throws -> TokenResponse {
        let tokenUrl = OAuthConfig.getTokenEndpointUrl(portalUrl: portalUrl)
        
        guard let url = URL(string: tokenUrl) else {
            throw OAuthError.invalidURL
        }
        
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/x-www-form-urlencoded", forHTTPHeaderField: "Content-Type")
        
        // Build form-urlencoded body manually to ensure proper encoding
        let redirectUri = OAuthConfig.getRedirectUriForTokenExchange()
        let encodedRedirectUri = redirectUri.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? redirectUri
        
        let bodyString = [
            "grant_type=authorization_code",
            "client_id=\(OAuthConfig.clientId.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? OAuthConfig.clientId)",
            "client_secret=\(OAuthConfig.clientSecret.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? OAuthConfig.clientSecret)",
            "code=\(code.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? code)",
            "redirect_uri=\(encodedRedirectUri)"
        ].joined(separator: "&")
        
        request.httpBody = bodyString.data(using: .utf8)
        
        print("🔄 Direct Token Exchange Request:")
        print("   URL: \(tokenUrl)")
        print("   Client ID: \(OAuthConfig.clientId)")
        print("   Redirect URI: \(redirectUri)")
        
        let (data, response) = try await httpClient.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse else {
            throw OAuthError.networkError(NSError(domain: "OAuthService", code: -1))
        }
        
        guard (200...299).contains(httpResponse.statusCode) else {
            let errorMessage = String(data: data, encoding: .utf8) ?? "Unknown error"
            print("❌ Direct token exchange failed:")
            print("   Status: \(httpResponse.statusCode)")
            print("   Response: \(errorMessage)")
            throw OAuthError.tokenExchangeFailed("HTTP \(httpResponse.statusCode): \(errorMessage)")
        }
        
        let decoder = JSONDecoder()
        decoder.keyDecodingStrategy = .convertFromSnakeCase
        let tokenResponse = try decoder.decode(TokenResponse.self, from: data)
        
        // Save tokens
        tokenStorage.saveAccessToken(token: tokenResponse.access_token)
        tokenStorage.saveRefreshToken(token: tokenResponse.refresh_token)
        tokenStorage.saveTokenExpiry(expiresIn: tokenResponse.expires_in)
        
        if let domain = domain {
            tokenStorage.savePortalUrl(url: "https://\(domain)")
        } else {
            tokenStorage.savePortalUrl(url: portalUrl)
        }
        
        return tokenResponse
    }
    
    /**
     * Refresh access token using refresh token
     */
    func refreshToken(portalUrl: String) async throws -> TokenResponse {
        guard let refreshToken = tokenStorage.getRefreshToken(),
              !refreshToken.isEmpty else {
            throw OAuthError.noRefreshToken
        }
        
        let tokenUrl = OAuthConfig.getTokenEndpointUrl(portalUrl: portalUrl)
        
        guard let url = URL(string: tokenUrl) else {
            throw OAuthError.invalidURL
        }
        
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/x-www-form-urlencoded", forHTTPHeaderField: "Content-Type")
        
        var components = URLComponents()
        components.queryItems = [
            URLQueryItem(name: "grant_type", value: "refresh_token"),
            URLQueryItem(name: "client_id", value: OAuthConfig.clientId),
            URLQueryItem(name: "client_secret", value: OAuthConfig.clientSecret),
            URLQueryItem(name: "refresh_token", value: refreshToken)
        ]
        
        request.httpBody = components.query?.data(using: .utf8)
        
        do {
            let (data, response) = try await httpClient.data(for: request)
            
            guard let httpResponse = response as? HTTPURLResponse else {
                throw OAuthError.networkError(NSError(domain: "OAuthService", code: -1))
            }
            
            guard (200...299).contains(httpResponse.statusCode) else {
                let errorMessage = String(data: data, encoding: .utf8) ?? "Unknown error"
                throw OAuthError.tokenExchangeFailed("HTTP \(httpResponse.statusCode): \(errorMessage)")
            }
            
            let decoder = JSONDecoder()
            decoder.keyDecodingStrategy = .convertFromSnakeCase
            let tokenResponse = try decoder.decode(TokenResponse.self, from: data)
            
            // Save new tokens
            tokenStorage.saveAccessToken(token: tokenResponse.access_token)
            tokenStorage.saveRefreshToken(token: tokenResponse.refresh_token)
            tokenStorage.saveTokenExpiry(expiresIn: tokenResponse.expires_in)
            
            return tokenResponse
        } catch let error as DecodingError {
            throw OAuthError.decodingError(error)
        } catch let error as OAuthError {
            throw error
        } catch {
            throw OAuthError.networkError(error)
        }
    }
}
