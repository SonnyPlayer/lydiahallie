#!/usr/bin/env python3
"""Serve Teilen with the manifest content type iOS and Android expect."""

import http.server
import mimetypes

mimetypes.add_type("application/manifest+json", ".webmanifest")


class Handler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-cache")
        super().end_headers()


if __name__ == "__main__":
    server = http.server.ThreadingHTTPServer(("0.0.0.0", 3000), Handler)
    server.serve_forever()
