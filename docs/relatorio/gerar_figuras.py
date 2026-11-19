# -*- coding: utf-8 -*-
"""
Gera os diagramas do relatório em SVG/HTML e converte para PNG com Chrome headless.
Sem Graphviz/Mermaid: apenas SVG inline, para garantir reproducibilidade.
"""
import html
import os
import subprocess
import sys
import tempfile

BASE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(BASE, "assets")
HTML_DIR = os.path.join(BASE, "figuras_html")
CHROME = r"C:\Program Files\Google\Chrome\Application\chrome.exe"

os.makedirs(OUT, exist_ok=True)
os.makedirs(HTML_DIR, exist_ok=True)

AZUL = "#1e3a5f"
AZUL_CLARO = "#dbeafe"
AZUL_MEDIO = "#93c5fd"
VERDE = "#166534"
VERDE_CLARO = "#dcfce7"
AMBAR = "#92400e"
AMBAR_CLARO = "#fef3c7"
VERMELHO = "#991b1b"
VERMELHO_CLARO = "#fee2e2"
CINZA = "#334155"
CINZA_CLARO = "#f1f5f9"
ROXO = "#5b21b6"
ROXO_CLARO = "#ede9fe"


def esc(s):
    return html.escape(str(s), quote=True)


class SVG:
    def __init__(self, w, h, titulo=""):
        self.w = w
        self.h = h
        self.p = []
        self.p.append(
            f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" '
            f'viewBox="0 0 {w} {h}" font-family="Segoe UI, Arial, sans-serif">'
        )
        self.p.append(
            '<defs><marker id="seta" viewBox="0 0 10 10" refX="9" refY="5" '
            'markerWidth="7" markerHeight="7" orient="auto-start-reverse">'
            f'<path d="M 0 0 L 10 5 L 0 10 z" fill="{CINZA}"/></marker>'
            '<filter id="sombra" x="-10%" y="-10%" width="130%" height="130%">'
            '<feDropShadow dx="0" dy="2" stdDeviation="2" flood-opacity="0.10"/></filter>'
            '</defs>'
        )
        self.p.append(f'<rect width="{w}" height="{h}" fill="#ffffff"/>')
        if titulo:
            self.text(w / 2, 48, titulo, 34, "bold", AZUL)

    def text(self, x, y, s, size=20, weight="normal", fill=CINZA, anchor="middle", style=""):
        self.p.append(
            f'<text x="{x:.1f}" y="{y:.1f}" font-size="{size}" font-weight="{weight}" '
            f'fill="{fill}" text-anchor="{anchor}" style="{style}">{esc(s)}</text>'
        )

    def lines(self, x, y, linhas, size=17, fill=CINZA, anchor="middle", lh=1.25):
        for i, linha in enumerate(linhas):
            self.text(x, y + i * size * lh, linha, size, "normal", fill, anchor)

    def rect(self, x, y, w, h, fill=CINZA_CLARO, stroke=CINZA, rx=10, sw=2, dash=None, sombra=False):
        d = f' stroke-dasharray="{dash}"' if dash else ""
        s = ' filter="url(#sombra)"' if sombra else ""
        self.p.append(
            f'<rect x="{x:.1f}" y="{y:.1f}" width="{w:.1f}" height="{h:.1f}" rx="{rx}" '
            f'fill="{fill}" stroke="{stroke}" stroke-width="{sw}"{d}{s}/>'
        )

    def line(self, x1, y1, x2, y2, stroke=CINZA, sw=2, dash=None, seta=True):
        d = f' stroke-dasharray="{dash}"' if dash else ""
        m = ' marker-end="url(#seta)"' if seta else ""
        self.p.append(
            f'<line x1="{x1:.1f}" y1="{y1:.1f}" x2="{x2:.1f}" y2="{y2:.1f}" '
            f'stroke="{stroke}" stroke-width="{sw}"{d}{m}/>'
        )

    def path(self, d, stroke=CINZA, sw=2, dash=None, seta=True, fill="none"):
        da = f' stroke-dasharray="{dash}"' if dash else ""
        m = ' marker-end="url(#seta)"' if seta else ""
        self.p.append(
            f'<path d="{d}" fill="{fill}" stroke="{stroke}" stroke-width="{sw}"{da}{m}/>'
        )

    def box(self, x, y, w, h, titulo, linhas=(), fill=AZUL_CLARO, stroke=AZUL,
            titulo_size=21, texto_size=16, sombra=True, rx=12):
        self.rect(x, y, w, h, fill, stroke, rx=rx, sombra=sombra)
        if linhas:
            self.text(x + w / 2, y + 32, titulo, titulo_size, "bold", stroke)
            self.lines(x + w / 2, y + 62, linhas, texto_size, CINZA)
        else:
            self.text(x + w / 2, y + h / 2 + 7, titulo, titulo_size, "bold", stroke)

    def grupo(self, x, y, w, h, rotulo, fill="none", stroke="#94a3b8"):
        self.rect(x, y, w, h, fill, stroke, rx=16, sw=2, dash="8 6")
        self.text(x + 18, y + 30, rotulo, 20, "bold", "#64748b", anchor="start")

    def salvar(self, nome, largura_png=None):
        self.p.append("</svg>")
        svg = "\n".join(self.p)
        html_doc = (
            "<!doctype html><html><head><meta charset='utf-8'>"
            "<style>html,body{margin:0;padding:0;background:#fff;overflow:hidden}</style>"
            f"</head><body>{svg}</body></html>"
        )
        html_path = os.path.join(HTML_DIR, nome + ".html")
        with open(html_path, "w", encoding="utf-8") as f:
            f.write(html_doc)
        png_path = os.path.join(OUT, nome + ".png")
        cmd = [
            CHROME,
            "--headless=new",
            "--disable-gpu",
            "--hide-scrollbars",
            "--no-sandbox",
            "--disable-dev-shm-usage",
            "--force-device-scale-factor=2",
            f"--window-size={self.w},{self.h}",
            "--virtual-time-budget=1500",
            f"--screenshot={png_path}",
            "file:///" + html_path.replace("\\", "/"),
        ]
        subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        print(f"  {nome}.png")


