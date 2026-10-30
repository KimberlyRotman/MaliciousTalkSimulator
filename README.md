# Malicious Talk Simulator

Simulador didático para conscientizar sobre possíveis abordagens mal-intencionadas em conversas de redes sociais. Você pode criar contatos fictícios, definir roteiros de mensagens e interagir com eles em uma interface de chat.

> **Importante:** as conversas são simuladas. O aplicativo não se conecta a uma rede social, não envia mensagens a outras pessoas e não encaminha denúncias a um serviço externo.

## Funcionalidades

- Criar contatos com nome e foto, ou editar e excluir contatos existentes.
- Definir o roteiro de cada contato com passos de texto, imagem e espera por respostas.
- Adicionar várias mensagens ao roteiro de uma vez, uma por linha.
- Conversar com os contatos, enviar texto e imagens e visualizar imagens ampliadas.
- Pesquisar contatos, fixar conversas e acompanhar mensagens não lidas.
- Ativar o modo **Lobo Mal**, que altera a aparência da conversa e do contato na lista.
- Reiniciar uma conversa, bloqueando/excluindo um contato ou registrando uma denúncia local.

## Requisitos

- Node.js 18 ou superior.
- npm, incluído na instalação do Node.js.

## Instalação e execução

No terminal, na pasta do projeto:

```bash
npm install
npm run dev
```

Abra o endereço indicado pelo Vite, normalmente <http://localhost:5173>.

Comandos disponíveis:

| Comando | Descrição |
| --- | --- |
| `npm install` | Instala as dependências descritas em `package.json` e fixadas em `package-lock.json`. |
| `npm run dev` | Inicia o servidor de desenvolvimento do Vite. |
| `npm run build` | Gera a versão de produção em `dist/`. O plugin `vite-plugin-singlefile` incorpora os recursos JavaScript e CSS em `dist/index.html`. |
| `npm run preview` | Serve localmente a versão já compilada. Execute `npm run build` antes. O endereço padrão do Vite Preview é <http://localhost:4173>. |

