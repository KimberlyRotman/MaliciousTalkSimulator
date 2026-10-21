# MaliciousTalkSimulator
Simulador didático para concientizar os usuários de possíveis abordagens má intencionadas em ambientes de redes sociais.

## Como usar

Aplicativo web estático em React (sem back end).

```bash
npm install
npm run dev     # desenvolvimento em http://localhost:5173
npm run build   # gera dist/index.html (arquivo único, abre direto no navegador)
```

- **Configurações**: crie contatos (nome e foto) e monte o roteiro de mensagens com passos de texto, imagem e "Esperar N mensagens".
  No campo "Adicionar em lote", escreva uma mensagem por linha e use `*espera 2` para aguardar 2 mensagens suas.
  Só contam para o "Esperar" as mensagens enviadas depois que o contato terminou de mandar as anteriores.
- **Conversas**: ao abrir a conversa, o contato segue o roteiro. É possível enviar texto e imagens e fixar conversas (ícone de alfinete).
- **Lobo Mal**: botão no topo da conversa; quando ativo, o contato fica com fundo preto na lista.
- **Menu (⋮)**: "Bloquear contato" exclui o contato; "Denunciar contato" registra o motivo e exibe a tag "Contato denunciado".

## Dados (JSON)

Os dados ficam salvos no `localStorage` do navegador (formato JSON).
Se o app for servido via HTTP (ex.: `npm run dev`) e não houver dados locais, um arquivo `public/data.json` é carregado automaticamente como dados iniciais.