def hld():
    s = SVG(1600, 1000, "Cidadão Ativo — Diagrama de Alto Nível (HLD)")
    s.grupo(30, 78, 1540, 178, "Actores")
    atores = [
        ("Cidadão", ["Reporta, acompanha", "e avalia"]),
        ("Técnico Municipal", ["Executa tarefas", "de campo"]),
        ("Gestor Municipal", ["Triagem, atribuição", "e dashboard"]),
        ("Administrador", ["Categorias, SLA", "e contas"]),
        ("Visitante", ["Mapa público", "sem sessão"]),
    ]
    for i, (t, l) in enumerate(atores):
        s.box(62 + i * 296, 118, 268, 112, t, l, AZUL_CLARO, AZUL, 19, 15)

    s.grupo(30, 300, 1540, 330, "Aplicação Cidadão Ativo — função serverless na Vercel")
    apps = [
        ("Mapa público", ["Ocorrências e filtros"], VERDE_CLARO, VERDE),
        ("Conta e sessão", ["Registo, login e perfis"], AZUL_CLARO, AZUL),
        ("Denúncias", ["Foto, GPS e acompanhamento"], AZUL_CLARO, AZUL),
        ("Participação", ["Apoios, comentários e avaliação"], VERDE_CLARO, VERDE),
        ("Operação municipal", ["Triagem, atribuição e KPIs"], AMBAR_CLARO, AMBAR),
        ("Tarefas de campo", ["Início e resolução com foto"], AMBAR_CLARO, AMBAR),
        ("Administração", ["Categorias, SLA e utilizadores"], ROXO_CLARO, ROXO),
        ("Apoio por IA", ["Classificação, duplicados e chatbot"], ROXO_CLARO, ROXO),
    ]
    for i, (t, l, fill, stroke) in enumerate(apps):
        col = i % 4
        row = i // 4
        s.box(65 + col * 370, 345 + row * 125, 345, 105, t, l, fill, stroke, 19, 15)

    s.grupo(30, 672, 1540, 280, "Persistência e serviços externos")
    servicos = [
        ("Supabase PostgreSQL", ["13 tabelas", "RLS activo", "sessões e rate limit"], AZUL_CLARO, AZUL),
        ("Supabase Storage", ["Fotografias das", "denúncias e resoluções"], VERDE_CLARO, VERDE),
        ("Google Gemini", ["Texto, visão, chatbot", "e relatório executivo"], ROXO_CLARO, ROXO),
        ("Mapas e GPS", ["Tiles CARTO/Esri", "Geolocalização do browser"], AMBAR_CLARO, AMBAR),
    ]
    for i, (t, l, fill, stroke) in enumerate(servicos):
        s.box(65 + i * 370, 720, 345, 190, t, l, fill, stroke, 20, 16)

    # Setas actores -> aplicação
    for x in (196, 492, 788, 1084, 1380):
        s.line(x, 258, x, 300)
    # Setas aplicação -> serviços
    for x in (196, 492, 788, 1084):
        s.line(x, 630, x, 672)
    s.text(800, 940, "HTTPS · SQL/TLS · API REST · ficheiros estáticos", 17, "normal", "#64748b")
    s.salvar("fig_hld")


