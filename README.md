# ⭕ Tic-Tac-Toe Multiplayer Client ❌

![Banner](./public/banner.png)

A modern, high-performance multiplayer Tic-Tac-Toe frontend built with **Next.js** and **Nakama**. Features a sleek glassmorphic UI, real-time matchmaking, and persistent session management.

---

## 🚀 Quick Start

### Prerequisites
- [Node.js](https://nodejs.org/) (v18+)
- Running [Tic-Tac-Toe API](../tic-tac-toe-api)

### Installation
1. Install dependencies:
   ```bash
   npm install
   ```

2. Configure environment:
   Create a `.env` file with the following variables:
   ```env
   NEXT_PUBLIC_API_URL=http://localhost:5000
   NEXT_PUBLIC_NAKAMA_HOST=localhost
   ```

3. Start development server:
   ```bash
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🛠️ Tech Stack
- **Framework**: [Next.js 16](https://nextjs.org/) (App Router)
- **Styling**: [Tailwind CSS 4](https://tailwindcss.com/)
- **Multiplayer**: [Nakama-JS](https://heroiclabs.com/docs/nakama/client-libraries/javascript/)
- **Icons**: [Lucide React](https://lucide.dev/)

---

## 🎮 Features
- **Real-time Matchmaking**: Find opponents instantly with Nakama's matchmaker.
- **Custom Rooms**: Create or join matches using unique Match IDs.
- **Glassmorphic UI**: Premium visual experience with smooth transitions.
- **Persistent Auth**: Session restoration across page reloads.

---

## 📖 Backend Reference
This client requires the accompanying backend to function correctly. See the [API README](../tic-tac-toe-api/README.md) for server-side setup instructions.
