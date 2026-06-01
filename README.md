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

## Fluxo recomendado

A biblioteca é o ponto de partida. Antes de cadastrar plantas, popule a biblioteca com seus insumos e setup:

1. **Biblioteca → 💡 Setup** — cadastre sua tenda, LED, sensores e automações
2. **Biblioteca → 🪨 Solo** — cadastre seus substratos
3. **Biblioteca → 📋 Receitas** — cadastre receitas de solo orgânico
4. **Biblioteca → 🧪 Nutrientes** — cadastre seus nutrientes com dose mínima e máxima
5. **Início → ＋** — cadastre a planta e selecione setup e solo da biblioteca

---

## Navegação

Quatro abas na barra inferior:

| Aba | Função |
|---|---|
| **Início** | Visão geral, lista de plantas, alertas |
| **Planta** | Detalhe da planta ativa (aparece após abrir uma planta) |
| **Biblioteca** | Substratos, receitas, nutrientes e setups cadastrados |
| **Analytics** | KPIs, gráficos de barras, médias por planta |

---

## Biblioteca

Central de insumos e equipamentos. Cadastre uma vez, reutilize em qualquer cultivo.

### 🪨 Solo
Substratos individuais — nome, tipo (inerte, orgânico, organomineral, coco), marca e notas.

### 📋 Receitas
Receitas de solo — lista de componentes com proporções e notas de preparo.

### 🧪 Nutrientes
- Nome, tipo (mineral, orgânico, adubo sólido)
- Dose mínima e máxima em ml/L
- Aparecem como **autocomplete** no campo de nutrientes da rega

### 💡 Setup
Setup completo do cultivo:
- LED — modelo, chip, potência
- Fotoperíodo — horário liga/apaga
- Estrutura — tamanho da tenda
- Clima — exaustor, ventilador
- Automações — timer, tomada inteligente, irrigação automática
- Sensores — CO₂, VPD/UR/T°, luz, câmera

---

## Plantas

Toque no **＋** (botão flutuante) na tela Início. O cadastro tem 4 abas:

- **Básico** — nome/strain, tipo (auto/foto), data de início, ciclo de rega, semanas de veg/flor, observações
- **Solo** — selecione da biblioteca (substratos ou receitas)
- **Setup** — selecione da biblioteca
- **Origem** — planta mãe (para genealogia de clones)

---

## Registros

Na tela **Planta**, toque em **＋ Registrar** ou nos atalhos:

| Atalho | Abre |
|---|---|
| 💧 Rega | Registro com volume, pH, EC e nutrientes |
| 🌡️ Clima | Registro com temperatura e umidade |

**Tipos de registro disponíveis:**

`📋 Geral` `💧 Rega` `🌡️ Clima` `💡 Luz` `✂️ Poda` `🪢 LST` `🍃 Defoliação` `🪴 Transplante` `🚿 Flush` `🧪 Runoff`

### Campos automáticos
- **Dias e semana** calculados a partir da data de início
- **VPD** calculado ao preencher temperatura + umidade
- **PPFD e DLI** calculados ao preencher lux + horários LED

### Badges de referência
Cada valor recebe um badge comparado às tabelas de referência para LM301H indoor, diferenciadas por tipo (auto/foto) e semana do ciclo:

- 🟢 Dentro da faixa ideal
- 🟡 Fora da faixa com tolerância de 10%
- 🔴 Muito acima ou abaixo

---

## Estágio

Toque em **editar** ao lado do estágio. Estágios disponíveis:

`🌰 Germinação` → `🌱 Plântula` → `🍃 Vegetativo` → `🌸 Floração` → `✂️ Colheita`

Ao entrar em **Colheita**, o app abre automaticamente o relatório de colheita.

---

## Cards de status

Na tela da planta, acima do botão Registrar:

- **Próxima rega** — com ou sem nutriente, baseado no ciclo configurado (ex: 2 com + 1 sem)
- **Countdown** — dias restantes até colheita estimada com barra de progresso
- **VPD** — valor e zona ideal do último registro com temperatura e umidade

---

## Tabs da planta

| Tab | Conteúdo |
|---|---|
| **Timeline** | Registros agrupados por dia, ordem cronológica reversa |
| **Registros** | Lista compacta com chips e badges de referência |
| **Genealogia** | Árvore mostrando planta mãe, clones e planta atual |

---

## Analytics

KPIs globais: total de plantas, registros, água e temperatura média.

Gráficos de barras:
- Ações por tipo (rega, poda, clima...)
- Água total por planta em litros

Bloco por planta com médias de temperatura, umidade, pH, EC, dados do setup e solo.

---

## Dados / Backup

| Opção | Descrição |
|---|---|
| 💾 Backup JSON | Exporta todos os dados — use para migrar entre dispositivos |
| 📥 Importar Backup | Restaura a partir de um JSON (substitui os dados atuais) |
| 📊 Exportar CSV | Exporta registros de todas as plantas |

Na tela da planta, o botão **CSV** exporta só aquela planta.

> ⚠️ Faça backup regularmente. Os dados ficam no IndexedDB do navegador — limpar o cache apaga tudo.

---

## Relatório de colheita

Gerado automaticamente ao entrar em **Colheita**. Contém:

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

## Deploy

```bash
# Clonar
git clone https://github.com/seu-usuario/growlog.git
cd growlog

# Servir localmente
npx serve .
# ou
python3 -m http.server 8080
```

GitHub Pages: **Settings → Pages → Branch: main → Save**
