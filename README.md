<h1 align="center">
  🎮 Siqueira Games Hub
</h1>

<p align="center">
  <img src="https://img.shields.io/badge/Node.js-18.x-339933?style=flat&logo=nodedotjs&logoColor=white" alt="Node.js 18.x" />
  <img src="https://img.shields.io/badge/Express.js-Backend-404D59?style=flat&logo=express" alt="Express" />
  <img src="https://img.shields.io/badge/PostgreSQL-Database-336791?style=flat&logo=postgresql" alt="Postgres" />
  <img src="https://img.shields.io/badge/Docker-Container-2496ED?style=flat&logo=docker" alt="Docker" />
  <img src="https://img.shields.io/badge/Vanilla_JS-Frontend-F7DF1E?style=flat&logo=javascript&logoColor=black" alt="Vanilla JS" />
</p>

O **Siqueira Games** é uma plataforma Full-Stack de minigames retrô, desenhada com uma interface **Glassmorphism Premium** e um sistema completo de gestão de usuários (Autenticação JWT, Persistência no PostgreSQL e modo simulado "Visitante").

---

## 🕹️ Funcionalidades

- **Auth Gate Dinâmico:** Telas de Login e Cadastro integradas à API, salvando senhas com Hashing Criptográfico (`bcryptjs`).
- **5 Jogos Integrados:**
  - **Jogo da Velha** (Modo dinâmico de redimensionamento e identificação de empate + I.A.).
  - **Snake Retro** (Pontuação em tela, canvas fluido). Sistema de controles com **Fila de Inputs (Queue)** perfeita anti-ghosting e detecção de Swipes (Arrastar) em dispositivos Mobile sem precisar tirar o dedo da tela!
  - **Memória Master** (Animações de cartas em CSS 3D e múltiplos níveis de Grade).
  - **BlackJack 21** ♠️ (Simulador contra a banca, apostando moedas do saldo local).
  - **Roleta Double** 🔴⚪⚫ (Roda animada baseada nos famosos Double de cassino, prêmios variando de 2x a 14x).
- **Interface Imersiva:** Design System com animações suaves, paleta neon-índigo, popups (`Toasts`) orgânicos para erros e feedback visual.
- **Docker-Ready:** Configurado nativamente com `docker-compose` para orquestração da API Node.JS junto com o banco PostgreSQL e os arquivos estáticos.

---

## 🚀 Como Executar Localmente

### Pré-requisitos
- Ter o **Docker Desktop** (ou o docker engine) em execução na sua máquina.

### Passos:
1. Faça o clone do projeto:
   ```bash
   git clone https://github.com/Luisfsiq/hubJogos.git
   ```
2. Acesse a pasta do backend:
   ```bash
   cd hubJogos/server
   ```
3. Suba o container Docker:
   ```bash
   docker-compose up -d --build
   ```
4. Pelo fato do projeto estar rodando totalmente roteado no backend, basta abrir a URL fornecida na sua máquina:
   > **Acesse: http://localhost:3000**

---

## 🗂️ Estrutura do Projeto

```text
├── server/                 # Diretório Backend
│   ├── server.js           # Express API e Servidor Estático
│   ├── schema.sql          # Modelagem Relacional e Criação das Tabelas
│   ├── .env                # Credenciais da DB e Segredos JWT (não commitados)
│   ├── Dockerfile          # Definição do build da imagem Node.js
│   └── docker-compose.yml  # Orquestração do Express App + PostgreSQL
├── index.html              # Estrutura principal ("SPA" Layout)
├── style.css               # Folha de estilos Master (Glassmorphism & Variables)
├── script.js               # Logic-Engine de Navegação e API Fetch Requests Interno
└── README.md               # Este arquivo de documentação
```

---

## ✒️ Tecnologias e Decisões de Arquitetura
- **Frontend Stateless:** Sem uso de frameworks pesados, o site é puro Vanilla ES6. Ele roteia pelas "views" do site (Início, Jogos, Perfil) escondendo e revelando via manipulação do DOM.
- **Backend Robusto e Seguro:** As requisições são protegidas com JWT. Mesmo que o usuário não rode o backend (ex: modo live preview do VSCode), a página foi desenvolvida para entrar em modo resiliente de falha e simular o dashboard no Local Storage da máquina.

---

**Siqueira Games - A sua próxima aventura começa aqui!**
