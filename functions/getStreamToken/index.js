const admin = require('firebase-admin');
const functions = require('firebase-functions');

admin.initializeApp();

/**
 * Callable function to fetch a short-lived signed stream URL for an authenticated user.
 * Replace `getSignedUrlForStream` with your streaming provider integration.
 * This example returns a placeholder URL for demonstration.
 */
exports.getStreamToken = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const uid = context.auth.uid;
  const streamRef = data.streamRef; // e.g. "streams/movie_abc123"

  // TODO: validate streamRef exists & user permissions (subscription, entitlements)

  // Replace this block with real signed URL generation using your streaming infra
  const now = Date.now();
  const expiresAt = now + 60 * 1000; // valid for 60s
  const signedUrl = `https://example-streaming.example.com/${encodeURIComponent(streamRef)}?token=MOCKED_SIGNED_TOKEN&exp=${expiresAt}`;

  return { url: signedUrl, expiresAt };
});
