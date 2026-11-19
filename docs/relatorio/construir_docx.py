# -*- coding: utf-8 -*-
"""
Compõe o documento final do Trabalho Semestral em DOCX.

Estilo herdado do Trabalho 01: A4, Times New Roman 12, margens de 2 cm,
espaçamento 1,5 e capa da UEM. Acrescenta cabeçalho/rodapé, numeração por
secção, índice automático, índice de figuras/tabelas e legendas numeradas.

    python docs/relatorio/construir_docx.py
"""
import os
import re
import sys

from docx import Document
from docx.enum.section import WD_SECTION
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.enum.text import WD_ALIGN_PARAGRAPH, WD_BREAK
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Cm, Pt, RGBColor

BASE = os.path.dirname(os.path.abspath(__file__))
ASSETS = os.path.join(BASE, "assets")
CAPTURAS = os.path.join(BASE, "capturas")
SAIDA = os.path.join(BASE, "..", "Cidadao_Ativo_Documento_Final.docx")

TINTA = RGBColor(0x00, 0x00, 0x00)
CINZA = RGBColor(0x44, 0x44, 0x44)
CINZA_CLARO = "E7E6E6"
AZUL_TABELA = "DCE6F1"

sys.path.insert(0, BASE)
import conteudo_1  # noqa: E402
import conteudo_2  # noqa: E402
import conteudo_3  # noqa: E402
import conteudo_4  # noqa: E402


# ---------------------------------------------------------------------------
# Utilitários de baixo nível
# ---------------------------------------------------------------------------
def definir_fonte(run, tamanho=None, negrito=None, italico=None, cor=None,
                  fonte="Times New Roman"):
    run.font.name = fonte
    rpr = run._element.get_or_add_rPr()
    rfonts = rpr.find(qn("w:rFonts"))
    if rfonts is None:
        rfonts = OxmlElement("w:rFonts")
        rpr.append(rfonts)
    for atributo in ("w:ascii", "w:hAnsi", "w:cs", "w:eastAsia"):
        rfonts.set(qn(atributo), fonte)
    if tamanho is not None:
        run.font.size = Pt(tamanho)
    if negrito is not None:
        run.bold = negrito
    if italico is not None:
        run.italic = italico
    if cor is not None:
        run.font.color.rgb = cor


def escrever_formatado(paragrafo, texto, tamanho=12):
    """Interpreta **negrito**, <i>...</i> e `código` no texto."""
    partes = texto.split("**")
    for i, parte in enumerate(partes):
        if not parte:
            continue
        negrito = (i % 2 == 1)
        italico = False
        for sub in re.split(r"(<i>|</i>)", parte):
            if sub == "<i>":
                italico = True
                continue
            if sub == "</i>":
                italico = False
                continue
            if not sub:
                continue
            for trecho in re.split(r"(`[^`]*`)", sub):
                if not trecho:
                    continue
                if len(trecho) >= 2 and trecho.startswith("`") and trecho.endswith("`"):
                    run = paragrafo.add_run(trecho[1:-1])
                    definir_fonte(run, tamanho=max(tamanho - 1, 8), negrito=negrito,
                                  italico=italico, fonte="Consolas")
                else:
                    run = paragrafo.add_run(trecho)
                    definir_fonte(run, tamanho=tamanho, negrito=negrito, italico=italico)


def caminho_asset(caminho):
    """Resolve caminhos relativos a partir da pasta docs/relatorio."""
    if os.path.isabs(caminho):
        return caminho
    return os.path.join(BASE, caminho)


def campo(paragrafo, instrucao, resultado="1"):
    """Insere um campo Word (PAGE, SEQ, TOC, ...) com a estrutura canónica."""
    run = paragrafo.add_run()
    inicio = OxmlElement("w:fldChar")
    inicio.set(qn("w:fldCharType"), "begin")
    run._r.append(inicio)

    run_instr = paragrafo.add_run()
    instr = OxmlElement("w:instrText")
    instr.set(qn("xml:space"), "preserve")
    instr.text = instrucao
    run_instr._r.append(instr)

    run_sep = paragrafo.add_run()
    separador = OxmlElement("w:fldChar")
    separador.set(qn("w:fldCharType"), "separate")
    run_sep._r.append(separador)

    if resultado:
        paragrafo.add_run(str(resultado))

    run_fim = paragrafo.add_run()
    fim = OxmlElement("w:fldChar")
    fim.set(qn("w:fldCharType"), "end")
    run_fim._r.append(fim)
    return run


