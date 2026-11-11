/** Android intent:// URI that hands a stream to an installed video player (browser build only; the app uses the NativePlayer plugin). */
export function buildAndroidIntentUrl(streamUrl: string, title?: string, packageName?: string): string {
  try {
    const url = new URL(streamUrl);
    const scheme = url.protocol.replace(':', '');
    const rest = streamUrl.slice(scheme.length + 3);
    let intent = `intent://${rest}#Intent;scheme=${scheme};action=android.intent.action.VIEW;type=video/*`;
    if (packageName) {
      intent += `;package=${packageName}`;
    }
    if (title) {
      intent += `;S.title=${encodeURIComponent(title)}`;
    }
    intent += `;S.browser_fallback_url=${encodeURIComponent(streamUrl)};end`;
    return intent;
  } catch {
    return streamUrl;
  }
}
