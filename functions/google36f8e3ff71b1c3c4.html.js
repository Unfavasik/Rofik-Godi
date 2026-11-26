const VERIFICATION_FILE_CONTENT = "google-site-verification: google36f8e3ff71b1c3c4.html\n";

export function onRequestGet() {
  return new Response(VERIFICATION_FILE_CONTENT, {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store, max-age=0",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