def sombrear(celula, cor):
    tcpr = celula._tc.get_or_add_tcPr()
    shd = OxmlElement("w:shd")
    shd.set(qn("w:val"), "clear")
    shd.set(qn("w:color"), "auto")
    shd.set(qn("w:fill"), cor)
    tcpr.append(shd)


def repetir_cabecalho(linha):
    trpr = linha._tr.get_or_add_trPr()
    tblheader = OxmlElement("w:tblHeader")
    tblheader.set(qn("w:val"), "true")
    trpr.append(tblheader)


def nao_dividir(linha):
    trpr = linha._tr.get_or_add_trPr()
    cantsplit = OxmlElement("w:cantSplit")
    cantsplit.set(qn("w:val"), "true")
    trpr.append(cantsplit)


def numero_de_pagina_romano(section, formato, inicio):
    sectpr = section._sectPr
    pg = sectpr.find(qn("w:pgNumType"))
    if pg is None:
        pg = OxmlElement("w:pgNumType")
        cols = sectpr.find(qn("w:cols"))
        if cols is not None:
            cols.addprevious(pg)
        else:
            sectpr.append(pg)
    pg.set(qn("w:fmt"), formato)
    pg.set(qn("w:start"), str(inicio))


def rodape_com_pagina(section, texto_esquerda=""):
    section.footer.is_linked_to_previous = False
    par = section.footer.paragraphs[0]
    par.text = ""
    par.alignment = WD_ALIGN_PARAGRAPH.CENTER
    par.paragraph_format.space_before = Pt(0)
    par.paragraph_format.space_after = Pt(0)
    if texto_esquerda:
        run = par.add_run(texto_esquerda + "   |   ")
        definir_fonte(run, tamanho=9, cor=CINZA)
    run = par.add_run("p. ")
    definir_fonte(run, tamanho=9, cor=CINZA)
    campo(par, "PAGE", "1")
    for run in par.runs:
        definir_fonte(run, tamanho=9, cor=CINZA)


def cabecalho(section, texto):
    section.header.is_linked_to_previous = False
    par = section.header.paragraphs[0]
    par.text = ""
    par.alignment = WD_ALIGN_PARAGRAPH.RIGHT
    run = par.add_run(texto)
    definir_fonte(run, tamanho=9, cor=CINZA, italico=True)
    borda = OxmlElement("w:pBdr")
    fundo = OxmlElement("w:bottom")
    fundo.set(qn("w:val"), "single")
    fundo.set(qn("w:sz"), "4")
    fundo.set(qn("w:space"), "1")
    fundo.set(qn("w:color"), "999999")
    borda.append(fundo)
    par._p.get_or_add_pPr().append(borda)


