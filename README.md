# Agent CrossDo App

Protótipo inicial do segundo portal da CrossDo para o projeto Cross Agent.

## Escopo atual

- Login com identidade do Agent CrossDo.
- Cabeçalho com nome, setor, ajuda, atualizar, trocar senha e sair.
- Menu lateral com Dashboard e Cadastros.
- Submenu de Cadastros: Usuários e Clientes.
- Usuário master inicial: Henrique Andrade.
- Tela de clientes com campos iniciais para preenchimento das respostas.

## Segurança do protótipo

A senha do usuário master não fica salva em texto aberto no código. O login do protótipo compara hash SHA-256 no navegador. Em produção, isso deve migrar para backend/autenticação real com envio de senha por e-mail.
