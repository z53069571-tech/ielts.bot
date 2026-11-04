/* extra.js: Writing essay'ni AI baholashga ulaydi (Cloudflare Worker). index.html ga tegmaydi */
(function () {
  "use strict";
    const API_BASE = "https://ielts-api.z53069571.workers.dev";   // <-- shu yerga Worker manzilini yozing: "https://ielts-api.NOM.workers.dev" (oxirida / bo'lmasin)
      const API_ON = /^https:\/\//.test(API_BASE);
        async function evalEssay(task, text) {
            const el = document.getElementById("aiRes"); if (!el) return;
                const c0 = new AbortController(), t = setTimeout(() => c0.abort(), 60000);
                    try {
                          const r = await fetch(API_BASE + "/api/essay", { method: "POST", signal: c0.signal,
                                  headers: { "Content-Type": "application/json", "X-Telegram-Init-Data": (typeof tg !== "undefined" && tg && tg.initData) || "" },
                                          body: JSON.stringify({ task, text }) });
                                                if (!r.ok) throw new Error("HTTP " + r.status);
                                                      const d = await r.json(), c = d.criteria || {};
                                                            const row = (k, v) => v == null ? "" : `<div style="display:flex;justify-content:space-between;padding:4px 0"><span>${k}</span><b>${esc(v)}</b></div>`;
                                                                  el.innerHTML = `<p style="color:#fff;font-size:18px;margin-bottom:8px">Taxminiy band: <b style="color:var(--saf)">${esc(d.band)}</b></p>
                                                                          ${row("Task Response", c.ta)}${row("Coherence & Cohesion", c.cc)}${row("Lexical Resource", c.lr)}${row("Grammar", c.gra)}
                                                                                  ${d.feedback ? `<p style="margin-top:10px;color:#fff;text-align:left;white-space:pre-wrap">${esc(d.feedback)}</p>` : ""}`;
                                                                                      } catch (e) {
                                                                                            el.textContent = "Baholash hozir ishlamayapti (botni Telegram ichida oching). Keyinroq urinib ko'ring.";
                                                                                                } finally { clearTimeout(t); }
                                                                                                  }

                                                                                                    const origWriting = window.vWriting;
                                                                                                      function newWriting() {
                                                                                                          origWriting();
                                                                                                              const btn = document.getElementById("send");
                                                                                                                  if (!btn || !btn.onclick) return;
                                                                                                                      const origSend = btn.onclick;
                                                                                                                          btn.onclick = function () {
                                                                                                                                const ta = document.getElementById("essay"), tk = document.getElementById("tk");
                                                                                                                                      const text = ta ? ta.value : "", task = tk ? tk.textContent : "";
                                                                                                                                            origSend.apply(this, arguments);
                                                                                                                                                  const p = [...document.querySelectorAll("#view p.sub")].find(el => /band baholash keyingi/.test(el.textContent));
                                                                                                                                                        if (p && API_ON) { p.id = "aiRes"; p.textContent = "Essay tekshirilmoqda (bir necha soniya)..."; evalEssay(task, text); }
                                                                                                                                                            };
                                                                                                                                                              }
                                                                                                                                                                window.vWriting = newWriting;
                                                                                                                                                                  VIEWS.writing = newWriting;
                                                                                                                                                                  })();