# -*- coding: utf-8 -*-
"""Capítulos 7 a 9: plano de testes (E1), casos de teste (E2) e implementação (E3/E5)."""


def blocos():
    return [
        # ------------------------------------------------------------------
        ("h1", "7. Plano de testes (E1)"),
        ("p", "Este capítulo responde ao entregável E1: define objectivos, âmbito, abordagem, "
              "técnicas, ambiente, critérios de entrada e saída, riscos e calendário. O plano foi "
              "escrito antes da execução e ajustado duas vezes — após o primeiro sprint, para "
              "incorporar os testes de autorização, e após o segundo, para incorporar os testes de "
              "concorrência. Os ajustes estão registados na secção 7.8."),

        ("h2", "7.1 Objectivos e âmbito"),
        ("p", "O objectivo do plano é demonstrar, com evidência reproduzível, que o sistema satisfaz "
              "os requisitos funcionais críticos e os requisitos não funcionais de segurança, "
              "integridade e privacidade, e que as regressões são detectadas antes da produção. O "
              "plano não pretende demonstrar a ausência de defeitos — objectivo inatingível — mas "
              "reduzir o risco a um nível aceitável e tornar visível o risco residual."),
        ("t", {
            "cap": "Âmbito do plano de testes",
            "cols": ["Dentro do âmbito", "Fora do âmbito"],
            "w": [8.5, 8.5],
            "f": 9,
            "rows": [
                ["Criação e validação de denúncias; upload e validação de imagens.",
                 "Testes de carga e de stress com utilizadores concorrentes."],
                ["Autenticação, sessões, CSRF, autorização por papel e município.",
                 "Testes de penetração formais e análise de vulnerabilidades."],
                ["Máquina de estados, transições inválidas e concorrência.",
                 "Compatibilidade com todos os browsers e sistemas operativos."],
                ["Participação: apoios, comentários, avaliação e privacidade.",
                 "Usabilidade com utilizadores reais e testes de acessibilidade formais."],
                ["Dashboard, relatório executivo e exportação CSV.",
                 "Integração com sistemas internos do município."],
                ["Integração com IA e contingência determinística.",
                 "Qualidade e enviesamento dos modelos de IA."],
                ["Pipeline de integração contínua e deployment.",
                 "Recuperação de desastres e continuidade de negócio."],
            ],
        }),

        ("h2", "7.2 Abordagem por níveis"),
        ("p", "A abordagem segue a pirâmide de testes, com três níveis e uma proporção deliberada. A "
              "Figura 12 mostra a distribuição: 98 testes unitários, 40 testes de integração e dois "
              "cenários de aceitação com cinco critérios cada. A base é larga porque é rápida e "
              "localiza a falha; o topo é estreito porque é lento e depende de dados e de julgamento "
              "humano."),
        ("f", {"path": "assets/fig_piramide.png", "w": 13.6,
               "cap": "Pirâmide de testes adoptada",
               "nota": "Fonte: elaboração própria. Os valores correspondem à execução de 18 de "
                       "Novembro de 2026."}),
        ("p", "Os **testes unitários** exercitam funções puras e módulos isolados: máquina de estados, "
              "autorização, validação, prioridade, duplicados, encaminhamento, cliente de IA, "
              "armazenamento e sugestão de descrição. Não usam base de dados nem rede; o `fetch` é "
              "simulado quando necessário. Correm em cerca de 3 segundos."),
        ("p", "Os **testes de integração** exercitam a aplicação Express completa contra um PostgreSQL "
              "real em memória, com PGlite. Cobrem o fluxo cidadão → município → técnico → cidadão, os "
              "controles de segurança, a participação, a administração, as sessões, o rate limiting e "
              "os cabeçalhos. Correm em cerca de 31 segundos, em série, porque partilham a base de "
              "dados."),
        ("p", "Os **testes de sistema e de aceitação** são cenários de negócio executados sobre a "
              "aplicação em funcionamento, com as personas Maria, João, Carlos e Ana. Não são "
              "automatizados no browser; são executados manualmente com apoio de chamadas HTTP e "
              "verificação visual, e documentados no capítulo 11. A ausência de automação end-to-end é "
              "uma limitação assumida e proposta como trabalho futuro."),

        ("h2", "7.3 Técnicas de desenho de casos"),
        ("p", "A escolha da técnica foi determinada pela natureza do requisito. A Tabela 26 relaciona "
              "as técnicas usadas com as perguntas de investigação e dá um exemplo de aplicação."),
        ("t", {
            "cap": "Técnicas de desenho de casos de teste",
            "cols": ["Técnica", "Aplicação", "RQ", "Exemplo"],
            "w": [3.4, 6.6, 1.4, 5.6],
            "f": 8.8,
            "rows": [
                ["Partição de equivalência", "Classes válidas e inválidas de entrada.", "RQ1",
                 "Descrição vazia, curta, válida e excessiva."],
                ["Análise de valores limite", "Fronteiras dos intervalos.", "RQ1",
                 "9/10 e 5.000/5.001 caracteres."],
                ["Tabela de decisão", "Combinações de papel, município e vínculo.", "RQ2",
                 "Gestor do município vs. gestor de outro município."],
                ["Transição de estados", "Pares (origem, destino) da máquina.", "RQ3",
                 "recebida → atribuida é inválido; recebida → em_analise é válido."],
                ["Teste de concorrência", "Dois pedidos simultâneos sobre a mesma linha.", "RQ3",
                 "Duas transições concorrentes; apenas uma vence."],
                ["Análise de valor limite em ficheiros", "Tamanho e assinatura do upload.", "RQ1",
                 "4 MB aceite; 4 MB + 1 recusado."],
                ["Cobertura de ramos", "Avaliação da suite unitária.", "RQ1–RQ3",
                 "Ramos não executados em autorização e prioridade."],
            ],
        }),

        ("h2", "7.4 Ambiente e dados de teste"),
        ("p", "O ambiente de teste é reproduzível e não depende de serviços externos. A Tabela 27 "
              "descreve os componentes e as respectivas configurações."),
        ("t", {
            "cap": "Ambiente de teste",
            "cols": ["Componente", "Configuração", "Justificação"],
            "w": [3.6, 7.4, 6.0],
            "f": 8.8,
            "rows": [
                ["Base de dados", "PGlite em memória, com `database/schema.sql`.",
                 "PostgreSQL real, sem serviço externo nem custo."],
                ["Aplicação", "Express criada por `createApp()`, sem `listen` nos testes de integração.",
                 "Supertest exercita a app sem abrir porto."],
                ["Sessões", "Store PostgreSQL; cookie de teste.",
                 "Permite testar revogação e expiração."],
                ["Armazenamento", "Driver local em `public/uploads`.",
                 "Evita dependência do Supabase."],
                ["IA", "Flags desligadas e `fetch` simulado.",
                 "Determinismo e ausência de custo."],
                ["Dados", "Fixtures com dois municípios, quatro categorias, sete utilizadores e "
                          "denúncias criadas por helper.", "Cenários de isolamento e de estado."],
                ["Tempo", "Timeout de 60 s por teste; execução em série.",
                 "PGlite é single-process e partilha estado."],
            ],
        }),
        ("p", "As fixtures definem dois municípios — Maputo e Matola —, três departamentos, quatro "
              "categorias, sete utilizadores e ligações categoria–departamento. As personas são Maria "
              "(cidadã de Maputo), Rita (segunda cidadã), João (gestor de Maputo), Ana (gestora da "
              "Matola), Carlos (técnico de vias de Maputo), Pedro (técnico de vias da Matola) e o "
              "administrador. A palavra-passe é `password`, com hash de custo reduzido para os testes "
              "serem rápidos."),
        ("p", "A escolha de PGlite merece justificação. A alternativa mais comum — simular o acesso a "
              "dados — tornaria os testes rápidos, mas não exercitaria restrições, chaves estrangeiras, "
              "transacções nem o comportamento de `FOR UPDATE`. Foi precisamente numa transacção real "
              "que o defeito de concorrência se manifestou. A alternativa de usar um PostgreSQL em "
              "contentor tornaria os testes dependentes de Docker e mais lentos de arrancar. O PGlite "
              "oferece o compromisso: SQL real, sem infraestrutura."),

        ("h2", "7.5 Ferramentas"),
        ("p", "O Jest é o executor de testes e o fornecedor de asserções, mocks e relatórios de "
              "cobertura. O Supertest permite enviar pedidos HTTP para a aplicação Express sem abrir "
              "um porto. O `cross-env` garante que as variáveis de ambiente são definidas de forma "
              "consistente em Windows, Linux e macOS. O GitHub Actions executa a suite em Ubuntu com "
              "Node 22. A cobertura é produzida pelo Istanbul, integrado no Jest, e publicada em texto, "
              "LCOV, HTML e JSON sumário."),
        ("p", "A escolha de não usar uma ferramenta de testes end-to-end no browser foi consciente. "
              "Ferramentas como Playwright ou Cypress acrescentariam realismo, mas também tempo de "
              "execução, fragilidade e complexidade de configuração. Numa primeira versão, optou-se por "
              "investir na base da pirâmide e em testes de integração HTTP, que cobrem a maior parte "
              "dos riscos. A lacuna é reconhecida e endereçada no trabalho futuro."),

        ("h2", "7.6 Critérios de entrada, saída, suspensão e retoma"),
        ("p", "Os critérios foram definidos antes da execução, para evitar a tentação de declarar "
              "sucesso com base no resultado observado. A Tabela 28 apresenta-os."),
        ("t", {
            "cap": "Critérios de entrada, saída, suspensão e retoma",
            "cols": ["Tipo", "Critério"],
            "w": [3.2, 13.8],
            "f": 9,
            "rows": [
                ["Entrada", "Código integrado na branch principal; esquema aplicável; fixtures "
                            "disponíveis; suite anterior verde; ambiente de teste configurado."],
                ["Saída", "100% dos testes planeados executados; 0 falhas; cobertura global ≥ 80% "
                          "de instruções e ≥ 75% de ramos; nenhum defeito crítico aberto; "
                          "evidências arquivadas."],
                ["Suspensão", "Falha do ambiente (PGlite não arranca); defeito bloqueante que impede "
                              "a execução de um grupo; indisponibilidade do repositório."],
                ["Retoma", "Ambiente restabelecido; defeito bloqueante corrigido e revisto; suite de "
                           "regressão executada antes de retomar o grupo suspenso."],
                ["Aceitação", "Todos os critérios dos dois cenários do capítulo 11 verificados; "
                              "nenhuma discrepância entre o esperado e o observado."],
            ],
        }),

        ("h2", "7.7 Riscos do processo de teste"),
        ("p", "Os riscos do processo são distintos dos riscos do produto. Dizem respeito à capacidade "
              "de testar e à validade dos resultados. A Tabela 29 identifica os principais."),
        ("t", {
            "cap": "Riscos do processo de teste",
            "cols": ["ID", "Risco", "Impacto", "Mitigação"],
            "w": [1.2, 6.2, 1.8, 7.8],
            "f": 8.8,
            "rows": [
                ["RT01", "Testes frágeis que falham por ordem de execução ou estado partilhado.",
                 "Alto", "Execução em série, limpeza de tabelas e fixtures determinísticas."],
                ["RT02", "Cobertura alta sem asserções significativas.",
                 "Médio", "Revisão cruzada dos testes e descrição explícita do que cada um prova."],
                ["RT03", "Dados de teste irreais que escondem defeitos.",
                 "Médio", "Fixtures com dois municípios, papéis distintos e estados variados."],
                ["RT04", "Ambiente de teste divergente da produção.",
                 "Alto", "PGlite com o mesmo esquema; revisão das diferenças de driver."],
                ["RT05", "Falta de tempo para executar a aceitação.",
                 "Médio", "Priorização dos cenários críticos e automação possível."],
                ["RT06", "Dependência de um único executor.",
                 "Baixo", "Pipeline no GitHub Actions e comandos documentados."],
            ],
        }),

        ("h2", "7.8 Papéis, calendário e ajustes"),
        ("p", "A execução foi conjunta: ambos os elementos escreveram testes, mas a revisão foi "
              "cruzada — quem escrevia o código não assinava sozinho os testes desse código. O "
              "calendário acompanhou os sprints: os testes unitários do domínio no Sprint 1, os testes "
              "de autorização e participação no Sprint 2, os testes de dashboard, CSV e IA no Sprint 3, "
              "e a consolidação e a aceitação na fase final."),
        ("p", "O plano foi ajustado duas vezes. O primeiro ajuste acrescentou testes de autorização "
              "negativa, depois de a revisão ter identificado que os testes iniciais verificavam apenas "
              "os caminhos permitidos. O segundo acrescentou o teste de concorrência, depois de uma "
              "análise ao código ter revelado que a leitura do estado e a actualização não estavam "
              "protegidas por bloqueio. Ambos os ajustes aumentaram o âmbito, mas reduziram o risco "
              "residual; são exemplo de como o plano de testes é um documento vivo e não uma formalidade."),

        ("h2", "7.9 Métricas e comunicação"),
        ("p", "As métricas usadas são: número de testes planeados e executados, taxa de sucesso, tempo "
              "de execução por nível, cobertura de instruções, ramos, funções e linhas, número de "
              "defeitos por gravidade e estado, e número de execuções do pipeline. Os resultados são "
              "comunicados em três formatos: saída do Jest, relatório de cobertura e tabela de "
              "defeitos. Não foi adoptada uma ferramenta de gestão de defeitos; o registo foi mantido "
              "em tabela, dada a dimensão da equipa. A limitação é a ausência de histórico de transições "
              "de estado dos defeitos, que uma ferramenta dedicada teria fornecido."),
        ("q",),

        # ------------------------------------------------------------------
        ("h1", "8. Conceção dos casos de teste (E2)"),
        ("p", "Este capítulo responde ao entregável E2. Foram concebidos 27 casos de teste, nove por "
              "cada pergunta de investigação. A distribuição não é arbitrária: resulta da identificação "
              "das classes de equivalência e dos valores limite de cada RQ, seguida de uma revisão para "
              "eliminar redundâncias. Cada caso tem identificador estável, pré-condições, entrada ou "
              "acção, resultado esperado, técnica e teste que o automatiza."),
        ("p", "Os casos estão organizados em três tabelas, uma por RQ. A coluna “Teste” indica o "
              "ficheiro ou o grupo de testes que executa o caso; quando o caso é verificado por mais do "
              "que um teste, indica-se o principal. A rastreabilidade completa consta do Anexo B."),

        ("h2", "8.1 Convenções"),
        ("p", "Os identificadores seguem o formato `TC-RQn-nn`. Um caso é **positivo** quando verifica "
              "que uma acção legítima produz o resultado esperado e **negativo** quando verifica que "
              "uma acção ilegítima é rejeitada sem efeitos colaterais. A distinção é importante: um "
              "caso negativo bem desenhado não verifica apenas o código de resposta, mas também que "
              "nenhum registo foi criado ou alterado. Sem esta verificação, um sistema que devolve 403 "
              "mas grava a alteração passaria no teste."),
        ("p", "As pré-condições referem-se às fixtures: Maria e Rita são cidadãs de Maputo; João é "
              "gestor de Maputo; Ana é gestora da Matola; Carlos é técnico de vias de Maputo; Pedro é "
              "técnico de vias da Matola; o administrador não tem município. As denúncias usadas nos "
              "testes têm estados e responsáveis definidos na Tabela 30."),

        ("h2", "8.2 Dados de teste"),
        ("p", "A Tabela 30 resume os dados de base. A coluna “Uso” indica em que RQ o dado é relevante."),
        ("t", {
            "cap": "Dados de teste e personas",
            "cols": ["Entidade", "Dados", "Uso"],
            "w": [3.2, 10.2, 3.6],
            "f": 8.6,
            "rows": [
                ["Municípios", "Maputo (id 1) e Matola (id 2).", "RQ2"],
                ["Departamentos", "Vias e Saneamento em Maputo; Vias na Matola.", "RQ2, RQ3"],
                ["Categorias", "Buracos, Lixo, Iluminação Pública e Água; SLA de 72, 24, 48 e 12 h.", "RQ1, RQ3"],
                ["Maria", "Cidadã de Maputo, autora da denúncia #1 (recebida) e #2 (em análise).", "RQ1, RQ2, RQ3"],
                ["Rita", "Cidadã de Maputo, autora da denúncia #3 (atribuída a Carlos).", "RQ2, RQ3"],
                ["João", "Gestor de Maputo.", "RQ2, RQ3"],
                ["Ana", "Gestora da Matola.", "RQ2"],
                ["Carlos", "Técnico de Vias de Maputo.", "RQ2, RQ3"],
                ["Pedro", "Técnico de Vias da Matola.", "RQ2"],
                ["Admin", "Administrador sem município.", "RQ2"],
                ["Denúncia #4", "Maputo, Água, em execução, atribuída a Carlos.", "RQ3"],
                ["Denúncia #6", "Maputo, Lixo, fechada com avaliação 5.", "RQ3"],
            ],
        }),

        ("h2", "8.3 Casos de teste de RQ1 — criação e validação"),
        ("p", "Os nove casos de RQ1 cobrem o caminho feliz, as fronteiras de texto, a obrigatoriedade e "
              "a autenticidade da fotografia, a localização, o encaminhamento e a protecção CSRF. A "
              "Tabela 31 apresenta-os."),
        ("t", {
            "cap": "Casos de teste de RQ1 — criação e validação da denúncia",
            "cols": ["ID", "Objectivo", "Pré-condições", "Entrada / acção", "Resultado esperado", "Técnica", "Teste"],
            "w": [1.7, 2.7, 2.3, 3.3, 3.4, 1.4, 2.2],
            "f": 8.0,
            "rows": [
                ["TC-RQ1-01", "Criar denúncia válida.", "Maria autenticada; categoria Buracos.",
                 "POST /denuncias com descrição de 120 caracteres, foto JPEG válida e GPS.",
                 "302 para /denuncias; denúncia criada em “recebida”; histórico com entrada inicial.",
                 "Partição de equivalência", "fluxo-denuncia"],
                ["TC-RQ1-02", "Rejeitar descrição com 9 caracteres.", "Maria autenticada.",
                 "POST com descrição “Buraco na”.", "200 com erro “mínimo 10 caracteres”; nenhuma "
                 "denúncia criada.", "Valor limite", "validation"],
                ["TC-RQ1-03", "Aceitar descrição com 10 caracteres.", "Maria autenticada.",
                 "POST com descrição de exactamente 10 caracteres.", "Denúncia criada.", "Valor limite",
                 "validation"],
                ["TC-RQ1-04", "Rejeitar descrição acima de 5.000 caracteres.", "Maria autenticada.",
                 "POST com 5.001 caracteres; variante com 5.000.", "5.001 rejeitado; 5.000 aceite.",
                 "Valor limite", "validation"],
                ["TC-RQ1-05", "Rejeitar denúncia sem fotografia.", "Maria autenticada.",
                 "POST sem ficheiro.", "200 com erro “anexa uma fotografia”; sem criação.",
                 "Partição de equivalência", "validation"],
                ["TC-RQ1-06", "Recusar ficheiro com tipo real diferente do declarado.", "Maria autenticada.",
                 "Ficheiro com bytes de texto e MIME image/jpeg.", "Erro de validação; nada guardado no "
                 "storage.", "Valor limite / assinatura", "storage"],
                ["TC-RQ1-07", "Rejeitar localização ausente ou não numérica.", "Maria autenticada.",
                 "POST sem latitude; variante com “abc”.", "Erro de validação; sem criação.",
                 "Partição de equivalência", "validation"],
                ["TC-RQ1-08", "Encaminhar para o departamento da categoria.", "Categoria Buracos ligada a Vias.",
                 "Criar denúncia válida de Buracos em Maputo.", "municipality_id e department_id "
                 "preenchidos com Maputo/Vias.", "Tabela de decisão", "encaminhamento"],
                ["TC-RQ1-09", "Rejeitar pedido sem CSRF ou sem sessão.", "Sessão de Maria; token válido noutro formulário.",
                 "POST /denuncias sem _csrf; variante sem sessão.", "419 sem efeitos; 302 para login sem sessão.",
                 "Tabela de decisão", "seguranca"],
            ],
        }),

        ("h2", "8.4 Casos de teste de RQ2 — autorização e isolamento"),
        ("p", "Os nove casos de RQ2 verificam o acesso permitido, o acesso negado e a ausência de "
              "fugas laterais. A ênfase está nos casos negativos: um sistema que permite o que deve "
              "permitir mas também permite o que não deve é um sistema inseguro. A Tabela 32 "
              "apresenta-os."),
        ("t", {
            "cap": "Casos de teste de RQ2 — autorização e isolamento municipal",
            "cols": ["ID", "Objectivo", "Pré-condições", "Entrada / acção", "Resultado esperado", "Técnica", "Teste"],
            "w": [1.7, 2.7, 2.3, 3.3, 3.4, 1.4, 2.2],
            "f": 8.0,
            "rows": [
                ["TC-RQ2-01", "Permitir ao autor ver a sua denúncia.", "Maria autenticada; denúncia #1 de Maria.",
                 "GET /denuncias/1.", "200 com dados completos e histórico.", "Tabela de decisão", "authorization"],
                ["TC-RQ2-02", "Negar a cidadão a denúncia de outro.", "Rita autenticada; denúncia #1 de Maria.",
                 "GET /denuncias/1.", "404, sem revelar a existência.", "Tabela de decisão", "authorization"],
                ["TC-RQ2-03", "Permitir ao gestor gerir denúncia do seu município.", "João (Maputo).",
                 "POST /municipio/denuncias/1/estado para em_analise.", "302; estado alterado; histórico "
                 "com João.", "Tabela de decisão", "fluxo-denuncia"],
                ["TC-RQ2-04", "Negar ao gestor de outro município.", "Ana (Matola); denúncia #1 de Maputo.",
                 "GET e POST sobre /municipio/denuncias/1.", "404 em ambas as operações; nenhuma alteração.",
                 "Tabela de decisão", "seguranca"],
                ["TC-RQ2-05", "Negar a técnico não atribuído.", "Carlos autenticado; denúncia #1 sem técnico.",
                 "GET /tecnico/tarefas/1.", "404; tarefa não listada.", "Tabela de decisão", "authorization"],
                ["TC-RQ2-06", "Permitir ao admin aceder a qualquer denúncia.", "Admin autenticado.",
                 "GET /municipio/denuncias/1.", "200, independentemente do município.", "Tabela de decisão",
                 "authorization"],
                ["TC-RQ2-07", "Rejeitar atribuição de técnico incompatível.", "João; denúncia de Vias de Maputo.",
                 "POST atribuir Pedro (Matola); variante Carlos (Vias).", "Pedro rejeitado; Carlos aceite.",
                 "Tabela de decisão", "authorization"],
                ["TC-RQ2-08", "Restringir dashboard e CSV ao município.", "João; existem denúncias na Matola.",
                 "GET /municipio/dashboard e /exportar.csv.", "Indicadores e linhas apenas de Maputo; "
                 "fórmulas neutralizadas.", "Tabela de decisão", "participacao"],
                ["TC-RQ2-09", "Restringir administração ao admin.", "João autenticado; admin autenticado.",
                 "POST /admin/categorias como João; como admin.", "403 para João; 302 e criação para admin.",
                 "Tabela de decisão", "participacao"],
            ],
        }),

        ("h2", "8.5 Casos de teste de RQ3 — máquina de estados"),
        ("p", "Os nove casos de RQ3 verificam transições válidas, transições inválidas, estados finais, "
              "pré-condições de resolução, avaliação e concorrência. A Tabela 33 apresenta-os."),
        ("t", {
            "cap": "Casos de teste de RQ3 — máquina de estados",
            "cols": ["ID", "Objectivo", "Pré-condições", "Entrada / acção", "Resultado esperado", "Técnica", "Teste"],
            "w": [1.7, 2.7, 2.3, 3.3, 3.4, 1.4, 2.2],
            "f": 8.0,
            "rows": [
                ["TC-RQ3-01", "Aceitar recebida → em_analise.", "Denúncia #1 recebida; João autenticado.",
                 "POST estado = em_analise.", "302; estado em_analise; histórico com anterior e novo.",
                 "Transição de estados", "fluxo-denuncia"],
                ["TC-RQ3-02", "Rejeitar salto recebida → atribuida.", "Denúncia #1 recebida.",
                 "POST estado = atribuida.", "422; estado inalterado; sem novo histórico.",
                 "Transição de estados", "fluxo-denuncia"],
                ["TC-RQ3-03", "Aceitar rejeição com nota.", "Denúncia #2 em_analise.",
                 "POST estado = rejeitada com nota.", "302; estado rejeitada; nota no histórico.",
                 "Transição de estados", "fluxo-denuncia"],
                ["TC-RQ3-04", "Negar saída de estado final.", "Denúncia #7 rejeitada.",
                 "POST para qualquer estado.", "422; estado e histórico inalterados.",
                 "Transição de estados", "estadosDenuncia"],
                ["TC-RQ3-05", "Exigir técnico atribuído para iniciar.", "Denúncia #3 atribuída a Carlos; Rita autenticada.",
                 "POST /tecnico/tarefas/3/iniciar como Rita; como Carlos.", "404 para Rita; 302 e "
                 "em_execucao para Carlos.", "Tabela de decisão", "tecnico"],
                ["TC-RQ3-06", "Exigir fotografia para resolver.", "Denúncia #4 em execução; Carlos.",
                 "POST resolver sem ficheiro; com ficheiro válido.", "Erro sem alteração; depois "
                 "resolvida e foto guardada.", "Partição de equivalência", "fluxo-denuncia"],
                ["TC-RQ3-07", "Permitir avaliação apenas ao autor.", "Denúncia #5 resolvida; autora Maria; Rita é outra cidadã.",
                 "POST /denuncias/5/avaliar como Rita; como Maria.", "403/404 para Rita; 302 para Maria.",
                 "Tabela de decisão", "participacao"],
                ["TC-RQ3-08", "Fechar na avaliação e recusar duplicados.", "Denúncia #5 resolvida.",
                 "Avaliar com 5; repetir; avaliar com 0 e 6.", "Primeira avaliação fecha; repetição e "
                 "notas inválidas rejeitadas.", "Valor limite / estado", "participacao"],
                ["TC-RQ3-09", "Garantir uma única transição concorrente.", "Denúncia #1 recebida; dois pedidos simultâneos.",
                 "Dois POST em_analise em paralelo.", "Um sucesso e um 422; um único registo no histórico.",
                 "Concorrência", "fluxo-denuncia"],
            ],
        }),

        ("h2", "8.6 Cobertura dos casos e limites"),
        ("p", "Os 27 casos cobrem 14 requisitos funcionais, três perguntas de investigação e sete "
              "técnicas. A distribuição entre positivos e negativos é de 8 para 19, o que reflecte a "
              "natureza do risco: a maior parte dos defeitos graves resulta de acções que deviam ser "
              "rejeitadas e não são. A Tabela 34 resume a distribuição."),
        ("t", {
            "cap": "Distribuição dos casos de teste",
            "cols": ["RQ", "Casos", "Positivos", "Negativos", "Técnicas predominantes"],
            "w": [1.6, 2.0, 2.6, 2.6, 8.2],
            "f": 9,
            "rows": [
                ["RQ1", "9", "3", "6", "Valores limite, partição de equivalência, assinatura de ficheiro."],
                ["RQ2", "9", "4", "5", "Tabela de decisão, isolamento municipal, papéis."],
                ["RQ3", "9", "5", "4", "Transição de estados, concorrência, valores limite."],
                ["Total", "27", "12", "15", "—"],
            ],
        }),
        ("p", "O capítulo tem duas limitações. A primeira é não cobrir explicitamente o desempenho sob "
              "carga: os casos verificam correcção funcional, não tempos de resposta com muitos "
              "utilizadores. A segunda é não cobrir a acessibilidade com critérios formais das WCAG. "
              "Ambas são reconhecidas no capítulo 12 e propostas como trabalho futuro."),
        ("q",),

        # ------------------------------------------------------------------
        ("h1", "9. Implementação dos testes (E3) e integração contínua (E5)"),
        ("p", "Este capítulo responde ao entregável E3 — implementação dos testes principais e "
              "complementares — e ao entregável E5 — pipeline de integração contínua. A suite tem 138 "
              "testes: 98 unitários, distribuídos por nove ficheiros, e 40 de integração, distribuídos "
              "por quatro ficheiros. Todos passam, e a execução completa demora cerca de 34 segundos."),

        ("h2", "9.1 Organização da suite"),
        ("p", "A Tabela 35 apresenta a distribuição dos testes por ficheiro. Os nomes dos ficheiros "
              "seguem a convenção `*.test.js` e a separação por nível é feita por configuração do Jest, "
              "não por pasta de execução."),
        ("t", {
            "cap": "Distribuição dos testes por ficheiro",
            "cols": ["Ficheiro", "Nível", "Testes", "Âmbito"],
            "w": [5.4, 2.4, 1.6, 7.6],
            "f": 8.8,
            "rows": [
                ["tests/unit/authorization.test.js", "Unitário", "16", "Acesso, gestão e atribuição por papel e município."],
                ["tests/unit/prioridade.test.js", "Unitário", "14", "Prioridade por gravidade, proximidade, apoios e antiguidade."],
                ["tests/unit/descricao.test.js", "Unitário", "12", "Sugestão de descrição, limites e privacidade."],
                ["tests/unit/validation.test.js", "Unitário", "21", "Validação e normalização de denúncias."],
                ["tests/unit/estadosDenuncia.test.js", "Unitário", "10", "Tabela de transições e estados finais."],
                ["tests/unit/duplicados.test.js", "Unitário", "9", "Detecção por GPS, categoria e texto."],
                ["tests/unit/storage.test.js", "Unitário", "9", "Assinatura de imagens e armazenamento Supabase."],
                ["tests/unit/aiClient.test.js", "Unitário", "4", "Fallback de modelo e timeout."],
                ["tests/unit/encaminhamento.test.js", "Unitário", "3", "Categoria → departamento e município."],
                ["tests/integration/fluxo-denuncia.test.js", "Integração", "9", "Fluxo completo, validação, estados e concorrência."],
                ["tests/integration/participacao.test.js", "Integração", "14", "Apoios, comentários, avaliação, dashboard e admin."],
                ["tests/integration/seguranca.test.js", "Integração", "9", "Sessões, rate limit, privacidade e cabeçalhos."],
                ["tests/integration/ia.test.js", "Integração", "8", "Endpoints de IA, flags e CSRF."],
                ["Total", "—", "138", "98 unitários + 40 de integração."],
            ],
        }),

        ("h2", "9.2 Testes principais"),
        ("p", "Foram seleccionados dez testes principais, por cobrirem as regras de maior risco e "
              "serem representativos das técnicas usadas. A Tabela 36 descreve o que cada um verifica "
              "e o resultado obtido."),
        ("t", {
            "cap": "Testes principais",
            "cols": ["ID", "Teste", "O que verifica", "Resultado"],
            "w": [1.2, 4.6, 9.0, 2.2],
            "f": 8.6,
            "rows": [
                ["T01", "Rejeita todos os pares fora da tabela de transições.", "Enumera as 49 "
                        "combinações de origem e destino e confirma que apenas as nove permitidas são aceites.",
                 "Passou"],
                ["T02", "Gestor de outro município não acede nem altera.", "A função de autorização "
                        "devolve falso para Ana sobre denúncia de Maputo, em leitura e em gestão.",
                 "Passou"],
                ["T03", "Atribuição exige técnico do mesmo município e departamento.", "Aceita Carlos "
                        "(Vias/Maputo), rejeita Pedro (Matola) e rejeita técnico sem departamento.",
                 "Passou"],
                ["T04", "Descrição com 9 caracteres é rejeitada e com 10 é aceite.", "Confirma a "
                        "fronteira inferior e a mensagem devolvida.", "Passou"],
                ["T05", "Descrição com 5.000 é aceite e com 5.001 é rejeitada.", "Confirma a "
                        "fronteira superior e a normalização de espaços.", "Passou"],
                ["T06", "Prioridade com cinco apoios, gravidade alta e local sensível atinge "
                        "muito_urgente.", "Exercita a combinação de factores e a salvaguarda de perigo.",
                 "Passou"],
                ["T07", "Assinatura de imagem recusa conteúdo incompatível.", "Confirma que bytes de "
                        "texto com MIME image/jpeg são recusados antes de qualquer escrita.", "Passou"],
                ["T08", "Duplicados descartam candidatos fora de 300 m e ordenam por pontuação.",
                 "Verifica o raio, a categoria opcional e o limite de cinco resultados.", "Passou"],
                ["T09", "Cliente de IA usa o modelo alternativo em 503 e em timeout.", "Simula as duas "
                        "falhas e confirma a chamada ao fallback, sem fallback quando o principal responde.",
                 "Passou"],
                ["T10", "Encaminhamento usa o departamento da categoria.", "Confirma a ligação "
                        "categoria–departamento e o caso sem departamento.", "Passou"],
            ],
        }),

        ("h2", "9.3 Testes complementares"),
        ("p", "Além dos dez principais, dois testes complementares cobrem aspectos que não se encaixam "
              "nas regras centrais, mas que têm impacto na qualidade percebida e na operação."),
        ("t", {
            "cap": "Testes complementares",
            "cols": ["ID", "Teste", "O que verifica", "Resultado"],
            "w": [1.2, 4.8, 8.8, 2.2],
            "f": 8.8,
            "rows": [
                ["C01", "Relatório executivo por regras cita números reais e gera recomendações "
                        "coerentes.", "Sem IA, o relatório usa os indicadores e produz recomendações "
                        "alinhadas com os alertas; sem alertas, devolve recomendação neutra.", "Passou"],
                ["C02", "Armazenamento Supabase com `fetch` simulado.", "Confirma o envio com a chave "
                        "de serviço, o URL público devolvido, a recusa de conteúdo inválido, a "
                        "propagação de falhas e a conversão de URL em caminho de objecto.", "Passou"],
            ],
        }),

        ("h2", "9.4 Testes de integração"),
        ("p", "Os testes de integração usam Supertest e PGlite. A Tabela 38 resume os grupos e o que "
              "cada um demonstra. A execução é feita em série (`--runInBand`), porque todos os "
              "ficheiros partilham a mesma base de dados em memória."),
        ("t", {
            "cap": "Grupos de testes de integração",
            "cols": ["Grupo", "Testes", "O que demonstra"],
            "w": [4.8, 1.6, 10.6],
            "f": 8.8,
            "rows": [
                ["Fluxo completo", "9", "Maria regista, João atribui, Carlos resolve e Maria avalia; "
                                        "validação server-side; CSRF; transições; concorrência."],
                ["Participação", "14", "Apoios, comentários com escape de HTML, avaliação, dashboard, "
                                       "CSV, administração e regras de privacidade."],
                ["Segurança", "9", "Sessões revogáveis, logout, conta apagada, rate limit atómico, "
                                   "namespaces, pseudónimos, notas oficiais e CSP."],
                ["IA", "8", "Autenticação e CSRF nos endpoints, validação de GPS, flags de "
                            "funcionalidade e visibilidade do assistente."],
            ],
        }),
        ("p", "O teste de concorrência merece destaque. Dois pedidos de mudança de estado são enviados "
              "em paralelo para a mesma denúncia. O resultado esperado é um sucesso e uma rejeição, com "
              "um único registo no histórico. O teste falhou na primeira implementação, revelando que a "
              "leitura do estado e a actualização não estavam protegidas. A correcção introduziu a "
              "transacção com `SELECT ... FOR UPDATE` e o teste passou a proteger a regressão."),

        ("h2", "9.5 Cobertura e análise"),
        ("p", "A cobertura é medida apenas nos testes unitários, por opção de configuração. Os testes "
              "de integração exercitam as rotas e os modelos, mas não são contabilizados no relatório "
              "de cobertura. Esta opção é conservadora: a cobertura apresentada refere-se ao núcleo de "
              "regras, que é precisamente a parte que se pretende exaustivamente testada. A Figura 13 "
              "resume os valores e a Tabela 39 apresenta o detalhe por módulo."),
        ("f", {"path": "assets/fig_cobertura.png", "w": 15.4,
               "cap": "Cobertura dos testes unitários por módulo",
               "nota": "Fonte: npm run test:coverage, execução de 18 de Novembro de 2026."}),
        ("t", {
            "cap": "Cobertura por módulo",
            "cols": ["Módulo", "Instruções", "Ramos", "Funções", "Linhas"],
            "w": [6.4, 2.6, 2.6, 2.6, 2.8],
            "f": 9,
            "align": ["left", "center", "center", "center", "center"],
            "rows": [
                ["Global", "96,72%", "92,18%", "100%", "100%"],
                ["src/authorization.js", "96,42%", "97,67%", "100%", "100%"],
                ["src/domain/estadosDenuncia.js", "100%", "100%", "100%", "100%"],
                ["src/services/servicoEncaminhamentoDenuncia.js", "100%", "100%", "100%", "100%"],
                ["src/services/ai/servicoPrioridade.js", "94,11%", "81,08%", "100%", "100%"],
                ["src/validation/denuncia.js", "100%", "95,23%", "100%", "100%"],
            ],
        }),
        ("p", "Os valores são superiores aos mínimos configurados — 80% de instruções, 75% de ramos, "
              "80% de funções e 80% de linhas. A análise das linhas não cobertas é mais informativa do "
              "que a percentagem global. Em `authorization.js`, a linha 40 corresponde a um ramo "
              "defensivo para um papel desconhecido com denúncia nula; é difícil de atingir pela API, "
              "porque a rota já rejeitou o pedido antes. Em `servicoPrioridade.js`, os 81,08% de ramos "
              "reflectem combinações de factores de prioridade que não alteram o resultado final, como "
              "a antiguidade num caso já classificado como muito urgente. Não se justificou criar "
              "testes artificiais apenas para elevar a métrica."),
        ("p", "A cobertura de 100% em `estadosDenuncia.js` e em `servicoEncaminhamentoDenuncia.js` é "
              "particularmente relevante: são os dois módulos que concentram regras de negócio puras e "
              "que, se estivessem errados, produziriam defeitos em cascata. A cobertura de 100% em "
              "linhas não garante que todas as asserções sejam fortes, mas, combinada com a revisão "
              "cruzada e com os testes de integração, dá confiança razoável."),

        ("h2", "9.6 Exemplo de teste"),
        ("p", "O bloco seguinte mostra dois testes representativos. O primeiro é unitário e verifica a "
              "tabela de transições; o segundo é de integração e verifica que a criação de uma "
              "denúncia sem fotografia não produz efeitos."),
        ("code", """// tests/unit/estadosDenuncia.test.js
it('rejeita todos os pares que não estão na tabela de transições', () => {
  const permitidos = new Set([
    'recebida>em_analise',
    'em_analise>atribuida', 'em_analise>rejeitada',
    'atribuida>em_execucao', 'em_execucao>resolvida',
    'resolvida>fechada',
  ]);
  for (const de of STATUSES) {
    for (const para of STATUSES) {
      const esperado = permitidos.has(`${de}>${para}`);
      expect(podeMudarStatus(de, para)).toBe(esperado);
    }
  }
});

// tests/integration/fluxo-denuncia.test.js
it('dados inválidos não criam denúncia e devolvem erro claro', async () => {
  const agente = await entrarComo('maria@teste.com');
  const antes = await db.query('SELECT count(*)::int AS n FROM reports');
  const resposta = await agente
    .post('/denuncias')
    .field('id_categoria', String(categoriaId))
    .field('descricao', 'Buraco na')          // 9 caracteres
    .field('latitude', '-25.96')
    .field('longitude', '32.57')
    .attach('foto', jpegValido, 'foto.jpg');
  expect(resposta.status).toBe(200);
  expect(resposta.text).toContain('pelo menos 10 caracteres');
  const depois = await db.query('SELECT count(*)::int AS n FROM reports');
  expect(depois.rows[0].n).toBe(antes.rows[0].n);
});""", "Testes representativos da suite"),

        ("h2", "9.7 Integração contínua (E5)"),
        ("p", "O pipeline está definido em `.github/workflows/ci.yml` e executa em cada push para "
              "`main` e em cada pull request. A Figura 14 apresenta as etapas. O workflow usa "
              "`actions/checkout@v4`, `actions/setup-node@v4` com Node 22 e cache de npm, instala as "
              "dependências com `npm ci`, compila o Tailwind e executa `npm test`, que corre os testes "
              "unitários e depois os de integração."),
        ("f", {"path": "assets/fig_ci.png", "w": 16.4,
               "cap": "Pipeline de integração contínua no GitHub Actions",
               "nota": "Fonte: elaboração própria, a partir de .github/workflows/ci.yml."}),
        ("p", "O repositório acumulou 22 execuções do pipeline até 18 de Novembro de 2026. A última "
              "execução concluída com sucesso ocorreu a 17 de Novembro de 2026, com o identificador "
              "44066884111, e corresponde ao commit `c9084b4`, que é também a versão em produção. O "
              "tempo total do pipeline é dominado pela instalação de dependências e pelos 31 segundos "
              "dos testes de integração; o conjunto fica tipicamente abaixo de três minutos, dentro do "
              "limite de 15 minutos configurado."),
        ("p", "O pipeline actual tem uma lacuna importante: **não executa a cobertura**. A cobertura é "
              "gerada localmente com `npm run test:coverage`, mas não é verificada pelo CI. Isto "
              "significa que uma alteração que reduza a cobertura abaixo dos mínimos configurados não "
              "seria detectada pelo pipeline, porque a configuração de thresholds só é aplicada quando "
              "a cobertura é recolhida. A correcção é simples e foi proposta, mas não foi implementada "
              "para não alterar o pipeline já validado e documentado como evidência."),
        ("p", "A proposta consiste em acrescentar dois passos ao workflow: executar `npm run "
              "test:coverage` e publicar o relatório como artefacto. O bloco seguinte mostra a "
              "alteração. Com ela, o quality gate passaria a incluir a cobertura e o pipeline "
              "protegeria também a métrica, e não apenas o resultado dos testes."),
        ("code", """      - name: Cobertura
        run: npm run test:coverage

      - name: Publicar relatório de cobertura
        uses: actions/upload-artifact@v4
        if: always()
        with:
          name: cobertura-unitária
          path: coverage/unit
          retention-days: 14""", "Proposta de extensão do pipeline"),
        ("p", "A proposta não foi executada nesta entrega por uma razão de método: o pipeline "
              "documentado no capítulo 10 é o que produziu as 22 execuções e a evidência de sucesso. "
              "Alterá-lo sem uma nova série de execuções tornaria a evidência ambígua. A recomendação "
              "fica registada como trabalho futuro imediato, com a estimativa de uma hora de "
              "implementação e validação."),
        ("p", "Além da cobertura, o pipeline poderia beneficiar de três melhorias: cache da base de "
              "dados de teste (pouco relevante, dado o tempo actual), execução em matriz de versões de "
              "Node (20 e 22) e análise estática com ESLint. Nenhuma é bloqueante para a entrega, mas "
              "todas aumentariam a confiança. A análise estática seria particularmente útil para "
              "detectar variáveis não utilizadas e promessas sem tratamento, que os testes podem não "
              "apanhar."),
        ("q",),
    ]
