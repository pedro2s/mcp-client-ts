# MCP Client

Este é um cliente MCP (Message Communication Protocol) desenvolvido em TypeScript. Ele fornece uma interface simples para comunicação com servidores que utilizam o protocolo MCP.

## Recursos

- Implementação do protocolo MCP.
- Suporte para envio e recebimento de mensagens.
- Fácil integração com projetos TypeScript.
- Implementação com Express (branch `express-app`)

## Instalação

Use o npm ou yarn para instalar as dependencias:

```bash
npm install
# ou
yarn install
```

## Build

Compilar os arquivos Typescript para JavaScript:

```bash
npm run build
```

## Uso

Aqui está um exemplo básico de como usar o MCP Client:

```bash
node .\build\index.js <path_mcp_server_script_em_python>
```
