#!/usr/bin/env python3
"""Har kuni content.json ga yangi IELTS kontent qo'shadi (Gemini API, standart kutubxonalar bilan)."""
import json, os, random, re, sys, time, urllib.request, urllib.error, datetime

sys.stdout.reconfigure(line_buffering=True)   # loglar darhol ko'rinsin
DEADLINE = time.time() + 600                  # jami 10 daqiqadan keyin to'xtaydi

KEY = os.environ.get("GEMINI_API_KEY")
PATH = os.environ.get("CONTENT_PATH", "content.json")
KEEP = {"words": 200, "listening": 40, "reading": 40, "grammar": 40, "writing": 80}
TODAY = datetime.date.today()
STAMP = TODAY.strftime("%Y%m%d")
THEMES = ["education", "technology", "environment", "health", "travel", "work", "city life", "culture",
          "science", "food", "sport", "media", "housing", "transport", "history", "economy"]
GRAM = ["Present Perfect vs Past Simple", "Conditionals", "Passive voice", "Relative clauses", "Modal verbs",
        "Articles", "Prepositions", "Reported speech", "Comparatives and superlatives", "Gerund vs infinitive",
        "Subject-verb agreement", "Linking words"]
theme = THEMES[TODAY.toordinal() % len(THEMES)]
level = TODAY.toordinal() % 3 + 1  # 1 boshlang'ich, 2 o'rta, 3 yuqori

def list_models():
    """Kalitingizga ruxsat etilgan flash modellar, barqarorlari oldinda."""
    env = os.environ.get("GEMINI_MODEL")
    if env: return [env]
    try:
        req = urllib.request.Request("https://generativelanguage.googleapis.com/v1beta/models?pageSize=200",
                                     headers={"x-goog-api-key": KEY or ""})
        with urllib.request.urlopen(req, timeout=60) as r:
            ms = json.load(r).get("models", [])
        names = [x["name"].split("/")[-1] for x in ms if "generateContent" in x.get("supportedGenerationMethods", [])]
        bad = ("lite", "image", "tts", "live", "audio", "embed", "thinking", "exp", "latest", "vision", "robotics", "computer")
        good = [n for n in names if "flash" in n and not any(b in n for b in bad)]
        ver = lambda n: float((re.findall(r"\d+(?:\.\d+)?", n) or ["0"])[0])
        good.sort(key=lambda n: ("preview" not in n, ver(n)), reverse=True)   # avval barqaror modellar
        if good: return good[:3]
    except Exception as e:
        print("model ro'yxati olinmadi:", e)
    return ["gemini-2.5-flash"]

MODELS = list_models()
print("Modellar:", MODELS)

