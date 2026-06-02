# 🌸 GrowLog v4

Diário de cultivo indoor — PWA offline-first para registrar cada etapa da planta à colheita, direto do celular.

---

## Instalação como app

**iOS Safari**
1. Abra o link do GitHub Pages no Safari
2. Ícone de compartilhar → "Adicionar à Tela de Início"
3. GrowLog aparece como app na home

**Android Chrome**
1. Abra o link no Chrome
2. Menu (⋮) → "Adicionar à tela inicial"

---

## Primeira abertura — Onboarding

Na primeira vez, um fluxo guiado de 5 etapas configura sua biblioteca:

1. **Boas-vindas** — visão geral do app
2. **Setup** — tenda, LED, fotoperíodo, sensores
3. **Solo e nutrientes** — substratos, receitas, nutrientes com dosagem
4. **Vasos** — tipo e volume
5. **Genética** — strains e linhagem (opcional)

O onboarding não aparece mais depois de concluído. Tudo pode ser editado a qualquer momento em **Biblioteca**.

---

## Navegação

Quatro abas na barra inferior:

| Aba | Função |
|---|---|
| **Início** | Painel geral, lista de plantas, alertas |
| **Planta** | Detalhe da planta ativa |
| **Biblioteca** | Insumos, equipamentos e genética |
| **Analytics** | KPIs, gráficos, médias por planta |

---

## Biblioteca

Central de insumos e equipamentos — cadastre uma vez, reutilize em todos os cultivos.

**🪨 Solo** — substratos com tipo (inerte, orgânico, organomineral, coco), marca e notas.

**📋 Receitas** — receitas de solo com lista de componentes e proporções.

**🧪 Nutrientes** — nome, tipo, dose mínima e máxima em ml/L. Aparecem como autocomplete nos registros de rega.

**💡 Setup** — configuração completa do ambiente:
- Iluminação: modelo LED, chip, potência
- Fotoperíodo: horário liga/apaga
- Estrutura: tamanho da tenda, exaustor, ventilador, timer
- Automações: tomada inteligente, irrigação automática
- Sensores: CO₂, VPD/temp/umidade, luz, câmera

**🪴 Vasos** — tipo (plástico, tecido, airpot, inteligente) e volume em litros.

**🧬 Genética** — strains com geração (F1, F2, IBL, BX, Landrace, Clone), pai, mãe, banco de sementes e notas.

---

## Plantas

Toque em **＋** na tela Início. O cadastro tem 4 abas:

- **Básico** — nome, tipo (auto/foto), data de início, ciclo de rega, semanas de veg/flor, observações
- **Solo** — substrato ou receita da biblioteca + vaso
- **Setup** — setup da biblioteca
- **Origem** — planta mãe para árvore de clones + strain vinculada para gráfico de linhagem

---

## Registros

Na tela **Planta**, toque em **＋ Registrar** ou nos atalhos de rega e clima.

**Tipos de registro:**

`📋 Geral` `💧 Rega` `🌡️ Clima` `💡 Luz` `✂️ Poda` `🪢 LST` `🍃 Defoliação` `🪴 Transplante` `🚿 Flush` `🧪 Runoff`

### Campos automáticos
- **Dias vivos e semana no ciclo** calculados pela data de início
- **VPD** calculado ao preencher temperatura + umidade
- **PPFD e DLI** calculados ao preencher lux + horários do LED

### Badges de referência
Cada valor recebe um badge comparado às tabelas por tipo (auto/foto) e semana do ciclo:

🟢 Dentro da faixa ideal · 🟡 Fora da faixa (10% de tolerância) · 🔴 Muito acima ou abaixo

---

## Cards de status

Exibidos no topo da tela da planta:

**💧 Próxima rega** — indica se a próxima deve ser com ou sem nutriente, baseado no ciclo configurado (ex: 2 com + 1 sem).

**⏳ Countdown** — dias restantes até a colheita estimada com barra de progresso. Calculado pelas semanas de veg + flor configuradas.

**🌡️ VPD** — valor e zona ideal com base no último registro que contém temperatura e umidade.

---

## Tabs da planta

| Tab | Conteúdo |
|---|---|
| **Timeline** | Registros agrupados por dia, ordem cronológica reversa |
| **Registros** | Lista compacta com chips e badges de referência |
| **Genealogia** | Árvore de clones + botão para gráfico SVG de linhagem genética |

---

## Genealogia e linhagem

A aba **Genealogia** mostra:
- Árvore de clones entre as plantas cadastradas (plantas com planta mãe definida)
- Botão para abrir o **gráfico SVG de linhagem** da strain vinculada

O gráfico renderiza automaticamente a árvore de cruzamentos (até 4 gerações) usando as relações pai/mãe cadastradas nas strains da Biblioteca.

---

## Analytics

KPIs globais: total de plantas, registros, água acumulada, temperatura média.

Gráficos de barras:
- Ações por tipo
- Água total por planta

Bloco por planta com médias de temperatura, umidade, pH e informações do ciclo.

---

## Dados e backup

| Opção | Descrição |
|---|---|
| 💾 Backup JSON | Exporta todos os dados — use para migrar entre dispositivos |
| 📥 Importar Backup | Restaura a partir de um JSON (substitui os dados atuais) |
| 📊 Exportar CSV | Exporta registros de todas as plantas |

Na tela da planta, o botão **CSV** exporta só aquela planta.

> ⚠️ Faça backup regularmente. Os dados ficam no IndexedDB do browser — limpar o cache apaga tudo.

---

## Estágio e relatório de colheita

Toque em **editar** ao lado do estágio para avançar o ciclo.

Ao entrar em **✂️ Colheita**, o relatório abre automaticamente com resumo do ciclo, médias ambientais, timeline de estágios e campos para peso úmido, peso seco e avaliação (1–5 ⭐). Exportável em CSV.

---

## Tecnologia

- PWA puro — HTML + CSS + JS sem framework
- IndexedDB como storage principal, localStorage como fallback
- Funciona offline após o primeiro acesso
- Compatível com iOS Safari e Android Chrome

---

## Deploy no GitHub Pages

```bash
git clone https://github.com/seu-usuario/growlog.git
cd growlog
# Substitua os arquivos e faça push
git add . && git commit -m "v4" && git push
```

**Settings → Pages → Branch: main → Save**

Para testar localmente:

```bash
npx serve .
# ou
python3 -m http.server 8080
```