# ---------------------------------------------------------------------------
# Estilos
# ---------------------------------------------------------------------------
def configurar_estilos(doc):
    normal = doc.styles["Normal"]
    normal.font.name = "Times New Roman"
    normal.font.size = Pt(12)
    normal.font.color.rgb = TINTA
    rpr = normal.element.get_or_add_rPr()
    rfonts = rpr.find(qn("w:rFonts"))
    if rfonts is None:
        rfonts = OxmlElement("w:rFonts")
        rpr.append(rfonts)
    for atributo in ("w:ascii", "w:hAnsi", "w:cs", "w:eastAsia"):
        rfonts.set(qn(atributo), "Times New Roman")
    pf = normal.paragraph_format
    pf.line_spacing = 1.5
    pf.space_before = Pt(0)
    pf.space_after = Pt(6)
    pf.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY

    especificacoes = {
        "Heading 1": (14, True, False, 18, 10),
        "Heading 2": (12, True, False, 12, 6),
        "Heading 3": (12, True, True, 10, 4),
    }
    for nome, (tamanho, negrito, italico, antes, depois) in especificacoes.items():
        estilo = doc.styles[nome]
        estilo.font.name = "Times New Roman"
        estilo.font.size = Pt(tamanho)
        estilo.font.bold = negrito
        estilo.font.italic = italico
        estilo.font.color.rgb = TINTA
        rpr = estilo.element.get_or_add_rPr()
        rfonts = rpr.find(qn("w:rFonts"))
        if rfonts is None:
            rfonts = OxmlElement("w:rFonts")
            rpr.append(rfonts)
        for atributo in ("w:ascii", "w:hAnsi", "w:cs", "w:eastAsia"):
            rfonts.set(qn(atributo), "Times New Roman")
        pf = estilo.paragraph_format
        pf.space_before = Pt(antes)
        pf.space_after = Pt(depois)
        pf.line_spacing = 1.5
        pf.keep_with_next = True
        pf.alignment = WD_ALIGN_PARAGRAPH.LEFT

    def estilo_legenda(nome):
        estilo = doc.styles.add_style(nome, 1)  # 1 = parágrafo
        estilo.base_style = doc.styles["Normal"]
        estilo.font.name = "Times New Roman"
        estilo.font.size = Pt(10)
        estilo.paragraph_format.space_before = Pt(4)
        estilo.paragraph_format.space_after = Pt(10)
        estilo.paragraph_format.line_spacing = 1.0
        estilo.paragraph_format.alignment = WD_ALIGN_PARAGRAPH.CENTER
        estilo.paragraph_format.keep_with_next = True
        return estilo

    estilo_legenda("LegendaFigura")
    estilo_legenda("LegendaTabela")

    citacao = doc.styles.add_style("CitacaoLonga", 1)
    citacao.base_style = doc.styles["Normal"]
    citacao.font.name = "Times New Roman"
    citacao.font.size = Pt(11)
    citacao.paragraph_format.left_indent = Cm(4)
    citacao.paragraph_format.line_spacing = 1.0
    citacao.paragraph_format.space_before = Pt(6)
    citacao.paragraph_format.space_after = Pt(6)
    citacao.paragraph_format.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY

    front = doc.styles.add_style("TituloFrontMatter", 1)
    front.base_style = doc.styles["Normal"]
    front.font.name = "Times New Roman"
    front.font.size = Pt(14)
    front.font.bold = True
    front.font.color.rgb = TINTA
    front.paragraph_format.alignment = WD_ALIGN_PARAGRAPH.CENTER
    front.paragraph_format.space_before = Pt(0)
    front.paragraph_format.space_after = Pt(18)
    front.paragraph_format.line_spacing = 1.5
    front.paragraph_format.keep_with_next = True

    assinatura = doc.styles.add_style("Assinatura", 1)
    assinatura.base_style = doc.styles["Normal"]
    assinatura.paragraph_format.space_after = Pt(0)
    assinatura.paragraph_format.line_spacing = 1.0


