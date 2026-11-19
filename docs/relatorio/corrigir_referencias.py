# -*- coding: utf-8 -*-
"""Corrige as referências numéricas a tabelas e figuras e pequenas gralhas."""
import io
import re
import sys

BASE = "docs/relatorio/"

def corrigir(nome, tabelas, figuras, substituicoes=()):
    caminho = BASE + nome + ".py"
    texto = io.open(caminho, encoding="utf-8").read()

    def troca_tabela(m):
        n = int(m.group(1))
        return "Tabela %d" % tabelas[n] if n in tabelas else m.group(0)

    def troca_figura(m):
        n = int(m.group(1))
        return "Figura %d" % figuras[n] if n in figuras else m.group(0)

    texto, n_tab = re.subn(r"Tabela (\d+)", troca_tabela, texto)
    texto, n_fig = re.subn(r"Figura (\d+)", troca_figura, texto)

    for antigo, novo in substituicoes:
        if texto.count(antigo) != 1:
            print("ERRO: %r ocorre %d vezes em %s" % (antigo, texto.count(antigo), nome))
            sys.exit(1)
        texto = texto.replace(antigo, novo)

    io.open(caminho, "w", encoding="utf-8", newline="\n").write(texto)
    print("%s: %d referências a tabelas, %d a figuras, %d substituições"
          % (nome, n_tab, n_fig, len(substituicoes)))


corrigir("conteudo_1",
         {5: 6, 6: 7},
         {},
         ())

corrigir("conteudo_2",
         {n: n + 1 for n in range(7, 23)},
         {n: n + 1 for n in range(3, 11)},
         (
             ("cidatao-ativo/", "cidadao-ativo/"),
             ("`lerBytes`.\\\"\"],", "`lerBytes`.\"],"),
         ))

corrigir("conteudo_3",
         {n: n + 1 for n in range(25, 39)},
         {},
         ())