def ask(prompt):
    body = {"contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {"responseMimeType": "application/json", "temperature": 0.9}}
    last = None
    for model in MODELS:                      # band yoki yo'q model bo'lsa, keyingisiga o'tadi
        if time.time() > DEADLINE: raise RuntimeError("vaqt tugadi")
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
        for attempt in range(2):              # vaqtincha xatolarda bir marta qayta urinadi
            try:
                req = urllib.request.Request(url, json.dumps(body).encode(),
                                             {"Content-Type": "application/json", "x-goog-api-key": KEY})
                with urllib.request.urlopen(req, timeout=50) as r:
                    data = json.load(r)
                txt = data["candidates"][0]["content"]["parts"][0]["text"]
                return json.loads(re.sub(r"^```(?:json)?|```$", "", txt.strip(), flags=re.M).strip())
            except urllib.error.HTTPError as e:
                last = f"{model}: HTTP {e.code}"
                if e.code in (429, 500, 502, 503, 504) and attempt < 1:
                    time.sleep(10); continue
                break                          # 404/400 va h.k.: bu modelni tashlab, keyingisiga
            except (urllib.error.URLError, TimeoutError, ValueError, KeyError, IndexError) as e:
                last = f"{model}: {type(e).__name__}"
                if attempt < 1: time.sleep(5); continue
                break
    raise RuntimeError(last or "javob olinmadi")

def s(v): return isinstance(v, str) and v.strip() != ""

def fix_q(q):
    """Savolni tekshiradi; oddiy MCQ variantlarini aralashtiradi (AI javobni bir joyga qo'ymasligi uchun)."""
    if not (isinstance(q, dict) and s(q.get("q")) and s(q.get("exp")) and isinstance(q.get("ans"), int)): return None
    if q.get("type") == "tf":
        if q["ans"] not in (0, 1, 2): return None
        return {"q": q["q"], "opts": ["True", "False", "Not Given"], "ans": q["ans"], "exp": q["exp"]}
    o = q.get("opts")
    if not (isinstance(o, list) and len(o) == 4 and all(s(x) for x in o) and len(set(o)) == 4 and 0 <= q["ans"] < 4): return None
    right = o[q["ans"]]; random.shuffle(o)
    return {"q": q["q"], "opts": o, "ans": o.index(right), "exp": q["exp"]}

def fix_set(d, text_key, n, prefix, meta):
    if not (isinstance(d, dict) and s(d.get("title"))): return None
    if text_key and (not s(d.get(text_key)) or len(d[text_key].split()) < 60): return None
    items = [fix_q(q) for q in d.get("items", [])]
    if len(items) < n or any(i is None for i in items): return None
    out = {"id": f"{prefix}{STAMP}", "title": d["title"], "meta": meta.format(len(items)), "lv": level, "items": items}
    if text_key: out[text_key] = d[text_key]
    if d.get("en"): out["en"] = d["en"]
    return out

MCQ = '{"q":"...","opts":["a","b","c","d"],"ans":0,"exp":"1-2 sentence explanation in Uzbek"}'

def gen_words(db, existing):
    d = ask(f"Give 10 IELTS Band 6-7.5 academic vocabulary words about '{theme}'. Do NOT use: {sorted(existing)[:150]}. "
            'Return JSON: [{"w":"word","uz":"Uzbek translation","ex":"natural example sentence in English"}]')
    out = [x for x in d if isinstance(x, dict) and s(x.get("w")) and s(x.get("uz")) and s(x.get("ex")) and x["w"].lower() not in existing]
    db["words"] += [{"w": x["w"].lower(), "uz": x["uz"], "ex": x["ex"]} for x in out]

def gen_listening(db):
    d = ask(f"Create an IELTS-style Listening exercise (level {level}/3, topic: {theme}). 'script' is a 120-170 word English "
            f"dialogue or monologue to be read aloud (plain text, no speaker labels). Write 4 multiple-choice questions answerable "
            f"only from the script. 'title' in Uzbek. Return JSON: " + '{"title":"...","script":"...","items":[' + MCQ + ']}')
    x = fix_set(d, "script", 4, "lg", "Audio · {} ta savol")
    if x: db["listening"].append(x)

def gen_reading(db):
    d = ask(f"Create an IELTS Reading passage (level {level}/3, topic: {theme}), 180-230 words, plus exactly 4 questions: "
            f"3 True/False/Not Given and 1 multiple-choice. 'title' in Uzbek, 'en' English title. Explanations in Uzbek and must cite the text. "
            'Return JSON: {"title":"...","en":"...","text":"...","items":[{"type":"tf","q":"statement","ans":0,"exp":"..."},'
            '(ans: 0=True, 1=False, 2=Not Given, use each at least once) ,' + MCQ + ']}')
    x = fix_set(d, "text", 4, "rg", "True / False / Not Given · {} ta savol")
    if x: db["reading"].append(x)

def gen_grammar(db):
    topic = GRAM[TODAY.toordinal() % len(GRAM)]
    d = ask(f"Create 5 IELTS-level grammar multiple-choice questions on '{topic}' (level {level}/3), with a blank ___ in the sentence. "
            "'title' in Uzbek. Explanations in Uzbek. Return JSON: " + '{"title":"...","items":[' + MCQ + ']}')
    x = fix_set(d, None, 5, "gg", topic + " · {} ta savol")
    if x: db["grammar"].append(x)

def gen_writing(db):
    d = ask(f"Write 2 new IELTS Writing Task 2 questions about '{theme}', of different types (opinion, discussion, problem/solution). "
            'Return JSON: ["question 1","question 2"]')
    have = set(db["writing"])
    db["writing"] += [t for t in d if s(t) and t not in have]

def main():
    if not KEY: sys.exit("GEMINI_API_KEY topilmadi")
    db = json.load(open(PATH, encoding="utf8"))
    for k in KEEP: db.setdefault(k, [])
    existing = {w["w"].lower() for w in db["words"]}
    try: existing |= {m.lower() for m in re.findall(r'\{w:"([^"]+)"', open("index.html", encoding="utf8").read())}
    except OSError: pass
    before_total = sum(len(db[k]) for k in KEEP)
    jobs = [("words", lambda: gen_words(db, existing)), ("listening", lambda: gen_listening(db)),
            ("reading", lambda: gen_reading(db)), ("grammar", lambda: gen_grammar(db)), ("writing", lambda: gen_writing(db))]
    for name, fn in jobs:
        if name != "words" and name != "writing" and any(i.get("id", "").endswith(STAMP) for i in db[name]):
            print(name, "- bugun allaqachon bor"); continue
        try: before = len(db[name]); fn(); print(name, "+", len(db[name]) - before)
        except Exception as e: print(name, "xato:", e, flush=True)  # bitta bo'lim xato bersa, qolganlari davom etadi
    added = sum(len(db[k]) for k in KEEP) - before_total
    for k, n in KEEP.items(): db[k] = db[k][-n:]
    json.dump(db, open(PATH, "w", encoding="utf8"), ensure_ascii=False, indent=1)
    if added <= 0: sys.exit("Hech narsa yaratilmadi (Gemini javob bermadi)")

if __name__ == "__main__": main()
