export interface WelcomeTemplateArgs {
  firstName?: string | null;
  storeName: string;
  shopUrl: string;
  unsubscribeUrl: string;
  pixelUrl?: string;
}

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function safeUrl(url: string): string {
  try {
    const u = new URL(url);
    if (u.protocol === "http:" || u.protocol === "https:") return esc(url);
  } catch {
    /* fall through */
  }
  return "#";
}

export function welcomeMjml(args: WelcomeTemplateArgs): string {
  const greeting = args.firstName ? `Hi ${esc(args.firstName)},` : "Hi there,";
  const pixel = args.pixelUrl
    ? `<mj-raw><img src="${safeUrl(args.pixelUrl)}" width="1" height="1" alt="" style="display:none" /></mj-raw>`
    : "";

  return `
  <mjml>
    <mj-body background-color="#f4f4f5">
      <mj-section padding="24px">
        <mj-column>
          <mj-text font-size="22px" font-weight="bold">${esc(
            args.storeName,
          )}</mj-text>
        </mj-column>
      </mj-section>
      <mj-section background-color="#ffffff" padding="24px">
        <mj-column>
          <mj-text font-size="18px" font-weight="bold">Welcome! 👋</mj-text>
          <mj-text>${greeting}</mj-text>
          <mj-text>Thanks for joining ${esc(
            args.storeName,
          )}. We're glad you're here — take a look at what's new:</mj-text>
        </mj-column>
      </mj-section>
      <mj-section background-color="#ffffff" padding="24px">
        <mj-column>
          <mj-button href="${safeUrl(args.shopUrl)}" background-color="#111827">
            Start shopping
          </mj-button>
        </mj-column>
      </mj-section>
      <mj-section padding="16px">
        <mj-column>
          <mj-text font-size="11px" color="#999" align="center">
            You received this because you subscribed at ${esc(args.storeName)}.
            <a href="${safeUrl(args.unsubscribeUrl)}">Unsubscribe</a>.
          </mj-text>
        </mj-column>
      </mj-section>
      ${pixel}
    </mj-body>
  </mjml>`;
}