# ---------------------------------------------------------------------------
# Blocos de conteúdo
# ---------------------------------------------------------------------------
class Compositor:
    def __init__(self, doc):
        self.doc = doc
        self.num_figuras = 0
        self.num_tabelas = 0

    # -- texto
    def h1(self, texto):
        p = self.doc.add_heading(texto, level=1)
        return p

    def h2(self, texto):
        return self.doc.add_heading(texto, level=2)

    def h3(self, texto):
        return self.doc.add_heading(texto, level=3)

    def p(self, texto):
        par = self.doc.add_paragraph()
        escrever_formatado(par, texto, 12)

    def citacao(self, texto):
        par = self.doc.add_paragraph(style="CitacaoLonga")
        escrever_formatado(par, texto, 11)

    def lista(self, itens, numerada=False):
        estilo = "List Number" if numerada else "List Bullet"
        for item in itens:
            par = self.doc.add_paragraph(style=estilo)
            par.paragraph_format.line_spacing = 1.5
            par.paragraph_format.space_after = Pt(3)
            par.paragraph_format.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
            escrever_formatado(par, item, 12)

    def nota(self, texto):
        par = self.doc.add_paragraph()
        par.paragraph_format.space_before = Pt(2)
        par.paragraph_format.space_after = Pt(8)
        par.paragraph_format.line_spacing = 1.0
        escrever_formatado(par, texto, 9)
        for run in par.runs:
            run.font.color.rgb = CINZA

    def legenda(self, prefixo, texto, acima=False):
        estilo = "LegendaFigura" if prefixo == "Figura" else "LegendaTabela"
        par = self.doc.add_paragraph(style=estilo)
        if acima:
            par.paragraph_format.keep_with_next = True
        run = par.add_run(prefixo + " ")
        definir_fonte(run, tamanho=10, negrito=True)
        campo(par, f"SEQ {prefixo} \\* ARABIC", "0")
        run = par.add_run(" — " + texto)
        definir_fonte(run, tamanho=10, italico=True)
        return par

    def tabela(self, dados):
        cols = dados["cols"]
        rows = dados["rows"]
        larguras = dados.get("w")
        tamanho = dados.get("f", 9)
        alinhamentos = dados.get("align")
        if dados.get("cap"):
            self.num_tabelas += 1
            self.legenda("Tabela", dados["cap"], acima=True)
        tabela = self.doc.add_table(rows=1, cols=len(cols))
        tabela.style = "Table Grid"
        tabela.alignment = WD_TABLE_ALIGNMENT.CENTER
        tabela.autofit = False
        cab = tabela.rows[0]
        repetir_cabecalho(cab)
        nao_dividir(cab)
        for i, titulo in enumerate(cols):
            celula = cab.cells[i]
            celula.text = ""
            par = celula.paragraphs[0]
            par.paragraph_format.line_spacing = 1.0
            par.paragraph_format.space_after = Pt(0)
            par.paragraph_format.space_before = Pt(0)
            par.alignment = WD_ALIGN_PARAGRAPH.CENTER
            run = par.add_run(str(titulo))
            definir_fonte(run, tamanho=tamanho, negrito=True)
            sombrear(celula, AZUL_TABELA)
        for linha in rows:
            r = tabela.add_row()
            nao_dividir(r)
            for i, valor in enumerate(linha):
                celula = r.cells[i]
                celula.text = ""
                par = celula.paragraphs[0]
                par.paragraph_format.line_spacing = 1.0
                par.paragraph_format.space_after = Pt(0)
                par.paragraph_format.space_before = Pt(0)
                alinhamento = (alinhamentos or [])[i] if alinhamentos else "left"
                par.alignment = {
                    "left": WD_ALIGN_PARAGRAPH.LEFT,
                    "center": WD_ALIGN_PARAGRAPH.CENTER,
                    "right": WD_ALIGN_PARAGRAPH.RIGHT,
                    "justify": WD_ALIGN_PARAGRAPH.JUSTIFY,
                }[alinhamento]
                escrever_formatado(par, str(valor), tamanho)
        if larguras:
            for i, largura in enumerate(larguras):
                for linha in tabela.rows:
                    linha.cells[i].width = Cm(largura)
        # espaçamento após a tabela
        self.doc.add_paragraph().paragraph_format.space_after = Pt(2)

    def figura(self, dados):
        caminho = caminho_asset(dados["path"])
        largura = dados.get("w", 16)
        self.num_figuras += 1
        par = self.doc.add_paragraph()
        par.alignment = WD_ALIGN_PARAGRAPH.CENTER
        par.paragraph_format.space_before = Pt(6)
        par.paragraph_format.space_after = Pt(2)
        par.paragraph_format.keep_with_next = True
        par.add_run().add_picture(caminho, width=Cm(largura))
        self.legenda("Figura", dados["cap"])
        if dados.get("nota"):
            self.nota(dados["nota"])

    def codigo(self, texto, titulo=None):
        if titulo:
            par = self.doc.add_paragraph()
            par.paragraph_format.space_after = Pt(2)
            par.paragraph_format.keep_with_next = True
            run = par.add_run(titulo)
            definir_fonte(run, tamanho=9, negrito=True, cor=CINZA)
        tabela = self.doc.add_table(rows=1, cols=1)
        tabela.style = "Table Grid"
        tabela.autofit = False
        celula = tabela.rows[0].cells[0]
        celula.width = Cm(17)
        sombrear(celula, "F7F7F7")
        celula.text = ""
        linhas = texto.strip("\n").split("\n")
        for i, linha in enumerate(linhas):
            par = celula.paragraphs[0] if i == 0 else celula.add_paragraph()
            par.paragraph_format.line_spacing = 1.0
            par.paragraph_format.space_after = Pt(0)
            par.paragraph_format.space_before = Pt(0)
            par.alignment = WD_ALIGN_PARAGRAPH.LEFT
            run = par.add_run(linha)
            definir_fonte(run, tamanho=8)
            run.font.name = "Consolas"
            rpr = run._element.get_or_add_rPr()
            rfonts = rpr.find(qn("w:rFonts"))
            if rfonts is not None:
                for atributo in ("w:ascii", "w:hAnsi", "w:cs"):
                    rfonts.set(qn(atributo), "Consolas")
        self.doc.add_paragraph().paragraph_format.space_after = Pt(2)

    def quebra(self):
        self.doc.add_paragraph().add_run().add_break(WD_BREAK.PAGE)

    def referencia(self, texto):
        par = self.doc.add_paragraph()
        par.paragraph_format.left_indent = Cm(1.0)
        par.paragraph_format.first_line_indent = Cm(-1.0)
        par.paragraph_format.space_after = Pt(6)
        par.paragraph_format.line_spacing = 1.15
        par.alignment = WD_ALIGN_PARAGRAPH.LEFT
        escrever_formatado(par, texto, 12)

    def aplicar(self, blocos):
        for bloco in blocos:
            tipo = bloco[0]
            if tipo == "h1":
                self.h1(bloco[1])
            elif tipo == "h2":
                self.h2(bloco[1])
            elif tipo == "h3":
                self.h3(bloco[1])
            elif tipo == "p":
                self.p(bloco[1])
            elif tipo == "citacao":
                self.citacao(bloco[1])
            elif tipo == "b":
                self.lista(bloco[1], numerada=False)
            elif tipo == "n":
                self.lista(bloco[1], numerada=True)
            elif tipo == "t":
                self.tabela(bloco[1])
            elif tipo == "f":
                self.figura(bloco[1])
            elif tipo == "code":
                self.codigo(bloco[1], bloco[2] if len(bloco) > 2 else None)
            elif tipo == "q":
                self.quebra()
            elif tipo == "nota":
                self.nota(bloco[1])
            elif tipo == "ref":
                self.referencia(bloco[1])
            else:
                raise ValueError("Bloco desconhecido: " + tipo)


