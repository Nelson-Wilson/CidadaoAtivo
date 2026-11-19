# -*- coding: utf-8 -*-
"""Capítulos 10 a 12, referências e anexos."""


def blocos():
    return [
        # ------------------------------------------------------------------
        ("h1", "10. Resultados e discussão (E6)"),
        ("p", "Este capítulo responde ao entregável E6. Apresenta os resultados da execução "
              "automatizada, a resposta a cada pergunta de investigação, o registo dos defeitos "
              "encontrados, os riscos residuais, as lições aprendidas e as ameaças à validade. "
              "A distinção entre resultado e interpretação é mantida ao longo de todo o capítulo: "
              "os números são apresentados primeiro, a leitura crítica vem depois."),

        ("h2", "10.1 Resultados da execução automatizada"),
        ("p", "A execução de referência foi realizada em 18 de Novembro de 2026, sobre o commit "
              "`c9084b4`, com Node.js 24.19.0 no ambiente local e Node.js 22 no pipeline. A "
              "Tabela 40 resume os valores. Os 138 testes passaram sem falhas e sem testes "
              "ignorados. A suite unitária demorou 3,043 segundos e a de integração 30,967 "
              "segundos; o conjunto completo fica, tipicamente, abaixo dos 35 segundos."),
        ("t", {
            "cap": "Resultados globais da execução automatizada",
            "cols": ["Nível", "Ficheiros", "Testes", "Tempo", "Taxa de sucesso"],
            "w": [3.6, 2.6, 2.6, 3.8, 4.4],
            "f": 9.5,
            "align": ["left", "center", "center", "center", "center"],
            "rows": [
                ["Unitários", "9", "98", "3,043 s", "100%"],
                ["Integração", "4", "40", "30,967 s", "100%"],
                ["Total", "13", "138", "≈ 34 s", "100%"],
            ],
        }),
        ("p", "A cobertura foi medida apenas sobre os testes unitários, como explicado na secção "
              "9.5. O resultado global é de 96,72% de instruções, 92,18% de ramos, 100% de funções "
              "e 100% de linhas. Os dois módulos de regras puras — a máquina de estados e o "
              "encaminhamento — atingem 100% em todas as métricas. O valor mais baixo de ramos "
              "ocorre em `servicoPrioridade.js` (81,08%), por existirem combinações de factores que "
              "não alteram o resultado final. Estes valores são superiores aos mínimos definidos no "
              "plano (80% de instruções e 75% de ramos)."),
        ("p", "O pipeline de integração contínua executou 22 vezes entre a criação do repositório e "
              "18 de Novembro de 2026. A última execução concluída com sucesso ocorreu a 17 de "
              "Novembro de 2026, com o identificador 44066884111, sobre o commit `c9084b4`. O "
              "tempo total do workflow manteve-se abaixo de três minutos, muito longe do limite de "
              "15 minutos configurado. O endpoint `/health` da instância de produção confirmou, na "
              "mesma data, `status = ok`, `storage = supabase`, `ai = gemini` e `commit = c9084b4`, "
              "o que demonstra que a versão testada é a versão implantada."),
        ("p", "A leitura conjunta destes números permite três conclusões. Primeiro, a suite é "
              "suficientemente rápida para ser executada em cada push, o que a torna útil como "
              "mecanismo de prevenção e não apenas como relatório final. Segundo, a cobertura "
              "elevada incide precisamente sobre o núcleo de regras, e não sobre código trivial. "
              "Terceiro, a correspondência entre o commit testado e o commit em produção elimina a "
              "ambiguidade que existiria se o deployment não fosse rastreável."),

        ("h2", "10.2 Resultados por pergunta de investigação"),
        ("p", "Os 27 casos de teste do capítulo 8 foram executados e todos produziram o resultado "
              "esperado. A Tabela 41 relaciona cada pergunta de investigação com os casos "
              "concebidos, os testes que os executam e o risco que cobrem. A coluna “Aprovados” "
              "refere-se aos casos do capítulo 8; a coluna “Testes” indica os ficheiros ou grupos "
              "que os automatizam."),
        ("t", {
            "cap": "Resultados por pergunta de investigação",
            "cols": ["RQ", "Casos", "Testes que executam os casos", "Aprovados", "Risco coberto"],
            "w": [1.2, 1.4, 8.6, 1.8, 4.0],
            "f": 8.8,
            "align": ["center", "center", "left", "center", "left"],
            "rows": [
                ["RQ1", "9", "validation (21), fluxo-denuncia (9), storage (9), encaminhamento (3)",
                 "9/9", "Registos inválidos, ficheiros falsificados e pedidos forjados."],
                ["RQ2", "9", "authorization (16), seguranca (9), participacao (14)",
                 "9/9", "Acesso indevido, fuga entre municípios e escalada de privilégios."],
                ["RQ3", "9", "estadosDenuncia (10), fluxo-denuncia (9), participacao (14)",
                 "9/9", "Transições inválidas, estados finais e corrupção por concorrência."],
            ],
        }),
        ("p", "**RQ1 — validação na criação.** A resposta é afirmativa e assenta em quatro "
              "mecanismos: validação server-side com mensagens específicas, análise de valores "
              "limite para os campos textuais, verificação da assinatura real do ficheiro e "
              "protecção CSRF em todos os pedidos de escrita. Os nove casos de RQ1 passaram, "
              "incluindo as fronteiras de 9/10 e 5.000/5.001 caracteres, a recusa de fotografia "
              "ausente, a recusa de conteúdo incompatível com o MIME declarado e a rejeição de "
              "pedidos sem token. O teste de integração confirma não apenas o código de resposta, "
              "mas também que a contagem de denúncias não se altera após uma tentativa inválida."),
        ("p", "**RQ2 — autorização e isolamento.** A resposta é afirmativa. A autorização está "
              "concentrada em três funções puras e é aplicada em todas as rotas sensíveis. Os "
              "testes demonstram que o cidadão autor acede, que o cidadão não autor recebe 404, "
              "que o gestor da Matola não vê nem altera denúncias de Maputo, que o técnico só "
              "acede às tarefas que lhe estão atribuídas e que o administrador acede a qualquer "
              "município. O caso mais delicado — atribuir um técnico de outro município — é "
              "rejeitado tanto pela função de autorização como pela rota, o que constitui uma "
              "defesa em profundidade."),
        ("p", "**RQ3 — consistência da máquina de estados.** A resposta é afirmativa, com uma "
              "nuance importante. A tabela explícita de transições elimina as transições inválidas "
              "e os estados finais sem saída. Mas a consistência perante concorrência só foi "
              "garantida depois de o teste dedicado ter revelado o defeito D08: duas transições "
              "simultâneas podiam duplicar o histórico. A correcção com `SELECT ... FOR UPDATE` "
              "dentro de uma transacção resolveu o problema, e o teste passou a proteger a "
              "regressão. A lição é que a correcção funcional e a correcção sob concorrência são "
              "propriedades distintas e exigem testes distintos."),

        ("h2", "10.3 Defeitos encontrados"),
        ("p", "Foram registados catorze defeitos ao longo do projecto. A Tabela 42 apresenta-os "
              "por ordem de identificação, com a gravidade, a fase em que foram detectados, a "
              "causa e a correcção aplicada. A distinção entre “corrigido” e “mitigado” é "
              "relevante: todos os defeitos foram corrigidos, mas dois exigiram alterações "
              "estruturais — a transacção com bloqueio e a validação de sessão no store."),
        ("t", {
            "cap": "Registo de defeitos",
            "cols": ["ID", "Defeito", "Grav.", "Fase", "Causa", "Correcção"],
            "w": [1.0, 5.2, 1.3, 2.3, 3.4, 3.8],
            "f": 7.6,
            "rows": [
                ["D01", "Pedido à raiz do domínio devolvia 404 na Vercel.", "Média", "Produção",
                 "Apenas `/inicio` estava mapeado; a raiz não redireccionava.",
                 "Rota `GET /` com redireccionamento 302 para `/inicio`; verificação em produção."],
                ["D02", "Mapa sem tiles em produção devido à CSP.", "Alta", "Produção",
                 "`img-src` não incluía os domínios de tiles do CARTO e da Esri.",
                 "Lista explícita de origens de tiles na CSP; teste de cabeçalhos."],
                ["D03", "Contadores de rate limit partilhavam a mesma chave.", "Média",
                 "Testes de integração", "Chave sem namespace por operação.",
                 "Namespace por operação (`auth:`, `comment:`, `report:`); teste de independência."],
                ["D04", "Endpoints `/api/ai/*` aceitavam POST sem CSRF.", "Alta",
                 "Revisão de código", "Middleware aplicado apenas aos formulários HTML.",
                 "`verifyCsrf` nos endpoints; testes de 419 sem token."],
                ["D05", "Sessões continuavam válidas após alteração da conta.", "Alta",
                 "Revisão de código", "O store não validava a existência do utilizador.",
                 "Validação do utilizador no store e destruição de sessões; teste de revogação."],
                ["D06", "Comentário com HTML era interpretado na página.", "Alta",
                 "Testes de segurança", "Uso de `<%- %>` numa vista em vez de escape.",
                 "Escape automático e teste com `<script>`; CSP sem `unsafe-inline`."],
                ["D07", "Exportação CSV permitia injecção de fórmulas.", "Média",
                 "Revisão de código", "Valores exportados sem neutralização.",
                 "Prefixação com apóstrofo para `=`, `+`, `-` e `@`; teste dedicado."],
                ["D08", "Duas transições concorrentes duplicavam o histórico.", "Crítica",
                 "Testes de integração", "Leitura do estado e actualização sem bloqueio de linha.",
                 "Transacção com `SELECT ... FOR UPDATE`; teste de concorrência."],
                ["D09", "Fotografia órfã quando a transacção falhava.", "Média",
                 "Revisão de código", "Upload antes do commit, sem compensação.",
                 "Remoção compensatória em caso de erro; teste de resolução atómica."],
                ["D10", "Arranque aceitava `SESSION_SECRET` curto.", "Alta",
                 "Revisão de configuração", "Validação apenas da presença da variável.",
                 "Mínimo de 32 caracteres e recusa em produção; verificação no `preflight`."],
                ["D11", "Upload aceitava texto com MIME `image/jpeg`.", "Alta",
                 "Testes unitários", "Validação apenas do MIME declarado pelo cliente.",
                 "Verificação dos primeiros bytes (JPEG, PNG, WebP); teste de assinatura."],
                ["D12", "Chamada à IA sem timeout nem fallback.", "Média", "Testes unitários",
                 "`fetch` sem `AbortController` e sem modelo alternativo.",
                 "Timeout, modelo de fallback e erro controlado; testes com 503 e expiração."],
                ["D13", "Comentário público mostrava o nome real do autor.", "Média",
                 "Testes de integração", "Vista usava o nome em vez do pseudónimo.",
                 "Pseudónimo estável por utilizador; teste de privacidade."],
                ["D14", "Dashboard escrevia “1 dias” e “1 avaliações”.", "Baixa",
                 "Inspecção visual", "Pluralização fixa no template.",
                 "Pluralização condicional e revisão das capturas."],
            ],
        }),
        ("p", "A distribuição por gravidade e por fase está na Tabela 43. Um único defeito foi "
              "classificado como crítico — a duplicação de histórico por concorrência — e foi "
              "detectado por um teste de integração, não em produção. Dos catorze defeitos, doze "
              "foram detectados antes da entrada em produção, o que corresponde a 85,7%. Os dois "
              "defeitos detectados em produção (D01 e D02) são de configuração e de implantação, "
              "não de domínio, o que sugere que o esforço de teste foi correctamente dirigido às "
              "regras de negócio, mas que o ambiente de produção merece uma verificação própria."),
        ("t", {
            "cap": "Distribuição dos defeitos por gravidade e por fase",
            "cols": ["Categoria", "Valor", "Quantidade", "Percentagem"],
            "w": [3.4, 6.6, 2.6, 3.0],
            "f": 9,
            "align": ["left", "left", "center", "center"],
            "rows": [
                ["Gravidade", "Crítica", "1", "7,1%"],
                ["Gravidade", "Alta", "6", "42,9%"],
                ["Gravidade", "Média", "6", "42,9%"],
                ["Gravidade", "Baixa", "1", "7,1%"],
                ["Fase", "Revisão de código", "5", "35,7%"],
                ["Fase", "Testes automatizados", "6", "42,9%"],
                ["Fase", "Produção", "2", "14,3%"],
                ["Fase", "Inspecção visual", "1", "7,1%"],
                ["Total", "—", "14", "100%"],
            ],
        }),
        ("p", "A densidade de defeitos é de aproximadamente 3,5 por mil linhas de JavaScript "
              "(14 defeitos para 4.038 linhas), um valor que deve ser lido com cautela: não é "
              "comparável a métricas industriais, porque a contagem inclui defeitos de "
              "configuração e de interface e porque o código foi escrito por dois autores com "
              "revisão cruzada permanente. O valor útil não é a densidade absoluta, mas a "
              "distribuição: a maior parte dos defeitos (42,9%) foi encontrada por testes "
              "automatizados, o que confirma o retorno do investimento na suite."),
        ("p", "A análise por causa revela quatro padrões. O primeiro é a **fronteira de "
              "confiança**: D04, D06, D11 e D13 resultam de assumir que o cliente ou a vista "
              "fariam a coisa certa. O segundo é a **atomicidade**: D08 e D09 resultam de "
              "operações compostas sem compensação ou sem bloqueio. O terceiro é a "
              "**configuração**: D01, D02 e D10 só se manifestam no ambiente real. O quarto é a "
              "**apresentação**: D14 não afecta a correcção, mas afecta a credibilidade. Cada "
              "padrão sugere um tipo de teste: negativo, de concorrência, de fumo em produção e "
              "de inspecção visual. A leitura dos defeitos por fase e por causa segue a lógica de "
              "análise experimental de Wohlin et al. (2012), adaptada a um estudo de caso único."),

        ("h2", "10.4 Riscos residuais"),
        ("p", "Os riscos residuais são os que permanecem após as mitigações implementadas. A "
              "Tabela 44 apresenta os dez mais relevantes, com a probabilidade, o impacto, a "
              "mitigação actual e o trabalho futuro que os reduziria. Nenhum é bloqueante para a "
              "entrega, mas três merecem acompanhamento: a ausência de testes end-to-end no "
              "browser, a acessibilidade não auditada e a cobertura fora do pipeline."),
        ("t", {
            "cap": "Riscos residuais",
            "cols": ["ID", "Risco", "Prob.", "Impacto", "Mitigação actual", "Trabalho futuro"],
            "w": [1.1, 4.4, 1.2, 1.4, 5.0, 3.9],
            "f": 8.2,
            "rows": [
                ["RR01", "Limites dos planos gratuitos de Vercel e Supabase.", "Média", "Médio",
                 "Consultas eficientes, armazenamento externo e monitorização do `/health`.",
                 "Avaliar plano pago e definir alertas de consumo."],
                ["RR02", "Indisponibilidade de fornecedores externos.", "Média", "Alto",
                 "Contingência determinística da IA; arquitectura portável.",
                 "Procedimento de migração e monitorização sintética."],
                ["RR03", "Ausência de testes end-to-end no browser.", "Alta", "Médio",
                 "Aceitação manual com dez critérios e testes HTTP de integração.",
                 "Introduzir Playwright para os fluxos críticos."],
                ["RR04", "Acessibilidade não auditada formalmente.", "Média", "Médio",
                 "Etiquetas, foco visível e contraste nas vistas principais.",
                 "Auditoria WCAG 2.2 AA e testes com leitor de ecrã."],
                ["RR05", "Cobertura não verificada pelo pipeline.", "Média", "Baixo",
                 "Execução local de `npm run test:coverage` antes de cada entrega.",
                 "Incluir a cobertura no workflow e publicar o relatório."],
                ["RR06", "Ausência de testes de carga.", "Média", "Médio",
                 "Limites de upload, consultas indexadas e cache de estáticos.",
                 "Testes com k6 ou Artillery sobre os percursos de leitura."],
                ["RR07", "Detecção de duplicados heurística.", "Alta", "Baixo",
                 "Revisão humana na triagem e referência à ocorrência original.",
                 "Ajustar limiar e combinar texto, GPS e categoria."],
                ["RR08", "Ausência de teste de penetração formal.", "Baixa", "Alto",
                 "Controlos alinhados com OWASP ASVS e testes negativos.",
                 "Pentest independente antes de uso institucional."],
                ["RR09", "Recuperação de desastres não ensaiada.", "Baixa", "Alto",
                 "Backups geridos pelo Supabase.",
                 "Ensaio de restauro documentado e verificado."],
                ["RR10", "Fotografias de demonstração de terceiros.", "Baixa", "Baixo",
                 "Licenças livres e atribuição no Anexo E.",
                 "Substituir por fotografias próprias na versão institucional."],
            ],
        }),
        ("p", "A avaliação de risco mostra um perfil assimétrico: os riscos de maior impacto "
              "(RR02, RR08, RR09) têm probabilidade baixa ou média, enquanto os de maior "
              "probabilidade (RR03, RR07) têm impacto médio ou baixo. Esta assimetria é "
              "confortável para uma entrega académica, mas não seria suficiente para uma operação "
              "institucional em larga escala. Nesse cenário, os riscos RR02, RR08 e RR09 teriam "
              "de ser tratados antes da entrada em serviço."),

        ("h2", "10.5 Lições aprendidas"),
        ("p", "A primeira lição é que **a tabela de transições é um instrumento de desenho e de "
              "teste**. Ao concentrar os pares válidos numa estrutura de dados, tornou-se possível "
              "enumerar exaustivamente as 49 combinações e testá-las em poucas linhas. Se a regra "
              "estivesse dispersa por condições nas rotas, o teste exaustivo seria impraticável."),
        ("p", "A segunda lição é que **os testes de integração encontram defeitos que os testes "
              "unitários não conseguem ver**. O defeito D08 não estava em nenhuma função isolada: "
              "estava na ausência de bloqueio entre duas operações correctas. Só um teste que "
              "executasse dois pedidos concorrentes sobre a base de dados real o poderia revelar. "
              "Isto justifica o custo dos 31 segundos da suite de integração."),
        ("p", "A terceira lição é que **os casos negativos são tão importantes como os "
              "positivos**. Dezanove dos 27 casos do capítulo 8 verificam rejeições. Um sistema "
              "que aceita o que deve aceitar e rejeita o que deve rejeitar é um sistema seguro; "
              "um sistema que aceita tudo é apenas um sistema permissivo. A verificação de "
              "ausência de efeitos colaterais — e não apenas do código HTTP — foi decisiva."),
        ("p", "A quarta lição é que **a configuração é parte do produto**. Dois dos catorze "
              "defeitos só apareceram em produção, e nenhum deles era de lógica: eram CSP e rotas. "
              "Um teste de fumo executado após o deployment teria detectado ambos. A recomendação "
              "para trabalho futuro inclui, por isso, uma verificação automática pós-deployment."),
        ("p", "A quinta lição é que **a documentação tem de descrever o sistema implantado**. "
              "Várias decisões iniciais — fotografia opcional, ausência de SLA por categoria, IA "
              "obrigatória — foram alteradas durante a implementação. Manter o documento fiel ao "
              "que existe exigiu revisão contínua e evitou a situação, comum em trabalhos "
              "académicos, de apresentar um sistema que já não corresponde ao código."),
        ("p", "A sexta lição é que **a qualidade percebida conta**. O defeito D14 — “1 dias” — não "
              "altera nenhuma regra, mas foi imediatamente visível na captura de ecrã e teria "
              "comprometido a credibilidade do dashboard. A inspecção visual com dados realistas "
              "revelou o que os testes automáticos não procuram: coerência de linguagem e de "
              "apresentação."),

        ("h2", "10.6 Ameaças à validade"),
        ("p", "A validade interna foi protegida pela utilização de uma base de dados PostgreSQL "
              "real em memória, por fixtures determinísticas e pela execução em série. Ainda "
              "assim, as fixtures são simplificadas: dois municípios, quatro categorias e sete "
              "utilizadores não reproduzem a complexidade de uma organização real. Um defeito que "
              "só aparecesse com centenas de categorias ou com dezenas de departamentos não seria "
              "detectado."),
        ("p", "A validade externa é limitada pelo desenho de estudo de caso único. Os resultados "
              "demonstram que a solução funciona para o CMM no âmbito definido, mas não permitem "
              "generalizar para outros municípios ou outros domínios sem adaptação. A arquitectura "
              "é portável, mas as regras de negócio — SLAs, categorias, departamentos — são "
              "específicas."),
        ("p", "A validade de constructo depende da ligação entre as perguntas de investigação e as "
              "métricas usadas. A cobertura é um indicador imperfeito: mede execução de código, "
              "não qualidade das asserções. Procurou-se compensar esta limitação com a revisão "
              "cruzada, com a descrição explícita do que cada teste verifica e com a exigência de "
              "que os casos negativos verificassem a ausência de efeitos. A validade de conclusão "
              "não recorre a inferência estatística; os resultados são descritivos e "
              "reprodutíveis, e não amostrais."),
        ("p", "Uma ameaça adicional é a **subjectividade da classificação de gravidade**. A escala "
              "usada — crítica, alta, média, baixa — foi aplicada pelos autores, sem revisão "
              "independente. Um revisor externo poderia classificar D02 como média e D13 como "
              "alta. A classificação deve, por isso, ser lida como orientação e não como medida "
              "absoluta."),

        ("h2", "10.7 Síntese do capítulo"),
        ("p", "Os resultados sustentam três afirmações. A primeira é que o sistema cumpre os "
              "requisitos críticos e os requisitos não funcionais de segurança, integridade e "
              "privacidade, com evidência automatizada e manual. A segunda é que a suite detecta "
              "regressões nas áreas de maior risco e o faz em tempo compatível com a integração "
              "contínua. A terceira é que subsistem riscos conhecidos — browser, acessibilidade, "
              "carga e recuperação — que estão identificados e têm trabalho futuro associado. A "
              "combinação de resultados e riscos é, por si só, o retrato honesto do estado do "
              "projecto."),
        ("q",),

        # ------------------------------------------------------------------
        ("h1", "11. Testes de sistema e de aceitação (E4)"),
        ("p", "Este capítulo responde ao entregável E4. Os testes de sistema verificam o "
              "comportamento do sistema completo contra os requisitos; os testes de aceitação "
              "verificam se o sistema satisfaz as necessidades dos utilizadores. Neste trabalho, "
              "os dois níveis foram combinados em dois cenários de negócio, executados sobre a "
              "aplicação em funcionamento, com as personas definidas nas fixtures e com "
              "verificação visual e por chamadas HTTP."),
        ("p", "A opção por cenários, em vez de uma lista de ecrãs, segue a lógica de validação "
              "descrita por Sommerville (2016): o utilizador não avalia funcionalidades isoladas, "
              "avalia a capacidade de completar um objectivo. Cada cenário tem cinco critérios no "
              "formato Dado/Quando/Então, o que torna o resultado verificável e reproduzível."),

        ("h2", "11.1 Método, personas e ambiente"),
        ("p", "Os cenários foram executados no servidor de demonstração descrito no Anexo F, "
              "semeado com dois municípios, dez utilizadores, catorze denúncias, comentários, "
              "apoios, avaliações e fotografias. A base de dados é PGlite em memória, o "
              "armazenamento é local e as funcionalidades de IA estão desligadas, para que o "
              "resultado não dependa de um serviço externo. A aplicação de produção foi também "
              "verificada por consulta ao endpoint de saúde e por navegação nas páginas públicas."),
        ("p", "As personas são as mesmas das fixtures: Maria, cidadã de Maputo, autora de várias "
              "denúncias; João, gestor municipal de Maputo; Carlos, técnico de vias de Maputo; e "
              "Ana, gestora da Matola. A escolha de duas cidadãs e de dois municípios permite "
              "testar o isolamento sem criar actores artificiais. As palavras-passe são de "
              "demonstração e não são reutilizadas em produção."),
        ("p", "Cada critério foi executado uma vez pelo autor que não o tinha concebido, para "
              "reduzir o enviesamento de confirmação. O resultado foi registado com o estado "
              "observado, a captura de ecrã correspondente e, quando aplicável, o código HTTP. "
              "Uma discrepância entre o esperado e o observado era registada como defeito e "
              "corrigida antes de o critério ser considerado aprovado."),

        ("h2", "11.2 Cenário A — do reporte à avaliação"),
        ("p", "O cenário A percorre o ciclo completo de uma denúncia de buraco na via: Maria "
              "regista, João tria e atribui, Carlos executa e comprova, Maria avalia e o caso "
              "fecha. É o cenário que dá sentido ao sistema, porque nenhum dos actores consegue "
              "completá-lo sozinho. A Tabela 45 apresenta os cinco critérios."),
        ("t", {
            "cap": "Cenário A — critérios de aceitação (Dado/Quando/Então)",
            "cols": ["ID", "Dado que", "Quando", "Então", "Evidência"],
            "w": [1.2, 4.4, 4.0, 5.0, 2.4],
            "f": 8.4,
            "rows": [
                ["CA-A1", "Maria está autenticada e preenche categoria, descrição, fotografia e "
                          "localização válidas.",
                 "Submete o formulário de nova denúncia.",
                 "A denúncia é criada no estado “recebida”, com fotografia, coordenadas e "
                 "histórico inicial; Maria é redireccionada para a lista pessoal.",
                 "Figura 7; teste TC-RQ1-01."],
                ["CA-A2", "João é gestor de Maputo e a denúncia está “recebida”.",
                 "Abre a triagem, atribui Carlos (Vias/Maputo) e confirma.",
                 "O estado passa a “atribuida”; o histórico regista João, Carlos e a data; "
                 "Carlos vê a tarefa na sua lista.",
                 "Figura 17; TC-RQ2-03."],
                ["CA-A3", "Carlos tem a tarefa atribuída e está no terreno.",
                 "Inicia a execução e submete a fotografia de resolução com observações.",
                 "O estado passa a “em execução” e depois a “resolvida”; a prova fotográfica e "
                 "a nota ficam visíveis para Maria.",
                 "Figuras 15 e 16; TC-RQ3-06."],
                ["CA-A4", "Maria vê a denúncia “resolvida” e o serviço foi concluído.",
                 "Atribui a nota 5 e submete a avaliação.",
                 "A avaliação é registada uma única vez e a denúncia passa a “fechada”; o "
                 "histórico regista o fecho.",
                 "TC-RQ3-08."],
                ["CA-A5", "A denúncia está “fechada”.",
                 "Maria tenta avaliar novamente e João tenta alterar o estado.",
                 "As duas operações são recusadas sem alterar o estado, o histórico ou a "
                 "avaliação existente.",
                 "TC-RQ3-04 e TC-RQ3-08."],
            ],
        }),
        ("p", "A execução do cenário A revelou um comportamento que merece registo. Na primeira "
              "tentativa, a atribuição a Carlos foi aceite, mas o histórico mostrava duas "
              "entradas com o mesmo estado, porque o pedido de mudança de estado foi reenviado "
              "pelo browser. A investigação concluiu que se tratava de uma dupla submissão do "
              "formulário, não de um defeito do servidor; ainda assim, foi acrescentado um "
              "desactivar do botão após o primeiro clique e o fluxo passou a produzir uma única "
              "entrada. O caso não entrou na tabela de defeitos por ser de interface, mas ilustra "
              "a utilidade da execução manual."),

        ("h2", "11.3 Cenário B — isolamento municipal e operação"),
        ("p", "O cenário B verifica aquilo que o cenário A não cobre: o comportamento do sistema "
              "quando os actores tentam sair do seu âmbito. Ana é gestora da Matola e não deve "
              "ver nem alterar denúncias de Maputo; João deve ver apenas os indicadores do seu "
              "município; o visitante deve ver a ocorrência pública sem dados pessoais; e a "
              "exportação CSV não deve permitir injecção de fórmulas. A Tabela 46 apresenta os "
              "cinco critérios."),
        ("t", {
            "cap": "Cenário B — critérios de aceitação (Dado/Quando/Então)",
            "cols": ["ID", "Dado que", "Quando", "Então", "Evidência"],
            "w": [1.2, 4.4, 4.0, 5.0, 2.4],
            "f": 8.4,
            "rows": [
                ["CA-B1", "Ana é gestora da Matola e existe uma denúncia de Maputo.",
                 "Tenta abrir o detalhe e alterar o estado da denúncia de Maputo.",
                 "Recebe 404 nas duas operações; o estado e o histórico permanecem inalterados.",
                 "TC-RQ2-04; teste de integração de segurança."],
                ["CA-B2", "João abre o dashboard municipal e existem denúncias nos dois "
                          "municípios.",
                 "Compara os indicadores com uma consulta directa à base de dados.",
                 "Os totais, o SLA e a satisfação contam apenas denúncias de Maputo; a Matola "
                 "não aparece no ranking nem no mapa de calor.",
                 "Figura 11; TC-RQ2-08."],
                ["CA-B3", "João exporta o CSV e existe uma descrição que começa por “=”.",
                 "Descarrega e abre o ficheiro numa folha de cálculo.",
                 "O valor é prefixado com apóstrofo e apresentado como texto; nenhuma fórmula é "
                 "executada.",
                 "TC-RQ2-08; teste de exportação."],
                ["CA-B4", "Um visitante sem sessão abre a página pública de uma ocorrência "
                          "comentada.",
                 "Consulta os comentários e o autor da denúncia.",
                 "Vê pseudónimos estáveis e nunca o nome real, o email ou a palavra-passe; a "
                 "fotografia e a localização pública são apresentadas.",
                 "TC-RQ2-06; teste de privacidade."],
                ["CA-B5", "Carlos é técnico de Vias/Maputo e o administrador está autenticado.",
                 "Carlos tenta abrir uma denúncia não atribuída; o administrador abre a mesma "
                 "denúncia.",
                 "Carlos recebe 404; o administrador acede e pode gerir, independentemente do "
                 "município.",
                 "Figura 15; TC-RQ2-05 e TC-RQ2-06."],
            ],
        }),
        ("p", "O cenário B confirmou o comportamento esperado em todos os critérios e não revelou "
              "defeitos novos. A verificação mais demorada foi a do CSV, porque exigiu inspeccionar "
              "o ficheiro gerado e confirmar que o apóstrofo não era apenas visual. A segunda mais "
              "demorada foi a do dashboard, porque obrigou a comparar os indicadores com consultas "
              "SQL directas. Esta comparação é importante: um dashboard que apresente números "
              "plausíveis mas errados passaria numa inspecção visual."),

        ("h2", "11.4 Evidências"),
        ("p", "As Figuras 15 a 18 documentam os momentos principais dos dois cenários. A Figura "
              "15 mostra a lista de tarefas do técnico, com o estado e a prioridade de cada uma; "
              "a Figura 16 mostra o detalhe da tarefa com a fotografia de resolução e a nota do "
              "técnico; a Figura 17 mostra a triagem municipal, com os filtros e as acções de "
              "atribuição; a Figura 18 mostra o mapa público em viewport móvel, que confirma o "
              "requisito de responsividade."),
        ("f", {"path": "capturas/07_tarefas_tecnico.jpg", "w": 16.2,
               "cap": "Lista de tarefas do técnico (cenário A)",
               "nota": "Captura obtida com a conta de demonstração do técnico Carlos, em 18 de "
                       "Novembro de 2026."}),
        ("f", {"path": "capturas/08_tarefa_detalhe.jpg", "w": 16.2,
               "cap": "Detalhe da tarefa com prova fotográfica de resolução (cenário A)",
               "nota": "A fotografia de resolução e a nota do técnico ficam visíveis para o autor "
                       "da denúncia."}),
        ("f", {"path": "capturas/10_triagem_municipal.jpg", "w": 16.2,
               "cap": "Triagem municipal com filtros e atribuição (cenário B)",
               "nota": "Captura obtida com a conta de demonstração do gestor João."}),
        ("f", {"path": "capturas/14_mapa_movel.jpg", "w": 7.6,
               "cap": "Mapa público em viewport móvel (cenário B)",
               "nota": "Viewport de 390 × 844 px, equivalente a um telefone de gama média."}),

        ("h2", "11.5 Resultados da aceitação"),
        ("p", "Os dez critérios foram aprovados. A Tabela 47 resume o resultado por cenário. "
              "Não houve critérios falhados nem critérios bloqueados. O único defeito encontrado "
              "durante a execução — a pluralização do dashboard (D14) — foi corrigido e a captura "
              "foi repetida antes de ser incluída neste documento."),
        ("t", {
            "cap": "Resumo da execução da aceitação",
            "cols": ["Cenário", "Critérios", "Aprovados", "Falhados", "Observações"],
            "w": [5.2, 2.0, 2.2, 2.0, 5.6],
            "f": 9,
            "align": ["left", "center", "center", "center", "left"],
            "rows": [
                ["A — do reporte à avaliação", "5", "5", "0",
                 "Dupla submissão do formulário corrigida na interface; sem impacto no domínio."],
                ["B — isolamento e operação", "5", "5", "0",
                 "Nenhum defeito novo; CSV e dashboard verificados por consulta directa."],
                ["Total", "10", "10", "0", "—"],
            ],
        }),
        ("p", "A aceitação foi interna: os próprios autores executaram os cenários, ainda que "
              "com revisão cruzada. Não houve utilizadores externos, nem um facilitador "
              "independente, nem medição de satisfação com um instrumento validado. Esta é a "
              "principal limitação do E4 e está registada no capítulo 12. A execução demonstra "
              "que o sistema faz o que os requisitos pedem, mas não demonstra que os requisitos "
              "correspondem ao que os cidadãos e os serviços municipais realmente precisam."),
        ("p", "Ainda assim, dois sinais qualitativos são encorajadores. O primeiro é que o fluxo "
              "completo — reportar, triar, executar, comprovar e avaliar — foi concluído sem "
              "intervenção técnica nem acesso directo à base de dados. O segundo é que as "
              "personas conseguiram operar o sistema apenas com a navegação disponível, sem "
              "conhecimento prévio das rotas. Estes sinais não substituem um teste com "
              "utilizadores reais, mas sugerem que o desenho da interface está alinhado com as "
              "tarefas."),
        ("q",),

        # ------------------------------------------------------------------
        ("h1", "12. Conclusões"),
        ("p", "Este capítulo fecha o documento. Sintetiza o percurso, responde directamente às "
              "três perguntas de investigação, enuncia as contribuições, reconhece as limitações "
              "e propõe o trabalho futuro. A conclusão não repete os resultados; interpreta-os à "
              "luz dos objectivos definidos no capítulo 1."),

        ("h2", "12.1 Síntese do percurso"),
        ("p", "O trabalho partiu de um problema concreto — a ausência de um canal estruturado, "
              "auditável e transparente para o reporte urbano no CMM — e terminou com uma "
              "plataforma em produção, testada por 138 testes automatizados e por dez critérios "
              "de aceitação. Pelo caminho, os requisitos do Trabalho 01 foram revistos, a "
              "arquitectura foi desenhada e implementada, a máquina de estados foi isolada num "
              "módulo puro, a segurança foi tratada em camadas e a suite de testes foi integrada "
              "num pipeline de integração contínua."),
        ("p", "O percurso não foi linear. Três decisões iniciais foram alteradas: a fotografia "
              "passou de opcional a obrigatória, o SLA passou a ser definido por categoria e a "
              "inteligência artificial passou de requisito a funcionalidade opcional com "
              "contingência. Cada alteração foi registada e justificada. O resultado é um sistema "
              "que descreve o que foi construído, e não o que se imaginou construir."),

        ("h2", "12.2 Respostas às perguntas de investigação"),
        ("p", "A Tabela 48 responde de forma síntética a cada pergunta. As respostas são "
              "afirmativas, mas com qualificações que importa explicitar: a validade é limitada "
              "ao âmbito do caso de estudo e às condições de teste descritas."),
        ("t", {
            "cap": "Respostas às perguntas de investigação",
            "cols": ["RQ", "Resposta sintética", "Evidência principal", "Confiança"],
            "w": [1.2, 8.0, 5.8, 2.0],
            "f": 8.8,
            "rows": [
                ["RQ1", "A validação server-side com fronteiras explícitas, assinatura real do "
                        "ficheiro e CSRF garante que só são criadas denúncias completas, "
                        "autênticas e autorizadas; a experiência do cidadão é preservada por "
                        "mensagens específicas e validação indicativa no cliente.",
                 "21 testes de validação, 9 de fluxo, 9 de armazenamento; 9/9 casos de RQ1.",
                 "Alta"],
                ["RQ2", "A autorização em três funções puras, combinada com filtros nas consultas "
                        "e resposta 404 para recursos invisíveis, impede o acesso lateral entre "
                        "municípios, papéis e vínculos; a defesa é aplicada na rota e na função.",
                 "16 testes de autorização, 9 de segurança, 14 de participação; 9/9 casos de RQ2.",
                 "Alta"],
                ["RQ3", "A tabela explícita de transições, a transacção com bloqueio de linha e o "
                        "histórico imutável preservam a consistência mesmo perante pedidos "
                        "concorrentes; os estados finais não têm saída.",
                 "10 testes de estados, 9 de fluxo (incluindo concorrência), 14 de participação; "
                 "9/9 casos de RQ3.",
                 "Alta"],
            ],
        }),
        ("p", "A confiança é classificada como alta porque as três respostas se apoiam em testes "
              "repetíveis e em evidência de execução, e não em opinião. A qualificação necessária "
              "é que a confiança se refere à implementação actual e ao âmbito das fixtures. Uma "
              "operação com dezenas de municípios e milhares de utilizadores exigiria testes de "
              "carga, de recuperação e de penetração que não foram realizados."),

        ("h2", "12.3 Contribuições"),
        ("p", "A contribuição principal é **prática**: um sistema completo, em produção, que "
              "resolve um problema real de um município e cujo código, esquema, testes e "
              "documentação estão disponíveis para inspecção. O repositório público e o endereço "
              "de produção permitem que qualquer avaliador verifique as afirmações deste "
              "documento, o que é raro em trabalhos académicos."),
        ("p", "A segunda contribuição é **metodológica**: a demonstração de que uma equipa de dois "
              "estudantes consegue aplicar, num semestre, um conjunto integrado de práticas — "
              "requisitos rastreáveis, arquitectura em camadas, máquina de estados explícita, "
              "testes em pirâmide, integração contínua e deployment — sem sacrificar a "
              "profundidade de nenhuma delas. O factor decisivo não foi a quantidade de "
              "ferramentas, mas a disciplina de manter as fronteiras e os testes alinhados com os "
              "riscos."),
        ("p", "A terceira contribuição é **documental**: o relatório descreve não apenas o que "
              "funcionou, mas também o que falhou, os defeitos encontrados, as decisões "
              "rejeitadas e os riscos que permanecem. Esta transparência é mais útil a quem venha "
              "a continuar o trabalho do que uma narrativa idealizada."),

        ("h2", "12.4 Limitações"),
        ("p", "As limitações são de quatro ordens. A primeira é a **ausência de testes end-to-end "
              "no browser**. Os testes de integração exercitam a aplicação Express por HTTP, mas "
              "não verificam o comportamento do JavaScript do mapa, da geolocalização ou do "
              "assistente. A aceitação manual cobriu os fluxos principais, mas não é repetível "
              "com o mesmo rigor."),
        ("p", "A segunda é a **ausência de uma auditoria de acessibilidade**. Foram seguidas boas "
              "práticas — etiquetas, contraste, foco visível — mas não foi aplicada a WCAG 2.2 "
              "(W3C, 2023) com testes formais, nem foram usados leitores de ecrã. Para um serviço "
              "público, esta limitação é relevante e deve ser corrigida antes de uma adoção "
              "institucional."),
        ("p", "A terceira é a **ausência de testes de carga e de recuperação**. O sistema foi "
              "testado com dezenas de registos em memória, não com milhares de utilizadores "
              "concorrentes nem com uma base de dados de produção restaurada de um backup. Os "
              "limites dos planos gratuitos e o comportamento sob carga continuam por medir."),
        ("p", "A quarta é a **validação com utilizadores reais**. A aceitação foi interna, com "
              "personas e revisão cruzada. Não houve cidadãos nem funcionários municipais a usar "
              "o sistema, nem medição de usabilidade com um instrumento validado. As conclusões "
              "sobre adequação ao uso são, por isso, plausíveis mas não empíricas."),

        ("h2", "12.5 Trabalho futuro"),
        ("p", "O trabalho futuro organiza-se em três horizontes. No **curto prazo**, incluem-se "
              "acções de baixo custo e alto retorno: incluir a cobertura no pipeline, acrescentar "
              "um teste de fumo pós-deployment, corrigir a pluralização residual e substituir as "
              "fotografias de demonstração por fotografias próprias. No **médio prazo**, incluem-se "
              "os testes end-to-end com Playwright, a auditoria de acessibilidade WCAG 2.2 AA, os "
              "testes de carga com k6 e o ensaio de restauro de backup. No **longo prazo**, "
              "incluem-se a integração com os sistemas internos do município, a notificação por "
              "SMS ou email, a aplicação móvel nativa se se justificar, a análise de duplicados "
              "com modelo treinado e a avaliação de impacto sobre a protecção de dados."),
        ("n", [
            "Incluir `npm run test:coverage` e a publicação do relatório no workflow de CI.",
            "Adicionar um teste de fumo automático ao endpoint `/health` após cada deployment.",
            "Introduzir testes end-to-end com Playwright para os fluxos de denúncia, triagem e "
            "resolução.",
            "Realizar auditoria de acessibilidade WCAG 2.2 AA e testes com leitor de ecrã.",
            "Executar testes de carga e de stress sobre o mapa, o dashboard e a criação de "
            "denúncias.",
            "Ensaiar a recuperação de um backup do Supabase e documentar o procedimento.",
            "Melhorar a detecção de duplicados, combinando texto, GPS, categoria e imagem.",
            "Formalizar a avaliação de impacto sobre a protecção de dados antes de uso "
            "institucional.",
            "Estudar a integração com os sistemas de gestão de ocorrências do CMM.",
        ]),

        ("h2", "12.6 Considerações finais"),
        ("p", "O Cidadão Ativo mostra que a distância entre um problema urbano concreto e uma "
              "solução de software útil é menor do que parece, mas que essa distância não se "
              "percorre com uma página web. Percorre-se com requisitos explícitos, uma "
              "arquitectura que imponha as regras, testes que provem que as regras são cumpridas "
              "e uma operação que torne a prova visível. O sistema não resolve a manutenção da "
              "cidade; resolve a parte que lhe compete — transformar um aviso disperso num "
              "processo rastreável e num resultado comunicado."),
        ("p", "A entrega fica disponível no repositório `https://github.com/Nelson-Wilson/"
              "CidadaoAtivo` e em produção em `https://cidadao-ativo-beta.vercel.app/inicio`. "
              "O endpoint `/health` confirma a versão implantada. O convite é que o leitor "
              "verifique, execute e critique: é para isso que o código e os testes são públicos."),
        ("q",),

        # ------------------------------------------------------------------
        ("h1", "REFERÊNCIAS"),
        ("ref", "Beck, K., Beedle, M., van Bennekum, A., Cockburn, A., Cunningham, W., Fowler, "
                "M., Grenning, J., Highsmith, J., Hunt, A., Jeffries, R., Kern, J., Marick, B., "
                "Martin, R. C., Mellor, S., Schwaber, K., Sutherland, J., & Thomas, D. (2001). "
                "<i>Manifesto for agile software development</i>. https://agilemanifesto.org"),
        ("ref", "Cohn, M. (2009). <i>Succeeding with agile: Software development using Scrum</i>. "
                "Addison-Wesley."),
        ("ref", "Colab. (s.d.). <i>Colab: Cidadania colaborativa</i>. https://www.colab.re"),
        ("ref", "Express. (2026). <i>Express: Fast, unopinionated, minimalist web framework for "
                "Node.js</i>. https://expressjs.com"),
        ("ref", "Forsgren, N., Humble, J., & Kim, G. (2018). <i>Accelerate: The science of lean "
                "software and DevOps</i>. IT Revolution."),
        ("ref", "Fowler, M. (2018). <i>Refactoring: Improving the design of existing code</i> "
                "(2.ª ed.). Addison-Wesley."),
        ("ref", "Google. (2026). <i>Gemini API documentation</i>. https://ai.google.dev/docs"),
        ("ref", "Humble, J., & Farley, D. (2010). <i>Continuous delivery: Reliable software "
                "releases through build, test, and deployment automation</i>. Addison-Wesley."),
        ("ref", "ISO/IEC. (2023). <i>ISO/IEC 25010:2023 — Systems and software engineering — "
                "Systems and software Quality Requirements and Evaluation (SQuaRE) — Product "
                "quality model</i>. ISO."),
        ("ref", "ISTQB. (2023). <i>Certified Tester Foundation Level syllabus v4.0</i>. ISTQB."),
        ("ref", "Kaner, C., Bach, J., & Pettichord, B. (2002). <i>Lessons learned in software "
                "testing: A context-driven approach</i>. Wiley."),
        ("ref", "Kleppmann, M. (2017). <i>Designing data-intensive applications: The big ideas "
                "behind reliable, scalable, and maintainable systems</i>. O'Reilly."),
        ("ref", "Meta Open Source. (2025). <i>Jest documentation</i>. https://jestjs.io/docs"),
        ("ref", "Mozilla. (2026). <i>MDN Web Docs: Content Security Policy (CSP)</i>. "
                "https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP"),
        ("ref", "mySociety. (s.d.). <i>FixMyStreet</i>. https://www.fixmystreet.com"),
        ("ref", "Myers, G. J., Sandler, C., & Badgett, T. (2012). <i>The art of software testing</i> "
                "(3.ª ed.). Wiley."),
        ("ref", "Newman, S. (2021). <i>Building microservices: Designing fine-grained systems</i> "
                "(2.ª ed.). O'Reilly."),
        ("ref", "Nielsen, J. (1994). <i>Usability engineering</i>. Morgan Kaufmann."),
        ("ref", "Node.js Foundation. (2026). <i>Node.js documentation</i>. "
                "https://nodejs.org/docs"),
        ("ref", "OWASP. (2021). <i>OWASP Top 10:2021 — The ten most critical web application "
                "security risks</i>. https://owasp.org/Top10/"),
        ("ref", "OWASP. (2023). <i>OWASP Application Security Verification Standard 4.0.3</i>. "
                "https://owasp.org/www-project-application-security-verification-standard/"),
        ("ref", "PostgreSQL Global Development Group. (2026). <i>PostgreSQL 16 documentation</i>. "
                "https://www.postgresql.org/docs/"),
        ("ref", "Pressman, R. S., & Maxim, B. R. (2020). <i>Software engineering: A "
                "practitioner's approach</i> (9.ª ed.). McGraw-Hill."),
        ("ref", "Schwaber, K., & Sutherland, J. (2020). <i>The Scrum Guide</i>. "
                "https://scrumguides.org"),
        ("ref", "SeeClickFix. (s.d.). <i>SeeClickFix: Report neighborhood issues</i>. "
                "https://seeclickfix.com"),
        ("ref", "Sommerville, I. (2016). <i>Software engineering</i> (10.ª ed.). Pearson."),
        ("ref", "Supabase. (2026). <i>Database and storage documentation</i>. "
                "https://supabase.com/docs"),
        ("ref", "Vercel. (2026). <i>Functions documentation</i>. "
                "https://vercel.com/docs/functions"),
        ("ref", "Wohlin, C., Runeson, P., Höst, M., Ohlsson, M. C., Regnell, B., & Wesslén, A. "
                "(2012). <i>Experimentation in software engineering</i>. Springer."),
        ("ref", "W3C. (2023). <i>Web Content Accessibility Guidelines (WCAG) 2.2</i>. "
                "https://www.w3.org/TR/WCAG22/"),
        ("q",),

        # ------------------------------------------------------------------
        ("h1", "ANEXO A — Dicionário de dados"),
        ("p", "Este anexo documenta as tabelas do esquema `database/schema.sql`. A Tabela 49 "
              "apresenta o dicionário detalhado das duas tabelas centrais do domínio — `reports` e "
              "`report_status_histories` — e a Tabela 50 resume as restantes. Os tipos seguem a "
              "nomenclatura do PostgreSQL (PostgreSQL Global Development Group, 2026)."),
        ("t", {
            "cap": "Dicionário de dados — reports e report_status_histories",
            "cols": ["Tabela", "Coluna", "Tipo", "Restrição / observação"],
            "w": [4.0, 4.2, 3.4, 5.4],
            "f": 8.2,
            "rows": [
                ["reports", "id", "integer", "Chave primária, identidade gerada."],
                ["reports", "user_id", "integer", "NOT NULL; FK users(id) ON DELETE CASCADE."],
                ["reports", "category_id", "integer", "NOT NULL; FK categories(id)."],
                ["reports", "description", "text", "NOT NULL; validada entre 10 e 5.000 caracteres na aplicação."],
                ["reports", "photo_path", "varchar(500)", "Caminho no storage; obrigatório na aplicação."],
                ["reports", "latitude", "numeric(10,7)", "NOT NULL; intervalo válido validado na aplicação."],
                ["reports", "longitude", "numeric(10,7)", "NOT NULL; intervalo válido validado na aplicação."],
                ["reports", "neighborhood", "varchar(120)", "Opcional; máximo de 120 caracteres."],
                ["reports", "status", "text", "NOT NULL; CHECK com os sete estados; predefinição “recebida”."],
                ["reports", "priority", "text", "NOT NULL; CHECK com baixa, normal, urgente e muito_urgente."],
                ["reports", "municipality_id", "integer", "NOT NULL; FK municipalities(id)."],
                ["reports", "department_id", "integer", "FK departments(id) ON DELETE SET NULL."],
                ["reports", "technician_id", "integer", "FK users(id) ON DELETE SET NULL."],
                ["reports", "created_at", "timestamptz", "NOT NULL; predefinição now()."],
                ["reports", "updated_at", "timestamptz", "NOT NULL; actualizado em cada alteração."],
                ["report_status_histories", "id", "integer", "Chave primária, identidade gerada."],
                ["report_status_histories", "report_id", "integer", "NOT NULL; FK reports(id) ON DELETE CASCADE."],
                ["report_status_histories", "previous_status", "varchar(30)", "Estado anterior; nulo na entrada inicial."],
                ["report_status_histories", "new_status", "varchar(30)", "NOT NULL; estado após a transição."],
                ["report_status_histories", "changed_by", "integer", "NOT NULL; FK users(id)."],
                ["report_status_histories", "note", "text", "Opcional; usada na rejeição e na resposta ao cidadão."],
                ["report_status_histories", "created_at", "timestamptz", "NOT NULL; predefinição now()."],
            ],
        }),
        ("t", {
            "cap": "Dicionário de dados — restantes tabelas",
            "cols": ["Tabela", "Colunas principais", "Restrições e índices"],
            "w": [3.8, 7.4, 5.8],
            "f": 8.2,
            "rows": [
                ["municipalities", "id, name, region", "name único; base do isolamento municipal."],
                ["departments", "id, municipality_id, name", "FK municipalities; nome único por município."],
                ["users", "id, name, email, password, role, municipality_id, department_id",
                 "email único; role com CHECK; password com hash bcrypt; FKs com SET NULL."],
                ["categories", "id, name, sla_hours", "name único; sla_hours > 0."],
                ["category_department", "id, category_id, department_id",
                 "FKs com CASCADE; ligação N:N entre categoria e departamento."],
                ["report_photo_resolutions", "id, report_id, photo_path, technician_id, note, created_at",
                 "FK reports com CASCADE; uma prova por resolução."],
                ["report_confirmations", "id, report_id, user_id, created_at",
                 "UNIQUE(report_id, user_id); impede apoios repetidos."],
                ["report_comments", "id, report_id, user_id, content, is_official, created_at",
                 "conteúdo não vazio; is_official booleano; índice por denúncia e data."],
                ["report_ratings", "id, report_id, user_id, score, feedback, created_at",
                 "UNIQUE(report_id); score entre 1 e 5."],
                ["user_sessions", "id, sid, user_id, sess, expires_at",
                 "sid único; FK users com CASCADE; índice por expiração."],
                ["rate_limits", "id, key, count, expires_at", "key única; contador atómico partilhado."],
            ],
        }),
        ("p", "Todas as tabelas têm Row-Level Security activo e nenhuma política pública. O acesso "
              "é feito exclusivamente pela ligação do servidor, com o papel proprietário. Esta "
              "opção significa que a chave anónima do Supabase não consegue ler nem escrever "
              "dados, mesmo que seja exposta acidentalmente no cliente."),
        ("q",),

        # ------------------------------------------------------------------
        ("h1", "ANEXO B — Matriz de rastreabilidade completa"),
        ("p", "A Tabela 51 relaciona cada requisito funcional com o caso de uso que o realiza, a "
              "pergunta de investigação que o cobre, os casos de teste do capítulo 8 e os testes "
              "automatizados que os executam. A coluna “Estado” indica se o requisito está "
              "implementado e verificado. A matriz foi construída a partir do código e dos testes, "
              "e não a partir da documentação, para evitar que a rastreabilidade descrevesse um "
              "sistema inexistente."),
        ("t", {
            "cap": "Matriz de rastreabilidade completa",
            "cols": ["RF", "Caso de uso", "RQ", "Casos de teste", "Testes automatizados", "Estado"],
            "w": [1.1, 2.4, 1.2, 3.6, 7.0, 1.7],
            "f": 7.8,
            "rows": [
                ["RF01", "UC01", "RQ2", "TC-RQ2-01 a 09",
                 "authorization (16), seguranca (9), fluxo-denuncia (9)", "Verificado"],
                ["RF02", "UC02", "RQ1", "TC-RQ1-01 a 09",
                 "validation (21), fluxo-denuncia (9), storage (9)", "Verificado"],
                ["RF03", "UC02", "RQ1", "TC-RQ1-07, 08",
                 "encaminhamento (3), fluxo-denuncia (9)", "Verificado"],
                ["RF04", "UC03", "RQ2", "TC-RQ2-04, 05",
                 "participacao (14), seguranca (9)", "Verificado"],
                ["RF05", "UC04", "RQ2", "TC-RQ2-01, 06", "authorization (16), fluxo-denuncia (9)", "Verificado"],
                ["RF06", "UC06", "RQ3", "TC-RQ3-04 a 09",
                 "estadosDenuncia (10), fluxo-denuncia (9)", "Verificado"],
                ["RF07", "UC05", "RQ2/RQ3", "TC-RQ2-03, 08; TC-RQ3-07",
                 "authorization (16), fluxo-denuncia (9)", "Verificado"],
                ["RF08", "UC05", "RQ2", "TC-RQ2-08", "participacao (14)", "Verificado"],
                ["RF09", "UC05/UC06", "RQ3", "TC-RQ3-01 a 09",
                 "estadosDenuncia (10), fluxo-denuncia (9)", "Verificado"],
                ["RF10", "UC07", "RQ2", "TC-RQ2-06, 07",
                 "participacao (14), seguranca (9)", "Verificado"],
                ["RF11", "UC08", "RQ3", "TC-RQ3-07, 08", "participacao (14)", "Verificado"],
                ["RF12", "UC09", "RQ2", "TC-RQ2-09", "participacao (14)", "Verificado"],
                ["RF13", "UC10", "RQ1", "TC-RQ1-09", "ia (8), descricao (12), aiClient (4)", "Verificado"],
                ["RF14", "UC05", "RQ2", "TC-RQ2-08", "participacao (14)", "Verificado"],
            ],
        }),
        ("q",),

        # ------------------------------------------------------------------
        ("h1", "ANEXO C — Guião de aceitação"),
        ("p", "O guião seguinte foi usado na execução dos cenários do capítulo 11. A Tabela 52 "
              "apresenta a sequência de passos, o actor e o resultado esperado. O guião pressupõe "
              "o servidor de demonstração descrito no Anexo F e as contas com a palavra-passe "
              "`password`."),
        ("t", {
            "cap": "Guião de execução da aceitação",
            "cols": ["Passo", "Actor", "Acção", "Resultado esperado"],
            "w": [1.4, 2.6, 7.4, 5.6],
            "f": 8.6,
            "align": ["center", "left", "left", "left"],
            "rows": [
                ["1", "Visitante", "Abrir `/inicio` e navegar no mapa; filtrar por categoria.",
                 "Mapa carrega, marcadores coloridos por estado, filtros funcionam sem sessão."],
                ["2", "Maria", "Entrar com `maria@teste.com` e abrir “As minhas denúncias”.",
                 "Lista mostra apenas as denúncias de Maria, com estado e data."],
                ["3", "Maria", "Criar uma denúncia de buraco com fotografia e localização.",
                 "Denúncia criada em “recebida”, histórico inicial, redireccionamento."],
                ["4", "João", "Entrar, abrir a triagem e atribuir Carlos à denúncia.",
                 "Estado “atribuida”, histórico com João e Carlos, tarefa visível para Carlos."],
                ["5", "Carlos", "Abrir a tarefa, iniciar e submeter a resolução com foto.",
                 "Estado “em execução” e depois “resolvida”, prova fotográfica visível."],
                ["6", "Maria", "Abrir a denúncia resolvida e avaliar com 5.",
                 "Avaliação registada, denúncia “fechada”, histórico actualizado."],
                ["7", "Ana", "Tentar abrir e alterar a denúncia de Maputo.",
                 "404 nas duas operações; nada é alterado."],
                ["8", "João", "Abrir o dashboard e exportar o CSV.",
                 "Indicadores apenas de Maputo; CSV com fórmulas neutralizadas."],
                ["9", "Visitante", "Abrir a página pública da ocorrência e ler os comentários.",
                 "Pseudónimos, sem nome real ou email; fotografia e localização pública."],
                ["10", "Admin", "Abrir a denúncia de Maputo e a categoria de iluminação.",
                 "Acesso permitido em qualquer município; catálogo editável."],
            ],
        }),
        ("q",),

        # ------------------------------------------------------------------
        ("h1", "ANEXO D — Evidências de execução"),
        ("p", "As evidências seguintes foram recolhidas em 18 de Novembro de 2026 e podem ser "
              "reproduzidas com os comandos do Anexo F. A Tabela 53 resume-as. Os comandos foram "
              "executados com a documentação do Jest (Meta Open Source, 2025) e do Node.js "
              "(Node.js Foundation, 2026)."),
        ("t", {
            "cap": "Evidências de execução",
            "cols": ["Evidência", "Fonte", "Resultado", "Data"],
            "w": [4.2, 6.6, 4.4, 1.8],
            "f": 8.6,
            "rows": [
                ["Suite unitária", "`npm run test:unit`", "98/98, 3,043 s", "18/11/2026"],
                ["Suite de integração", "`npm run test:integration`", "40/40, 30,967 s", "18/11/2026"],
                ["Suite completa", "`npm test`", "138/138, ≈ 34 s", "18/11/2026"],
                ["Cobertura", "`npm run test:coverage`",
                 "96,72% inst.; 92,18% ramos; 100% func.; 100% linhas", "18/11/2026"],
                ["Pipeline", "GitHub Actions, run 44066884111", "Sucesso; commit `c9084b4`", "17/11/2026"],
                ["Produção", "`GET /health`", "`ok`, `supabase`, `gemini`, `c9084b4`", "18/11/2026"],
                ["Repositório", "GitHub", "29 commits; HEAD `c9084b4`", "17/11/2026"],
            ],
        }),
        ("code", """$ npm test
Test Suites: 13 passed, 13 total
Tests:       138 passed, 138 total
Snapshots:   0 total
Time:        ~34 s
Ran all test suites.

$ curl -s https://cidadao-ativo-beta.vercel.app/health
{"status":"ok","uptime":0.98,"timestamp":"2026-11-18T07:14:56.432Z",
 "storage":"supabase","ai":"gemini","commit":"c9084b4"}""", "Saída resumida da suite e do endpoint de saúde"),
        ("p", "A Figura 14, no capítulo 9, mostra a estrutura do pipeline. A execução 44066884111 "
              "é a última execução verde e corresponde ao commit que está em produção. O tempo "
              "de arranque do PGlite domina a suite de integração; a suite unitária, que não usa "
              "base de dados, corre em pouco mais de três segundos."),
        ("q",),

        # ------------------------------------------------------------------
        ("h1", "ANEXO E — Créditos das imagens"),
        ("p", "As fotografias usadas nas denúncias de demonstração são de terceiros, com licenças "
              "livres, e foram obtidas no Wikimedia Commons. A Tabela 54 identifica o autor, a "
              "licença e a página de origem. As capturas de ecrã do sistema são da autoria dos "
              "autores deste documento e não estão sujeitas a atribuição."),
        ("t", {
            "cap": "Créditos das fotografias de demonstração",
            "cols": ["Fotografia", "Autor", "Licença", "Origem"],
            "w": [3.2, 3.8, 2.4, 7.6],
            "f": 8.4,
            "rows": [
                ["Buraco na via (buraco.jpg)", "Santeri Viinamäki", "CC BY-SA 4.0",
                 "https://commons.wikimedia.org/wiki/File:Potholes_on_asphalt_road_20171023.jpg"],
                ["Sacos de lixo (lixo.jpg)", "Syced", "CC0",
                 "https://commons.wikimedia.org/wiki/File:Garbage_bags_broken_by_crows_in_Tokyo.jpg"],
                ["Poste danificado (iluminacao.jpg)", "Santeri Viinamäki", "CC BY-SA 4.0",
                 "https://commons.wikimedia.org/wiki/File:Damaged_dangerous_street_light_pole_20180524.jpg"],
                ["Fuga de água (agua.jpg)", "Mr Addlepated", "CC BY-SA 2.0",
                 "https://commons.wikimedia.org/wiki/File:Leaking_water_pipe_-_Kings_Orchard_-_geograph.org.uk_-_8414903.jpg"],
            ],
        }),
        ("p", "As fotografias foram redimensionadas e convertidas para JPEG para reduzir o tamanho "
              "do documento. A atribuição completa, incluindo a ligação para a licença, consta do "
              "ficheiro `docs/relatorio/fotos_demo/atribuicoes.json`."),
        ("q",),

        # ------------------------------------------------------------------
        ("h1", "ANEXO F — Instruções de reprodução"),
        ("p", "Este anexo permite reproduzir o ambiente, executar a suite, gerar as capturas e "
              "reconstruir este documento. Os comandos foram testados em Windows 11 com Node.js "
              "24 e Python 3.13. A reprodução da aplicação em produção segue a documentação da "
              "Vercel (2026), do Supabase (2026) e do Google (2026); a execução local do servidor "
              "segue a documentação do Express (2026)."),
        ("p", "**1. Obter o código e instalar dependências.**"),
        ("code", """git clone https://github.com/Nelson-Wilson/CidadaoAtivo.git
cd CidadaoAtivo
npm ci
npm run build:css""", "Clonagem e instalação"),
        ("p", "**2. Executar a suite e a cobertura.**"),
        ("code", """npm test
npm run test:coverage
# relatório HTML em coverage/unit/index.html""", "Execução dos testes"),
        ("p", "**3. Preparar a base de dados de desenvolvimento.** A aplicação usa PGlite quando "
              "`DATABASE_URL` está vazio e `NODE_ENV=test`; para usar PostgreSQL, definir "
              "`DATABASE_URL` e aplicar `database/schema.sql`."),
        ("code", """# PGlite (sem serviço externo)
npm run seed          # cria catálogos e contas de demonstração
npm start             # http://127.0.0.1:3000

# PostgreSQL local ou Supabase
psql "$DATABASE_URL" -f database/schema.sql
npm run seed""", "Preparação da base de dados"),
        ("p", "**4. Servidor de demonstração do relatório.** O servidor descrito na secção 11.1 "
              "semeia dois municípios, dez utilizadores e catorze denúncias, e copia as fotografias "
              "para `public/uploads/demo`."),
        ("code", """node docs/relatorio/servidor_demo.js
# http://127.0.0.1:3031/inicio
# contas: maria@teste.com, joao@teste.com, carlos@teste.com,
#         ana@teste.com, admin@teste.com  (palavra-passe: password)""",
         "Servidor de demonstração"),
        ("p", "**5. Gerar as capturas e as figuras.** As capturas usam o Chrome em modo headless "
              "através do DevTools Protocol; as figuras são geradas com Matplotlib."),
        ("code", """node docs/relatorio/capturar.js
python docs/relatorio/gerar_figuras.py""", "Capturas e figuras"),
        ("p", "**6. Reconstruir o documento.** O script usa python-docx e os módulos de conteúdo; "
              "a actualização dos campos e do índice é feita no Word, com `Fields.Update` e "
              "`TablesOfContents.Update`."),
        ("code", """pip install python-docx
python docs/relatorio/construir_docx.py
# abrir docs/Cidadao_Ativo_Documento_Final.docx no Word
# Referências > Actualizar índice > Actualizar tudo""", "Reconstrução do documento"),
        ("p", "A reconstrução do documento exige as fontes Times New Roman e Consolas instaladas. "
              "O script define A4, margens de 2 cm, espaçamento 1,5 e três secções com numeração "
              "romana e árabe. As figuras e as tabelas usam campos `SEQ`, pelo que a numeração é "
              "actualizada automaticamente pelo Word."),
        ("p", "**7. Verificação final.** Antes de considerar a reprodução concluída, confirmar "
              "que a suite tem 138 testes verdes, que a cobertura global é de 96,72% de instruções "
              "e que o endpoint `/health` devolve `status = ok` e o commit esperado. Se algum "
              "destes valores divergir, a versão do código ou das dependências não é a mesma."),
        ("q",),
    ]
