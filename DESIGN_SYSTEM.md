# Design System - Harvest Realm

## 1. Visão Geral

O design de Harvest Realm combina elementos de jogos casuais (Stardew Valley, Harvest Moon) com uma estética Web3 moderna. O objetivo é criar uma interface amigável, acessível e visualmente atraente que não intimide novos jogadores.

**Paleta de Cores**: Tons quentes e naturais que remetem à agricultura
**Tipografia**: Limpa e legível, com hierarquia clara
**Estilo de Arte**: Pixel art retrô com toques modernos

## 2. Paleta de Cores

### 2.1 Cores Primárias

| Nome | Hex | RGB | Uso |
|------|-----|-----|-----|
| **Harvest Gold** | `#D4A574` | 212, 165, 116 | Botões principais, destaques |
| **Farm Green** | `#6BA547` | 107, 165, 71 | Sucesso, cultivos saudáveis |
| **Soil Brown** | `#8B6F47` | 139, 111, 71 | Backgrounds, elementos secundários |
| **Sky Blue** | `#87CEEB` | 135, 206, 235 | Backgrounds, elementos de água |
| **Accent Orange** | `#FF8C42` | 255, 140, 66 | Alertas, elementos importantes |

### 2.2 Cores Secundárias

| Nome | Hex | RGB | Uso |
|------|-----|-----|-----|
| **Leaf Green** | `#90EE90` | 144, 238, 144 | Cultivos raros, sucesso |
| **Sunset Red** | `#FF6B6B` | 255, 107, 107 | Erros, perda, riscos |
| **Twilight Purple** | `#9B59B6` | 155, 89, 182 | Itens épicos/lendários |
| **Wheat Yellow** | `#FFD700` | 255, 215, 0 | Ouro, premium, raro |
| **Stone Gray** | `#A9A9A9` | 169, 169, 169 | Elementos desabilitados |

### 2.3 Cores Neutras

| Nome | Hex | RGB | Uso |
|------|-----|-----|-----|
| **White** | `#FFFFFF` | 255, 255, 255 | Background principal, texto claro |
| **Light Gray** | `#F5F5F5` | 245, 245, 245 | Backgrounds secundários |
| **Medium Gray** | `#D3D3D3` | 211, 211, 211 | Borders, separadores |
| **Dark Gray** | `#333333` | 51, 51, 51 | Texto principal |
| **Black** | `#000000` | 0, 0, 0 | Texto em backgrounds claros |

### 2.4 Cores por Rarity

| Rarity | Cor | Hex | Uso |
|--------|-----|-----|-----|
| **Comum** | Gray | `#A9A9A9` | Itens comuns |
| **Incomum** | Green | `#90EE90` | Itens incomuns |
| **Raro** | Blue | `#4169E1` | Itens raros |
| **Épico** | Purple | `#9B59B6` | Itens épicos |
| **Lendário** | Gold | `#FFD700` | Itens lendários |

### 2.5 Cores por Facção

| Facção | Cor Primária | Hex | Cor Secundária | Hex |
|--------|-------------|-----|----------------|-----|
| **Cultivadores** | Farm Green | `#6BA547` | Leaf Green | `#90EE90` |
| **Comerciantes** | Harvest Gold | `#D4A574` | Wheat Yellow | `#FFD700` |
| **Alquimistas** | Twilight Purple | `#9B59B6` | Lavender | `#E6B3FF` |
| **Exploradores** | Sky Blue | `#87CEEB` | Ocean Blue | `#4169E1` |

## 3. Tipografia

### 3.1 Fontes Principais

**Fonte Principal (Headings)**: `Poppins` (Google Fonts)
- Peso: Bold (700), SemiBold (600)
- Tamanho: 24px - 48px
- Uso: Títulos, headings, destaques

**Fonte Secundária (Body)**: `Inter` (Google Fonts)
- Peso: Regular (400), Medium (500)
- Tamanho: 14px - 18px
- Uso: Corpo de texto, descrições

**Fonte Monoespacial (Números)**: `Roboto Mono` (Google Fonts)
- Peso: Regular (400)
- Tamanho: 12px - 16px
- Uso: Valores de tokens, números, códigos

### 3.2 Hierarquia de Texto

| Elemento | Fonte | Tamanho | Peso | Cor |
|----------|-------|--------|------|-----|
| **H1 - Título Principal** | Poppins | 48px | Bold | Dark Gray |
| **H2 - Subtítulo** | Poppins | 36px | SemiBold | Dark Gray |
| **H3 - Seção** | Poppins | 28px | SemiBold | Dark Gray |
| **H4 - Subsseção** | Poppins | 24px | SemiBold | Dark Gray |
| **Body - Padrão** | Inter | 16px | Regular | Dark Gray |
| **Body - Pequeno** | Inter | 14px | Regular | Medium Gray |
| **Label** | Inter | 12px | Medium | Dark Gray |
| **Button Text** | Poppins | 16px | SemiBold | White |