# ---------------------------------------------------------------------------
# Capa e matéria pré-textual
# ---------------------------------------------------------------------------
def capa(doc):
    def linha(texto, tamanho=12, negrito=False, espaco_depois=6, alinhamento=None):
        par = doc.add_paragraph()
        par.paragraph_format.line_spacing = 1.5
        par.paragraph_format.space_after = Pt(espaco_depois)
        if alinhamento is not None:
            par.alignment = alinhamento
        run = par.add_run(texto)
        definir_fonte(run, tamanho=tamanho, negrito=negrito)
        return par

    linha("UNIVERSIDADE EDUARDO MONDLANE", 16, True, 8, WD_ALIGN_PARAGRAPH.CENTER)
    linha("Faculdade de Ciências", 12, False, 4, WD_ALIGN_PARAGRAPH.CENTER)
    linha("Departamento de Matemática e Informática", 12, False, 4, WD_ALIGN_PARAGRAPH.CENTER)
    linha("Licenciatura em Informática  -  Pós-laboral", 12, True, 12, WD_ALIGN_PARAGRAPH.CENTER)
    linha("Engenharia de Software", 12, False, 30, WD_ALIGN_PARAGRAPH.CENTER)
    linha("Trabalho Semestral — Documento Final", 14, True, 10, WD_ALIGN_PARAGRAPH.CENTER)
    linha(
        "\"Cidadão Ativo\" — Plataforma de Reporte Urbano para o Conselho Municipal de Maputo",
        12, False, 10, WD_ALIGN_PARAGRAPH.CENTER,
    )
    linha(
        "Arquitectura, implementação, garantia de qualidade e colocação em produção",
        12, False, 40, WD_ALIGN_PARAGRAPH.CENTER,
    )
    linha("Discentes:", 12, True, 2, WD_ALIGN_PARAGRAPH.LEFT)
    linha("Aurélio Langa", 12, False, 2, WD_ALIGN_PARAGRAPH.LEFT)
    linha("Nelson Dzimba", 12, False, 26, WD_ALIGN_PARAGRAPH.LEFT)
    linha("Docente (Regente): Alfredo Muchanga", 12, True, 4, WD_ALIGN_PARAGRAPH.RIGHT)
    linha("Docente (Assistente): Momade Marcos H. Abdul", 12, True, 40, WD_ALIGN_PARAGRAPH.RIGHT)
    linha("Maputo, Novembro de 2026", 12, False, 0, WD_ALIGN_PARAGRAPH.CENTER)


