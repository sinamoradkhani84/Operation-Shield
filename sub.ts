Deno.serve(async (request) => {
  const url = new URL(request.url);

  // آدرس پنل یا بک‌اند خود را از طریق متغیر محیطی BACKEND_URL تنظیم کنید
  const BACKEND_URL = Deno.env.get("BACKEND_URL") || "https://your-panel-domain.com";
  const backendUrlObj = new URL(BACKEND_URL);

  if (!url.pathname.startsWith("/sub/")) {
    return new Response("Bitzy VPN", {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  const target = BACKEND_URL + url.pathname + url.search;

  try {
    const ua = request.headers.get("user-agent") || "";
    const accept = request.headers.get("accept") || "";
    
    // تشخیص درخواست مرورگر
    const isBrowser =
      accept.includes("text/html") &&
      !ua.includes("Clash") &&
      !ua.includes("Sing-box") &&
      !ua.includes("v2ray") &&
      !ua.includes("Shadowrocket") &&
      !ua.includes("nekobox") &&
      !ua.includes("Hiddify");

    // تنظیم هدر برای ارتباط با پنل (اجبار پنل به ارسال اطلاعات ترافیک برای مرورگر)
    const fetchHeaders = new Headers();
    fetchHeaders.set("Host", backendUrlObj.host);
    fetchHeaders.set("User-Agent", isBrowser ? "Clash" : ua);

    const response = await fetch(target, {
      method: request.method,
      headers: fetchHeaders,
      body: ["GET", "HEAD"].includes(request.method)
        ? undefined
        : request.body,
    });

    if (isBrowser && request.method !== "HEAD") {
      const info = response.headers.get("subscription-userinfo") || "";
      console.log("Subscription-Userinfo:", info || "HEADER MISSING");

      const getValue = (key) => {
        const match = info.match(
          new RegExp("(?:^|[;,\\s])" + key + "\\s*=\\s*(\\d+)", "i")
        );
        return match ? Number(match[1]) : null;
      };

      const upload = getValue("upload");
      const download = getValue("download");
      const total = getValue("total");
      const expire = getValue("expire");

      const hasStats =
        upload !== null &&
        download !== null &&
        total !== null &&
        expire !== null;

      const used = hasStats ? upload + download : 0;
      const gb = (n) => (n / 1073741824).toFixed(2);
      const unlimited = hasStats && total === 0;
      const percent = !hasStats || unlimited
        ? 0
        : Math.min(100, used / total * 100);

      const expiry = !hasStats
        ? "Unavailable"
        : expire === 0
        ? "Never"
        : new Date(expire * 1000).toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
          });

      const uuid = url.pathname.split("/").pop();

      const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="theme-color" content="#070b14">
<title>Subscription Info | Bitzy VPN</title>
<style>
:root{color-scheme:dark;--bg:#070b14;--panel:#0d1525;--line:#1b3045;--cyan:#00f5ff;--green:#00ffa3;--muted:#8ca3bd}
*{box-sizing:border-box}
body{margin:0;background:radial-gradient(ellipse at 15% 0%,#102840 0,transparent 42%),var(--bg);color:#e8f7ff;font-family:Inter,Segoe UI,Arial,sans-serif;min-height:100vh}
header{border-bottom:1px solid var(--line);background:#080f1ddd;backdrop-filter:blur(12px)}
.nav{max-width:1050px;margin:auto;padding:22px 20px;display:flex;align-items:center;justify-content:space-between;gap:12px}
.brand{font-size:22px;font-weight:800;letter-spacing:1px;color:var(--cyan);text-shadow:0 0 18px #00f5ff55}
.tag{font-size:11px;letter-spacing:2px;color:var(--muted)}
main{max-width:1050px;margin:38px auto;padding:0 20px}
.heading{display:flex;align-items:center;justify-content:space-between;gap:15px;flex-wrap:wrap;margin-bottom:22px}
h1{font-size:clamp(25px,5vw,34px);margin:0;letter-spacing:-1px}
.subtitle{color:var(--muted);font-size:14px;margin-top:9px}
.status{font-size:12px;border:1px solid #00ffa355;color:var(--green);background:#00ffa30c;border-radius:30px;padding:9px 14px;white-space:nowrap}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,260px),1fr));gap:16px}
.card{position:relative;overflow:hidden;background:linear-gradient(145deg,#101b2d,#0a1220);border:1px solid var(--line);border-radius:17px;padding:23px;box-shadow:0 8px 30px #0002}
.card:before{content:"";position:absolute;top:0;left:22px;right:22px;height:1px;background:linear-gradient(90deg,transparent,var(--cyan),transparent);opacity:.65}
.label{font-size:12px;letter-spacing:1.4px;text-transform:uppercase;color:var(--muted)}
.value{font-size:27px;font-weight:750;margin-top:15px;overflow-wrap:anywhere}
.unit{font-size:13px;color:var(--muted);font-weight:400}
.note{font-size:12px;color:var(--muted);margin-top:10px;overflow-wrap:anywhere}
.cyan{color:var(--cyan);text-shadow:0 0 16px #00f5ff22}
.green{color:var(--green);text-shadow:0 0 16px #00ffa322}
.progress{height:7px;background:#1b2b40;border-radius:10px;margin-top:19px;overflow:hidden}
.fill{height:100%;width:${percent}%;background:linear-gradient(90deg,var(--cyan),var(--green));box-shadow:0 0 12px #00f5ff77}
.idvalue{font-size:15px;line-height:1.7}
footer{text-align:center;color:#617891;font-size:12px;padding:35px 15px;letter-spacing:.5px}
</style>
</head>
<body>
<header><div class="nav"><div><div class="brand">BITZY<span style="color:var(--green)"> VPN</span></div><div class="subtitle">Secure connection. No boundaries.</div></div><div class="tag">SUBSCRIPTION PORTAL</div></div></header>
<main>
<div class="heading"><div><h1>Subscription Info</h1><div class="subtitle">Your connection and traffic overview</div></div><div class="status">${response.ok ? "● SUBSCRIPTION ACTIVE" : "● UPSTREAM ERROR"}</div></div>
<div class="grid">
<section class="card"><div class="label">Subscription ID</div><div class="value idvalue cyan">${uuid}</div><div class="note">Your unique subscription identifier</div></section>
<section class="card"><div class="label">Total Traffic Used</div><div class="value cyan">${hasStats ? gb(used) : "Unavailable"} <span class="unit">${hasStats ? "GB" : ""}</span></div><div class="note">Combined upload and download</div></section>
<section class="card"><div class="label">Downloaded</div><div class="value">${hasStats ? gb(download) : "Unavailable"} <span class="unit">${hasStats ? "GB" : ""}</span></div><div class="note">Total inbound traffic</div></section>
<section class="card"><div class="label">Uploaded</div><div class="value">${hasStats ? gb(upload) : "Unavailable"} <span class="unit">${hasStats ? "GB" : ""}</span></div><div class="note">Total outbound traffic</div></section>
<section class="card"><div class="label">Traffic Limit</div><div class="value green">${!hasStats ? "Unavailable" / unlimited ? "UNLIMITED" : gb(total) + " GB"}</div><div class="progress"><div class="fill"></div></div><div class="note">${!hasStats ? "Usage information could not be retrieved" : unlimited ? "No traffic limit configured" : percent.toFixed(1) + "% of quota used"}</div></section>
<section class="card"><div class="label">Expiration Date</div><div class="value">${expiry}</div><div class="note">Subscription validity</div></section>
</div>
</main>
<footer>BITZY VPN &nbsp;·&nbsp; PRIVATE BY DESIGN &nbsp;·&nbsp; CONNECTION STATUS</footer>
</body>
</html>`;

      return new Response(html, {
        status: 200,
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Cache-Control": "no-store",
        },
      });
    }

    // برای کلاینت‌های VPN جهت به‌روزرسانی ساب
    const responseHeaders = new Headers(response.headers);
    responseHeaders.set("Cache-Control", "no-store");

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    });
  } catch (error) {
    return new Response(`Proxy Error: ${error?.message || error}`, {
      status: 502,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }
});
