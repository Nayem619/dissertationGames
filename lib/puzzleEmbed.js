/**
 * Injects dissertation boot config into Phaser puzzle HTML before WebView load.
 */

export function prependPuzzleBoot(html, boot) {
  const payload = JSON.stringify(boot ?? {});
  const inject = `<script>window.__NEXUS_PUZZLE__=JSON.parse(${JSON.stringify(payload)});<\/script>`;
  if (html.includes("<head>")) return html.replace("<head>", `<head>${inject}`);
  return inject + html;
}