def resumo(doc, comp):
    doc.add_paragraph("RESUMO", style="TituloFrontMatter")
    comp.p(
        "O presente documento descreve o percurso completo de concepção, implementação, "
        "verificação e colocação em produção do Cidadão Ativo, uma plataforma web de reporte "
        "e gestão de ocorrências urbanas destinada ao Conselho Municipal de Maputo. O ponto de "
        "partida foi o Trabalho 01, onde se caracterizou o problema, se levantaram os requisitos "
        "e se definiu o modelo de processo. O documento agora apresentado retoma esse trabalho, "
        "revê-o à luz do que foi efectivamente construído e acrescenta a arquitectura detalhada, "
        "as decisões de implementação, o plano de testes, os casos de teste, a suite automatizada, "
        "os testes de sistema e os resultados obtidos."
    )
    comp.p(
        "A solução assenta numa aplicação Node.js com Express e EJS, num monólito modular "
        "executado como função serverless na Vercel, com PostgreSQL no Supabase, armazenamento de "
        "fotografias no Supabase Storage e integração opcional com a API Google Gemini. O domínio "
        "central é a denúncia urbana, cujo ciclo de vida é governado por uma máquina de estados com "
        "sete estados e transições explicitamente autorizadas. A autorização é aplicada em três "
        "dimensões — papel, município e vínculo à ocorrência — e o isolamento entre municípios é "
        "verificado por testes próprios."
    )
    comp.p(
        "A estratégia de teste seguiu a pirâmide: 98 testes unitários e 40 testes de integração, "
        "num total de 138 testes executados pelo Jest e pelo Supertest sobre um PostgreSQL real em "
        "memória (PGlite). A cobertura global dos módulos de domínio, validação, autorização e "
        "serviços situa-se em 96,72% de instruções, 92,18% de ramos, 100% de funções e 100% de "
        "linhas. Foram concebidos 27 casos de teste, nove por cada pergunta de investigação, e "
        "executados dois cenários de aceitação com cinco critérios cada. O pipeline de integração "
        "contínua no GitHub Actions executou 22 vezes, com a última execução concluída com sucesso "
        "a 17 de Novembro de 2026. A aplicação está disponível em produção e o endpoint de saúde "
        "confirma a versão implantada."
    )
    comp.p(
        "Os resultados mostram que a combinação de validação server-side, autorização explícita e "
        "uma máquina de estados testada por tabela elimina as classes de defeito que motivaram este "
        "trabalho. O documento identifica ainda os defeitos encontrados, os riscos residuais e as "
        "linhas de evolução, designadamente a inclusão da cobertura no pipeline, os testes "
        "end-to-end no browser e a acessibilidade."
    )
    par = doc.add_paragraph()
    par.paragraph_format.space_before = Pt(12)
    run = par.add_run("Palavras-chave: ")
    definir_fonte(run, tamanho=12, negrito=True)
    run = par.add_run(
        "engenharia de software; requisitos; arquitectura; testes de software; integração contínua; "
        "governação urbana digital."
    )
    definir_fonte(run, tamanho=12)


