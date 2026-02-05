# Runtime Stack Information

## For This OAuth Redirect App: **NONE REQUIRED**

Your OAuth redirect page is **pure static HTML with JavaScript**. You don't need any runtime stack because:

- ✅ No server-side code
- ✅ No build process needed
- ✅ Just HTML + JavaScript that runs in the browser
- ✅ Azure Static Web Apps serves it directly

## Azure Static Web App Configuration

When creating the Static Web App via Azure Portal, you'll see options for:
- **Build Presets**: Choose **"None"** or **"Custom"**
- **Runtime Stack**: Not applicable for static files

If using Azure CLI (as in our scripts), we use:
```powershell
az staticwebapp create --login-with-github false
```

This creates a static site without requiring a build process.

## Why No Runtime Stack?

Our `index.html` file:
1. Extracts query parameters from the URL (client-side JavaScript)
2. Redirects to the app's deep link (client-side JavaScript)
3. No server processing needed
4. No database needed
5. No API needed

It's just a simple redirect page that runs entirely in the user's browser!

## If You Later Need a Backend

If you ever want to add server-side functionality (like logging, validation, etc.), you can:
- Add **Azure Functions** to the same Static Web App (Serverless)
- Choose runtime: Node.js, Python, .NET, etc.
- But for now, you don't need this!

## Summary

**Runtime Stack: None**  
**Build Preset: None/Custom**  
**Type: Static HTML/JavaScript**

That's it! Simple and free! 🎉
