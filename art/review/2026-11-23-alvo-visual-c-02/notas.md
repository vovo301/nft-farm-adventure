# Lote 2026-11-23-alvo-visual-c-02: alvo visual v3.2 (status: in_review)

Substitui o c-01 a pedido do usuário: "quero que use as imagens/estilo de arte para a cena".
O mundo agora segue o estilo das imagens dele: pintado, vivo e saturado, com luz e sombra pintadas
e contorno escuro-quente fino. A composição é a mesma do c-01.

| Arquivo | O que é |
|---|---|
| `cena@2x.png` | cena a zoom 1,0 com texturas @2x |
| `cena-celular-dpr2.png` | recorte de celular (DPR 2) |
| `antes-depois.png` | c-01 × c-02: cena inteira, detalhes @2x e leitura a 0,5 |
| `prancha.png` | peças isoladas a 1:1 · `cena.png`, `cena-zoom05.png` · `qa.json` |

## O que mudou

- **Paleta v3.2:** as 32 rampas do mundo foram reajustadas lado a lado com a arte do usuário.
  A grama ficou verde-amarelada viva, as folhas ganharam luz amarela e a telha ficou
  vermelho-alaranjada. Tábuas e cerca passaram a marrom quente (como a tora dele), a pedra usa o
  cinza dele e a água ficou azul-turquesa. O fazendeiro veste brim azul e colete de couro.
  A v3.1 está em `art/style-guide/archive/v3.1/`.
- **Acabamento pintado** (`paint_finish`): a luz fica quente no topo-esquerda e a sombra fria no
  baixo-direita, com oclusão suave na base e +12 % de saturação. Vale para toda peça do mundo
  com contorno.
- **Canteiros:** trigo maduro (s3, com indicador), tomate crescendo (s2), abóbora madura (s3) e
  cenoura em broto (s1). Todos são arte do usuário escalada.
- **Recursos do usuário no mundo:** a tora está junto da árvore folhosa e os minérios cinza e
  dourado junto da pedra. Cada um tem sombra de contato separada.
- **Mantido:** 2:1, tile 128×64, @1x/@2x, âncoras, sombras separadas, personagem adulto (~6
  cabeças) e formas pontudas e angulares.

## QA (passou, build com código 0)

Costura do chão a 0,5–2 sem buraco e 3×3 dos tiles ok. A paleta v3.2 foi checada em todos os
SVGs e o contrato de canvas/âncora está ok. `asset_report.py` saiu 0 em todos os grupos.

Leitura a 0,5 (L5, borda ΔL\* ≥ 16), de c-01 para c-02: canteiro com trigo 19,4 → 22,1;
pedra 21,0 → 25,1; árvore 27,0 → 29,8; fazendeiro 21,5 → 23,8; galpão 23,3 → 27,2. A peça mais
justa é o canteiro com tomate (18,9). O minério cinza tem índice 1,67 (mínimo 1,6), porque a
textura do usuário é granulada.

## Pendências

- Ainda não foi visto no Phaser. A cena é uma composição em Pillow.
- Ainda não há animação; só a direção `_se`.
- A árvore, a pedra e o galpão continuam vetoriais, recoloridos no estilo do usuário. Não existe
  versão isométrica pintada pelo usuário.
- O lote tem mais de 12 entradas porque é o quadro de estilo.

## Resposta do usuário

_(pendente)_
