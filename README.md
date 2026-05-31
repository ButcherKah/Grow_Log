# 🌱 GrowLog v3

Diário de cultivo indoor PWA — registre cada etapa da planta à colheita, do seu celular, sem internet.

---

## Instalação

**iOS Safari**
1. Abra o link do GitHub Pages no Safari
2. Toque em compartilhar → "Adicionar à Tela de Início"
3. O app aparece como ícone na home

**Android Chrome**
1. Abra o link no Chrome
2. Menu (⋮) → "Adicionar à tela inicial"

---

## Navegação

Quatro abas na barra inferior:

| Aba | Função |
|---|---|
| **Início** | Visão geral, lista de plantas, alertas |
| **Planta** | Detalhe da planta ativa (aparece após abrir uma planta) |
| **Biblioteca** | Substratos, receitas de solo e nutrientes cadastrados |
| **Analytics** | KPIs, gráficos de barras, médias por planta |

---

## Plantas

Toque no **＋** (botão flutuante) na tela Início para cadastrar uma planta.

O cadastro tem 4 abas:

- **Básico** — nome/strain, tipo (auto/foto), data de início, ciclo de rega, semanas de veg/flor, observações
- **Solo** — tipo (inerte, orgânico, organomineral, coco), receita, marca
- **Setup** — LED (modelo, chip, watts), fotoperíodo (horário liga/apaga), exaustor, ventilador, timer, tomada inteligente, irrigação automática, sensores (CO₂, VPD, luz, câmera), tenda
- **Origem** — planta mãe (para genealogia de clones)

---

## Registros

Na tela **Planta**, toque em **＋ Registrar** (botão verde) ou nos atalhos:

| Atalho | Abre |
|---|---|
| 💧 Rega | Registro com campos de volume, pH, EC e nutrientes |
| 🌡️ Clima | Registro com temperatura e umidade |

**Tipos de registro disponíveis:**

`📋 Geral` `💧 Rega` `🌡️ Clima` `💡 Luz` `✂️ Poda` `🪢 LST` `🍃 Defoliação` `🪴 Transplante` `🚿 Flush` `🧪 Runoff`

### Campos automáticos
- **Dias e semana** são calculados automaticamente a partir da data
- **VPD** é calculado ao preencher temperatura + umidade
- **PPFD e DLI** são calculados ao preencher lux + horários LED

### Badges de referência
Cada valor registrado recebe um badge colorido comparado às tabelas de referência para LM301H indoor:

- 🟢 Dentro da faixa ideal
- 🟡 Fora da faixa (tolerância 10%)
- 🔴 Muito acima ou abaixo

As tabelas são diferentes para **automáticas** e **fotoperíodo**, por semana do ciclo.

---

## Estágio

Toque em **editar** ao lado do estágio na tela da planta. Estágios disponíveis:

`🌰 Germinação` → `🌱 Plântula` → `🍃 Vegetativo` → `🌸 Floração` → `✂️ Colheita`

Ao entrar em **Colheita**, o app abre automaticamente o relatório de colheita.

Dias e semana são automáticos. É possível sobrescrever manualmente se necessário.

---

## Cards de status

Na tela da planta, acima dos botões de ação:

- **Próxima rega** — mostra se a próxima é com ou sem nutriente, com base no ciclo configurado (ex: 2 com + 1 sem)
- **Countdown** — dias restantes até a colheita estimada, com barra de progresso (aparece se semanas de veg/flor estiverem preenchidas)
- **VPD** — valor e zona ideal do último registro com temperatura e umidade

---

## Tabs da planta

| Tab | Conteúdo |
|---|---|
| **Timeline** | Registros agrupados por dia, em ordem cronológica reversa |
| **Registros** | Lista compacta com chips de valores e badges de referência |
| **Genealogia** | Árvore mostrando planta mãe, clones e a planta atual |

---

## Biblioteca

Cadastre insumos para reutilizar nos registros:

- **Substratos** — nome, tipo, marca, notas
- **Receitas de solo** — lista de componentes com proporções
- **Nutrientes** — nome, tipo, dose mínima e máxima (ml/L)

Nutrientes cadastrados aparecem como **autocomplete** no campo de nutrientes da rega.

---

## Analytics

KPIs globais: total de plantas, registros, água e temperatura média.

Gráficos de barras:
- Ações por tipo (rega, poda, clima...)
- Água total por planta (em litros)

Bloco por planta com médias de temperatura, umidade, pH, EC e dados do setup.

---

## Dados / Backup

Botão de dados no menu (ícone ⋮ ou via tela Início):

| Opção | Descrição |
|---|---|
| 💾 Backup JSON | Exporta todos os dados em JSON — use para migrar entre dispositivos |
| 📥 Importar Backup | Restaura a partir de um JSON (substitui os dados atuais) |
| 📊 Exportar CSV | Exporta todos os registros de todas as plantas |

Na tela da planta, o botão **CSV** exporta só aquela planta.

> ⚠️ Faça backup regularmente. Os dados ficam no IndexedDB do navegador — limpar o cache do browser apaga tudo.

---

## Relatório de colheita

Gerado automaticamente ao entrar no estágio **Colheita**. Contém:

- Resumo do ciclo (duração, regas, água total, flushes)
- Médias ambientais (temp, UR, VPD, pH, EC)
- Linha do tempo por estágio
- Campos para peso úmido, peso seco e avaliação (1–5 ⭐)
- Exportação em CSV

---

## Tecnologia

- PWA puro — HTML + CSS + JS sem framework
- IndexedDB como storage principal, localStorage como fallback
- Funciona offline após o primeiro acesso
- Compatível com iOS Safari e Android Chrome

---

## Setup de desenvolvimento

```bash
# Clonar o repositório
git clone https://github.com/seu-usuario/growlog.git
cd growlog

# Servir localmente (qualquer servidor estático serve)
npx serve .
# ou
python3 -m http.server 8080
```

Acesse `http://localhost:8080` no navegador.

Para deploy: suba os arquivos na raiz do repositório e ative GitHub Pages em **Settings → Pages → Branch: main**.