def lld():
    s = SVG(1600, 1180, "Cidadão Ativo — Diagrama de Baixo Nível (LLD)")
    s.grupo(30, 78, 1540, 118, "Apresentação")
    s.box(60, 118, 1480, 58, "Browser — views EJS + Tailwind + JavaScript (mapa, formulários, dashboard)", [], AZUL_CLARO, AZUL, 21)

    s.grupo(30, 215, 1540, 120, "Aplicação Express")
    s.box(60, 250, 1480, 65, "src/app.js — helmet, CSP, sessão PostgreSQL, CSRF, flash, rate limit e tratamento de erros", [], AZUL_CLARO, AZUL, 20)

    s.grupo(30, 355, 1540, 160, "Rotas HTTP")
    rotas = ["auth", "ocorrencias", "reports", "municipio", "tecnico", "admin", "api", "map"]
    for i, r in enumerate(rotas):
        s.box(60 + i * 186, 392, 170, 88, "routes/" + r, [], AZUL_CLARO, AZUL, 17)

    s.grupo(30, 535, 1540, 185, "Domínio, validação e serviços")
    boxes = [
        ("domain/", ["estadosDenuncia"], VERDE_CLARO, VERDE),
        ("validation/", ["denuncia"], VERDE_CLARO, VERDE),
        ("authorization.js", ["podeAceder", "podeGerir", "podeAtribuir"], VERDE_CLARO, VERDE),
        ("services/", ["encaminhamento"], VERDE_CLARO, VERDE),
        ("services/ai/", ["classificação, prioridade", "duplicados, resumo", "chatbot, relatório"], ROXO_CLARO, ROXO),
    ]
    for i, (t, l, fill, stroke) in enumerate(boxes):
        s.box(60 + i * 300, 572, 280, 120, t, l, fill, stroke, 18, 14)

    s.grupo(30, 740, 1540, 145, "Modelos de dados")
    modelos = ["Denuncia", "Usuario", "Categoria", "Departamento", "Municipio", "Comentario", "Confirmacao", "Avaliacao", "ResolucaoFoto"]
    for i, m in enumerate(modelos):
        col = i % 5
        row = i // 5
        s.box(60 + col * 296, 775 + row * 48, 280, 38, m, [], AMBAR_CLARO, AMBAR, 16, rx=6, sombra=False)

    s.grupo(30, 905, 1540, 105, "Acesso a dados")
    s.box(60, 938, 720, 55, "src/db.js — query() e tx(); PostgreSQL em produção, PGlite nos testes", [], CINZA_CLARO, CINZA, 18)
    s.box(810, 938, 680, 55, "src/storage.js — Supabase Storage ou disco local", [], CINZA_CLARO, CINZA, 18)

    s.grupo(30, 1030, 1540, 120, "Infraestrutura")
    s.box(60, 1062, 470, 65, "Supabase PostgreSQL", [], AZUL_CLARO, AZUL, 20)
    s.box(560, 1062, 470, 65, "Supabase Storage", [], VERDE_CLARO, VERDE, 20)
    s.box(1060, 1062, 470, 65, "Google Gemini API", [], ROXO_CLARO, ROXO, 20)

    for x in (200, 500, 800, 1100, 1400):
        s.line(x, 192, x, 215)
        s.line(x, 335, x, 355)
        s.line(x, 515, x, 535)
        s.line(x, 720, x, 740)
        s.line(x, 885, x, 905)
        s.line(x, 1010, x, 1030)
    s.salvar("fig_lld")


