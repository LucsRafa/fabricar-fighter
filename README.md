# Fabricar Fighter

Jogo de luta no navegador com os devs da Fabricar: Andinho, Marcelão, Jailson, Thiago, Marcus e Tom. Bonecos 3D feitos em WebGL próprio (sem bibliotecas), modo contra CPU, dois jogadores no mesmo teclado, treinamento e suporte a controle (Gamepad API).

## Como jogar

| Ação | Jogador 1 | Jogador 2 |
|---|---|---|
| Mover / pular / agachar | W A S D | Setas |
| Socos (leve, médio, forte) | U I O | Num 4 5 6 |
| Chutes (leve, médio, forte) | J K L | Num 1 2 3 |
| Especiais 1 a 4 | Q E R F | Num 0 , + − |
| Agarrão / secundário / definitivo | H / Y / Espaço | Num 7 / 8 / 9 |
| Pausar | Esc | Esc |

Os comandos clássicos (meia-lua, quarto de lua, U+J, O+L…) também funcionam. Todas as teclas podem ser trocadas em **Controles**.

## Rodar localmente

Precisa só do Node 18+.

```bash
node build.js            # junta src/*.js em dist/index.html
npx serve dist           # ou abra dist/index.html direto no navegador
```

## Estrutura

```
src/
  00-core.js        constantes, utilitários, configurações
  01-audio.js       música e efeitos (WebAudio) + falas (Web Speech)
  02-input.js       teclado, controle, buffer e comandos (meia-lua etc.)
  03-characters.js  atributos, golpes e especiais de cada lutador
  04-animation.js   esqueleto, poses e desenho 2D
  04b-gl3d.js       renderizador 3D (WebGL) dos bonecos
  05-collision.js   hitboxes, hurtboxes e pushboxes
  06-fx.js          partículas e câmera
  07-fighter.js     máquina de estados do lutador
  08-combat.js      acertos, defesa, combos, dano
  09-specials.js    Cladiio, Tadalas, Tester Culposo, Fumada, Rolamento, Chicote
  10-ai.js          CPU
  11-stage.js       cenário Fabricar Arena
  12-ui.js          HUD
  13-rounds.js      rounds, tempo e vencedor
  14-battle.js      partida
  15-scenes.js      menus, seleção, VS, resultado
  16-main.js        laço principal (60 Hz fixo)
template.html       página base
build.js            gera dist/index.html
```

## Publicação

Todo push na branch `main` gera o jogo e publica no GitHub Pages pelo workflow em `.github/workflows/pages.yml`.
