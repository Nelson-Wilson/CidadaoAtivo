# -*- coding: utf-8 -*-
"""Capítulos 1 a 3: introdução, enquadramento teórico e requisitos."""


def blocos():
    return [
        # ------------------------------------------------------------------
        ("h1", "1. Introdução"),
        ("p", "Este documento constitui a versão final do trabalho semestral da unidade curricular de "
              "Engenharia de Software e retoma o Trabalho 01, submetido em Setembro de 2026. Nesse "
              "primeiro momento caracterizou-se o problema do reporte urbano no Conselho Municipal de "
              "Maputo (CMM), levantaram-se os requisitos, escolheu-se um modelo de processo e "
              "planificou-se o desenvolvimento. O que agora se apresenta não substitui esse trabalho: "
              "revê-o, corrige o que a prática mostrou ser necessário corrigir e acrescenta aquilo que "
              "só existe depois de um sistema estar construído, testado e em produção — a arquitectura "
              "real, as decisões de implementação, a suite de testes, as evidências de execução e os "
              "defeitos encontrados."),
        ("p", "A estrutura segue os seis entregáveis definidos no enunciado da componente de Teste de "
              "Software (E1 a E6), mas integra-os num relatório único, com princípio, meio e fim. "
              "Optou-se deliberadamente por não produzir um “dossier de testes” separado: num projecto "
              "desta dimensão, o plano de testes só é compreensível à luz dos requisitos e da "
              "arquitectura, e os resultados só o são à luz do plano. O documento foi, por isso, "
              "organizado como um relatório de engenharia de software, e não como uma colecção de "
              "artefactos justapostos."),

        ("h2", "1.1 Contextualização"),
        ("p", "Maputo é uma capital de crescimento rápido, com uma população urbana que ultrapassa "
              "largamente a capacidade de manutenção das infraestruturas construídas nas últimas "
              "décadas. Buracos na via, acumulação de resíduos sólidos, avarias na iluminação pública e "
              "fugas na rede de água e saneamento são ocorrências quotidianas. A sua resolução depende "
              "de informação que, na maior parte dos casos, existe — o cidadão vê o problema todos os "
              "dias — mas não chega ao departamento certo, com a localização certa e no tempo certo."),
        ("p", "O CMM dispõe de departamentos especializados, designadamente vias, saneamento e "
              "iluminação, mas o canal de entrada dessa informação é predominantemente informal: "
              "telefonemas, mensagens em redes sociais, cartas e contactos pessoais. Este modelo "
              "produz três efeitos perversos. Primeiro, perde informação: uma fotografia enviada por "
              "mensagem não fica associada a um processo. Segundo, não permite priorizar: sem registo "
              "sistemático, não há forma objectiva de comparar criticidade, antiguidade e apoio "
              "popular. Terceiro, não fecha o ciclo: o cidadão raramente sabe se o problema foi "
              "resolvido, o que alimenta a desconfiança e reduz a participação futura."),
        ("p", "Paralelamente, a penetração de smartphones e de dados móveis tornou viável uma "
              "alternativa: uma plataforma web, acessível pelo browser, sem instalação, onde o cidadão "
              "regista a ocorrência com fotografia e coordenadas, e onde o município faz a triagem, "
              "atribui e comprova a resolução. É esta a proposta do Cidadão Ativo. A plataforma não "
              "substitui os serviços municipais nem os sistemas de gestão internos; cria o canal "
              "público que falta e a camada de rastreabilidade que liga o cidadão ao departamento."),

        ("h2", "1.2 Problema e motivação"),
        ("p", "O problema central pode enunciar-se assim: o CMM não dispõe de um canal único, "
              "estruturado e auditável para receber, encaminhar, acompanhar e encerrar ocorrências "
              "urbanas reportadas por cidadãos, nem de mecanismos que garantam que cada intervenção é "
              "registada e comunicada a quem a reportou."),
        ("p", "Deste problema decorrem quatro necessidades concretas. A primeira é **captura "
              "estruturada**: categoria, descrição, fotografia e localização têm de ser obrigatórios e "
              "validados, caso contrário o registo não é accionável. A segunda é **encaminhamento "
              "automático**: a categoria determina o departamento responsável, e o município determina "
              "quem pode ver e agir. A terceira é **ciclo de vida controlado**: o estado da ocorrência "
              "não pode ser alterado arbitrariamente; tem de seguir uma sequência conhecida, com "
              "histórico. A quarta é **prestação de contas**: o cidadão tem de ver a prova da "
              "resolução e poder avaliá-la."),
        ("p", "A motivação para tratar este problema num trabalho de Engenharia de Software é dupla. "
              "Por um lado, é um caso realista de sistema de informação com requisitos de segurança, "
              "autorização e consistência de dados que não se resolvem com uma página web simples. Por "
              "outro, permite exercitar de forma integrada todo o ciclo — requisitos, arquitectura, "
              "implementação, testes, integração contínua e operação — que é exactamente o objectivo da "
              "unidade curricular."),

        ("h2", "1.3 Objectivos"),
        ("p", "O **objectivo geral** é conceber, implementar, testar e colocar em produção uma "
              "plataforma web de reporte e gestão de ocorrências urbanas para o CMM, com garantias "
              "verificáveis de validação, autorização e consistência de estados."),
        ("p", "Os **objectivos específicos** são os seguintes:"),
        ("b", [
            "Consolidar e rever os requisitos do Trabalho 01, distinguindo o que é funcionalidade "
            "essencial do que é evolução posterior, e mantendo rastreabilidade entre requisito, caso "
            "de uso, caso de teste e teste automatizado.",
            "Conceber uma arquitectura modular que separe apresentação, rotas, domínio, serviços e "
            "acesso a dados, compatível com execução serverless e com um plano gratuito de "
            "PostgreSQL gerido.",
            "Implementar a máquina de estados da denúncia, o encaminhamento automático por categoria e "
            "a autorização por papel, município e vínculo à ocorrência.",
            "Implementar uma camada de segurança proporcional ao risco: CSRF, CSP, sessões "
            "revogáveis, limitação de tentativas, validação do conteúdo real dos ficheiros e "
            "pseudonimização de comentários.",
            "Definir e executar um plano de testes com níveis unitário, de integração e de sistema, "
            "com critérios de entrada e saída explícitos.",
            "Automatizar a execução dos testes num pipeline de integração contínua e documentar a "
            "cobertura obtida.",
            "Colocar o sistema em produção na Vercel, com base de dados e armazenamento no Supabase, "
            "e verificar a implantação por endpoint de saúde.",
            "Identificar defeitos, riscos residuais e lições aprendidas, propondo trabalho futuro.",
        ]),

        ("h2", "1.4 Perguntas de investigação"),
        ("p", "Para que a avaliação não se dispersasse por toda a funcionalidade, o plano de testes "
              "foi organizado em torno de três perguntas de investigação (RQ, do inglês Research "
              "Question), cada uma correspondendo a uma classe de risco do sistema:"),
        ("b", [
            "**RQ1 — Validação na criação.** Como garantir que uma denúncia só é criada com dados "
            "completos e válidos, sem degradar a experiência do cidadão?",
            "**RQ2 — Autorização e isolamento.** Como assegurar que cada utilizador só acede e opera "
            "sobre as denúncias do seu âmbito — autor, município, departamento ou atribuição?",
            "**RQ3 — Consistência da máquina de estados.** Como preservar a consistência do ciclo de "
            "vida da denúncia perante transições inválidas e pedidos concorrentes?",
        ]),
        ("p", "As três perguntas não são arbitrárias. A primeira cobre os defeitos de entrada, que "
              "produzem registos inúteis. A segunda cobre os defeitos de isolamento, que num contexto "
              "multi-municipal são simultaneamente um problema funcional e um incidente de "
              "confidencialidade. A terceira cobre os defeitos de concorrência e de regra de negócio, "
              "que corrompem o histórico e tornam o sistema não auditável. Juntas, cobrem as partes do "
              "sistema onde um erro tem consequências reais para o cidadão e para o município."),

        ("h2", "1.5 Metodologia"),
        ("p", "O trabalho seguiu uma abordagem de **investigação-aplicação**, próxima do paradigma de "
              "Design Science: o problema foi caracterizado, uma solução foi construída, e a solução "
              "foi avaliada por artefactos verificáveis — testes automatizados, cenários de aceitação, "
              "métricas de cobertura e execução em produção. Não se pretendeu produzir conhecimento "
              "teórico novo, mas sim demonstrar, com evidência, que um conjunto de decisões de "
              "engenharia resolve o problema enunciado."),
        ("p", "O processo de desenvolvimento foi um **Scrum adaptado** a uma equipa de dois "
              "estudantes, com três sprints de duas a três semanas. Cada sprint produziu software "
              "executável e foi fechado com uma revisão interna. A documentação de requisitos foi "
              "mantida como artefacto vivo: o backlog passou a ser a lista de requisitos, e as "
              "decisões que alteraram o âmbito foram registadas com justificação. A componente de "
              "teste foi tratada como uma fase transversal, e não como uma etapa final: os testes "
              "unitários acompanharam a implementação do domínio, e os testes de integração foram "
              "escritos à medida que as rotas ficaram disponíveis."),
        ("p", "A avaliação seguiu uma lógica de **verificação e validação**. A verificação responde à "
              "pergunta “construímos o produto correctamente?” e foi assegurada por testes unitários, "
              "de integração e de sistema. A validação responde à pergunta “construímos o produto "
              "certo?” e foi assegurada por cenários de aceitação derivados dos requisitos e "
              "executados sobre a aplicação real. As duas perspectivas são apresentadas em capítulos "
              "distintos, precisamente para que o leitor possa distinguir o que é conformidade técnica "
              "do que é adequação ao uso."),
        ("p", "Os dados quantitativos apresentados — número de testes, tempos de execução, cobertura, "
              "execuções do pipeline, versão implantada — foram recolhidos no ambiente real do "
              "projecto, em 18 de Novembro de 2026, e não foram estimados. Sempre que um valor "
              "depende do momento da medição, isso é indicado no texto."),

        ("h2", "1.6 Entregáveis e estrutura do documento"),
        ("p", "A Tabela 1 estabelece a correspondência entre os entregáveis E1 a E6 e os capítulos "
              "onde são tratados. Esta correspondência é também a grelha de leitura do documento: um "
              "leitor interessado apenas na componente de teste pode seguir os capítulos 7 a 11; um "
              "leitor interessado na engenharia do sistema encontra nos capítulos 3 a 6 o essencial."),
        ("t", {
            "cap": "Correspondência entre os entregáveis E1–E6 e os capítulos do documento",
            "cols": ["Entregável", "Conteúdo exigido", "Tratamento neste documento"],
            "w": [2.0, 8.0, 7.0],
            "f": 9.5,
            "rows": [
                ["E1", "Plano de testes: objectivos, âmbito, abordagem, técnicas, ambiente, "
                        "critérios de entrada e saída, riscos e calendário.",
                 "Capítulo 7, com apoio do capítulo 6 para o contexto de implementação."],
                ["E2", "Concepção dos casos de teste, com identificação, pré-condições, dados, passos "
                        "e resultados esperados.",
                 "Capítulo 8, com 27 casos distribuídos por RQ1, RQ2 e RQ3."],
                ["E3", "Implementação dos testes, incluindo os testes principais e complementares.",
                 "Capítulo 9, com a organização da suite, os dez testes principais, os dois "
                 "complementares e a análise de cobertura."],
                ["E4", "Testes de sistema e de aceitação, com cenários, critérios e evidências.",
                 "Capítulo 11, com dois cenários e cinco critérios Dado/Quando/Então por cenário."],
                ["E5", "Integração contínua e pipeline de qualidade.",
                 "Secção 9.7, com o pipeline actual, as 22 execuções e a proposta de inclusão da "
                 "cobertura."],
                ["E6", "Resultados, defeitos, riscos residuais e lições aprendidas.",
                 "Capítulo 10 e secção 12.5, com tabelas de defeitos e de riscos e a síntese das "
                 "lições."],
            ],
        }),
        ("p", "O restante documento está organizado da seguinte forma. O capítulo 2 apresenta o "
              "enquadramento teórico que sustenta as decisões. O capítulo 3 consolida os requisitos, "
              "as regras de negócio e a rastreabilidade. O capítulo 4 descreve a arquitectura, o "
              "modelo de dados, a máquina de estados e a segurança. O capítulo 5 documenta o processo "
              "de desenvolvimento e a gestão do projecto. O capítulo 6 percorre a implementação. Os "
              "capítulos 7 a 11 correspondem à componente de teste. O capítulo 12 conclui. Seguem-se "
              "as referências e seis anexos com o dicionário de dados, a matriz de rastreabilidade, o "
              "guião de aceitação, as evidências de execução, os créditos das imagens e as instruções "
              "de reprodução."),
        ("q",),

        # ------------------------------------------------------------------
        ("h1", "2. Enquadramento teórico"),
        ("p", "Este capítulo fixa os conceitos e as referências que sustentam o resto do documento. "
              "Não é uma revisão exaustiva da literatura; é o enquadramento necessário para que as "
              "decisões dos capítulos seguintes possam ser avaliadas com critério. Começa-se pelo "
              "contexto de governação urbana digital, passa-se pelas plataformas de reporte cívico "
              "que serviram de referência, pela engenharia de requisitos e pelos métodos ágeis, e "
              "termina-se nos fundamentos de teste de software, automação e métricas."),

        ("h2", "2.1 Governação urbana digital e participação cívica"),
        ("p", "A expressão “cidade inteligente” é frequentemente usada para descrever cidades que "
              "instrumentam infraestruturas com sensores e analisam grandes volumes de dados. Essa "
              "visão é, para um município com recursos limitados, pouco realista a curto prazo. Uma "
              "leitura mais útil é a de **governação urbana digital**: usar tecnologia acessível para "
              "melhorar a relação entre o cidadão e a administração, tornando o processo mais "
              "transparente, mais rápido e mais responsabilizável."),
        ("p", "Nesta leitura, o valor não está na quantidade de dados recolhidos, mas na qualidade do "
              "circuito que os transforma em acção. Um reporte só gera valor se chegar ao departamento "
              "certo, se for priorizado com critérios explícitos, se produzir uma intervenção "
              "registada e se essa intervenção for comunicada a quem reportou. A literatura sobre "
              "participação pública insiste precisamente neste ponto: a participação sustenta-se "
              "quando o cidadão percebe que a sua contribuição produz efeito. Caso contrário, o canal "
              "esvazia-se depois de um pico inicial de adesão."),
        ("p", "O Cidadão Ativo foi desenhado a partir desta premissa. O mapa público dá visibilidade "
              "ao que já foi reportado, o que evita duplicação e demonstra que o sistema está vivo. O "
              "acompanhamento por estados dá previsibilidade. A prova fotográfica de resolução e a "
              "avaliação do cidadão fecham o ciclo. Nenhuma destas funcionalidades é sofisticada do "
              "ponto de vista técnico; o que é exigente é garanti-las em conjunto, com consistência e "
              "segurança."),

        ("h2", "2.2 Plataformas de reporte cívico"),
        ("p", "As plataformas de reporte urbano existem há mais de uma década e fornecem um conjunto "
              "consolidado de padrões funcionais. O FixMyStreet (mySociety, s.d.) popularizou, no "
              "Reino Unido, o modelo de mapa público com reporte georreferenciado e "
              "encaminhamento para a autoridade local. O SeeClickFix (SeeClickFix, s.d.) introduziu "
              "fortemente, nos Estados Unidos, o conceito de acompanhamento e de resposta da "
              "autoridade. No Brasil, o Colab (Colab, s.d.) explorou a dimensão de rede social "
              "cívica, com apoio da comunidade e priorização participativa."),
        ("p", "A análise destas soluções permite identificar seis padrões que se revelaram "
              "indispensáveis: (i) captura por fotografia e localização, porque uma descrição textual "
              "raramente é suficiente para localizar o problema; (ii) categorização, porque determina "
              "o encaminhamento; (iii) mapa público, porque reduz duplicados e aumenta a confiança; "
              "(iv) ciclo de vida explícito, porque o cidadão precisa de saber em que ponto está o "
              "processo; (v) prova de resolução, porque encerra o ciclo com evidência; e (vi) "
              "avaliação, porque produz um sinal de qualidade do serviço."),
        ("p", "O Cidadão Ativo adopta os seis padrões, mas adapta-os ao contexto do CMM em quatro "
              "aspectos. Primeiro, é **multi-municipal**: o modelo de dados distingue municípios, "
              "departamentos e técnicos, e a autorização impede que um gestor da Matola veja ou altere "
              "ocorrências de Maputo. Segundo, é **mobile-first e leve**: não exige aplicação nativa, "
              "funciona em browsers modestos e serve os estilos e as bibliotecas localmente, sem "
              "dependência de CDNs externos. Terceiro, incorpora **contingência**: as funcionalidades "
              "de inteligência artificial têm alternativas determinísticas, para que o sistema "
              "continue operacional sem chave de API ou em caso de falha do fornecedor. Quarto, "
              "assume **português de Moçambique** como língua de interface e de dados, incluindo "
              "nomes de bairros e categorias locais."),

        ("h2", "2.3 Engenharia de requisitos"),
        ("p", "A engenharia de requisitos é o processo de descobrir, analisar, especificar, validar e "
              "gerir as necessidades e restrições de um sistema. Sommerville (2016) organiza-a em "
              "quatro actividades principais — elicitação, especificação, validação e gestão — e "
              "salienta que o custo de corrigir um requisito errado cresce à medida que o projecto "
              "avança. Esta observação justifica o esforço despendido no Trabalho 01 e a decisão de "
              "rever os requisitos antes de os testar."),
        ("p", "Os requisitos funcionais descrevem o que o sistema deve fazer; os requisitos não "
              "funcionais descrevem como deve comportar-se, em termos de desempenho, segurança, "
              "usabilidade, disponibilidade e manutenibilidade. A distinção é importante para o "
              "plano de testes porque os requisitos não funcionais raramente são verificáveis por um "
              "único caso de teste; exigem medições, inspecções ou testes especializados. Neste "
              "projecto, os requisitos não funcionais foram mapeados para mecanismos concretos de "
              "arquitectura e para verificações específicas, como se mostra no capítulo 4."),
        ("p", "A **rastreabilidade** é o fio que liga um requisito à sua origem, à sua especificação, "
              "à sua implementação e à sua verificação. Sem rastreabilidade, um plano de testes tende "
              "a crescer por acumulação e a deixar lacunas invisíveis. Neste trabalho, cada requisito "
              "funcional foi associado a um caso de uso, a uma pergunta de investigação e a pelo menos "
              "um caso de teste; a matriz completa consta do Anexo B. A rastreabilidade foi também "
              "usada no sentido inverso: nenhum caso de teste foi aceite sem que se soubesse que "
              "requisito protegia."),

        ("h2", "2.4 Desenvolvimento ágil e Scrum"),
        ("p", "O Manifesto Ágil (Beck et al., 2001) valoriza indivíduos e interacções, software "
              "funcional, colaboração com o cliente e resposta à mudança. O Scrum (Schwaber & "
              "Sutherland, 2020) operacionaliza estes valores com três papéis — Product Owner, Scrum "
              "Master e Developers — cinco eventos e três artefactos. Numa equipa de dois estudantes, "
              "os papéis tiveram de ser acumulados: um elemento assumiu a função de Product Owner e de "
              "gestão de requisitos; o outro assumiu a função de Scrum Master e de arquitectura; ambos "
              "implementaram e testaram."),
        ("p", "A adaptação mais relevante foi a **revisão interna** em substituição da revisão com "
              "cliente. No fim de cada sprint, o incremento era demonstrado ao outro elemento e "
              "avaliado contra os critérios de aceitação. Esta revisão cumpriu a função de inspecção e "
              "adaptação, ainda que sem a riqueza de uma revisão com utilizadores reais. A limitação é "
              "reconhecida no capítulo 12."),
        ("p", "A Definition of Done (DoD) foi definida desde o início: código revisto pelo par, testes "
              "unitários a passar, testes de integração do fluxo afectado a passar, documentação "
              "actualizada e ausência de erros no arranque. A DoD evitou a tentação de considerar uma "
              "funcionalidade concluída apenas porque o ecrã funcionava no browser do autor — uma "
              "prática que, num projecto com autenticação e estados, esconde defeitos durante pouco "
              "tempo."),

        ("h2", "2.5 Fundamentos de teste de software"),
        ("p", "Testar é executar um sistema ou componente com o objectivo de encontrar defeitos e "
              "avaliar a sua conformidade com o esperado. Myers, Sandler e Badgett (2012) formulam um "
              "princípio que continua a ser útil: um teste bem-sucedido é aquele que descobre um "
              "defeito. A formulação é provocatória, mas lembra que uma suite que nunca falha pode "
              "estar a testar pouco. A mesma ênfase no contexto e na experiência do testador "
              "atravessa as lições de Kaner, Bach e Pettichord (2002), e a terminologia de níveis e "
              "técnicas seguida neste documento alinha-se com o syllabus do ISTQB (2023) e com a "
              "abordagem de Pressman e Maxim (2020)."),
        ("p", "A literatura distingue níveis de teste. Os **testes unitários** exercitam unidades "
              "isoladas — funções, módulos — e são rápidos e baratos. Os **testes de integração** "
              "verificam a colaboração entre componentes, incluindo a base de dados e as rotas HTTP. "
              "Os **testes de sistema** exercitam o sistema completo contra requisitos funcionais e "
              "não funcionais. Os **testes de aceitação** verificam se o sistema satisfaz as "
              "necessidades do utilizador e são, tipicamente, derivados de cenários de negócio."),
        ("p", "As técnicas de desenho de casos dividem-se em caixa negra e caixa branca. As de caixa "
              "negra derivam casos da especificação, sem olhar ao código: partição de equivalência, "
              "análise de valores limite, tabelas de decisão, transição de estados e pairwise. As de "
              "caixa branca derivam casos da estrutura interna: cobertura de instruções, de ramos, de "
              "condições e de caminhos. Neste projecto usaram-se ambas: as técnicas de caixa negra "
              "para desenhar os 27 casos do capítulo 8; a cobertura de ramos para avaliar a suite "
              "unitária no capítulo 9."),
        ("p", "A **pirâmide de testes** (Cohn, 2009) recomenda uma base larga de testes unitários, uma "
              "camada intermédia de testes de integração e um topo estreito de testes de sistema e de "
              "aceitação. A recomendação não é estética: os testes unitários são rápidos e localizam "
              "a falha; os testes de sistema são lentos, frágeis e caros, mas verificam aquilo que os "
              "outros não vêem. A proporção adoptada neste trabalho — 71% unitários, 29% de "
              "integração, aceitação manual assistida — segue esta lógica e é discutida no capítulo 7."),

        ("h2", "2.6 Automação, métricas e integração contínua"),
        ("p", "A automação de testes tem custos e benefícios. O custo inicial é a escrita e a "
              "manutenção; o benefício é a possibilidade de executar a suite tantas vezes quantas as "
              "necessárias, com resultado determinístico e em tempo aceitável. O ponto de equilíbrio "
              "depende da estabilidade do domínio: quanto mais o código muda, mais valiosa é a suite, "
              "desde que os testes sejam estáveis. Testes frágeis — que falham por razões alheias ao "
              "defeito — destroem a confiança na automação e são, por isso, um risco a gerir."),
        ("p", "As métricas mais usadas são a **taxa de sucesso**, o **número de defeitos por "
              "gravidade**, o **tempo de execução** e a **cobertura**. A cobertura merece uma nota "
              "crítica: mede o código executado, não a qualidade das asserções. Um teste que chama "
              "uma função e não verifica o resultado pode produzir 100% de cobertura e nenhuma "
              "garantia. Neste documento, a cobertura é apresentada como indicador complementar, "
              "acompanhada da descrição do que cada teste verifica."),
        ("p", "A **integração contínua** (CI) consiste em integrar o trabalho de todos os "
              "desenvolvedores numa linha principal partilhada, várias vezes ao dia, com uma "
              "verificação automática a cada integração. No GitHub Actions, essa verificação é "
              "descrita num ficheiro de workflow e executada em runners efémeros. A vantagem é "
              "detectar regressões cedo, quando são baratas de corrigir. A limitação é que o pipeline "
              "só protege aquilo que executa: se um teste não estiver no workflow, não protege nada. "
              "Esta constatação está na base da proposta apresentada na secção 9.7. A relação entre "
              "práticas de entrega e desempenho organizacional é documentada por Forsgren, Humble e "
              "Kim (2018), e a automação do processo de entrega é tratada em profundidade por "
              "Humble e Farley (2010)."),

        ("h2", "2.7 Síntese crítica"),
        ("p", "O enquadramento permite retirar três conclusões que orientam o resto do documento. "
              "Primeiro, o problema do CMM é menos um problema de recolha de dados e mais um problema "
              "de **circuito**: encaminhamento, estado e prova. Segundo, a arquitectura tem de ser "
              "suficientemente simples para ser operável por uma equipa pequena, mas suficientemente "
              "explícita para impor regras de autorização e de estado. Terceiro, a qualidade tem de "
              "ser demonstrada com evidência, e não afirmada: daí a insistência em testes "
              "automatizados, métricas e execução em produção."),
        ("p", "Estas conclusões justificam as escolhas dos capítulos seguintes: um monólito modular "
              "em vez de microserviços; uma máquina de estados explícita em vez de transições "
              "implícitas nas rotas; uma suite de testes em pirâmide em vez de testes end-to-end "
              "como única garantia; e um pipeline de CI que executa a suite completa em cada push."),
        ("q",),

        # ------------------------------------------------------------------
        ("h1", "3. Requisitos e modelação do domínio"),
        ("p", "Este capítulo consolida o trabalho de requisitos iniciado no Trabalho 01. O objectivo "
              "não é repetir o documento anterior, mas apresentar a versão que efectivamente governou "
              "a implementação e os testes. As alterações face à versão inicial são identificadas e "
              "justificadas na secção 3.7."),

        ("h2", "3.1 Partes interessadas"),
        ("p", "A identificação das partes interessadas determina os actores do sistema e, "
              "consequentemente, o modelo de autorização. A Tabela 2 resume as partes interessadas, os "
              "interesses e a forma como o sistema os endereça."),
        ("t", {
            "cap": "Partes interessadas e respectivos interesses",
            "cols": ["Parte interessada", "Interesse principal", "Como o sistema responde"],
            "w": [3.4, 6.6, 7.0],
            "f": 9,
            "rows": [
                ["Cidadão", "Reportar problemas com facilidade, saber o que aconteceu e avaliar a "
                            "resolução.",
                 "Registo com foto e GPS, lista pessoal, notificações de estado, avaliação."],
                ["Técnico municipal", "Receber tarefas claras, executá-las e comprovar a intervenção.",
                 "Painel de tarefas, detalhe com localização, upload de foto de resolução."],
                ["Gestor municipal", "Triar, priorizar, atribuir e prestar contas.",
                 "Dashboard com KPIs, filtros, atribuição, mudança de estado, relatório e CSV."],
                ["Administrador", "Manter catálogos e contas de pessoal.",
                 "Gestão de categorias, SLA, departamentos e utilizadores."],
                ["Visitante", "Consultar ocorrências sem criar conta.",
                 "Mapa público e página pública da ocorrência, com autor anonimizado."],
                ["Conselho Municipal de Maputo", "Melhorar o serviço e reduzir duplicação.",
                 "Encaminhamento automático, histórico auditável, indicadores de desempenho."],
                ["Equipa de desenvolvimento", "Construir e manter o sistema com risco controlado.",
                 "Arquitectura modular, testes automatizados, CI e documentação."],
            ],
        }),

        ("h2", "3.2 Requisitos funcionais"),
        ("p", "Os requisitos funcionais foram revistos para reflectir o sistema construído. A "
              "numeração mantém a do Trabalho 01 até RF09 e acrescenta os requisitos que resultaram "
              "do refinamento. A Tabela 3 apresenta a versão consolidada."),
        ("t", {
            "cap": "Requisitos funcionais consolidados",
            "cols": ["ID", "Requisito", "Prioridade"],
            "w": [1.5, 13.5, 2.0],
            "f": 8.8,
            "rows": [
                ["RF01", "O sistema deve permitir o registo e a autenticação de cidadãos por email e "
                         "palavra-passe, mantendo sessão persistente e revogável.", "Alta"],
                ["RF02", "O sistema deve permitir ao cidadão criar uma denúncia com categoria, "
                         "descrição, fotografia obrigatória e localização (GPS ou selecção no mapa).", "Alta"],
                ["RF03", "O sistema deve encaminhar automaticamente cada denúncia para o município e "
                         "departamento responsáveis, com base na categoria.", "Alta"],
                ["RF04", "O sistema deve apresentar um mapa interactivo público com todas as "
                         "denúncias, com filtros por categoria, estado e bairro.", "Alta"],
                ["RF05", "O sistema deve permitir ao cidadão consultar a lista e o estado actual de "
                         "todas as denúncias que criou.", "Alta"],
                ["RF06", "O sistema deve permitir ao técnico visualizar as tarefas atribuídas, "
                         "iniciar a execução e submeter prova fotográfica de resolução.", "Alta"],
                ["RF07", "O sistema deve permitir ao gestor municipal filtrar, atribuir técnico e "
                         "alterar o estado de qualquer denúncia do seu município.", "Alta"],
                ["RF08", "O sistema deve apresentar um dashboard com total, pendentes, em execução, "
                         "resolvidas, tempo médio, cumprimento de SLA, satisfação, categorias e "
                         "bairros mais frequentes.", "Alta"],
                ["RF09", "O sistema deve implementar uma máquina de estados para a denúncia, "
                         "validando cada transição e registando o histórico com autor e nota.", "Alta"],
                ["RF10", "O sistema deve permitir aos cidadãos apoiar ocorrências de outros "
                         "(“também me afeta”), comentar e receber respostas oficiais do município.", "Média"],
                ["RF11", "O sistema deve permitir ao autor avaliar a resolução (1 a 5), encerrando a "
                         "denúncia após a avaliação.", "Média"],
                ["RF12", "O sistema deve permitir ao administrador gerir categorias, prazos de SLA, "
                         "departamentos e contas de pessoal.", "Média"],
                ["RF13", "O sistema deve oferecer assistente de IA para conversa, sugestão de "
                         "descrição, classificação, prioridade, detecção de duplicados e análise de "
                         "fotografia, com contingência determinística.", "Baixa"],
                ["RF14", "O sistema deve gerar relatório executivo e exportação CSV, restritos ao "
                         "município do gestor e protegidos contra injecção de fórmulas.", "Média"],
            ],
        }),

        ("h2", "3.3 Requisitos não funcionais"),
        ("p", "Os requisitos não funcionais foram organizados por atributo de qualidade e associados "
              "a um mecanismo de verificação. Esta associação é essencial: um requisito não funcional "
              "sem forma de verificação é uma intenção, não um requisito."),
        ("t", {
            "cap": "Requisitos não funcionais e verificação",
            "cols": ["ID", "Categoria", "Requisito", "Verificação"],
            "w": [1.3, 2.6, 9.1, 4.0],
            "f": 8.8,
            "rows": [
                ["RNF01", "Usabilidade", "Interface responsiva e mobile-first, em português, com "
                                          "fluxo de denúncia em três passos.", "Inspecção e teste manual em viewport móvel."],
                ["RNF02", "Desempenho", "Páginas de leitura respondem em menos de 2 s (p95); upload "
                                        "limitado a 4 MB.", "Medição local e limites no código."],
                ["RNF03", "Segurança", "CSRF em todos os POST, CSP sem scripts inline, bcrypt, "
                                       "sessões revogáveis e rate limiting partilhado.",
                 "Testes de integração de segurança e inspecção de cabeçalhos."],
                ["RNF04", "Privacidade", "Comentários públicos pseudonimizados; email e palavra-passe "
                                         "nunca expostos.", "Teste de integração dedicado."],
                ["RNF05", "Disponibilidade", "Meta de 99,5% mensal suportada por Vercel e Supabase; "
                                             "endpoint de saúde.", "Monitorização manual do /health."],
                ["RNF06", "Portabilidade", "Node.js 20+, PostgreSQL 15+, deploy na Vercel, sem CDN "
                                           "obrigatória.", "Execução local, em PGlite e na Vercel."],
                ["RNF07", "Manutenibilidade", "Módulos coesos, funções curtas, cobertura mínima de 80%.",
                 "Configuração do Jest e revisão de código."],
                ["RNF08", "Testabilidade", "Testes sem rede e sem serviços externos, com base de dados "
                                           "em memória.", "PGlite e mocks de fetch."],
                ["RNF09", "Acessibilidade", "Contraste adequado, etiquetas em formulários, foco "
                                            "visível e navegação por teclado.", "Inspecção manual; auditoria pendente."],
                ["RNF10", "Escalabilidade", "Instâncias serverless horizontais; sessões e contadores "
                                            "partilhados na base de dados.", "Teste de atomicidade do rate limit."],
                ["RNF11", "Auditabilidade", "Histórico de estados imutável, com autor, data e nota.",
                 "Teste de integração e consulta directa."],
                ["RNF12", "Conformidade", "RLS activo em todas as tabelas, sem políticas públicas; "
                                          "acesso apenas pelo servidor.", "Script de esquema e verificação no Supabase."],
            ],
        }),

        ("h2", "3.4 Regras de negócio"),
        ("p", "As regras de negócio são afirmações que restringem o comportamento do sistema e que "
              "não se reduzem a validações de formato. Foram a principal fonte dos casos de teste de "
              "autorização e de estado."),
        ("t", {
            "cap": "Regras de negócio",
            "cols": ["ID", "Regra"],
            "w": [1.6, 15.4],
            "f": 9.2,
            "rows": [
                ["RN01", "Cada denúncia pertence a exactamente um município, determinado pela "
                         "categoria e pelo encaminhamento automático."],
                ["RN02", "Só o autor, o técnico atribuído, o gestor do município da denúncia e o "
                         "administrador podem aceder ao detalhe."],
                ["RN03", "Só são aceites os pares (estado actual, novo estado) previstos na tabela de "
                         "transições; qualquer outro par é rejeitado com HTTP 422."],
                ["RN04", "Os estados “rejeitada” e “fechada” são finais e não têm transições de saída."],
                ["RN05", "A avaliação é exclusiva do autor, apenas sobre denúncias resolvidas, uma "
                         "única vez, e a sua gravação fecha a denúncia."],
                ["RN06", "Um técnico só pode ser atribuído se pertencer ao mesmo município e ao mesmo "
                         "departamento da denúncia."],
                ["RN07", "O apoio “também me afeta” é único por utilizador e não é permitido ao autor "
                         "nem em denúncias fechadas."],
                ["RN08", "Comentários oficiais só podem ser criados por gestor do município ou "
                         "administrador; comentários públicos nunca revelam o nome real."],
                ["RN09", "A fotografia é obrigatória, o tipo real é validado pelos primeiros bytes e o "
                         "tamanho máximo é de 4 MB."],
                ["RN10", "A exportação CSV é restrita ao município do gestor e neutraliza valores que "
                         "comecem por =, +, - ou @."],
            ],
        }),

        ("h2", "3.5 Casos de uso"),
        ("p", "Os casos de uso ligam os actores aos requisitos e fornecem a base para os cenários de "
              "aceitação. A Tabela 6 apresenta os dez casos de uso principais, com o actor primário e "
              "o resultado esperado."),
        ("t", {
            "cap": "Casos de uso principais",
            "cols": ["ID", "Caso de uso", "Actor", "Resultado"],
            "w": [1.4, 4.6, 3.2, 7.8],
            "f": 9,
            "rows": [
                ["UC01", "Registar conta e autenticar-se", "Cidadão",
                 "Sessão criada, cookie seguro, redireccionamento para a área pessoal."],
                ["UC02", "Criar denúncia", "Cidadão",
                 "Denúncia validada, foto guardada, estado “recebida”, histórico iniciado."],
                ["UC03", "Explorar o mapa público", "Visitante / Cidadão",
                 "Ocorrências visíveis com filtros; detalhe público sem dados pessoais."],
                ["UC04", "Acompanhar as minhas denúncias", "Cidadão",
                 "Lista com estado actual e acesso ao detalhe."],
                ["UC05", "Triar e atribuir denúncia", "Gestor municipal",
                 "Técnico compatível atribuído; estado e histórico actualizados."],
                ["UC06", "Executar tarefa e comprovar resolução", "Técnico",
                 "Estado “em execução” e depois “resolvida”, com foto e observações."],
                ["UC07", "Apoiar e comentar", "Cidadão",
                 "Apoio único registado; comentário público pseudonimizado."],
                ["UC08", "Avaliar a resolução", "Cidadão (autor)",
                 "Nota e comentário guardados; denúncia fechada."],
                ["UC09", "Administrar catálogos e contas", "Administrador",
                 "Categorias, SLA, departamentos e utilizadores actualizados."],
                ["UC10", "Interagir com o assistente de IA", "Cidadão / Gestor",
                 "Resposta contextual ou contingência determinística."],
            ],
        }),

        ("h2", "3.6 Rastreabilidade dos requisitos"),
        ("p", "A matriz da Tabela 7 relaciona cada requisito funcional com o caso de uso que o "
              "realiza, a pergunta de investigação que o cobre e os casos de teste que o verificam. "
              "A versão completa, incluindo os testes automatizados, consta do Anexo B."),
        ("t", {
            "cap": "Matriz de rastreabilidade (extracto)",
            "cols": ["Requisito", "Caso de uso", "RQ", "Casos de teste"],
            "w": [2.4, 3.0, 1.4, 10.2],
            "f": 9,
            "rows": [
                ["RF01", "UC01", "RQ2", "TC-RQ2-01 a TC-RQ2-09"],
                ["RF02", "UC02", "RQ1", "TC-RQ1-01 a TC-RQ1-09"],
                ["RF03", "UC02", "RQ1", "TC-RQ1-07, TC-RQ1-08"],
                ["RF04", "UC03", "RQ2", "TC-RQ2-04, TC-RQ2-05"],
                ["RF05", "UC04", "RQ2", "TC-RQ2-06"],
                ["RF06", "UC06", "RQ3", "TC-RQ3-04 a TC-RQ3-09"],
                ["RF07", "UC05", "RQ2 / RQ3", "TC-RQ2-03, TC-RQ2-08, TC-RQ3-07"],
                ["RF08", "UC05", "RQ2", "TC-RQ2-08"],
                ["RF09", "UC05 / UC06", "RQ3", "TC-RQ3-01 a TC-RQ3-09"],
                ["RF10", "UC07", "RQ2", "TC-RQ2-06, TC-RQ2-07"],
                ["RF11", "UC08", "RQ3", "TC-RQ3-08, TC-RQ3-09"],
                ["RF12", "UC09", "RQ2", "TC-RQ2-09"],
                ["RF13", "UC10", "RQ1", "TC-RQ1-09"],
                ["RF14", "UC05", "RQ2", "TC-RQ2-08"],
            ],
        }),

        ("h2", "3.7 Gestão de requisitos e alterações"),
        ("p", "A comparação entre o Trabalho 01 e o sistema final revela cinco alterações "
              "significativas. A primeira foi tornar a **fotografia obrigatória**. A versão inicial "
              "previa-a como opcional; a revisão concluiu que uma denúncia sem imagem é dificilmente "
              "accionável e dificulta a detecção de duplicados. A segunda foi introduzir **SLA por "
              "categoria**, porque o tempo aceitável para um buraco não é o mesmo de uma fuga de "
              "água. A terceira foi explicitar o **isolamento municipal** como regra de negócio e não "
              "apenas como consequência do encaminhamento. A quarta foi acrescentar a **avaliação do "
              "cidadão** como mecanismo de fecho do ciclo, com efeito directo no estado. A quinta foi "
              "tratar a **inteligência artificial como funcionalidade opcional**, com alternativas "
              "determinísticas, para não comprometer a operação sem chave de API."),
        ("p", "Cada alteração foi registada com a origem — revisão interna, dificuldade de "
              "implementação ou risco identificado — e com o impacto nos testes. Este registo evitou "
              "um problema comum em projectos académicos: a documentação descrever um sistema que já "
              "não existe. A regra adoptada foi simples: o documento descreve o sistema implantado; o "
              "que foi planeado e não construído é apresentado como trabalho futuro."),
        ("q",),
    ]