def erd():
    s = SVG(1800, 1280, "Cidadão Ativo — Modelo de Dados (ERD simplificado)")

    def ent(x, y, w, h, nome, campos, fill=AZUL_CLARO, stroke=AZUL):
        s.rect(x, y, w, h, fill, stroke, rx=8, sw=2, sombra=True)
        s.rect(x, y, w, 38, stroke, stroke, rx=8, sw=0)
        s.text(x + w / 2, y + 26, nome, 18, "bold", "#ffffff")
        for i, c in enumerate(campos):
            s.text(x + 14, y + 62 + i * 24, c, 15, "normal", CINZA, anchor="start")

    def label(x, y, txt):
        s.rect(x - 20, y - 18, 44, 24, "#ffffff", "#ffffff", rx=0, sw=0)
        s.text(x, y, txt, 14, "bold", "#475569")

    # Relações (desenhadas antes das caixas)
    s.line(360, 210, 400, 210)
    label(386, 196, "1:N")
    s.line(720, 220, 760, 220)
    label(746, 206, "1:N")
    s.line(1440, 210, 1480, 210)
    label(1466, 196, "1:N")
    # departments -> category_department (por cima das caixas)
    s.path("M 560 140 L 560 100 L 1620 100 L 1620 140")
    label(1090, 86, "1:N")
    # departments -> reports
    s.line(560, 310, 560, 470)
    label(586, 390, "1:N")
    # users -> reports
    s.path("M 930 360 L 930 430 L 700 430 L 700 470")
    label(815, 416, "1:N")
    # categories -> reports
    s.path("M 1290 290 L 1290 420 L 850 420 L 850 470")
    label(1070, 406, "1:N")
    # reports -> history
    s.line(920, 550, 1000, 550)
    label(966, 536, "1:N")
    # reports -> photo resolutions (por baixo do histórico)
    s.path("M 920 650 L 950 650 L 950 675 L 1580 675 L 1580 630")
    label(1260, 661, "1:N")
    # reports -> confirmations
    s.line(920, 720, 1000, 720)
    label(966, 706, "1:N")
    # reports -> comments
    s.line(500, 770, 500, 850)
    label(526, 810, "1:N")
    # reports -> ratings
    s.path("M 620 770 L 620 810 L 960 810 L 960 850")
    label(790, 796, "1:1")

    # Entidades
    ent(40, 140, 320, 150, "municipalities", ["PK id", "name", "region"])
    ent(400, 140, 320, 170, "departments", ["PK id", "FK municipality_id", "name"])
    ent(760, 140, 340, 220, "users", ["PK id", "name / email / password", "role (4 papéis)", "FK municipality_id", "FK department_id"])
    ent(1140, 140, 300, 150, "categories", ["PK id", "name", "sla_hours"])
    ent(1480, 140, 280, 150, "category_department", ["PK id", "FK category_id", "FK department_id"])
    ent(400, 470, 520, 300, "reports", [
        "PK id", "FK user_id (autor)", "FK category_id", "description / photo_path",
        "latitude / longitude / neighborhood", "status (7 estados) / priority",
        "FK municipality_id", "FK department_id / technician_id"
    ], VERDE_CLARO, VERDE)
    ent(1000, 440, 360, 210, "report_status_histories", [
        "PK id", "FK report_id", "previous_status", "new_status", "FK changed_by", "note"
    ], VERDE_CLARO, VERDE)
    ent(1400, 440, 360, 190, "report_photo_resolutions", [
        "PK id", "FK report_id", "photo_path", "FK technician_id", "note"
    ], VERDE_CLARO, VERDE)
    ent(1000, 700, 360, 170, "report_confirmations", [
        "PK id", "FK report_id", "FK user_id", "UNIQUE(report, user)"
    ], VERDE_CLARO, VERDE)
    ent(400, 850, 360, 190, "report_comments", [
        "PK id", "FK report_id", "FK user_id", "content", "is_official"
    ], VERDE_CLARO, VERDE)
    ent(800, 850, 360, 190, "report_ratings", [
        "PK id", "FK report_id (único)", "FK user_id", "score (1–5)", "feedback"
    ], VERDE_CLARO, VERDE)

    # Infraestrutura (sem relações de domínio)
    s.grupo(1200, 885, 560, 250, "Infraestrutura")
    ent(1220, 925, 250, 150, "user_sessions", ["PK sid", "sess (jsonb)", "FK user_id", "expire"], CINZA_CLARO, CINZA)
    ent(1490, 925, 250, 120, "rate_limits", ["PK key", "total_hits", "reset_time"], CINZA_CLARO, CINZA)

    s.text(60, 1125, "Relações principais: um município tem departamentos e utilizadores; cada denúncia pertence a um autor,", 16, "normal", "#475569", anchor="start")
    s.text(60, 1150, "categoria, município e departamento; histórico, fotos, apoios, comentários e avaliação referenciam a denúncia.", 16, "normal", "#475569", anchor="start")
    s.text(60, 1225, "Legenda: PK = chave primária; FK = chave estrangeira; 1:N = um-para-muitos; 1:1 = um-para-um.", 16, "italic", "#64748b", anchor="start")
    s.salvar("fig_erd")


