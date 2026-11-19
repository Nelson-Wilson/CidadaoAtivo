# -*- coding: utf-8 -*-
"""Descarrega fotografias de demonstração do Wikimedia Commons (com atribuição)."""
import json
import os
import urllib.parse
import urllib.request

BASE = os.path.dirname(os.path.abspath(__file__))
DEST = os.path.join(BASE, "fotos_demo")
os.makedirs(DEST, exist_ok=True)

TERMOS = {
    "buraco": "pothole road asphalt",
    "lixo": "garbage bags street",
    "iluminacao": "broken street light",
    "agua": "water leak pipe street",
}

API = "https://commons.wikimedia.org/w/api.php"


def pedir(params):
    url = API + "?" + urllib.parse.urlencode(params)
    req = urllib.request.Request(url, headers={"User-Agent": "CidadaoAtivo/2.0 (relatorio academico)"})
    with urllib.request.urlopen(req, timeout=45) as r:
        return json.loads(r.read().decode("utf-8"))


atribuicoes = {}
for chave, termo in TERMOS.items():
    dados = pedir({
        "action": "query",
        "generator": "search",
        "gsrsearch": termo,
        "gsrnamespace": 6,
        "gsrlimit": 10,
        "prop": "imageinfo",
        "iiprop": "url|extmetadata|size",
        "iiurlwidth": 1100,
        "format": "json",
    })
    paginas = list(dados.get("query", {}).get("pages", {}).values())
    print(f"[{chave}] resultados: {len(paginas)}")
    paginas.sort(key=lambda p: p.get("index", 99))
    escolhida = None
    for p in paginas:
        info = p["imageinfo"][0]
        caminho = urllib.parse.urlparse(info.get("url", "")).path.lower()
        if info.get("width", 0) < 900 or not caminho.endswith((".jpg", ".jpeg")):
            continue
        escolhida = (p, info)
        break
    if not escolhida:
        print("sem resultado para", chave)
        continue
    p, info = escolhida
    meta = info.get("extmetadata", {})
    autor = meta.get("Artist", {}).get("value", "desconhecido")
    licenca = meta.get("LicenseShortName", {}).get("value", "?")
    destino = os.path.join(DEST, chave + ".jpg")
    req = urllib.request.Request(info["thumburl"], headers={"User-Agent": "CidadaoAtivo/2.0"})
    with urllib.request.urlopen(req, timeout=60) as r, open(destino, "wb") as f:
        f.write(r.read())
    atribuicoes[chave] = {
        "ficheiro": p["title"],
        "purl": "https://commons.wikimedia.org/wiki/" + urllib.parse.quote(p["title"].replace(" ", "_")),
        "autor": autor,
        "licenca": licenca,
        "bytes": os.path.getsize(destino),
    }
    print(chave, "->", p["title"], os.path.getsize(destino), "bytes")

with open(os.path.join(DEST, "atribuicoes.json"), "w", encoding="utf-8") as f:
    json.dump(atribuicoes, f, ensure_ascii=False, indent=2)
print("concluido")