O aplicativo não possui um servidor de aplicação separado. Em desenvolvimento e preview, um middleware do Vite implementa a persistência local descrita em [Persistência dos dados](#persistência-dos-dados).

## Como usar

### Criar contatos e roteiros

1. Abra **Configurações** e escolha **Novo contato**.
2. Informe um nome e, opcionalmente, escolha uma foto.
3. Monte o **Roteiro de mensagens** adicionando passos de texto, imagem ou espera.
4. Reordene ou remova passos conforme necessário e selecione **Salvar**.

Os roteiros são executados na ordem configurada. Mensagens de texto vazias são descartadas ao salvar. O nome do contato pode ter até 60 caracteres.

#### Adicionar mensagens em lote

No campo **Adicionar em lote**, coloque uma mensagem por linha. Uma linha que comece com `*espera` ou `*esperar` cria um passo de espera:

```text
Olá!
Você tem um minuto?
*espera 2
Obrigado por responder.
```

Nesse exemplo, o contato envia as duas primeiras mensagens, espera você enviar duas mensagens e só então continua. A quantidade de espera é no mínimo 1.

### Conversar

Abra **Conversas** e selecione um contato. O roteiro começa ou continua quando a conversa é aberta. Você pode enviar texto com o botão de envio ou pressionando **Enter**; **Shift+Enter** insere uma quebra de linha. Use o ícone de clipe para enviar uma imagem.

Um passo **Esperar N mensagens** conta somente as mensagens enviadas enquanto o roteiro está parado nesse passo. Mensagens enviadas antes de o contato terminar os passos anteriores não contam para a espera.

### Outras ações

- **Fixar conversa:** use o alfinete na lista para mantê-la antes das demais.
- **Lobo Mal:** alterne o botão no cabeçalho da conversa. O efeito é visual e não altera as mensagens.
- **Reiniciar conversa:** reinicia o roteiro e limpa as mensagens e o progresso da conversa. Na tela de conversa, também remove o estado de denúncia e desativa o modo Lobo Mal.
- **Denunciar contato:** escolha um ou mais motivos e, opcionalmente, descreva o ocorrido. A denúncia fica registrada no contato localmente; não é enviada a uma plataforma.
- **Bloquear contato:** após confirmação, remove o contato e toda a conversa do armazenamento atual.

## Persistência dos dados

O aplicativo mantém uma cópia dos contatos no `localStorage` do navegador. Quando executado com `npm run dev` ou `npm run preview`, o middleware configurado no Vite também lê e grava os dados em `data/data.json` por meio do endpoint local `/api/data`. Assim, as alterações feitas nesse modo continuam disponíveis após reiniciar o servidor.

Na inicialização, o aplicativo tenta carregar o JSON do endpoint local; se ele não estiver disponível, tenta recuperar a cópia do `localStorage`. Se o endpoint responder que o arquivo ainda não existe, dados locais existentes são migrados para `data/data.json` na primeira gravação.

O build é um HTML único, mas os dados não são incorporados a esse arquivo. Ao abrir `dist/index.html` diretamente (`file://`), não há endpoint do Vite: os dados ficam apenas no `localStorage` daquele navegador e o arquivo `data/data.json` não é carregado automaticamente. Para usar a persistência em arquivo com a versão compilada, execute `npm run preview`.

Fotos e imagens escolhidas no aplicativo são convertidas para JPEG e armazenadas como data URLs dentro dos dados do contato ou da mensagem. Imagens grandes podem aumentar o tamanho de `data/data.json` e consumir o espaço disponível no armazenamento do navegador.

### Formato dos dados

`data/data.json` contém um objeto com a propriedade `contacts`, uma lista de contatos. Cada contato pode conter:

- `id`, `name` e `photo`: identificador, nome e foto (data URL ou `null`).
- `script`: passos do roteiro. Passos de texto e imagem usam `type` e `content`; passos de espera usam `type: "wait"` e `count`.
- `messages`: mensagens da conversa, com remetente (`me` ou `them`), tipo, conteúdo e horário.
- `progress`: posição atual do roteiro (`index`) e quantidade de respostas recebidas no passo de espera (`received`).
- `pinned`, `wolf`, `unread` e `report`: estado de fixação, modo visual, mensagens não lidas e denúncia local.

Ao carregar os dados, o aplicativo normaliza os contatos e ignora etapas ou mensagens que não correspondam aos formatos esperados.

## Estrutura do projeto

```text
.
├── data/
│   └── data.json              # Contatos, roteiros e conversas persistidos
├── images/                    # Imagens disponíveis no repositório
│   ├── canvas.png
│   ├── mamae.jpeg
│   ├── miranha.jpg
│   ├── naruto.jpg
│   ├── policia.jpg
│   ├── professora.jpg
│   └── shrek.jpg
├── src/
│   ├── components/
│   │   ├── Avatar.jsx         # Avatar com foto ou iniciais
│   │   ├── ChatView.jsx       # Cabeçalho, mensagens e envio da conversa
│   │   ├── Editor.jsx         # Edição do contato e do roteiro
│   │   ├── Modal.jsx          # Modais de confirmação e visualização de imagem
│   │   ├── ReportModal.jsx    # Formulário de denúncia local
│   │   └── Sidebar.jsx        # Navegação, pesquisa e lista de contatos
│   ├── App.jsx                # Composição da interface e estado da aplicação
│   ├── engine.js              # Execução dos roteiros e ciclo das conversas
│   ├── main.jsx               # Inicialização do React
│   ├── store.js               # Estado, normalização e persistência dos dados
│   ├── styles.css             # Estilos, animações e layout responsivo
│   └── utils.js               # Formatação de horário e processamento de imagens
├── .gitignore                 # Ignora node_modules/ e dist/
├── index.html                 # Documento HTML de entrada do Vite
├── package-lock.json          # Versões resolvidas das dependências npm
├── package.json               # Dependências e comandos do projeto
├── README.md                  # Documentação do projeto
└── vite.config.js             # Configuração do Vite, build único e middleware JSON
```

As imagens em `images/` são arquivos disponíveis no repositório; a interface não as associa automaticamente aos contatos. As fotos selecionadas pelo editor são processadas no navegador e salvas como data URLs nos dados.

### Responsabilidades dos principais módulos

- **`App.jsx`** conecta as telas e componentes, gerencia seleção de contato, modais e notificações e restaura a última tela da sessão.
- **`store.js`** mantém a lista de contatos, valida/normaliza os dados carregados e salva no `localStorage` e, quando disponível, no endpoint local do Vite.
- **`engine.js`** avança cada roteiro, simula o tempo de digitação, conta respostas durante esperas e controla reinicialização e remoção de contatos.
- **`components/`** separa os elementos da interface e suas interações.
- **`utils.js`** formata horários e converte imagens escolhidas para JPEG, redimensionando-as antes de salvar.
- **`styles.css`** define o visual e adapta a navegação para telas estreitas.
- **`vite.config.js`** configura React, a geração de HTML único e o middleware que lê/grava `data/data.json` durante desenvolvimento e preview.

## Tecnologias

- React 18 e React DOM.
- Vite 5 com `@vitejs/plugin-react`.
- `vite-plugin-singlefile` para gerar o HTML de produção em um único arquivo.
- `lucide-react` para ícones.

## Testes

O `package.json` não define um comando de testes automatizados. Para verificar que o projeto compila, execute:

```bash
npm run build
```