def estados():
    s = SVG(1600, 740, "Máquina de estados da denúncia")
    y = 220
    estados = [
        (60, "recebida", "estado inicial"),
        (310, "em_analise", ""),
        (560, "atribuida", ""),
        (810, "em_execucao", ""),
        (1060, "resolvida", ""),
        (1310, "fechada", "estado final"),
    ]
    for x, nome, nota in estados:
        s.rect(x, y, 210, 90, AZUL_CLARO, AZUL, rx=12, sombra=True)
        s.text(x + 105, y + 40, nome, 20, "bold", AZUL)
        if nota:
            s.text(x + 105, y + 66, nota, 15, "normal", "#64748b")
    # rejeitada
    s.rect(560, 520, 210, 90, VERMELHO_CLARO, VERMELHO, rx=12, sombra=True)
    s.text(665, 560, "rejeitada", 20, "bold", VERMELHO)
    s.text(665, 586, "estado final", 15, "normal", "#64748b")

    for i in range(5):
        s.line(270 + i * 250, y + 45, 310 + i * 250, y + 45)
    s.line(665, y + 90, 665, 520)  # em_analise -> rejeitada
    s.text(690, 455, "rejeitar", 16, "normal", VERMELHO)
    s.text(1400, 370, "Sem transições de saída", 17, "italic", "#64748b", anchor="middle")
    s.text(800, 690, "Qualquer par (de, para) ausente da tabela é rejeitado com HTTP 422 e não altera o estado nem o histórico.", 18, "normal", "#334155")
    s.salvar("fig_estados")


def implantacao():
    s = SVG(1600, 900, "Diagrama de implantação")
    s.box(60, 120, 320, 150, "Browser do utilizador", ["Chrome, Edge, Firefox", "ou Safari"], AZUL_CLARO, AZUL, 21, 17)
    s.box(520, 120, 400, 150, "Vercel", ["Função serverless Node.js", "Express + EJS", "maxDuration = 60 s"], AMBAR_CLARO, AMBAR, 21, 17)
    s.box(1080, 120, 460, 150, "GitHub", ["Repositório CidadãoAtivo", "push na branch main", "GitHub Actions (CI)"], CINZA_CLARO, CINZA, 21, 17)

    s.box(100, 400, 360, 170, "Supabase PostgreSQL", ["13 tabelas", "RLS activo", "pooler transaction :6543"], AZUL_CLARO, AZUL, 21, 17)
    s.box(540, 400, 360, 170, "Supabase Storage", ["Bucket de fotografias", "URLs públicos", "chave de serviço no servidor"], VERDE_CLARO, VERDE, 21, 17)
    s.box(980, 400, 360, 170, "Google Gemini", ["generateContent", "modelo principal + fallback", "timeout e fallback determinístico"], ROXO_CLARO, ROXO, 21, 17)

    s.box(100, 680, 360, 120, "Mapas", ["Tiles CARTO/Esri", "geolocalização do browser"], AMBAR_CLARO, AMBAR, 21, 16)

    s.line(380, 195, 520, 195)
    s.line(1080, 195, 920, 195)
    s.line(600, 270, 280, 400)
    s.line(720, 270, 720, 400)
    s.line(840, 270, 1160, 400)
    s.path("M 60 240 L 30 240 L 30 740 L 100 740")
    s.text(450, 182, "HTTPS", 15, "normal", "#64748b")
    s.text(1000, 182, "deploy automático", 15, "normal", "#64748b")
    s.text(400, 322, "SQL/TLS", 15, "normal", "#64748b")
    s.text(738, 330, "HTTPS", 15, "normal", "#64748b")
    s.text(1010, 340, "API REST", 15, "normal", "#64748b")
    s.text(42, 500, "tiles", 15, "normal", "#64748b")
    s.text(800, 840, "Deploy automático a partir do GitHub; segredos configurados no painel da Vercel.", 18, "normal", "#334155")
    s.salvar("fig_implantacao")