## 4. Componentes de UI

### 4.1 Botões

**Botão Primário (CTA)**
- Background: Harvest Gold (`#D4A574`)
- Texto: White, Poppins Bold 16px
- Padding: 12px 24px
- Border Radius: 8px
- Hover: Darken 10%
- Active: Darken 20%
- Disabled: Stone Gray

**Botão Secundário**
- Background: Light Gray (`#F5F5F5`)
- Texto: Dark Gray, Poppins SemiBold 16px
- Border: 2px Medium Gray
- Padding: 12px 24px
- Border Radius: 8px
- Hover: Background Farm Green (light)

**Botão Perigo**
- Background: Sunset Red (`#FF6B6B`)
- Texto: White, Poppins Bold 16px
- Padding: 12px 24px
- Border Radius: 8px
- Hover: Darken 10%

### 4.2 Cards

**Card Padrão**
- Background: White
- Border: 1px Medium Gray
- Border Radius: 12px
- Padding: 16px
- Box Shadow: 0 2px 8px rgba(0,0,0,0.1)
- Hover: Elevate (shadow 0 4px 12px)

**Card com Rarity**
- Border: 3px com cor de rarity
- Glow effect: Cor de rarity com 20% opacity

### 4.3 Inputs

**Input Text**
- Background: Light Gray
- Border: 1px Medium Gray
- Border Radius: 6px
- Padding: 10px 12px
- Font: Inter Regular 14px
- Focus: Border Farm Green, outline none

**Select Dropdown**
- Mesmo estilo de input
- Ícone de chevron à direita
- Hover: Background mais claro

### 4.4 Modals

**Modal Background**
- Overlay: Black com 40% opacity
- Card: White, Border Radius 16px
- Padding: 24px
- Max Width: 600px
- Box Shadow: 0 8px 24px rgba(0,0,0,0.2)

## 5. Espaçamento

### 5.1 Escala de Espaçamento

```
4px   - xs (mínimo)
8px   - sm (pequeno)
12px  - md (médio)
16px  - lg (grande)
24px  - xl (extra grande)
32px  - 2xl (dobro)
48px  - 3xl (triplo)
64px  - 4xl (quádruplo)
```

### 5.2 Aplicação

| Elemento | Espaçamento |
|----------|------------|
| Padding interno de cards | 16px |
| Margin entre cards | 16px |
| Padding de botões | 12px 24px |
| Margin entre seções | 32px |
| Padding de página | 24px |
| Gap em grids | 16px |

## 6. Sombras e Elevação

| Nível | Box Shadow | Uso |
|-------|-----------|-----|
| **Flat** | none | Backgrounds, elementos base |
| **Elevation 1** | 0 2px 4px rgba(0,0,0,0.1) | Cards, inputs |
| **Elevation 2** | 0 4px 8px rgba(0,0,0,0.12) | Hovered cards |
| **Elevation 3** | 0 8px 16px rgba(0,0,0,0.15) | Dropdowns, tooltips |
| **Elevation 4** | 0 12px 24px rgba(0,0,0,0.2) | Modals, popovers |

## 7. Ícones

**Estilo**: Outline, 24px x 24px (padrão)
**Fonte**: Lucide React (já integrada no template)
**Cores**: Dark Gray (padrão), Harvest Gold (ativo), Sunset Red (erro)

### 7.1 Ícones Principais

| Ícone | Uso |
|-------|-----|
| `Sprout` | Cultivos, plantio |
| `Harvest` | Colheita |
| `ShoppingCart` | Marketplace |
| `Hammer` | Crafting, ferramentas |
| `Users` | Facções, comunidade |
| `TrendingUp` | Ranking, estatísticas |
| `Gift` | Recompensas, missões |
| `Map` | Mapa global |
| `Wallet` | Carteira, tokens |
| `Settings` | Configurações |

## 8. Animações

### 8.1 Transições

| Elemento | Duração | Easing | Efeito |
|----------|---------|--------|--------|
| Hover de botão | 200ms | ease-in-out | Cor + sombra |
| Hover de card | 300ms | ease-out | Elevação |
| Modal entrada | 300ms | ease-out | Fade + scale |
| Modal saída | 200ms | ease-in | Fade + scale |
| Notificação | 300ms | ease-out | Slide + fade |

### 8.2 Animações Principais

**Crescimento de Cultivo**
- Duração: 5 segundos (loop suave)
- Efeito: Scale 0.9 → 1.0 com opacidade
- Trigger: Quando cultivo está crescendo

**Colheita**
- Duração: 600ms
- Efeito: Bounce + fade out
- Partículas: Pequenos ícones de colheita