def abstract(doc, comp):
    doc.add_paragraph("ABSTRACT", style="TituloFrontMatter")
    comp.p(
        "This document describes the complete lifecycle of Cidadão Ativo, a web platform for "
        "reporting and managing urban incidents for the Maputo Municipal Council, from requirements "
        "to production. It builds on the first semester assignment, revising its requirements and "
        "project plan in the light of what was actually implemented, and adds the detailed "
        "architecture, implementation decisions, test plan, test cases, automated suite, system "
        "tests and results."
    )
    comp.p(
        "The solution is a Node.js and Express application rendered with EJS, deployed as a "
        "serverless function on Vercel, backed by PostgreSQL on Supabase, Supabase Storage for "
        "photographs and an optional Google Gemini integration. The core domain is the urban report, "
        "whose lifecycle is governed by an explicit seven-state machine. Authorisation is enforced "
        "across three dimensions — role, municipality and relationship to the report — and "
        "cross-municipality isolation is covered by dedicated tests."
    )
    comp.p(
        "The test strategy follows the test pyramid: 98 unit tests and 40 integration tests, 138 in "
        "total, executed with Jest and Supertest against a real in-memory PostgreSQL (PGlite). "
        "Global coverage of the domain, validation, authorisation and service modules is 96.72% of "
        "statements, 92.18% of branches and 100% of functions and lines. Twenty-seven test cases "
        "were designed, nine per research question, and two acceptance scenarios with five criteria "
        "each were executed. The GitHub Actions pipeline ran 22 times, the last run succeeding on "
        "17 November 2026. The application is live and its health endpoint confirms the deployed "
        "revision."
    )
    comp.p(
        "Results show that combining server-side validation, explicit authorisation and a "
        "table-driven state machine removes the defect classes that motivated this work. The "
        "document also reports defects found, residual risks and future work, namely coverage in the "
        "pipeline, browser end-to-end tests and accessibility."
    )
    par = doc.add_paragraph()
    par.paragraph_format.space_before = Pt(12)
    run = par.add_run("Keywords: ")
    definir_fonte(run, tamanho=12, negrito=True)
    run = par.add_run(
        "software engineering; requirements; architecture; software testing; continuous integration; "
        "digital urban governance."
    )
    definir_fonte(run, tamanho=12)


def indice(doc, titulo, instrucao, resultado="Sumário"):
    doc.add_paragraph(titulo, style="TituloFrontMatter")
    par = doc.add_paragraph()
    par.paragraph_format.line_spacing = 1.15
    campo(par, instrucao, resultado)
    for run in par.runs:
        definir_fonte(run, tamanho=11)


def abreviaturas(doc):
    doc.add_paragraph("LISTA DE ABREVIATURAS E SIGLAS", style="TituloFrontMatter")
    linhas = [
        ("API", "Application Programming Interface — interface de programação de aplicações"),
        ("APA", "American Psychological Association — norma de referenciação"),
        ("CI", "Continuous Integration — integração contínua"),
        ("CMM", "Conselho Municipal de Maputo"),
        ("CSRF", "Cross-Site Request Forgery — falsificação de pedido entre sítios"),
        ("CSP", "Content Security Policy — política de segurança de conteúdos"),
        ("CSS", "Cascading Style Sheets — folhas de estilo em cascata"),
        ("CSV", "Comma-Separated Values — valores separados por vírgulas"),
        ("DoD", "Definition of Done — definição de concluído"),
        ("E1–E6", "Entregáveis do trabalho semestral de Teste de Software"),
        ("ERD", "Entity-Relationship Diagram — diagrama entidade-relação"),
        ("GPS", "Global Positioning System — sistema de posicionamento global"),
        ("HLD", "High-Level Design — desenho de alto nível"),
        ("HTTP", "Hypertext Transfer Protocol — protocolo de transferência de hipertexto"),
        ("IA", "Inteligência Artificial"),
        ("ISO", "International Organization for Standardization"),
        ("JSON", "JavaScript Object Notation"),
        ("LLD", "Low-Level Design — desenho de baixo nível"),
        ("MVC", "Model-View-Controller — modelo-visão-controlador"),
        ("OWASP", "Open Worldwide Application Security Project"),
        ("PGlite", "PostgreSQL compilado para WebAssembly, executado em memória"),
        ("RF", "Requisito Funcional"),
        ("RLS", "Row-Level Security — segurança ao nível da linha"),
        ("RNF", "Requisito Não Funcional"),
        ("RQ", "Research Question — pergunta de investigação"),
        ("SLA", "Service Level Agreement — acordo de nível de serviço"),
        ("SQL", "Structured Query Language — linguagem de consulta estruturada"),
        ("TNR", "Times New Roman"),
        ("UEM", "Universidade Eduardo Mondlane"),
        ("XSS", "Cross-Site Scripting — execução de scripts entre sítios"),
    ]
    tabela = doc.add_table(rows=0, cols=2)
    tabela.autofit = False
    for sigla, significado in linhas:
        linha = tabela.add_row()
        nao_dividir(linha)
        c0, c1 = linha.cells
        c0.width = Cm(3)
        c1.width = Cm(14)
        p0 = c0.paragraphs[0]
        p0.paragraph_format.line_spacing = 1.0
        p0.paragraph_format.space_after = Pt(2)
        run = p0.add_run(sigla)
        definir_fonte(run, tamanho=11, negrito=True)
        p1 = c1.paragraphs[0]
        p1.paragraph_format.line_spacing = 1.0
        p1.paragraph_format.space_after = Pt(2)
        run = p1.add_run(significado)
        definir_fonte(run, tamanho=11)


