"""Local-only compatibility fixture; never publishes or changes production headers."""
import http.server

# Exact existing AWS candidate Report-Only value, enforced only on this fixture.
POLICY = "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data: https:; media-src 'self' blob: https:; connect-src 'self' https: wss:; font-src 'self' data:; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self' https://account.stewaro.com; upgrade-insecure-requests"

class Handler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Content-Security-Policy', POLICY)
        super().end_headers()

http.server.ThreadingHTTPServer(('127.0.0.1', 8767), Handler).serve_forever()
