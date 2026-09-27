# Você com a gente no mercado

Projeto web para a Feira de Ciências.

## Fluxo
1. O visitante aponta o celular para o QR Code.
2. O site pede acesso à câmera.
3. A câmera traseira é usada por padrão (`facingMode: environment`).
4. O BodyPix faz a segmentação da pessoa diretamente no navegador.
5. A pessoa é colocada sobre a imagem do Mercado da Madalena.
6. O visitante salva a foto no próprio celular.

## IMPORTANTE: coloque a foto do Mercado da Madalena
Substitua:
`assets/mercado-madalena.jpg`

por uma foto real, preferencialmente:
- orientação vertical (9:16 ou 3:4);
- boa resolução;
- com espaço livre onde as pessoas vão aparecer;
- autorizada para uso no trabalho escolar.

Não é necessário alterar o JavaScript.

## Hospedagem
O projeto é estático. Pode ser colocado em qualquer hospedagem que sirva HTML/JS/CSS.

A câmera do navegador normalmente exige HTTPS. Não use apenas HTTP em um domínio público.

## QR Code
Depois de publicar, abra:
`qr.html`

Digite a URL pública do `index.html`, gere o QR Code e imprima.

## Teste local
Para testar no computador, não abra o arquivo diretamente com `file://`.
Use um servidor local, por exemplo:
`python -m http.server 8000`

Depois acesse:
`http://localhost:8000`

Em celular, para câmera funcionar em produção, publique em HTTPS.

## Escala da pessoa
No `app.js`, a variável `scale=0.68` controla o tamanho da pessoa na composição. Quanto menor o valor, mais distante a pessoa parecerá e mais fundo aparecerá.

## Personalização
- Nome do projeto: `index.html`
- Cores: `style.css`
- Fundo: `assets/mercado-madalena.jpg`
- Texto da moldura final: `app.js`

## Privacidade
A segmentação e a montagem da imagem acontecem no navegador. O projeto não possui backend nem banco de dados e não envia automaticamente as fotos para um servidor.
