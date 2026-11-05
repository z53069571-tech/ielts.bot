/* extra.js: Writing essay'ni AI baholashga ulaydi (Cloudflare Worker). index.html ga tegmaydi */
(function () {
  "use strict";
    const API_BASE = "https://ielts-api.z53069571.workers.dev";
      const API_ON = /^https:\/\//.test(API_BASE);

        const TYPE_UZ = { grammar: "Grammatika", vocab: "Lug'at", spelling: "Imlo", punct: "Tinish/bosh harf", cohesion: "Bog'lanish", task: "Mavzu" };
          const B = (t) => `<p style="margin:16px 0 6px;color:#fff;font-weight:700;font-size:15px;text-align:left">${t}</p>`;
            const bandColor = v => v >= 7 ? "var(--ok)" : v >= 6 ? "var(--saf)" : "var(--pink)";

              function render(d) {
                  const c = d.criteria || {}, cm = d.comments || {};
                      const crit = [["Task Response", "ta"], ["Coherence & Cohesion", "cc"], ["Lexical Resource", "lr"], ["Grammar", "gra"]];
                          let h = `<div style="text-align:left;color:#EDE9FF;font-size:14px;line-height:1.5">
                                <div style="text-align:center;margin-bottom:6px"><span style="color:var(--mute)">Taxminiy band</span><br>
                                      <b style="font-size:40px;color:${bandColor(d.band)}">${esc(d.band)}</b></div>`;
                                          h += crit.map(([name, k]) => `<div style="padding:8px 0;border-top:1px solid var(--line)">
                                                  <div style="display:flex;justify-content:space-between"><span style="color:#fff">${name}</span><b style="color:${bandColor(c[k])}">${esc(c[k])}</b></div>
                                                          ${cm[k] ? `<div style="color:var(--mute);font-size:13px;margin-top:2px">${esc(cm[k])}</div>` : ""}</div>`).join("");
                                                              if (d.notes && d.notes.length) h += `<div style="margin-top:8px;padding:8px 10px;border-radius:10px;background:rgba(255,211,63,.12);color:var(--saf);font-size:12.5px">Band cheklangan: ${esc(d.notes.join("; "))}</div>`;
                                                                  if (d.strengths && d.strengths.length) h += B("Kuchli tomonlar") + d.strengths.map(x => `<div style="margin:3px 0">✅ ${esc(x)}</div>`).join("");
                                                                      if (d.errors && d.errors.length) {
                                                                            h += B(`Xatolar (${d.errors.length})`) + d.errors.map(e => `<div style="margin:8px 0;padding:10px;border-radius:12px;background:rgba(255,255,255,.06)">
                                                                                    <span style="font-size:11px;color:var(--mute);text-transform:uppercase">${esc(TYPE_UZ[e.type] || e.type)}</span>
                                                                                            <div style="color:var(--pink);text-decoration:line-through">${esc(e.quote)}</div>
                                                                                                    <div style="color:var(--ok)">${esc(e.fix)}</div>
                                                                                                            <div style="color:var(--mute);font-size:13px">${esc(e.why)}</div></div>`).join("");
                                                                                                                } else h += B("Xatolar") + `<div>Aniq xato topilmadi.</div>`;
                                                                                                                    if (d.priorities && d.priorities.length) h += B("Nimalar ustida ishlash kerak") + d.priorities.map((p, i) => `<div style="margin:8px 0;padding:10px;border-radius:12px;background:rgba(124,92,255,.14)">
                                                                                                                            <b style="color:#fff">${i + 1}. ${esc(p.area)}</b>
                                                                                                                                    <div style="margin-top:2px">${esc(p.why)}</div>
                                                                                                                                            <div style="margin-top:4px;color:var(--turq)">Mashq: ${esc(p.practice)}</div></div>`).join("");
                                                                                                                                                if (d.next) h += B("Keyingi qadam") + `<div>${esc(d.next)}</div>`;
                                                                                                                                                    h += `<div style="margin-top:14px;color:var(--mute);font-size:12px">Bu sun'iy intellekt bahosi, rasmiy IELTS natijasi emas (taxminan ±0.5 band).</div></div>`;
                                                                                                                                                        return h;
                                                                                                                                                          }

                                                                                                                                                            async function evalEssay(task, text) {
                                                                                                                                                                const el = document.getElementById("aiRes"); if (!el) return;
                                                                                                                                                                    const c0 = new AbortController(), t = setTimeout(() => c0.abort(), 85000);
                                                                                                                                                                        try {
                                                                                                                                                                              const r = await fetch(API_BASE + "/api/essay", { method: "POST", signal: c0.signal,
                                                                                                                                                                                      headers: { "Content-Type": "application/json", "X-Telegram-Init-Data": (typeof tg !== "undefined" && tg && tg.initData) || "" },
                                                                                                                                                                                              body: JSON.stringify({ task, text }) });
                                                                                                                                                                                                    if (!r.ok) { let j = {}; try { j = await r.json(); } catch (_) {} throw new Error("HTTP " + r.status + (j.error ? ": " + j.error : "")); }
                                                                                                                                                                                                          el.innerHTML = render(await r.json());
                                                                                                                                                                                                              } catch (e) {
                                                                                                                                                                                                                    el.textContent = "Baholash ishlamadi: " + (e.name === "AbortError" ? "vaqt tugadi" : e.message) + ". Keyinroq urinib ko'ring.";
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
                                                                                                                                                                                                                                                                          const p = [...document.querySelectorAll("#view .sub")].find(el => /band baholash keyingi/.test(el.textContent));
                                                                                                                                                                                                                                                                                if (p && API_ON) { p.id = "aiRes"; p.textContent = "Essay tekshirilmoqda, to'liq tahlil 20-60 soniya oladi..."; evalEssay(task, text); }
                                                                                                                                                                                                                                                                                    };
                                                                                                                                                                                                                                                                                      }
                                                                                                                                                                                                                                                                                        window.vWriting = newWriting;
                                                                                                                                                                                                                                                                                          VIEWS.writing = newWriting;
                                                                                                                                                                                                                                                                                          })();
