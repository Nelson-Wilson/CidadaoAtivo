# -*- coding: utf-8 -*-
"""Capítulos 4 a 6: arquitectura, processo de desenvolvimento e implementação."""


def blocos():
    return [
        # ------------------------------------------------------------------
        ("h1", "4. Arquitectura do sistema"),
        ("p", "A arquitectura do Cidadão Ativo foi desenhada para três condicionantes: uma equipa "
              "pequena, uma operação sem servidores dedicados e um domínio com regras de autorização "
              "e de estado que não podem ser deixadas ao acaso. O resultado é um monólito modular "
              "executado como função serverless, com separação clara entre apresentação, rotas, "
              "domínio, serviços e acesso a dados."),
        ("p", "Este capítulo apresenta a arquitectura em cinco vistas complementares — alto nível, "
              "baixo nível, dados, estados e implantação — e discute as decisões que a sustentam. As "
              "vistas não são independentes: a máquina de estados justifica a existência de um módulo "
              "de domínio puro; o isolamento municipal justifica a forma das consultas; a execução "
              "serverless justifica a persistência de sessões e de contadores na base de dados."),

        ("h2", "4.1 Visão de alto nível"),
        ("p", "A Figura 1 apresenta o diagrama de alto nível. O sistema organiza-se em três camadas: "
              "actores, aplicação e persistência/serviços externos. Os actores são o cidadão, o "
              "técnico municipal, o gestor, o administrador e o visitante. A aplicação concentra as "
              "funcionalidades de mapa, conta, denúncias, participação, operação municipal, tarefas de "
              "campo, administração e apoio por inteligência artificial. A persistência e os serviços "
              "externos incluem o PostgreSQL no Supabase, o armazenamento de fotografias, a API Gemini "
              "e os fornecedores de mapas e geolocalização."),
        ("f", {"path": "assets/fig_hld.png", "w": 16.4,
               "cap": "Diagrama de alto nível do Cidadão Ativo",
               "nota": "Fonte: elaboração própria. A aplicação é uma única função serverless; a "
                       "separação em blocos é lógica, não física."}),
        ("p", "A opção por uma função serverless única não significa ausência de modularidade. "
              "Significa que todos os módulos são implantados juntos e partilham o mesmo processo "
              "quando a plataforma o permite. Esta decisão reduz o custo operacional e elimina a "
              "latência de rede entre componentes, mas exige disciplina interna: sem fronteiras claras, "
              "um monólito degrada-se em código entrelaçado. As fronteiras adoptadas são as pastas do "
              "projecto e as dependências permitidas entre elas, descritas na secção 4.3."),

        ("h2", "4.2 Estilo arquitectural"),
        ("p", "O estilo adoptado é **MVC em camadas sobre um monólito modular**. As vistas EJS "
              "constituem a camada de apresentação; as rotas Express actuam como controladores; os "
              "módulos de domínio e de serviços concentram as regras; os modelos encapsulam o acesso "
              "ao PostgreSQL. A escolha de EJS com renderização no servidor, em vez de uma aplicação "
              "de página única, foi deliberada: reduz o tempo até ao primeiro conteúdo, funciona em "
              "browsers modestos, simplifica a segurança — não há tokens de API expostos no cliente — "
              "e mantém o HTML acessível sem execução de JavaScript."),
        ("p", "A separação de responsabilidades segue três regras. Primeiro, as rotas não contêm "
              "regras de negócio: validam a entrada, chamam serviços ou modelos e escolhem a resposta. "
              "Segundo, o domínio não depende de Express nem da base de dados: a máquina de estados e "
              "as funções de autorização são puras, o que as torna testáveis sem infraestrutura. "
              "Terceiro, os modelos não tomam decisões de autorização: limitam-se a executar consultas "
              "e a devolver dados. A autorização é aplicada antes, nas rotas, com funções explícitas."),
        ("p", "A alternativa clássica — microserviços (Newman, 2021) — foi considerada e rejeitada. "
              "Com uma equipa "
              "de dois elementos e um domínio pequeno, os microserviços introduziriam complexidade "
              "operacional, consistência eventual e latência sem benefício proporcional. A alternativa "
              "oposta — um único ficheiro de rotas com SQL embutido — foi igualmente rejeitada, porque "
              "tornaria impossível testar a máquina de estados e a autorização de forma isolada. O "
              "monólito modular é o ponto de equilíbrio adequado ao contexto."),

        ("h2", "4.3 Componentes e responsabilidades"),
        ("p", "A Figura 2 apresenta o diagrama de baixo nível, com as camadas, os módulos e as "
              "dependências permitidas. A leitura faz-se de cima para baixo: o browser consome vistas "
              "e ficheiros estáticos; o Express aplica middleware transversal; as rotas delegam em "
              "domínio, validação e serviços; os modelos acedem à base de dados através de uma única "
              "camada de abstracção."),
        ("f", {"path": "assets/fig_lld.png", "w": 16.4,
               "cap": "Diagrama de baixo nível e organização dos módulos",
               "nota": "Fonte: elaboração própria. As setas entre grupos indicam dependência de "
                       "chamada, não fluxo de dados."}),
        ("p", "A Tabela 8 descreve as responsabilidades de cada grupo de módulos e as regras de "
              "dependência que lhe estão associadas. Estas regras foram verificadas por revisão de "
              "código e não por uma ferramenta de análise de dependências; é uma limitação assumida."),
        ("t", {
            "cap": "Componentes, responsabilidades e dependências",
            "cols": ["Componente", "Responsabilidade", "Pode depender de"],
            "w": [3.2, 9.6, 4.2],
            "f": 8.8,
            "rows": [
                ["views/", "Vistas EJS, layouts por papel, componentes de interface.",
                 "helpers de vista; nunca de modelos."],
                ["public/", "CSS compilado, JavaScript de mapa e foco, ícones, bibliotecas locais.",
                 "Nada (estático)."],
                ["routes/", "Controladores HTTP, permissões, validação de entrada, respostas e "
                            "redireccionamentos.", "domain/, validation/, services/, models/."],
                ["middleware", "Sessão, flash, CSRF, CSP, rate limiting, erros.",
                 "config/, rateLimit/, sessionStore/."],
                ["domain/", "Máquina de estados pura e constantes do domínio.", "Nada."],
                ["authorization.js", "Decisões de acesso e de atribuição, sem I/O.", "Nada."],
                ["validation/", "Validação e normalização de denúncias.", "Nada."],
                ["services/", "Encaminhamento por categoria, prioridade, duplicados, resumo, "
                              "chatbot, relatório executivo.", "models/ e serviços de IA."],
                ["services/ai/", "Cliente Gemini, prompts, contingência determinística.",
                 "config/, fetch."],
                ["models/", "Consultas SQL e mapeamento de resultados.", "db/, storage/."],
                ["db.js", "Abstracção de PostgreSQL (pg) e PGlite; transacções.", "config/."],
                ["storage.js", "Supabase Storage ou disco local; validação de imagem.",
                 "config/, fetch, fs."],
            ],
        }),

        ("h2", "4.4 Modelo de dados"),
        ("p", "O modelo de dados tem treze tabelas. As cinco primeiras — `municipalities`, "
              "`departments`, `users`, `categories` e `category_department` — constituem o núcleo "
              "organizacional. As seis seguintes — `reports`, `report_status_histories`, "
              "`report_photo_resolutions`, `report_confirmations`, `report_comments` e "
              "`report_ratings` — constituem o núcleo da denúncia e da participação. As duas últimas — "
              "`user_sessions` e `rate_limits` — são infraestrutura transversal."),
        ("f", {"path": "assets/fig_erd.png", "w": 16.4,
               "cap": "Modelo de dados (ERD simplificado)",
               "nota": "Fonte: elaboração própria, a partir de database/schema.sql. As tabelas de "
                       "infraestrutura não têm relações de domínio."}),
        ("p", "A Tabela 9 resume o propósito de cada tabela. O dicionário de dados completo, com "
              "colunas, tipos e restrições, consta do Anexo A."),
        ("t", {
            "cap": "Tabelas da base de dados",
            "cols": ["Tabela", "Propósito", "Relações principais"],
            "w": [3.6, 8.4, 5.0],
            "f": 8.8,
            "rows": [
                ["municipalities", "Municípios servidos pela plataforma.", "1:N com departments e users."],
                ["departments", "Departamentos operacionais de cada município.", "N:1 com municipalities."],
                ["users", "Cidadãos, técnicos, gestores e administradores.", "N:1 com municipalities e departments."],
                ["categories", "Categorias de ocorrência e prazo de SLA.", "N:N com departments."],
                ["category_department", "Ligação entre categoria e departamento responsável.", "N:1 com categories e departments."],
                ["reports", "Denúncia: autor, categoria, descrição, foto, GPS, estado, prioridade e "
                            "responsáveis.", "N:1 com users, categories, municipalities, departments."],
                ["report_status_histories", "Registo imutável de cada transição, com autor e nota.",
                 "N:1 com reports e users."],
                ["report_photo_resolutions", "Prova fotográfica da resolução e observações do técnico.",
                 "N:1 com reports e users."],
                ["report_confirmations", "Apoios “também me afeta”, únicos por utilizador.",
                 "N:1 com reports e users."],
                ["report_comments", "Comentários públicos e respostas oficiais.",
                 "N:1 com reports e users."],
                ["report_ratings", "Avaliação única do autor (1–5) e comentário.",
                 "1:1 com reports; N:1 com users."],
                ["user_sessions", "Sessões persistidas, revogáveis por utilizador.",
                 "N:1 com users."],
                ["rate_limits", "Contadores atómicos partilhados entre instâncias.",
                 "Sem relação de domínio."],
            ],
        }),
        ("p", "Três decisões de modelação merecem destaque. A primeira é o **histórico separado**: o "
              "estado actual está em `reports`, mas cada transição é registada em "
              "`report_status_histories`, com o estado anterior, o novo, o autor e uma nota opcional. "
              "Esta separação permite reconstruir a linha temporal e responsabilizar quem alterou. A "
              "segunda é a **restrição de unicidade** em `report_ratings(report_id)` e em "
              "`report_confirmations(report_id, user_id)`, que impede avaliações duplicadas e apoios "
              "repetidos mesmo perante pedidos concorrentes; é a forma mais simples de garantir "
              "idempotência sem coordenar transacções na aplicação (Kleppmann, 2017). A terceira é a "
              "**chave estrangeira com "
              "`ON DELETE SET NULL`** nos responsáveis da denúncia: eliminar um técnico não deve "
              "apagar a denúncia, mas sim deixá-la por atribuir."),
        ("p", "O esquema activa **Row-Level Security** em todas as tabelas e não define políticas "
              "públicas. O efeito é deliberado: a chave anónima do Supabase não lê nem escreve nada. "
              "Todo o acesso passa pela ligação PostgreSQL do servidor, que não é sujeita a RLS por "
              "ser o proprietário das tabelas. Esta configuração reduz a superfície de exposição caso "
              "a chave pública seja utilizada indevidamente."),

        ("h2", "4.5 Máquina de estados"),
        ("p", "O ciclo de vida da denúncia é o coração do domínio e a principal fonte de risco de "
              "inconsistência. A máquina de estados tem sete estados e uma tabela explícita de "
              "transições. A Figura 4 representa o caminho principal e o ramo de rejeição; a Tabela 10 "
              "apresenta a matriz completa."),
        ("f", {"path": "assets/fig_estados.png", "w": 15.6,
               "cap": "Máquina de estados da denúncia",
               "nota": "Fonte: elaboração própria. Qualquer par (origem, destino) ausente da tabela é "
                       "rejeitado com HTTP 422."}),
        ("t", {
            "cap": "Matriz de transições permitidas",
            "cols": ["Estado actual", "Destinos permitidos", "Quem pode executar", "Efeito"],
            "w": [2.9, 3.6, 4.5, 6.0],
            "f": 8.6,
            "rows": [
                ["recebida", "em_analise", "Gestor do município ou admin",
                 "Entrada em triagem; histórico registado."],
                ["em_analise", "atribuida, rejeitada", "Gestor do município ou admin",
                 "Atribuição de técnico compatível ou rejeição com nota."],
                ["atribuida", "em_execucao", "Técnico atribuído (ou gestor)",
                 "Início da intervenção no terreno."],
                ["em_execucao", "resolvida", "Técnico atribuído",
                 "Exige fotografia de resolução e observações."],
                ["resolvida", "fechada", "Autor (avaliação) ou sistema",
                 "Avaliação guardada; denúncia encerrada."],
                ["fechada", "—", "—", "Estado final; sem saída."],
                ["rejeitada", "—", "—", "Estado final; sem saída."],
            ],
        }),
        ("p", "A implementação vive em `src/domain/estadosDenuncia.js`, um módulo sem dependências "
              "externas. A função `podeMudarStatus(de, para)` consulta a tabela congelada e devolve um "
              "booleano. A mesma função é usada pela API, pelo painel municipal e pelo painel do "
              "técnico, o que elimina a possibilidade de regras divergentes. A transição é executada "
              "dentro de uma transacção com `SELECT ... FOR UPDATE`, como se descreve na secção 6.5."),
        ("p", "A escolha de uma tabela explícita, em vez de condições espalhadas pelas rotas, tem "
              "consequências directas na testabilidade. É possível enumerar todos os pares possíveis "
              "— sete origens por sete destinos, quarenta e nove combinações — e verificar que apenas "
              "as nove permitidas são aceites. É exactamente isso que o teste unitário "
              "“rejeita todos os pares que não estão na tabela de transições” faz."),

        ("h2", "4.6 Arquitectura de segurança"),
        ("p", "A segurança foi tratada como um conjunto de camadas, e não como uma funcionalidade "
              "isolada. A Tabela 11 relaciona as ameaças consideradas com os controlos implementados e "
              "a forma de verificação. A lista não é exaustiva; cobre as ameaças que o modelo de "
              "utilização torna plausíveis, organizadas a partir das categorias do OWASP Top 10 "
              "(OWASP, 2021). A escolha dos controlos seguiu o ASVS (OWASP, 2023) e a política de "
              "conteúdos foi escrita com base na especificação de CSP da Mozilla (2026)."),
        ("t", {
            "cap": "Ameaças, controlos e verificação",
            "cols": ["Ameaça", "Controlo implementado", "Verificação"],
            "w": [4.0, 8.6, 4.4],
            "f": 8.8,
            "rows": [
                ["Pedido forjado em nome do utilizador (CSRF)",
                 "Token por sessão em todos os formulários POST; middleware dedicado.",
                 "Teste de integração exige 419 sem token."],
                ["Execução de scripts no browser (XSS)",
                 "Escape automático do EJS, CSP sem `unsafe-inline`, sem HTML do utilizador.",
                 "Teste com HTML em comentário e inspecção da CSP."],
                ["Acesso a denúncias de outro município",
                 "Autorização por papel, município e vínculo; filtros nas consultas.",
                 "TC-RQ2 e teste de integração com Ana (Matola)."],
                ["Escalada de privilégios",
                 "Verificação de papel em cada rota; administração restrita.",
                 "Testes de gestão e de atribuição."],
                ["Sequestro de sessão",
                 "Cookie HttpOnly, SameSite=Lax, Secure em produção; regeneração no login; "
                 "revogação no logout.", "Testes de sessões revogáveis."],
                ["Força bruta no login",
                 "Rate limiting por namespace, persistido na base de dados.",
                 "Teste de atomicidade e de 429."],
                ["Upload de ficheiro malicioso",
                 "Multer em memória, limite de 4 MB, validação do MIME real pelos primeiros bytes.",
                 "Testes de assinatura e de recusa."],
                ["Server-side request forgery no armazenamento",
                 "Leitura restrita ao bucket configurado; sem fetch de URLs arbitrários.",
                 "Teste de `urlPublica` e de `lerBytes`."],
                ["Injecção de SQL",
                 "Consultas parametrizadas; conversão controlada de `?` para `$n`.",
                 "Revisão de código e testes de integração."],
                ["Injecção de fórmulas no CSV",
                 "Neutralização de valores iniciados por =, +, - e @.",
                 "Teste de exportação restrita."],
                ["Divulgação de dados pessoais em comentários",
                 "Pseudónimos estáveis; nome real nunca é devolvido ao público.",
                 "Teste de privacidade."],
                ["Erros internos expostos",
                 "Página de erro genérica; detalhes apenas no registo do servidor.",
                 "Inspecção e teste manual."],
            ],
        }),
        ("p", "A autorização merece uma nota própria porque é o controlo mais importante num sistema "
              "multi-municipal. Foram definidas três funções puras: `podeAceder(utilizador, denuncia)`, "
              "`podeGerir(utilizador, denuncia)` e `podeAtribuir(utilizador, denuncia, tecnico)`. A "
              "primeira responde “posso ver?”; a segunda, “posso alterar estado ou atribuir?”; a "
              "terceira, “este técnico é elegível?”. As três concentram toda a lógica e são testadas "
              "exaustivamente, incluindo os casos de dados em falta e de papéis desconhecidos."),

        ("h2", "4.7 Implantação"),
        ("p", "A Figura 5 apresenta o diagrama de implantação. O browser comunica por HTTPS com a "
              "função serverless na Vercel. A função liga-se ao PostgreSQL no Supabase através do "
              "pooler em modo transacção, ao Storage para fotografias, à API Gemini para "
              "funcionalidades de inteligência artificial e aos fornecedores de tiles para o mapa. O "
              "GitHub é a origem do código e o executor do pipeline de integração contínua."),
        ("f", {"path": "assets/fig_implantacao.png", "w": 16.0,
               "cap": "Diagrama de implantação",
               "nota": "Fonte: elaboração própria. Os segredos são configurados no painel da Vercel e "
                       "nunca versionados."}),
        ("p", "Existem três ambientes. O **local** usa Node.js e, sem `DATABASE_URL`, PGlite em "
              "memória; as fotografias ficam em `public/uploads`. O **teste** é o ambiente do Jest: "
              "PGlite, armazenamento local, IA desligada e rede simulada. A **produção** usa Supabase, "
              "Storage e Gemini, com as variáveis definidas na Vercel. A separação é garantida por "
              "`NODE_ENV` e pela ausência de ficheiro `.env` no ambiente de teste, o que impede a "
              "utilização acidental de credenciais reais."),
        ("t", {
            "cap": "Variáveis de ambiente relevantes",
            "cols": ["Variável", "Obrigatória", "Função"],
            "w": [5.2, 2.2, 9.6],
            "f": 8.8,
            "rows": [
                ["DATABASE_URL", "Produção", "Ligação PostgreSQL (pooler, porta 6543)."],
                ["SESSION_SECRET", "Sim", "Assinatura do cookie de sessão; mínimo de 32 caracteres."],
                ["SUPABASE_URL", "Produção", "Endereço do projecto Supabase."],
                ["SUPABASE_SERVICE_ROLE_KEY", "Produção", "Chave de serviço para o Storage; nunca exposta ao browser."],
                ["SUPABASE_STORAGE_BUCKET", "Produção", "Bucket público de leitura para fotografias."],
                ["GEMINI_API_KEY", "Não", "Activa as funcionalidades de IA; sem chave, usa contingência."],
                ["AI_MODEL / AI_MODEL_FALLBACK", "Não", "Modelo principal e alternativa em caso de falha."],
                ["AI_THINKING_LEVEL", "Não", "Nível de raciocínio dos modelos Gemini 3+."],
                ["AI_FEATURE_*", "Não", "Liga ou desliga funcionalidades de IA individualmente."],
                ["APP_URL", "Sim", "URL pública usada em links absolutos e cookies."],
                ["PORT", "Local", "Porta do servidor local (predefinição 3000)."],
                ["NODE_ENV", "Sim", "Distingue produção, desenvolvimento e teste."],
            ],
        }),
        ("p", "A colocação em produção é automática: um push para a branch `main` desencadeia a "
              "construção e a publicação na Vercel, depois de o pipeline do GitHub Actions ter "
              "validado a suite. O endpoint `/health` devolve o estado, o tempo de actividade, o driver "
              "de armazenamento, o estado da IA e o `commit` implantado. No momento da redacção, "
              "devolvia `commit = c9084b4`, `storage = supabase` e `ai = gemini`."),

        ("h2", "4.8 Decisões arquitecturais"),
        ("p", "As decisões estruturantes foram registadas em formato abreviado de ADR (Architecture "
              "Decision Record). A Tabela 13 apresenta as sete decisões com maior impacto, a "
              "alternativa considerada e a justificação."),
        ("t", {
            "cap": "Decisões arquitecturais (ADR resumidos)",
            "cols": ["ID", "Decisão", "Alternativa rejeitada", "Justificação"],
            "w": [1.2, 4.6, 4.2, 7.0],
            "f": 8.5,
            "rows": [
                ["ADR-01", "Monólito modular serverless.",
                 "Microserviços.", "Equipa pequena; complexidade operacional desproporcionada."],
                ["ADR-02", "Renderização no servidor com EJS.",
                 "SPA com API JSON.", "Simplicidade, SEO, segurança e menor custo no cliente."],
                ["ADR-03", "Sessões em PostgreSQL, com store próprio.",
                 "JWT ou Redis.", "Revogação imediata sem infraestrutura adicional."],
                ["ADR-04", "PGlite nos testes de integração.",
                 "Mocks de base de dados.", "PostgreSQL real, sem serviço externo nem rede."],
                ["ADR-05", "Supabase Storage com validação por assinatura.",
                 "Disco local em produção.", "Disco da Vercel é efémero e só de leitura."],
                ["ADR-06", "IA opcional, com contingência determinística.",
                 "IA obrigatória.", "Operação garantida sem chave, com falha do fornecedor ou sem rede."],
                ["ADR-07", "Tailwind e Leaflet servidos localmente.",
                 "CDNs públicas.", "CSP estrita, independência de terceiros e previsibilidade."],
            ],
        }),

        ("h2", "4.9 Atributos de qualidade"),
        ("p", "A arquitectura foi avaliada contra os atributos da norma ISO/IEC 25010 (ISO/IEC, 2023). "
              "A Tabela 14 resume a posição do sistema em cada atributo, as tácticas adoptadas e a "
              "evidência disponível. A avaliação é qualitativa e baseada na implementação e nos testes, "
              "não numa certificação formal; o atributo de usabilidade foi lido à luz das heurísticas "
              "de Nielsen (1994)."),
        ("t", {
            "cap": "Atributos de qualidade (ISO/IEC 25010)",
            "cols": ["Atributo", "Táctica", "Evidência"],
            "w": [3.2, 9.0, 4.8],
            "f": 8.8,
            "rows": [
                ["Adequação funcional", "Requisitos rastreados e aceitação por cenários.",
                 "Capítulos 8 e 11."],
                ["Eficiência de desempenho", "Renderização no servidor, consultas indexadas, "
                                             "compressão, cache de estáticos.", "Medição local; 31 s para 40 testes de integração."],
                ["Compatibilidade", "HTML padrão, CSS compilado, sem dependências proprietárias.",
                 "Teste em Chrome, Edge e viewport móvel."],
                ["Usabilidade", "Fluxo em três passos, mensagens claras, estados visíveis.",
                 "Inspecção e cenários de aceitação."],
                ["Fiabilidade", "Transacções, restrições de unicidade, tratamento de erros.",
                 "Teste de concorrência e de transições inválidas."],
                ["Segurança", "CSRF, CSP, bcrypt, sessões revogáveis, autorização explícita.",
                 "Testes de segurança e de isolamento."],
                ["Manutenibilidade", "Módulos coesos, domínio puro, cobertura elevada.",
                 "Cobertura de 96,72% de instruções."],
                ["Portabilidade", "Node.js e PostgreSQL padrão; deploy na Vercel.",
                 "Execução local, em PGlite e em produção."],
            ],
        }),

        ("h2", "4.10 Fluxo principal"),
        ("p", "A Figura 6 consolida o fluxo principal, do registo à avaliação. O diagrama mostra a "
              "interacção entre a cidadã Maria, a aplicação, a base de dados, o armazenamento, a IA e "
              "os actores municipais. Cada mudança de estado é registada no histórico; a transacção "
              "com bloqueio de linha impede que dois pedidos concorrentes produzam históricos "
              "duplicados."),
        ("f", {"path": "assets/fig_sequencia.png", "w": 16.2,
               "cap": "Fluxo principal da denúncia, do registo ao fecho",
               "nota": "Fonte: elaboração própria. Os passos 6 a 13 correspondem às operações "
                       "municipais e ao fecho pelo cidadão."}),
        ("p", "O fluxo evidencia uma separação importante: a criação da denúncia é uma operação do "
              "cidadão; a triagem e a atribuição são operações do município; a execução é uma "
              "operação do técnico; a avaliação é uma operação do cidadão. Esta cadeia de "
              "responsabilidades é a razão pela qual a autorização não pode ser reduzida a “está "
              "autenticado?”. Cada passo exige um actor diferente, e o sistema tem de o saber."),
        ("q",),

        # ------------------------------------------------------------------
        ("h1", "5. Metodologia de desenvolvimento e gestão do projecto"),
        ("p", "Este capítulo documenta como o trabalho foi conduzido: o ciclo de vida, os papéis, o "
              "calendário, o backlog, os riscos, as dependências e o controlo de configuração. O "
              "objectivo não é descrever burocracia, mas tornar auditável o processo que produziu o "
              "sistema e explicar por que razão algumas decisões foram tomadas em determinado momento."),

        ("h2", "5.1 Ciclo de vida e sprints"),
        ("p", "Adoptou-se um Scrum adaptado, com três sprints de desenvolvimento e uma fase final de "
              "consolidação. A Tabela 15 descreve o âmbito e o resultado de cada sprint. A duração "
              "real foi ajustada ao calendário académico e à disponibilidade dos dois elementos."),
        ("t", {
            "cap": "Sprints, âmbito e resultado",
            "cols": ["Sprint", "Duração", "Âmbito", "Resultado"],
            "w": [2.2, 2.2, 7.0, 5.6],
            "f": 8.8,
            "rows": [
                ["Sprint 1", "3 semanas",
                 "Autenticação, sessões, criação de denúncia, upload, mapa público, máquina de "
                 "estados e histórico.",
                 "Núcleo funcional com testes unitários de domínio e primeiros testes de integração."],
                ["Sprint 2", "3 semanas",
                 "Painel municipal, atribuição, painel do técnico, administração, comentários, apoios "
                 "e avaliação.",
                 "Fluxo completo cidadão → município → técnico → cidadão; testes de autorização."],
                ["Sprint 3", "3 semanas",
                 "Dashboard, relatório executivo, exportação CSV, assistente de IA e contingência.",
                 "Funcionalidades de gestão e IA; testes de dashboard, CSV e privacidade."],
                ["Consolidação", "3 semanas",
                 "Revisão de requisitos, cobertura, pipeline, deployment, documento final.",
                 "138 testes verdes, cobertura de 96,72%, produção activa e relatório."],
            ],
        }),

        ("h2", "5.2 Papéis, artefactos e cerimónias"),
        ("p", "Numa equipa de dois elementos, os papéis do Scrum foram acumulados. A Tabela 16 "
              "descreve a atribuição e a forma como cada cerimónia foi adaptada."),
        ("t", {
            "cap": "Papéis e cerimónias adaptadas",
            "cols": ["Elemento", "Papéis", "Responsabilidades"],
            "w": [3.4, 4.0, 9.6],
            "f": 9,
            "rows": [
                ["Aurélio Langa", "Product Owner, desenvolvimento, testes",
                 "Requisitos, priorização, validação com o enunciado, implementação e testes de "
                 "integração."],
                ["Nelson Dzimba", "Scrum Master, arquitectura, desenvolvimento",
                 "Arquitectura, revisão de código, implementação, pipeline e deployment."],
                ["Ambos", "Developers",
                 "Refinamento, estimativas, implementação, revisão cruzada e demonstração."],
            ],
        }),
        ("p", "As cerimónias foram simplificadas. O **planeamento** ocorreu no início de cada sprint, "
              "com revisão do backlog e selecção de itens. A **reunião diária** foi substituída por "
              "sincronização assíncrona, dada a incompatibilidade de horários. A **revisão** foi uma "
              "demonstração interna do incremento, com verificação dos critérios de aceitação. A "
              "**retrospectiva** produziu três acções por sprint, registadas e verificadas no sprint "
              "seguinte."),
        ("p", "Os artefactos foram o **backlog do produto**, a **definição de concluído** e o "
              "**incremento**. O backlog foi mantido numa lista simples, com identificador, descrição, "
              "estimativa e estado. A definição de concluído foi a referida na secção 2.4. O "
              "incremento era sempre software executável, nunca documentação isolada."),

        ("h2", "5.3 Calendarização e marcos"),
        ("p", "O trabalho decorreu entre Setembro e Novembro de 2026. A Tabela 17 apresenta os marcos "
              "principais e as datas previstas e efectivas. Os desvios foram modestos e concentraram-se "
              "na fase de testes, que exigiu mais iteração do que o previsto."),
        ("t", {
            "cap": "Marcos do projecto",
            "cols": ["Marco", "Previsto", "Efectivo", "Observação"],
            "w": [6.2, 2.8, 2.8, 5.2],
            "f": 9,
            "rows": [
                ["Requisitos consolidados", "Setembro de 2026", "Setembro de 2026",
                 "Trabalho 01 submetido."],
                ["Arquitectura e modelo de dados", "Setembro de 2026", "Outubro de 2026",
                 "Revisão do modelo após o primeiro sprint."],
                ["Núcleo funcional", "Outubro de 2026", "Outubro de 2026",
                 "Criação, mapa e estados."],
                ["Painéis municipais e administração", "Outubro de 2026", "Novembro de 2026",
                 "Atribuição e tarefas de campo."],
                ["Dashboard, IA e relatório", "Novembro de 2026", "Novembro de 2026",
                 "Com contingência determinística."],
                ["Suite completa e CI", "Novembro de 2026", "17 de Novembro de 2026",
                 "138 testes; última execução verde."],
                ["Documento final", "Novembro de 2026", "Novembro de 2026",
                 "Este documento."],
            ],
        }),

        ("h2", "5.4 Backlog e estimativas"),
        ("p", "O backlog foi estimado em pontos de história, numa escala de 1 a 8, e refinado no "
              "início de cada sprint. A Tabela 18 apresenta os doze itens principais."),
        ("t", {
            "cap": "Backlog do produto (extracto)",
            "cols": ["ID", "Item", "Pontos", "Sprint", "Estado"],
            "w": [1.2, 9.4, 1.8, 2.0, 2.6],
            "f": 8.8,
            "rows": [
                ["PB01", "Registo, login e sessões revogáveis", "5", "1", "Concluído"],
                ["PB02", "Criação de denúncia com foto e GPS", "8", "1", "Concluído"],
                ["PB03", "Mapa público com filtros", "5", "1", "Concluído"],
                ["PB04", "Máquina de estados e histórico", "5", "1", "Concluído"],
                ["PB05", "Painel municipal e atribuição", "8", "2", "Concluído"],
                ["PB06", "Painel do técnico e prova de resolução", "5", "2", "Concluído"],
                ["PB07", "Comentários, apoios e avaliação", "5", "2", "Concluído"],
                ["PB08", "Administração de categorias e utilizadores", "5", "2", "Concluído"],
                ["PB09", "Dashboard e exportação CSV", "5", "3", "Concluído"],
                ["PB10", "Assistente de IA e contingência", "8", "3", "Concluído"],
                ["PB11", "Relatório executivo", "3", "3", "Concluído"],
                ["PB12", "Pipeline de CI e documento final", "5", "Consolidação", "Concluído"],
            ],
        }),

        ("h2", "5.5 Gestão de riscos"),
        ("p", "Os riscos foram identificados no início do projecto e revistos em cada sprint. A "
              "Tabela 19 apresenta os dez riscos com maior relevância, a probabilidade, o impacto, a "
              "mitigação e o estado final. A coluna de estado distingue riscos materializados, "
              "mitigados e residuais."),
        ("t", {
            "cap": "Registo de riscos do projecto",
            "cols": ["ID", "Risco", "Prob.", "Impacto", "Mitigação", "Estado"],
            "w": [1.1, 4.6, 1.2, 1.4, 6.0, 2.7],
            "f": 8.4,
            "rows": [
                ["R01", "Crescimento descontrolado do âmbito.", "Alta", "Alto",
                 "Backlog fechado por sprint; funcionalidades não essenciais para trabalho futuro.",
                 "Mitigado"],
                ["R02", "Perda de dados ou corrupção do histórico.", "Baixa", "Alto",
                 "Transacções, bloqueio de linha e restrições de unicidade.", "Mitigado"],
                ["R03", "Falha ou indisponibilidade da API Gemini.", "Média", "Médio",
                 "Funcionalidades opcionais e contingência determinística.", "Mitigado"],
                ["R04", "Limites dos planos gratuitos de Vercel/Supabase.", "Média", "Médio",
                 "Consultas eficientes, armazenamento externo e monitorização.", "Residual"],
                ["R05", "Sessão insegura ou sequestro de conta.", "Baixa", "Alto",
                 "Cookie HttpOnly, SameSite, regeneração e revogação.", "Mitigado"],
                ["R06", "Upload de ficheiro malicioso.", "Média", "Alto",
                 "Validação de assinatura, limite de tamanho e bucket restrito.", "Mitigado"],
                ["R07", "Duplicação excessiva de denúncias.", "Alta", "Médio",
                 "Detecção por GPS/texto e política de rejeição com referência.", "Parcial"],
                ["R08", "Duas transições concorrentes corrompem o estado.", "Baixa", "Alto",
                 "Transacção com SELECT ... FOR UPDATE e teste dedicado.", "Mitigado"],
                ["R09", "Indisponibilidade da plataforma de deployment.", "Baixa", "Alto",
                 "Arquitectura portável; procedimento de redeploy documentado.", "Residual"],
                ["R10", "Indisponibilidade de um elemento da equipa.", "Média", "Médio",
                 "Documentação, revisão cruzada e histórico no Git.", "Residual"],
            ],
        }),

        ("h2", "5.6 Matriz de dependência"),
        ("p", "As actividades do projecto não são independentes. A Tabela 20 apresenta as "
              "dependências principais, que explicam a ordem dos sprints e justificam por que razão a "
              "documentação final só pôde ser fechada depois dos testes."),
        ("t", {
            "cap": "Dependências entre actividades",
            "cols": ["Actividade", "Depende de"],
            "w": [10.8, 6.2],
            "f": 9,
            "rows": [
                ["A1 — Contextualização e definição do problema", "—"],
                ["A2 — Elicitação e revisão de requisitos", "A1"],
                ["A3 — Especificação de RF, RNF e casos de uso", "A2"],
                ["A4 — Modelação da base de dados", "A3"],
                ["A5 — Sprint 1 (núcleo funcional)", "A3, A4"],
                ["A6 — Revisão do Sprint 1 e planeamento do Sprint 2", "A5"],
                ["A7 — Sprint 2 (painéis e participação)", "A6"],
                ["A8 — Revisão do Sprint 2 e planeamento do Sprint 3", "A7"],
                ["A9 — Sprint 3 (IA, dashboard e relatório)", "A8"],
                ["A10 — Plano de testes e casos de teste", "A3, A5, A7, A9"],
                ["A11 — Implementação e execução dos testes", "A10"],
                ["A12 — Deployment e verificação em produção", "A11"],
                ["A13 — Documento final e defesa", "A12"],
            ],
        }),

        ("h2", "5.7 Controlo de configuração"),
        ("p", "O código-fonte está num repositório Git público, com 29 commits até 17 de Novembro de "
              "2026. A branch `main` é protegida por hábito: cada alteração é commitada com mensagem "
              "descritiva e o pipeline é executado antes de ser considerada integrada. Não se adoptou "
              "um modelo de branching complexo — com uma equipa de dois elementos e sprints curtos, "
              "branches de longa duração introduziriam conflitos sem benefício."),
        ("p", "A versão do produto é 2.0.0, reflectindo a passagem de um protótipo inicial para a "
              "plataforma multi-municipal com IA e painéis. As dependências são fixadas no "
              "`package-lock.json` e instaladas com `npm ci` no pipeline, garantindo builds "
              "determinísticos. Os segredos nunca são versionados; o ficheiro `.env.example` documenta "
              "as variáveis necessárias."),
        ("p", "A documentação de operação está em `DEPLOY.md`, com o procedimento Supabase → Vercel, e "
              "o `README.md` descreve a instalação, os scripts e os testes. O script `npm run "
              "preflight` valida a ligação à base de dados, as tabelas, o RLS, o bucket, a chave Gemini "
              "e a disponibilidade dos modelos, sem imprimir segredos."),

        ("h2", "5.8 Qualidade do processo"),
        ("p", "A qualidade do processo foi avaliada por quatro indicadores: cumprimento da definição "
              "de concluído, taxa de defeitos encontrados após a revisão, estabilidade do pipeline e "
              "dívida técnica assumida. Os três primeiros foram positivos: nenhum item foi considerado "
              "concluído sem testes, os defeitos encontrados após revisão foram corrigidos no sprint "
              "seguinte e o pipeline manteve uma taxa de sucesso elevada. O quarto é o mais frágil: "
              "ficaram por fazer a auditoria de acessibilidade, os testes end-to-end no browser e a "
              "inclusão da cobertura no pipeline, todos identificados no capítulo 12. A dívida técnica "
              "assumida é reconhecida e registada, em vez de silenciada — a atitude que Fowler (2018) "
              "descreve como condição para a poder pagar mais tarde."),
        ("p", "A principal lição de processo é que a **revisão cruzada** foi o mecanismo mais eficaz "
              "de detecção precoce. Vários defeitos — a ausência de `FOR UPDATE`, a validação "
              "insuficiente do MIME e a fuga de nome real em comentários — foram detectados em revisão, "
              "antes de chegarem aos testes. Isto não substitui os testes, mas mostra que a inspecção "
              "humana continua a ser complementar à automação."),
        ("q",),

        # ------------------------------------------------------------------
        ("h1", "6. Implementação"),
        ("p", "Este capítulo descreve como a arquitectura se traduziu em código. Não é uma listagem "
              "exaustiva de ficheiros; é uma explicação das decisões de implementação que têm "
              "consequências na qualidade, na segurança e nos testes. O código-fonte tem cerca de "
              "4.000 linhas de JavaScript, 2.600 linhas de vistas EJS e 1.960 linhas de testes."),

        ("h2", "6.1 Stack e organização do repositório"),
        ("p", "A Tabela 21 resume a stack. Todas as escolhas privilegiam tecnologias maduras, "
              "documentadas e com suporte na Vercel, evitando dependências que exijam servidores "
              "dedicados."),
        ("t", {
            "cap": "Stack tecnológica",
            "cols": ["Área", "Tecnologia", "Papel"],
            "w": [3.0, 5.4, 8.6],
            "f": 9,
            "rows": [
                ["Runtime", "Node.js 20+ (CI em 22)", "Execução do servidor e dos scripts."],
                ["Framework web", "Express 4", "Rotas, middleware e respostas."],
                ["Vistas", "EJS", "Renderização no servidor com layouts por papel."],
                ["Estilos", "Tailwind CSS 4, compilado", "CSS minificado, sem CDN."],
                ["Base de dados", "PostgreSQL 15+ (Supabase); PGlite nos testes", "Persistência relacional."],
                ["Sessões", "express-session + store PostgreSQL", "Sessões revogáveis."],
                ["Upload", "Multer 2 em memória", "Validação e envio de fotografias."],
                ["Armazenamento", "Supabase Storage / disco local", "Fotografias das denúncias."],
                ["IA", "Google Gemini `generateContent`", "Chatbot, classificação, prioridade, duplicados."],
                ["Mapas", "Leaflet + tiles CARTO/Esri", "Mapa público e selecção de local."],
                ["Testes", "Jest + Supertest", "Testes unitários e de integração."],
                ["CI", "GitHub Actions", "Instalação, build e suite completa."],
                ["Deploy", "Vercel", "Função serverless e estáticos."],
            ],
        }),
        ("p", "A organização do repositório reflecte as fronteiras arquitecturais. O bloco seguinte "
              "mostra a estrutura resumida."),
        ("code", """cidadao-ativo/
├── api/index.js            # entrada serverless da Vercel
├── src/
│   ├── app.js              # middleware, sessão, CSRF, CSP, rotas
│   ├── config.js           # ambiente e funcionalidades
│   ├── db.js               # pg + PGlite, query() e tx()
│   ├── auth.js             # autenticação e exigirAutenticacao
│   ├── authorization.js    # podeAceder, podeGerir, podeAtribuir
│   ├── csrf.js             # tokens por sessão
│   ├── rateLimit.js        # limitadores com namespace
│   ├── storage.js          # Supabase Storage ou disco
│   ├── domain/             # máquina de estados
│   ├── validation/         # validação de denúncias
│   ├── services/           # encaminhamento, IA e relatórios
│   ├── models/             # acesso a dados
│   └── routes/             # auth, reports, map, municipio, tecnico, admin, api
├── views/                  # EJS por área e por papel
├── public/                 # CSS, JS, ícones e vendor
├── database/               # schema.sql, seed e storage.sql
├── tests/                  # unit, integration, helpers e setup
└── docs/                   # documentação e este relatório""", "Estrutura resumida do repositório"),
        ("p", "A regra de dependência é simples e verificável por inspecção: `routes/` pode importar "
              "`domain/`, `validation/`, `services/` e `models/`; `services/` pode importar `models/`; "
              "`models/` pode importar `db.js` e `storage.js`; `domain/`, `validation/` e "
              "`authorization.js` não importam nada do projecto. Esta última regra é a mais importante, "
              "porque mantém o núcleo testável sem infraestrutura."),

        ("h2", "6.2 Camada de apresentação"),
        ("p", "As vistas usam três layouts: público, autenticado com barra lateral e autenticação. O "
              "layout autenticado adapta a navegação ao papel: o cidadão vê “As minhas denúncias”; o "
              "técnico vê “Minhas tarefas”; o gestor vê dashboard, gestão, relatório e exportação; o "
              "administrador vê também categorias e utilizadores. Esta adaptação é visual, não "
              "autoritativa: cada rota verifica novamente a permissão, porque esconder um link não é "
              "um controlo de segurança."),
        ("p", "A interface é **dark-first**, com contraste elevado e cartões de estado. A Figura 7 "
              "mostra a página inicial, com o mapa público, os indicadores agregados e a lista de "
              "ocorrências recentes. O mapa usa Leaflet servido localmente e tiles externos; os "
              "marcadores são coloridos por estado."),
        ("f", {"path": "capturas/01_mapa_publico.jpg", "w": 16.4,
               "cap": "Página inicial com mapa público e indicadores",
               "nota": "Captura obtida no ambiente de demonstração, semeado com 14 ocorrências em dois "
                       "municípios."}),
        ("p", "O formulário de denúncia foi desenhado para reduzir abandono. A Figura 8 mostra a "
              "estrutura em três blocos — fotografia, detalhes e localização — com validação "
              "client-side indicativa e validação server-side autoritativa. A fotografia é "
              "obrigatória e o texto de ajuda explica os requisitos antes de o utilizador errar."),
        ("f", {"path": "capturas/04_nova_denuncia.jpg", "w": 16.4,
               "cap": "Formulário de criação de denúncia",
               "nota": "Captura obtida com a conta de demonstração da cidadã Maria."}),
        ("p", "A página de detalhe do cidadão, na Figura 9, reúne a fotografia, a descrição, o estado "
              "actual, a linha temporal e as acções disponíveis. A linha temporal é construída a "
              "partir do histórico, o que dá ao cidadão uma leitura compreensível do processo e não "
              "apenas um rótulo de estado."),
        ("f", {"path": "capturas/05_detalhe_denuncia.jpg", "w": 16.4,
               "cap": "Detalhe de uma denúncia na perspectiva do cidadão",
               "nota": "Captura obtida com a conta de demonstração da cidadã Maria."}),
        ("p", "Os estilos são compilados com Tailwind para `public/css/app.css`, num passo de build "
              "executado localmente e no pipeline. Não há folhas de estilo externas nem scripts "
              "inline, o que permite uma CSP restritiva. O JavaScript próprio limita-se ao mapa, à "
              "geolocalização, ao assistente e a pequenas interacções; toda a lógica de negócio "
              "permanece no servidor."),

        ("h2", "6.3 Rotas e controladores"),
        ("p", "As rotas estão agrupadas por área funcional. A Tabela 22 apresenta os grupos, as "
              "principais rotas e a regra de acesso."),
        ("t", {
            "cap": "Grupos de rotas e regras de acesso",
            "cols": ["Grupo", "Rotas principais", "Acesso"],
            "w": [2.8, 10.0, 4.2],
            "f": 8.6,
            "rows": [
                ["map.js", "GET /inicio, GET /, GET /dashboard", "Público; /dashboard autenticado."],
                ["auth.js", "GET/POST /login, /registar, POST /logout", "Público; /logout com CSRF."],
                ["reports.js", "GET /denuncias, /denuncias/nova, /denuncias/:id; POST /denuncias; "
                                "POST /denuncias/:id/avaliar", "Cidadão autenticado; autor no detalhe."],
                ["ocorrencias.js", "GET /ocorrencias/:id; POST votar e comentar", "Público na leitura; "
                                                                                 "cidadão na escrita."],
                ["municipio.js", "GET dashboard, denúncias, relatório, exportar.csv; POST atribuir e "
                                 "estado", "Gestor do município ou admin."],
                ["tecnico.js", "GET /tecnico/tarefas e /:id; POST iniciar e resolver", "Técnico "
                                                                                    "atribuído."],
                ["admin.js", "GET/POST categorias e utilizadores", "Administrador."],
                ["api.js", "/api/reports, /api/chatbot, /api/ai/*", "Autenticado; CSRF e rate limit."],
            ],
        }),
        ("p", "As rotas de escrita validam o token CSRF antes de qualquer efeito. A validação de "
              "entrada é feita em `validation/denuncia.js` e nas rotas específicas; os erros são "
              "devolvidos ao formulário com mensagens em português, sem revelar detalhes internos. As "
              "respostas de erro usam códigos HTTP adequados: 400 para dados inválidos, 403 para "
              "acesso negado, 404 para recurso inexistente ou invisível, 419 para CSRF inválido, 422 "
              "para transição inválida e 429 para limite de tentativas."),
        ("p", "Uma decisão relevante foi devolver **404 em vez de 403** quando o recurso existe mas "
              "não é visível para o utilizador. Esta escolha evita confirmar a existência de "
              "denúncias de outros municípios a quem não tem direito a vê-las. Os testes de "
              "isolamento verificam explicitamente este comportamento."),

        ("h2", "6.4 Modelos e acesso a dados"),
        ("p", "O módulo `src/db.js` oferece duas operações: `query(sql, params)` e `tx(fn)`. A primeira "
              "executa uma consulta e devolve `{ rows, rowCount }`; a segunda executa uma função dentro "
              "de uma transacção, com commit automático em caso de sucesso e rollback em caso de erro. "
              "Os parâmetros podem ser escritos com `?`, que são convertidos para `$1`, `$2`, ... — uma "
              "conveniência que não abre a porta a injecção, porque a conversão é posicional e os "
              "valores continuam a ser passados separadamente."),
        ("p", "A mesma interface serve dois drivers. Em produção usa-se `pg` com a `DATABASE_URL` do "
              "Supabase; nos testes usa-se PGlite, um PostgreSQL compilado para WebAssembly, que corre "
              "em memória e executa o mesmo `database/schema.sql`. Esta escolha é uma das mais "
              "importantes do projecto: os testes de integração exercitam SQL real, restrições reais e "
              "transacções reais, sem depender de um serviço externo. O custo é o tempo de arranque do "
              "PGlite, que é compensado pela ausência de rede."),
        ("p", "Os modelos encapsulam as consultas. `Denuncia` concentra as operações de listagem, "
              "detalhe, criação, mudança de estado e estatísticas; `Usuario` trata da autenticação e da "
              "gestão de contas; `Categoria`, `Departamento` e `Municipio` cobrem os catálogos. As "
              "consultas que alimentam o dashboard usam agregações SQL — contagens por estado, média de "
              "tempo de resolução, satisfação média, ocorrências fora do SLA — em vez de calcular tudo "
              "em JavaScript, o que reduz o volume de dados transferidos."),

        ("h2", "6.5 Domínio de estados e transacções"),
        ("p", "A mudança de estado é a operação mais sensível do sistema. A implementação segue quatro "
              "passos: validar a transição na tabela, bloquear a linha da denúncia, actualizar o estado "
              "e inserir o histórico, tudo dentro da mesma transacção. O bloqueio com `SELECT ... FOR "
              "UPDATE` impede que dois pedidos concorrentes leiam o mesmo estado e produzam duas "
              "transições a partir dele."),
        ("code", """// src/domain/estadosDenuncia.js
const TRANSITIONS = Object.freeze({
    recebida:   ['em_analise'],
    em_analise: ['atribuida', 'rejeitada'],
    atribuida:  ['em_execucao'],
    em_execucao:['resolvida'],
    resolvida:  ['fechada'],
    fechada:    [],
    rejeitada:  [],
});

function podeMudarStatus(de, para) {
    return (TRANSITIONS[de] || []).includes(para);
}

// routes/municipio.js (excerto)
if (!podeMudarStatus(denuncia.status, novoEstado)) {
    req.flashErrors(['Transição inválida: ' + denuncia.status + ' → ' + novoEstado]);
    return res.status(422).render(...);
}
await db.tx(async (cx) => {
    const { rows } = await cx.query(
        'SELECT status FROM reports WHERE id = $1 FOR UPDATE', [id]);
    if (!podeMudarStatus(rows[0].status, novoEstado)) throw new Error('ESTADO');
    await cx.query('UPDATE reports SET status = $1 WHERE id = $2', [novoEstado, id]);
    await cx.query(
        `INSERT INTO report_status_histories
            (report_id, previous_status, new_status, changed_by, note)
         VALUES ($1, $2, $3, $4, $5)`,
        [id, rows[0].status, novoEstado, req.usuarioAtual.id, nota]);
});""", "Tabela de transições e mudança de estado transaccional"),
        ("p", "A dupla verificação — antes e dentro da transacção — pode parecer redundante, mas não "
              "é. A primeira produz uma mensagem de erro clara e evita abrir uma transacção para uma "
              "operação inválida. A segunda protege contra a corrida entre a leitura inicial e o "
              "bloqueio. O teste “duas transições concorrentes: apenas uma vence e o histórico não "
              "duplica” exercita exactamente esta situação."),
        ("p", "A rejeição exige uma nota explicativa, que é gravada no histórico e visível ao cidadão. "
              "Esta decisão transforma uma operação potencialmente opaca — “a sua denúncia foi "
              "rejeitada” — numa comunicação com justificação, por exemplo a referência a uma "
              "ocorrência duplicada já em intervenção."),

        ("h2", "6.6 Validação e tratamento de erros"),
        ("p", "A validação é feita no servidor, mesmo quando existe validação no cliente. O módulo "
              "`validation/denuncia.js` verifica: categoria existente, descrição entre 10 e 5.000 "
              "caracteres, fotografia presente, latitude e longitude numéricas e dentro do intervalo, "
              "e bairro com até 120 caracteres. As mensagens são específicas: “A descrição deve ter "
              "pelo menos 10 caracteres”, e não “dados inválidos”."),
        ("p", "Os limites não foram escolhidos arbitrariamente. O mínimo de 10 caracteres distingue "
              "uma descrição útil de uma palavra solta; o máximo de 5.000 protege a base de dados e a "
              "interface; o limite de 4 MB para a fotografia resulta do compromisso entre qualidade "
              "visual e consumo de dados móveis. Os valores-limite são testados explicitamente: 9 e 10 "
              "caracteres, 5.000 e 5.001, 119, 120 e 121 caracteres no bairro."),
        ("p", "O tratamento de erros usa um middleware final que registra a excepção no servidor e "
              "devolve uma página genérica ao utilizador. As rotas assíncronas são envolvidas por "
              "`express-async-errors`, o que evita o padrão repetitivo de `try/catch` em cada handler "
              "e garante que nenhuma promessa rejeitada fica sem tratamento. Em produção, a mensagem "
              "genérica impede a fuga de detalhes internos, como nomes de tabelas ou caminhos."),

        ("h2", "6.7 Autenticação, sessões e autorização"),
        ("p", "As palavras-passe são guardadas com bcrypt, com custo adequado ao ambiente. No login, a "
              "sessão é regenerada antes de receber o identificador do utilizador, prevenindo fixação "
              "de sessão. O cookie é `HttpOnly`, `SameSite=Lax` e `Secure` em produção. O logout "
              "destrói a sessão na base de dados e limpa o cookie; apagar uma conta ou alterar a "
              "palavra-passe invalida imediatamente as sessões activas, porque o store verifica a "
              "existência do utilizador."),
        ("p", "As sessões são persistidas na tabela `user_sessions`, com o conteúdo JSON, o "
              "identificador do utilizador e a data de expiração. Esta opção resolve dois problemas "
              "do modelo serverless: uma função pode ser terminada a qualquer momento, pelo que a "
              "sessão não pode viver apenas em memória; e várias instâncias podem servir o mesmo "
              "utilizador, pelo que a sessão tem de ser partilhada. A alternativa JWT foi rejeitada "
              "porque a revogação imediata exigiria uma lista negra, ou seja, voltaria a introduzir "
              "estado persistente."),
        ("p", "A autorização está concentrada em `src/authorization.js`. As funções recebem o "
              "utilizador e a denúncia e devolvem um booleano, sem acesso à base de dados. A Tabela 23 "
              "resume a matriz de decisão para o acesso e para a gestão."),
        ("t", {
            "cap": "Matriz de autorização",
            "cols": ["Papel", "Acede ao detalhe", "Gere estado/atribui", "Pode avaliar"],
            "w": [3.6, 4.8, 4.8, 3.8],
            "f": 9,
            "rows": [
                ["Cidadão (autor)", "Sim", "Não", "Sim, após resolução"],
                ["Cidadão (não autor)", "Não (404)", "Não", "Não"],
                ["Técnico atribuído", "Sim", "Inicia e resolve", "Não"],
                ["Técnico não atribuído", "Não (404)", "Não", "Não"],
                ["Gestor do município", "Sim", "Sim", "Não"],
                ["Gestor de outro município", "Não (404)", "Não", "Não"],
                ["Administrador", "Sim", "Sim", "Não"],
                ["Visitante", "Só página pública anonimizada", "Não", "Não"],
            ],
        }),

        ("h2", "6.8 Fotografias e armazenamento"),
        ("p", "O upload usa Multer em memória, com limite de 4 MB, e nunca escreve directamente no "
              "disco antes de validar. A validação compara os primeiros bytes do ficheiro com a "
              "assinatura esperada para JPEG, PNG e WebP; um ficheiro com extensão `.jpg` mas conteúdo "
              "executável é recusado. Só depois de validado é enviado para o Supabase Storage, com uma "
              "chave gerada aleatoriamente, e o URL público é guardado na denúncia."),
        ("p", "A camada `storage.js` abstrai o destino. Em produção usa o bucket configurado; em "
              "desenvolvimento e testes usa `public/uploads`. A leitura de um ficheiro remoto é "
              "restrita ao bucket configurado, o que evita que um URL arbitrário seja usado para "
              "aceder à rede interna — uma protecção contra SSRF. A remoção de uma fotografia órfã, "
              "quando a transacção falha depois do upload, é tratada com compensação explícita."),
        ("p", "A Figura 10 mostra a página de gestão municipal, onde a fotografia do cidadão, a "
              "descrição, a localização e o histórico são apresentados ao gestor, juntamente com as "
              "acções de atribuição e de mudança de estado."),
        ("f", {"path": "capturas/11_gestao_denuncia.jpg", "w": 16.4,
               "cap": "Página de gestão de uma denúncia no painel municipal",
               "nota": "Captura obtida com a conta de demonstração do gestor João."}),

        ("h2", "6.9 Inteligência artificial com contingência"),
        ("p", "A integração com a Gemini foi construída como uma camada opcional. O cliente "
              "`aiClient.js` concentra a chamada `generateContent`, o tratamento de erros, o timeout e "
              "o fallback para um modelo alternativo. Cada funcionalidade tem uma flag "
              "`AI_FEATURE_*`; quando a flag está desligada ou falta a chave, o serviço correspondente "
              "não é chamado e a funcionalidade usa uma alternativa determinística."),
        ("t", {
            "cap": "Funcionalidades de IA e contingência",
            "cols": ["Funcionalidade", "Uso", "Sem IA / em falha"],
            "w": [3.6, 8.4, 5.0],
            "f": 8.8,
            "rows": [
                ["Assistente (chatbot)", "Respostas sobre ocorrências e procedimentos.",
                 "Respostas pré-definidas com base nos dados disponíveis."],
                ["Sugestão de descrição", "Melhora o texto do cidadão.", "Campo livre, sem sugestão."],
                ["Classificação", "Propõe categoria a partir do texto/foto.", "Categoria escolhida pelo cidadão."],
                ["Prioridade", "Combina gravidade, proximidade e apoios.", "Regra determinística de gravidade."],
                ["Duplicados", "Detecta ocorrências próximas e semelhantes.", "Verificação por GPS e categoria."],
                ["Análise de fotografia", "Apoia a classificação e a comparação antes/depois.", "Desactivada."],
                ["Resumo", "Resume descrições longas para o gestor.", "Texto original."],
                ["Relatório executivo", "Narrativa sobre os indicadores.", "Relatório por regras com números reais."],
            ],
        }),
        ("p", "A contingência não é um detalhe. Num contexto em que a chave de API pode não existir, "
              "em que o fornecedor pode estar indisponível ou em que o custo por chamada é relevante, "
              "um sistema que dependa inteiramente de IA é um sistema que falha por razões alheias ao "
              "seu domínio. A solução adoptada garante que a criação, a triagem e o fecho de denúncias "
              "funcionam sempre, com ou sem IA."),
        ("p", "A privacidade foi tratada explicitamente. Os comentários públicos usam pseudónimos "
              "estáveis, nunca o nome real; os prompts não incluem email nem palavra-passe; e a "
              "análise de fotografia é opcional. Os testes de privacidade verificam que o nome real "
              "não aparece na página pública, mesmo quando o comentário é do próprio autor."),

        ("h2", "6.10 Dashboard, relatório e exportação"),
        ("p", "O dashboard municipal agrega indicadores de operação: total, hoje, pendentes, em curso, "
              "resolvidas, tempo médio de atendimento, taxa de resolução, críticas abertas, "
              "ocorrências fora do SLA e satisfação média. Apresenta ainda as categorias mais "
              "frequentes, os bairros com mais ocorrências e um mapa de densidade. A Figura 11 mostra "
              "o resultado com os dados de demonstração."),
        ("f", {"path": "capturas/09_dashboard_municipal.jpg", "w": 16.4,
               "cap": "Dashboard municipal com indicadores de operação",
               "nota": "Captura obtida com a conta de demonstração do gestor João, sobre 12 "
                       "ocorrências do município de Maputo."}),
        ("p", "O relatório executivo pode ser gerado por IA ou por regras. A versão por regras cita "
              "números reais e produz recomendações coerentes com os alertas — por exemplo, se "
              "existem ocorrências fora do SLA, recomenda revisão de prioridades. A versão por IA "
              "recebe um resumo estruturado dos indicadores, sem dados pessoais, e produz uma "
              "narrativa. Em ambos os casos, o gestor pode exportar os dados em CSV."),
        ("p", "A exportação CSV é restrita ao município do gestor e neutraliza fórmulas. Um valor como "
              "`=HYPERLINK(...)` é prefixado com apóstrofo, impedindo que a folha de cálculo o "
              "interprete como fórmula. Esta protecção é frequentemente esquecida e foi objecto de um "
              "teste dedicado, porque a exportação é uma via clássica de injecção em sistemas que "
              "tratam texto livre."),

        ("h2", "6.11 Configuração, scripts e operação"),
        ("p", "O projecto expõe scripts para as tarefas recorrentes: `npm run dev` para "
              "desenvolvimento com recarregamento, `npm start` para execução local, `npm run seed` "
              "para semear catálogos e contas de teste, `npm run build:css` para compilar Tailwind, "
              "`npm test` para a suite completa, `npm run test:coverage` para a cobertura, `npm run "
              "preflight` para validar a configuração de produção e `npm run env:vercel` para gerar o "
              "ficheiro de variáveis."),
        ("p", "A configuração distingue três ambientes e recusa arrancar em produção sem os segredos "
              "obrigatórios. Em teste, o ficheiro `.env` não é carregado e as variáveis são forçadas "
              "para valores seguros, o que impede a suite de tocar em dados reais. Esta decisão é "
              "particularmente importante num projecto que usa uma base de dados gerida: um teste mal "
              "configurado poderia apagar dados de produção."),
        ("p", "A operação em produção é simples por desenho. A Vercel executa a função, o Supabase "
              "guarda os dados e as fotografias, e o endpoint `/health` permite verificar a versão e a "
              "configuração. Não há servidores para actualizar, nem processos em segundo plano. A "
              "limitação é a dependência de dois fornecedores externos, assumida no registo de riscos."),
        ("q",),
    ]
