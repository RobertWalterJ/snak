"""Make a computer-voice clip for every word and example sentence that has no recording by a real person.

    python tools/gen_audio.py .          # run from the repo root; the voice goes in tools/models/

Voices (Piper, https://github.com/OHF-Voice/piper1-gpl; models from rhasspy/piper-voices on Hugging Face):
  Danish    da_DK-talesyntese-medium  one speaker, trained on a CC0 Språkbanken recording set
  Icelandic is_IS-salka-medium        one speaker, trained on Talromur (CC BY 4.0, Reykjavik University)
Clips are small OGG/Vorbis files named by a hash of the word, or by the Tatoeba sentence id. The app's
data/audio.json says which clips are by real people ("h") and which are computer voice ("p"). Files that
already exist are kept, so this can be stopped and run again.
"""
import hashlib, io, json, os, sys, time
import numpy as np
import soundfile as sf
from piper import PiperVoice

app = sys.argv[1]
HERE = os.path.dirname(os.path.abspath(__file__))
deck = json.load(open(os.path.join(app, "app", "data", "deck.json"), encoding="utf8"))
lang = deck["lang"]["id"]
MODELS = {
    "da": ("da_DK-talesyntese-medium", "Computer voice (Piper, Danish voice from a Språkbanken recording set, CC0)"),
    "is": ("is_IS-salka-medium", "Computer voice (Piper, Icelandic voice trained on Talrómur, CC BY 4.0)"),
}
model, label = MODELS[lang]
voice = PiperVoice.load(os.path.join(HERE, "models", model + ".onnx"))

MAN = os.path.join(app, "app", "data", "audio.json")
HUMAN = os.path.join(app, "app", "data", "audio-human.json")   # written by build/fetch-audio.mjs


def human():
    """Recordings by real people. They win over a computer voice, and are re-read on every save."""
    return json.load(open(HUMAN, encoding="utf8")) if os.path.exists(HUMAN) else {"w": {}, "s": {}}


prev = json.load(open(MAN, encoding="utf8")) if os.path.exists(MAN) else {}
man = {"w": {k: v for k, v in prev.get("w", {}).items() if v.get("k") == "p"},
       "s": {k: v for k, v in prev.get("s", {}).items() if v.get("k") == "p"}}


def save():
    hm = human()
    out = {"w": {**man["w"], **hm.get("w", {})}, "s": {**man["s"], **hm.get("s", {})}, "voice": {"p": label}}
    json.dump(out, open(MAN, "w", encoding="utf8"), ensure_ascii=False)
OUT = os.path.join(app, "app", "audio", "p")
os.makedirs(OUT, exist_ok=True)


def h(text):
    return hashlib.md5(text.lower().encode("utf8")).hexdigest()[:10]


def synth(text, path):
    chunks = list(voice.synthesize(text))
    audio = np.concatenate([c.audio_float_array for c in chunks]).astype("float32")
    sr = chunks[0].sample_rate
    # trim near-silence at both ends, keep a short pad, and bring every clip to the same peak level
    loud = np.where(np.abs(audio) > 0.01)[0]
    if len(loud):
        pad = int(sr * 0.08)
        audio = audio[max(0, loud[0] - pad): loud[-1] + pad]
    peak = float(np.max(np.abs(audio))) or 1.0
    audio = audio * (0.89 / peak)
    buf = io.BytesIO()
    sf.write(buf, audio, sr, format="OGG", subtype="VORBIS")
    with open(path, "wb") as f:
        f.write(buf.getvalue())


jobs = []
for w in deck["words"]:
    key = w["w"].lower()
    if key in human().get("w", {}):
        continue
    jobs.append(("w", key, w["w"], f"w-{h(w['w'])}.ogg"))
# the forms offered in the verb / case ladder (være: er, var, været; hestur: hest, hesti ...) are spoken too
queued = {j[1] for j in jobs if j[0] == "w"}
for it in deck["items"]:
    if it["k"] != "form":
        continue
    for t in it["options"]:
        key = t.lower()
        if key in queued or key in human().get("w", {}):
            continue
        queued.add(key)
        jobs.append(("w", key, t, f"w-{h(t)}.ogg"))
# the Danish / Icelandic words shown with each note (hygge, smørrebrød, Þorrablót ...)
for nt in deck.get("notes", []):
    for t in nt["terms"]:
        key = t.lower()
        if key in queued or key in human().get("w", {}):
            continue
        queued.add(key)
        jobs.append(("w", key, t, f"w-{h(t)}.ogg"))
for s in deck["sentences"]:
    key = str(s["id"])
    if key in human().get("s", {}):
        continue
    jobs.append(("s", key, s["t"], f"s-{s['id']}.ogg"))

# entries for words or sentences that are no longer in the deck are dropped
wanted = {"w": {j[1] for j in jobs if j[0] == "w"}, "s": {j[1] for j in jobs if j[0] == "s"}}
for kind in ("w", "s"):
    man[kind] = {k: v for k, v in man[kind].items() if k in wanted[kind]}
print(f"{lang}: {len(jobs)} clips wanted", flush=True)
t0 = time.time()
made = 0
for n, (kind, key, text, name) in enumerate(jobs, 1):
    path = os.path.join(OUT, name)
    if not (os.path.exists(path) and os.path.getsize(path) > 500):
        try:
            synth(text, path)
            made += 1
        except Exception as e:  # a clip that will not synthesise is left out, and the app falls back to the phone voice
            print("  failed:", repr(text), e, flush=True)
            continue
    man[kind][key] = {"k": "p", "f": "p/" + name}
    if n % 100 == 0:
        save()
        print(f"  {n}/{len(jobs)}  ({made} new, {time.time() - t0:.0f}s)", flush=True)
save()
# clips no longer in the manifest (a sentence that left the deck) are removed
keep = {v["f"].split("/")[-1] for k in ("w", "s") for key, v in man[k].items() if key not in human().get(k, {})}
for f in os.listdir(OUT):
    if f not in keep:
        os.remove(os.path.join(OUT, f))
size = sum(os.path.getsize(os.path.join(OUT, f)) for f in os.listdir(OUT)) / 1048576
print(f"done: {len(jobs)} clips, {made} newly made, {size:.0f} MB in audio/p", flush=True)
