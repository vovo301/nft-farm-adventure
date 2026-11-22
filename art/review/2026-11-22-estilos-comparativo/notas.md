# Lote 2026-11-22-estilos-comparativo: prancha comparativa de estilos (status: draft)

O alvo iso-01 foi reprovado ("muito infantil, tudo muito arredondado, árvores com copas
arredondadas, personagem com aspecto infantil"). Antes de refazer a cena, esta prancha mostra
**as mesmas peças em 3 direções** para o usuário escolher. Não vai para produção.

Fixo nos três (igual ao guia v2.1): iso 2:1, tile 128×64 @1x, luz do topo-esquerda, vetor por
script, sem IA, sala limpa. Todos os estilos usam um fazendeiro adulto com ~5,5–6,5 cabeças, olhos
de 1 px, mandíbula marcada e barba curta. Não há esferas, olhos grandes nem brilhos "fofos".

```bash
python3 art/source/tools/build_estilos_comparativo.py   # sai 0; refaz PNGs, SVGs, qa.json e manifesto
```

## Arquivos

| Arquivo | O que é |
|---|---|
| `prancha.png` (1500×1168) | A, B e C lado a lado: título, 1 linha, 6 peças a 1×, trecho 3×3 a 1×, trecho a zoom 0,5 e amostra de paleta |
| `prancha@2x.png` | a mesma prancha a 2× para ver os detalhes |
| `qa.json` | resultado do QA |
| `art/source/estilos-comparativo/{a,b,c}/*.svg` | fonte de cada peça (gerada, não editar) |
| `art/source/estilos-comparativo/paletas.json` | as 3 paletas de comparação |

## As 3 direções

- **A · Estilizado maduro.** Contorno fino escuro (1,25 px) da cor do material e 4 tons chapados
  em planos com fronteira em zigue-zague. As copas são massas quebradas e serrilhadas. O telhado é
  de chapa com nervuras. As cores ainda são vivas, mas menos saturadas. É o mais próximo do
  iso-01 em legibilidade, porém adulto.
- **B · Low-poly facetado.** Malha 3D simples projetada em 2:1. Cada face recebe luz pelo
  normal, sem contorno. O chão é triangulado e a sombra é a projeção real da malha. O visual é de
  jogo de estratégia/simulação. É o mais fácil de manter coerente e de gerar variantes (só mudar
  a semente).
- **C · Pintado semirrealista.** Proporções realistas e textura sugerida: estrias de casca,
  tábuas com tom variado, telhas desencontradas, copa feita de 170 tufos pontudos e espigas
  grão a grão. A paleta é terrosa, o contraste moderado e a sombra é longa e suave. É o mais
  "maduro" e o mais caro de produzir. A 0,5 ele perde leitura primeiro (trigo e pedra viram
  mancha).

## Revisão interna (refeito antes de mandar)

1. **A pedra low-poly (B) parecia cabeça de gato**, porque as lascas de minério no topo pareciam
   orelhas. O minério virou faceta embutida no lado claro, mais 2 lascas baixas.
2. **As sombras eram longas demais** e saíam do painel e do chão. A luz da sombra de A e B ficou
   mais alta. A de C caiu de ~1,4× para ~1,0× a altura do objeto. As sombras agora são cortadas
   no losango do trecho e no painel das peças.
3. **As espigas de A pareciam chamas/cebolas** (gota arredondada). Viraram fusos estreitos e
   angulares com 2 sulcos.
4. **Os veios de minério de C pareciam minhocas laranja.** Viraram riscos finos quebrados com
   lascas angulares.
5. **O caminho de B tinha xadrez ruidoso.** A variação de cor por triângulo foi reduzida.
6. **O tronco do pinheiro B atravessava a camada de baixo.** Agora fica só na base.
7. **O trecho estava amontoado** (celeiro, pinheiro e árvore na mesma fileira). Novo arranjo:
   galpão no fundo, pinheiro à direita, árvore à esquerda, canteiro e pedra na frente.

## QA

- Peças de A: nenhum hex fora da paleta A. Em B, os tons saem da cor-base × luz por face. Em C,
  os tons e degradês saem das rampas de C.
- `asset_report.py --expect-size` nas duas pranchas: código 0.
- Manifesto: `style_board_a`, `style_board_b` e `style_board_c` estão com status `draft`, mais
  uma entrada em `support_files`.

## Limites conhecidos

- O galpão é 1×1, para caber no trecho 3×3. Por isso a porta fica um pouco mais baixa que o
  fazendeiro. Na produção, a construção pequena seria 2×2.
- Só existe a direção `_se` do personagem, sem animação. Nada foi testado no Phaser.
- As paletas são de comparação. A escolhida vira `palette.json` v3, e o guia ganha a v3 (as
  seções 6 e 7 da v2.1, contorno e "formas arredondadas e fofas", deixam de valer).

## Recomendação do diretor de arte

**A como base, com dois empréstimos de C:** a paleta terrosa menos saturada e a sombra um pouco
mais longa. A é claramente adulto, mas mantém a leitura a 0,5 e o custo de produção baixo. B é
a alternativa mais barata e consistente, se o usuário quiser um visual de "simulação moderna". C
é o mais bonito a 1× e a 2×, mas cobra caro em produção e em leitura no celular.

## Pergunta ao usuário

Qual direção seguimos: A, B, C ou uma mistura (diga o que levar de cada)?

## Resposta do usuário

_(pendente)_
