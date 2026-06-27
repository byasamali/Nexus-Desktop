const { ipcRenderer } = require('electron');

// ── Page Context script to inject ────────────────────────────────────────────
const injectScript = () => {
  try {
    console.log("[Nexus Injected] Initializing network and DOM interceptors...");

    const safeGetResponseText = (xhr) => {
      try {
        if (!xhr.responseType || xhr.responseType === 'text') {
          return xhr.responseText || '';
        }
        if (xhr.responseType === 'json' && xhr.response) {
          return typeof xhr.response === 'string' ? xhr.response : JSON.stringify(xhr.response);
        }
        return '[Unsupported ResponseType: ' + xhr.responseType + ']';
      } catch (e) {
        return '[Error reading responseText: ' + e.message + ']';
      }
    };

    // 1. Intercept XMLHttpRequest
    const XHR = XMLHttpRequest.prototype;
    const open = XHR.open;
    const send = XHR.send;

    XHR.open = function(method, url) {
      this._url = url;
      this._method = method;
      this._requestHeaders = [];
      return open.apply(this, arguments);
    };

    const setRequestHeader = XHR.setRequestHeader;
    XHR.setRequestHeader = function(header, value) {
      try {
        if (!this._requestHeaders) this._requestHeaders = [];
        this._requestHeaders.push({ name: header, value: value });
        if (header && typeof header === 'string' && value && typeof value === 'string') {
          const lowerHdr = header.toLowerCase();
          if (lowerHdr === 'token' || lowerHdr === 'authorization') {
            const tok = value.replace(/^Bearer\s+/i, '').trim();
            if (tok.length > 10) {
              window.__gekToken = tok;
              window.postMessage({ source: 'nexus-interceptor', type: 'gek-token', token: tok }, '*');
            }
          }
        }
      } catch (e) {}
      return setRequestHeader.apply(this, arguments);
    };

    XHR.send = function(body) {
      this._requestBody = body;
      this.addEventListener('load', function() {
        try {
          if (!this._url) return;

          // GEK network traffic tracking
          const isGek = (location.hostname && location.hostname.includes('gek')) || (this._url && this._url.includes('gek'));
          if (isGek) {
            try {
              let bodyStr = '';
              if (this._requestBody) {
                if (typeof this._requestBody === 'string') {
                  bodyStr = this._requestBody;
                } else {
                  bodyStr = '[Binary Data / Object]';
                }
              }
              window.postMessage({
                source: 'nexus-interceptor',
                type: 'gek-network-traffic',
                url: this._url,
                method: this._method || 'POST',
                headers: this._requestHeaders || [],
                requestBody: bodyStr,
                status: this.status,
                response: safeGetResponseText(this).slice(0, 5000)
              }, '*');
            } catch (e) {}
          }

          // Selçuk/AS Ecza — ürün verisi
          if (this._url.includes("IlacGetir-ajax.aspx") || this._url.includes("hizlisiparis-ajax.aspx")) {
            const res = JSON.parse(safeGetResponseText(this));
            window.postMessage({ source: 'nexus-interceptor', type: 'ajax', url: this._url, data: res }, '*');
          }

          // GEK/BEK/İskoop — token endpoint
          if (this._url.includes("/MainService/api/rfc/gt") || this._url.includes("/MainService/api/rfc/al")) {
            try {
              const body = safeGetResponseText(this);
              let token = null;
              try { const j = JSON.parse(body); token = j.token || j.Token || j.TOKEN || j.accessToken || j.access_token || j.data?.token; } catch { token = body.trim(); }
              if (token && typeof token === 'string' && token.length > 10) {
                window.__gekToken = token;
                window.postMessage({ source: 'nexus-interceptor', type: 'gek-token', token }, '*');
              }
            } catch {}
          }

          // GEK — herhangi bir başarılı API yanıtından token header'a bak
          if (this._url.includes('esube.gek.org.tr') || this._url.includes('gek.org.tr')) {
            try {
              // Response header'lardan token oku
              const hdrToken = this.getResponseHeader('token') || this.getResponseHeader('Token') || this.getResponseHeader('authorization') || this.getResponseHeader('Authorization');
              if (hdrToken && hdrToken.length > 10 && !window.__gekToken) {
                const tok = hdrToken.replace(/^Bearer\s+/i, '').trim();
                window.__gekToken = tok;
                window.postMessage({ source: 'nexus-interceptor', type: 'gek-token', token: tok }, '*');
              }
            } catch {}
          }

          // GEK — ürün arama ve detay yanıtları
          if (this._url.includes("/MainService/api/rfc/mat/")) {
            try {
              const res = JSON.parse(safeGetResponseText(this));
              window.postMessage({ source: 'nexus-interceptor', type: 'gek-data', url: this._url, data: res }, '*');
            } catch {}
          }
        } catch (e) {}
      });
      return send.apply(this, arguments);
    };

    // 2. Intercept fetch
    if (window.fetch) {
      const originalFetch = window.fetch;
      window.fetch = async function(...args) {
        const response = await originalFetch.apply(this, args);
        try {
          const url = args[0] && typeof args[0] === 'string' ? args[0] : (args[0] && args[0].url ? args[0].url : '');
          
          // Intercept response body for token if it's gt or al
          if (url.includes("/MainService/api/rfc/gt") || url.includes("/MainService/api/rfc/al")) {
            try {
              const clone = response.clone();
              const body = await clone.text();
              let token = null;
              try { const j = JSON.parse(body); token = j.token || j.Token || j.TOKEN || j.accessToken || j.access_token || j.data?.token; } catch { token = body.trim(); }
              if (token && typeof token === 'string' && token.length > 10) {
                window.__gekToken = token;
                window.postMessage({ source: 'nexus-interceptor', type: 'gek-token', token }, '*');
              }
            } catch {}
          }

          // Intercept request headers for token
          let reqToken = null;
          const options = args[1] || {};
          const reqObj = args[0];
          let reqHeaders = [];
          if (options && options.headers) {
            if (options.headers instanceof Headers) {
              options.headers.forEach((v, k) => {
                reqHeaders.push({ name: k, value: v });
                if (k.toLowerCase() === 'token' || k.toLowerCase() === 'authorization') reqToken = v;
              });
            } else if (typeof options.headers === 'object') {
              for (const [k, v] of Object.entries(options.headers)) {
                reqHeaders.push({ name: k, value: String(v) });
                if (k.toLowerCase() === 'token' || k.toLowerCase() === 'authorization') reqToken = String(v);
              }
            }
          }
          if (!reqToken && reqObj && typeof reqObj === 'object' && reqObj.headers) {
            if (reqObj.headers instanceof Headers) {
              reqObj.headers.forEach((v, k) => {
                reqHeaders.push({ name: k, value: v });
                if (k.toLowerCase() === 'token' || k.toLowerCase() === 'authorization') reqToken = v;
              });
            } else if (typeof reqObj.headers === 'object') {
              for (const [k, v] of Object.entries(reqObj.headers)) {
                reqHeaders.push({ name: k, value: String(v) });
                if (k.toLowerCase() === 'token' || k.toLowerCase() === 'authorization') reqToken = String(v);
              }
            }
          }
          if (reqToken && typeof reqToken === 'string' && reqToken.length > 10) {
            const tok = reqToken.replace(/^Bearer\s+/i, '').trim();
            if (tok !== window.__gekToken) {
              window.__gekToken = tok;
              window.postMessage({ source: 'nexus-interceptor', type: 'gek-token', token: tok }, '*');
            }
          }

          // GEK network traffic tracking
          const isGek = (location.hostname && location.hostname.includes('gek')) || (url && url.includes('gek'));
          if (isGek) {
            try {
              let bodyStr = '';
              if (options.body) {
                if (typeof options.body === 'string') {
                  bodyStr = options.body;
                } else {
                  bodyStr = '[Binary Data / Object]';
                }
              }
              const clone = response.clone();
              clone.text().then(resText => {
                window.postMessage({
                  source: 'nexus-interceptor',
                  type: 'gek-network-traffic',
                  url,
                  method: options.method || 'GET',
                  headers: reqHeaders,
                  requestBody: bodyStr,
                  status: response.status,
                  response: resText ? resText.slice(0, 5000) : ''
                }, '*');
              }).catch(() => {});
            } catch (e) {}
          }

          // Selçuk/AS Ecza — ürün verisi
          if (url && (url.includes("IlacGetir-ajax.aspx") || url.includes("hizlisiparis-ajax.aspx"))) {
            const clone = response.clone();
            clone.json().then(res => {
              window.postMessage({ source: 'nexus-interceptor', type: 'ajax', url, data: res }, '*');
            }).catch(() => {});
          }

          // GEK/BEK/İskoop — token endpoint
          if (url && (url.includes("/MainService/api/rfc/gt") || url.includes("/MainService/api/rfc/al"))) {
            const clone = response.clone();
            clone.json().then(j => {
              const token = (j && (j.token || j.Token || j.TOKEN || j.accessToken || j.access_token || j.data?.token)) || (typeof j === 'string' ? j.trim() : null);
              if (token && typeof token === 'string' && token.length > 10) {
                window.__gekToken = token;
                window.postMessage({ source: 'nexus-interceptor', type: 'gek-token', token }, '*');
              }
            }).catch(() => {});
          }

          // GEK — herhangi bir başarılı API yanıtından response header token'a bak
          if (url && (url.includes('esube.gek.org.tr') || url.includes('gek.org.tr'))) {
            try {
              const hdrToken = response.headers.get('token') || response.headers.get('Token') || response.headers.get('authorization') || response.headers.get('Authorization');
              if (hdrToken && hdrToken.length > 10 && !window.__gekToken) {
                const tok = hdrToken.replace(/^Bearer\s+/i, '').trim();
                window.__gekToken = tok;
                window.postMessage({ source: 'nexus-interceptor', type: 'gek-token', token: tok }, '*');
              }
            } catch {}
          }

          // GEK — ürün arama ve detay yanıtları
          if (url && url.includes("/MainService/api/rfc/mat/")) {
            const clone = response.clone();
            clone.json().then(res => {
              window.postMessage({ source: 'nexus-interceptor', type: 'gek-data', url, data: res }, '*');
            }).catch(() => {});
          }
        } catch (e) {}
        return response;
      };
    }

    // 3. DOM tarama (barkod satırları)
    const scanDOM = () => {
      try {
        const rows = document.querySelectorAll('tr, .product-row, .urun-row, .siparisRow');
        rows.forEach(row => {
          const text = row.innerText || '';
          const match = text.match(/\b(86\d{11})\b/);
          if (match) {
            const barcode = match[1];
            const cacheKey = `scanned_${barcode}`;
            const now = Date.now();
            if (row.dataset[cacheKey] && (now - parseInt(row.dataset[cacheKey])) < 8000) return;
            row.dataset[cacheKey] = String(now);
            const elements = Array.from(row.querySelectorAll('td, span, div'));
            const cells = elements.map(c => c.innerText.trim()).filter(c => c.length > 0 && c.length < 150);
            const uniqueCells = [];
            cells.forEach(c => {
              if (!uniqueCells.includes(c) && !uniqueCells.some(existing => existing.includes(c) && existing !== c)) {
                uniqueCells.push(c);
              }
            });
            window.postMessage({ source: 'nexus-interceptor', type: 'dom-row-scraped', barcode, rowText: text, cells: uniqueCells.slice(0, 15) }, '*');
          }
        });
      } catch (e) {}
    };

    setInterval(scanDOM, 1500);
    console.log("[Nexus Injected] XMLHttpRequest, fetch and DOM scanner successfully initialized.");
  } catch (err) {
    console.error("[Nexus Injected] Error setting up interceptors:", err);
  }
};