def sequencia():
    s = SVG(1600, 1000, "Fluxo principal da denúncia — do registo ao fecho")
    atores = [
        (120, "Maria\n(cidadã)"),
        (400, "App Express\n(rotas + validação)"),
        (690, "PostgreSQL\n(Supabase)"),
        (980, "Storage\n(Supabase)"),
        (1270, "Gemini\n(IA)"),
        (1500, "João / Carlos\n(município / técnico)"),
    ]
    for x, nome in atores:
        s.rect(x - 80, 95, 160, 70, AZUL_CLARO, AZUL, rx=8)
        partes = nome.split("\n")
        s.text(x, 122, partes[0], 17, "bold", AZUL)
        if len(partes) > 1:
            s.text(x, 145, partes[1], 15, "normal", CINZA)
        s.line(x, 165, x, 900, "#94a3b8", 2, dash="7 6", seta=False)

    passos = [
        (120, 400, "1. preenche e submete o formulário", 220),
        (400, 1270, "2. classificação e prioridade (opcional)", 300),
        (400, 980, "3. guarda fotografia", 350),
        (400, 690, "4. INSERT denúncia + histórico (transacção)", 400),
        (400, 120, "5. confirmação e ID", 450),
        (1500, 400, "6. João lista e atribui Carlos", 500),
        (400, 690, "7. actualiza estado e histórico", 550),
        (1500, 400, "8. Carlos inicia e resolve com foto", 600),
        (400, 980, "9. guarda foto de resolução", 650),
        (400, 690, "10. estado resolvida + histórico", 700),
        (120, 400, "11. Maria avalia a resolução", 750),
        (400, 690, "12. avaliação + estado fechada", 800),
        (400, 120, "13. confirmação de fecho", 850),
    ]
    for x1, x2, texto, y in passos:
        s.line(x1, y, x2, y, CINZA, 2)
        s.text((x1 + x2) / 2, y - 10, texto, 16, "normal", CINZA)

    # Auto-validação (loop) na aplicação
    s.path("M 400 250 L 470 250 L 470 272 L 400 272")
    s.text(410, 242, "valida CSRF, sessão e dados", 15, "normal", CINZA, anchor="start")

    s.rect(40, 925, 1520, 55, CINZA_CLARO, "#cbd5e1", rx=8)
    s.text(800, 958, "Cada mudança de estado é registada em report_status_histories; SELECT ... FOR UPDATE evita históricos duplicados.", 16, "normal", CINZA)
    s.salvar("fig_sequencia")


def piramide():
    s = SVG(1200, 900, "Pirâmide de testes adoptada")
    # Triângulo
    s.p.append('<polygon points="600,120 1030,720 170,720" fill="#f8fafc" stroke="#94a3b8" stroke-width="3"/>')
    s.p.append('<polygon points="600,120 820,430 380,430" fill="' + ROXO_CLARO + '" stroke="' + ROXO + '" stroke-width="2"/>')
    s.p.append('<polygon points="380,430 820,430 920,560 280,560" fill="' + VERDE_CLARO + '" stroke="' + VERDE + '" stroke-width="2"/>')
    s.p.append('<polygon points="280,560 920,560 1030,720 170,720" fill="' + AZUL_CLARO + '" stroke="' + AZUL + '" stroke-width="2"/>')
    s.text(600, 310, "Sistema e aceitação", 20, "bold", ROXO)
    s.text(600, 338, "2 cenários E4 · 5 critérios", 15, "normal", CINZA)
    s.text(600, 500, "Integração", 23, "bold", VERDE)
    s.text(600, 532, "40 testes · Supertest + PGlite", 17, "normal", CINZA)
    s.text(600, 650, "Unitários", 24, "bold", AZUL)
    s.text(600, 682, "98 testes · Jest · 3,0 s", 17, "normal", CINZA)
    s.text(600, 790, "Base larga e rápida; poucos testes de sistema, lentos e com dados reais.", 18, "normal", "#475569")
    s.text(600, 845, "A proporção segue a pirâmide: 71% unitários, 29% integração, aceitação manual/automatizada.", 17, "italic", "#64748b")
    s.salvar("fig_piramide")


