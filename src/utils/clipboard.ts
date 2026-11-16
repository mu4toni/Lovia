/**
 * Cross-platform clipboard helper.
 * Supports modern Clipboard API in secure contexts (HTTPS/localhost)
 * and fallback execCommand for HTTP (e.g. 192.168.x.x local mobile testing), iOS Safari and Telegram WebApp.
 */
export async function copyTextToClipboard(text: string): Promise<boolean> {
  if (!text) return false;

  // 1. Modern Clipboard API when in a secure context (HTTPS / localhost)
  if (
    typeof window !== 'undefined' &&
    window.isSecureContext &&
    typeof navigator !== 'undefined' &&
    navigator.clipboard?.writeText
  ) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fallback below if writeText was rejected (e.g. lack of user activation or iframe sandbox)
    }
  }

  // 2. Battle-tested fallback for HTTP contexts (e.g. 192.168.x.x on phone), iOS Safari, and Telegram WebView
  if (typeof document === 'undefined') return false;

  try {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.top = '0';
    textarea.style.left = '0';
    textarea.style.width = '2em';
    textarea.style.height = '2em';
    textarea.style.padding = '0';
    textarea.style.border = 'none';
    textarea.style.outline = 'none';
    textarea.style.boxShadow = 'none';
    textarea.style.background = 'transparent';
    textarea.style.opacity = '0';
    textarea.style.fontSize = '16px'; // Prevents iOS Safari auto-zooming on focus
    textarea.style.pointerEvents = 'none';

    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    textarea.setSelectionRange(0, text.length);

    const success = document.execCommand('copy');
    document.body.removeChild(textarea);
    return success;
  } catch {
    return false;
  }
}