# ---------------------------------------------------------------------------
# Construção
# ---------------------------------------------------------------------------
def construir():
    doc = Document()
    configurar_estilos(doc)

    secao_capa = doc.sections[0]
    secao_capa.page_width = Cm(21)
    secao_capa.page_height = Cm(29.7)
    for atributo in ("top_margin", "bottom_margin", "left_margin", "right_margin"):
        setattr(secao_capa, atributo, Cm(2))
    secao_capa.header_distance = Cm(1.25)
    secao_capa.footer_distance = Cm(1.25)

    capa(doc)

    # --- matéria pré-textual (numeração romana)
    secao_pre = doc.add_section(WD_SECTION.NEW_PAGE)
    numero_de_pagina_romano(secao_pre, "lowerRoman", 1)
    for atributo in ("top_margin", "bottom_margin", "left_margin", "right_margin"):
        setattr(secao_pre, atributo, Cm(2))
    cabecalho(secao_pre, "Cidadão Ativo — Documento Final")
    rodape_com_pagina(secao_pre)

    comp = Compositor(doc)
    resumo(doc, comp)
    doc.add_page_break()
    abstract(doc, comp)
    doc.add_page_break()
    indice(doc, "ÍNDICE", 'TOC \\o "1-3" \\h \\z \\u')
    doc.add_page_break()
    indice(doc, "ÍNDICE DE FIGURAS", 'TOC \\h \\z \\t "LegendaFigura,1"')
    doc.add_page_break()
    indice(doc, "ÍNDICE DE TABELAS", 'TOC \\h \\z \\t "LegendaTabela,1"')
    doc.add_page_break()
    abreviaturas(doc)

    # --- corpo (numeração árabe a partir de 1)
    secao_corpo = doc.add_section(WD_SECTION.NEW_PAGE)
    numero_de_pagina_romano(secao_corpo, "decimal", 1)
    for atributo in ("top_margin", "bottom_margin", "left_margin", "right_margin"):
        setattr(secao_corpo, atributo, Cm(2))
    cabecalho(secao_corpo, "Cidadão Ativo — Documento Final")
    rodape_com_pagina(secao_corpo)

    for modulo in (conteudo_1, conteudo_2, conteudo_3, conteudo_4):
        comp.aplicar(modulo.blocos())

    # Os campos e os índices são actualizados no Word (Fields.Update e
    # TablesOfContents.Update) e o resultado é guardado no ficheiro final.
    # Não se activa w:updateFields para evitar que o Word actualize todos os
    # campos automaticamente ao abrir, o que torna a abertura muito lenta.

    doc.core_properties.title = "Trabalho Semestral — Documento Final"
    doc.core_properties.subject = "Cidadão Ativo — Plataforma de Reporte Urbano para o Conselho Municipal de Maputo"
    doc.core_properties.author = "Aurélio Langa e Nelson Dzimba"
    doc.core_properties.keywords = "engenharia de software; testes; arquitectura; Cidadão Ativo"
    doc.core_properties.language = "pt-MZ"

    doc.save(SAIDA)
    print("Documento gravado em", os.path.abspath(SAIDA))
    print("Figuras:", comp.num_figuras, "| Tabelas:", comp.num_tabelas)


if __name__ == "__main__":
    construir()