def ci():
    s = SVG(1800, 720, "Pipeline de integração contínua (GitHub Actions)")
    passos = [
        ("push / PR", ["main ou pull", "request"], AZUL_CLARO, AZUL),
        ("checkout", ["actions/checkout@v4"], CINZA_CLARO, CINZA),
        ("Node 22", ["actions/setup-node@v4", "cache: npm"], VERDE_CLARO, VERDE),
        ("npm ci", ["instalação", "determinística"], AZUL_CLARO, AZUL),
        ("build:css", ["Tailwind", "minificado"], AMBAR_CLARO, AMBAR),
        ("npm test", ["98 unitários +", "40 integração"], ROXO_CLARO, ROXO),
        ("resultado", ["sucesso ou falha", "notificação"], VERDE_CLARO, VERDE),
    ]
    x = 40
    for i, (t, l, fill, stroke) in enumerate(passos):
        w = 220
        s.box(x, 230, w, 150, t, l, fill, stroke, 20, 16)
        if i < len(passos) - 1:
            s.line(x + w, 305, x + w + 30, 305)
        x += 250
    s.text(900, 160, "Cada push na branch main e cada pull request executa a suite completa.", 20, "normal", CINZA)
    s.text(900, 470, "Duração típica: 3 s (unitários) + 31 s (integração) + instalação e build.", 18, "normal", "#475569")
    s.text(900, 515, "Quality gate actual: 138 testes; cobertura mínima configurada em 80/75/80/80.", 18, "normal", "#475569")
    s.rect(40, 580, 1720, 85, CINZA_CLARO, "#cbd5e1", rx=10)
    s.text(900, 615, "Evidência: 22 execuções no GitHub Actions; a mais recente em 2026-11-17 concluída com sucesso.", 19, "bold", AZUL)
    s.text(900, 645, "https://github.com/Nelson-Wilson/CidadaoAtivo/actions/runs/44066884111", 17, "normal", "#475569")
    s.salvar("fig_ci")


def cobertura():
    s = SVG(1400, 820, "Cobertura dos testes unitários por módulo")
    dados = [
        ("Todos os ficheiros", 96.72, 92.18),
        ("authorization.js", 96.42, 97.67),
        ("domain/estadosDenuncia.js", 100.0, 100.0),
        ("services/encaminhamento", 100.0, 100.0),
        ("services/ai/servicoPrioridade", 94.11, 81.08),
        ("validation/denuncia.js", 100.0, 95.23),
    ]
    x0 = 430
    maxw = 850
    y = 150
    s.text(250, 118, "Statements", 18, "bold", AZUL)
    s.rect(250, 130, 22, 22, AZUL, AZUL, rx=4)
    s.text(500, 118, "Branches", 18, "bold", VERDE)
    s.rect(500, 130, 22, 22, VERDE, VERDE, rx=4)
    for nome, st, br in dados:
        s.text(400, y + 23, nome, 18, "normal", CINZA, anchor="end")
        s.rect(x0, y, maxw, 26, "#e2e8f0", "#cbd5e1", rx=4, sw=0)
        s.rect(x0, y, maxw * st / 100, 26, AZUL, AZUL, rx=4, sw=0)
        s.text(x0 + maxw * st / 100 + 12, y + 20, f"{st:.2f}%", 17, "bold", AZUL, anchor="start")
        s.rect(x0, y + 34, maxw, 20, "#e2e8f0", "#cbd5e1", rx=4, sw=0)
        s.rect(x0, y + 34, maxw * br / 100, 20, VERDE, VERDE, rx=4, sw=0)
        s.text(x0 + maxw * br / 100 + 12, y + 50, f"{br:.2f}%", 16, "bold", VERDE, anchor="start")
        y += 98
    s.text(700, 760, "Mínimos do projecto: 80% statements, 75% branches, 80% functions e 80% lines.", 18, "normal", "#475569")
    s.salvar("fig_cobertura")


if __name__ == "__main__":
    print("A gerar diagramas...")
    hld()
    lld()
    erd()
    estados()
    implantacao()
    sequencia()
    piramide()
    ci()
    cobertura()
    print("Concluído.")