// Convert function to self-invoking string and inject into the document DOM
(function() {
  try {
    // Set up postMessage listener in preload context
    window.addEventListener('message', (event) => {
      if (event.data && event.data.source === 'nexus-interceptor') {
        const { url, data, type, barcode, rowText, cells, token, method, headers, requestBody, status, response } = event.data;
        console.log("[Nexus Preload] Forwarding intercepted event:", type, url || barcode || '');

        const href = location.href || '';
        const supplier = href.includes("selcuk") ? "selcuk"
                       : href.includes("asecza") ? "as"
                       : href.includes("nevzat") ? "nevzat"
                       : href.includes("gek")    ? "gek"
                       : href.includes("bek")    ? "bek"
                       : href.includes("iskoop") ? "iskoop"
                       : "unknown";

        ipcRenderer.sendToHost('depo-data-intercept', {
          supplier,
          type: type || 'ajax',
          url: url || '',
          detailData: data || null,
          barcode: barcode || '',
          rowText: rowText || '',
          cells: cells || [],
          token: token || null,
          method: method || '',
          headers: headers || null,
          requestBody: requestBody || null,
          status: status || 0,
          response: response || null,
        });
      }
    });

    // Injected script execution in main world
    const script = document.createElement('script');
    script.textContent = `(${injectScript.toString()})();`;
    (document.head || document.documentElement).appendChild(script);
    script.remove(); // Clean up script tag from DOM

    console.log("[Nexus Preload] Successfully injected network and DOM hook into page context.");
  } catch (e) {
    console.error("[Nexus Preload] Failed to inject hooks:", e);
  }
})();