**Transação Marketplace**
- Duração: 800ms
- Efeito: Pulse + slide
- Feedback: Som + visual

## 9. Responsividade

### 9.1 Breakpoints

| Breakpoint | Largura | Dispositivo |
|-----------|---------|------------|
| **Mobile** | < 640px | Celular |
| **Tablet** | 640px - 1024px | Tablet |
| **Desktop** | > 1024px | Computador |

### 9.2 Ajustes por Breakpoint

**Mobile**
- Padding: 12px
- Font size: -2px
- Cards: Full width
- Grid: 1 coluna

**Tablet**
- Padding: 16px
- Font size: -1px
- Cards: 2 colunas
- Grid: 2 colunas

**Desktop**
- Padding: 24px
- Font size: Normal
- Cards: 3-4 colunas
- Grid: 3-4 colunas

## 10. Acessibilidade

### 10.1 Contraste

- Texto em background claro: Ratio 4.5:1 (WCAG AA)
- Texto em background escuro: Ratio 7:1 (WCAG AAA)
- Elementos interativos: Ratio 3:1 mínimo

### 10.2 Foco

- Todos os elementos interativos têm focus ring visível
- Focus ring: 2px solid Harvest Gold
- Offset: 2px

### 10.3 Leitura

- Line height: 1.5 para body text
- Letter spacing: 0.5px para headings
- Max width de texto: 80 caracteres

## 11. Estados de Componentes

### 11.1 Estados de Botão

- **Default**: Cor normal
- **Hover**: Darken 10%
- **Active/Pressed**: Darken 20%
- **Disabled**: Stone Gray, cursor not-allowed
- **Loading**: Spinner, disabled

### 11.2 Estados de Input

- **Default**: Border Medium Gray
- **Focus**: Border Farm Green, outline none
- **Error**: Border Sunset Red
- **Disabled**: Background Stone Gray, cursor not-allowed
- **Success**: Border Farm Green, ícone check

### 11.3 Estados de Card

- **Default**: Sombra Elevation 1
- **Hover**: Sombra Elevation 2, cursor pointer
- **Selected**: Border 2px Harvest Gold
- **Disabled**: Opacidade 50%

## 12. Temas (Futuro)

Preparado para suportar temas alternativos:

**Dark Mode** (Futuro)
- Background: `#1a1a1a`
- Texto: `#FFFFFF`
- Cards: `#2a2a2a`
- Borders: `#444444`

**Light Mode** (Padrão)
- Background: `#FFFFFF`
- Texto: `#333333`
- Cards: `#F5F5F5`
- Borders: `#D3D3D3`

## 13. Implementação

### 13.1 CSS Variables (Tailwind)

```css
@layer base {
  :root {
    --harvest-gold: #D4A574;
    --farm-green: #6BA547;
    --soil-brown: #8B6F47;
    --sky-blue: #87CEEB;
    --accent-orange: #FF8C42;
    --leaf-green: #90EE90;
    --sunset-red: #FF6B6B;
    --twilight-purple: #9B59B6;
    --wheat-yellow: #FFD700;
    --stone-gray: #A9A9A9;
  }
}
```

### 13.2 Tailwind Config

Adicionar ao `tailwind.config.js`:

```javascript
theme: {
  extend: {
    colors: {
      harvest: {
        gold: '#D4A574',
        green: '#6BA547',
        brown: '#8B6F47',
        blue: '#87CEEB',
      },
      farm: {
        green: '#6BA547',
        leaf: '#90EE90',
        sunset: '#FF6B6B',
        purple: '#9B59B6',
        wheat: '#FFD700',
      },
    },
    fontFamily: {
      poppins: ['Poppins', 'sans-serif'],
      inter: ['Inter', 'sans-serif'],
      mono: ['Roboto Mono', 'monospace'],
    },
  },
}
```

## 14. Guia de Uso

### 14.1 Quando Usar Cada Cor

- **Harvest Gold**: CTAs, botões principais, destaques importantes
- **Farm Green**: Sucesso, cultivos saudáveis, ações positivas
- **Sunset Red**: Erros, perda, ações destrutivas
- **Twilight Purple**: Itens épicos/lendários, prêmios especiais
- **Sky Blue**: Backgrounds, elementos de água, informações

### 14.2 Combinações Recomendadas

- Harvest Gold + Farm Green: Sucesso, vitória
- Harvest Gold + Sunset Red: Aviso, atenção
- Farm Green + Leaf Green: Crescimento, progresso
- Twilight Purple + Wheat Yellow: Premium, raro

## 15. Próximas Etapas

1. Criar conceito art para personagens e elementos
2. Desenvolver wireframes de UI
3. Criar protótipo interativo
4. Testar com usuários
5. Iterar baseado em feedback
