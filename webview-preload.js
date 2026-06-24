const { ipcRenderer } = require('electron');

// ── Page Context script to inject ────────────────────────────────────────────
const injectScript = () => {
  try {
    console.log("[Nexus Injected] Initializing network and DOM interceptors...");

    // 1. Intercept XMLHttpRequest
    const XHR = XMLHttpRequest.prototype;
    const open = XHR.open;
    const send = XHR.send;

    XHR.open = function(method, url) {
      this._url = url;
      return open.apply(this, arguments);
    };

    XHR.send = function() {
      this.addEventListener('load', function() {
        try {
          if (this._url && (this._url.includes("IlacGetir-ajax.aspx") || this._url.includes("hizlisiparis-ajax.aspx"))) {
            const res = JSON.parse(this.responseText);
            window.postMessage({
              source: 'nexus-interceptor',
              type: 'ajax',
              url: this._url,
              data: res
            }, '*');
          }
        } catch (e) {
          // Ignore parsing errors
        }
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
          if (url && (url.includes("IlacGetir-ajax.aspx") || url.includes("hizlisiparis-ajax.aspx"))) {
            const clone = response.clone();
            clone.json().then(res => {
              window.postMessage({
                source: 'nexus-interceptor',
                type: 'ajax',
                url: url,
                data: res
              }, '*');
            }).catch(() => {});
          }
        } catch (e) {
          // Ignore errors
        }
        return response;
      };
    }

    // 3. Scan DOM for product tables/rows periodically (fallback for full page reloads)
    const scanDOM = () => {
      try {
        const rows = document.querySelectorAll('tr, .product-row, .urun-row, .siparisRow');
        rows.forEach(row => {
          const text = row.innerText || '';
          const match = text.match(/\b(86\d{11})\b/);
          if (match) {
            const barcode = match[1];
            const cacheKey = `scanned_${barcode}`;
            
            // Check cache to avoid duplicate processing in short time
            const now = Date.now();
            if (row.dataset[cacheKey] && (now - parseInt(row.dataset[cacheKey])) < 8000) return;
            row.dataset[cacheKey] = String(now);

            // Get clean list of cell texts
            const elements = Array.from(row.querySelectorAll('td, span, div'));
            const cells = elements
              .map(c => c.innerText.trim())
              .filter(c => c.length > 0 && c.length < 150);

            // Filter out parent container texts that duplicate child texts
            const uniqueCells = [];
            cells.forEach(c => {
              if (!uniqueCells.includes(c) && !uniqueCells.some(existing => existing.includes(c) && existing !== c)) {
                uniqueCells.push(c);
              }
            });

            window.postMessage({
              source: 'nexus-interceptor',
              type: 'dom-row-scraped',
              barcode: barcode,
              rowText: text,
              cells: uniqueCells.slice(0, 15)
            }, '*');
          }
        });
      } catch (e) {}
    };

    // Scan DOM every 1.5 seconds
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
        const { url, data, type, barcode, rowText, cells } = event.data;
        console.log("[Nexus Preload] Forwarding intercepted event:", type, url || barcode);
        
        ipcRenderer.sendToHost('depo-data-intercept', {
          supplier: location.href.includes("selcuk") ? "selcuk" : "as",
          type: type || 'ajax',
          url: url || '',
          detailData: data || null,
          barcode: barcode || '',
          rowText: rowText || '',
          cells: cells || []
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
