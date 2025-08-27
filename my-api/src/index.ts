/**
 * NK2IT API Worker
 * 
 * Base Endpoints:
 * - GET /api - API info and available endpoints
 * 
 * Products:
 * - GET /api/products - List all products
 * - GET /api/products/:id - Get product details
 * - POST /api/products - Create product (admin)
 * - PUT /api/products/:id - Update product (admin)
 * 
 * Authentication:
 * - POST /api/auth/register - Register new user
 * - POST /api/auth/verify-email - Verify email address
 * - POST /api/auth/login - Login user
 * - POST /api/auth/reset-password - Request password reset
 * 
 * Payment:
 * - POST /api/payment/bpoint/create - Create BPoint payment session
 * - POST /api/payment/bpoint/verify - Verify BPoint payment
 * - GET /api/payment/history - Get payment history
 * 
 * Invoice:
 * - GET /api/invoices - List user invoices
 * - GET /api/invoices/:id - Get invoice details
 * - GET /api/invoices/:id/download - Download invoice PDF
 * - POST /api/invoices/generate - Generate new invoice
 */

const REGION = "Tamil Nadu";

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,HEAD,POST,PUT,DELETE,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type,Authorization",
  "Access-Control-Max-Age": "86400",
};

interface Env {
  ASSETS: { fetch: typeof fetch }
}

function jsonResponse(data: any, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
      ...extraHeaders,
    },
  });
}

export default {
  async fetch(req: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    // Handle CORS preflight
    if (req.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      const url = new URL(req.url);
      const pathname = url.pathname;

      // Health check
      if (pathname === "/health") {
        return jsonResponse({ 
          status: "ok", 
          timestamp: new Date().toISOString(),
          region: REGION
        });
      }

      // Base API endpoints
      if (pathname === "/api" || pathname === "/api/") {
        return jsonResponse({
          name: "NK2IT API",
          version: "1.0.0",
          timestamp: new Date().toISOString(),
          region: REGION,
          endpoints: {
            base: "/api",
            available: [
              "/api/hello",
              "/api/time",
              "/api/echo",
              "/api/info"
            ]
          }
        });
      }

      // API Routes
      if (pathname.startsWith("/api/")) {
        switch (pathname) {
          case "/api/hello":
            if (req.method === "GET") {
              return jsonResponse({
                message: "Hello from NK2IT API!",
                timestamp: new Date().toISOString(),
                region: REGION,
              });
            }
            break;

          case "/api/time":
            if (req.method === "GET") {
              const now = new Date();
              return jsonResponse({
                iso: now.toISOString(),
                utc: now.toUTCString(),
                timezone: "Asia/Kolkata",
                region: REGION
              });
            }
            break;

          case "/api/echo":
            if (req.method === "POST") {
              const body = await req.json().catch(() => ({}));
              return jsonResponse({
                received: body,
                headers: Object.fromEntries(req.headers),
                timestamp: new Date().toISOString(),
                region: REGION
              });
            }
            break;

          case "/api/info":
            if (req.method === "GET") {
              return jsonResponse({
                worker: {
                  version: "1.0.0",
                  name: "NK2IT API",
                  timestamp: new Date().toISOString(),
                  region: REGION
                },
                request: {
                  cf: req.cf,
                  url: req.url,
                  method: req.method,
                  headers: Object.fromEntries(req.headers),
                }
              });
            }
            break;
        }

        // API route not found or method not allowed
        return jsonResponse({ 
          error: "API endpoint not found or method not allowed",
          path: pathname,
          method: req.method,
          availableAt: "/api",
          region: REGION
        }, 404);
      }

      // Serve static files from /public
      try {
        const staticPath = pathname.replace(/^\//, "") || "index.html";
        const asset = await env.ASSETS.fetch(req);
        if (asset.status === 200) {
          const response = new Response(asset.body, asset);
          response.headers.set("Cache-Control", "public, max-age=14400");
          return response;
        }
      } catch (err) {
        console.debug("Static asset error:", err);
      }

      // Default 404 for non-API routes
      return jsonResponse({ 
        error: "Not Found",
        path: pathname,
        availableAt: "/api",
        region: REGION
      }, 404);

    } catch (err: any) {
      console.error("Worker error:", err);
      return jsonResponse({ 
        error: "Internal Server Error",
        message: err.message,
        region: REGION
      }, 500);
    }
  }
};
