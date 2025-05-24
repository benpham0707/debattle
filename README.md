# 🧠 DeBATTLE

A real-time debate game where players face off in structured debates judged by AI.

## 🚀 Getting Started

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Copy `.env.example` to `.env` and fill in your environment variables:
   - Supabase URL and anon key
   - OpenAI API key
   - Other game configuration variables

4. Run the development server:
   ```bash
   npm run dev
   ```

## 🛠️ Tech Stack

- Next.js 14
- TypeScript
- Supabase (Real-time features & Database)
- OpenAI GPT-4 (Debate judging)
- TailwindCSS (Styling)
- Zustand (State management)

## 📁 Project Structure

```
src/
├── app/                 # Next.js app directory
├── components/          # React components
├── lib/                 # Utility functions and configurations
├── store/              # Zustand store
├── types/              # TypeScript type definitions
└── styles/             # Global styles
```

## 🎮 Game Features

- Real-time 1v1 debates
- AI-powered judging system
- Health-based scoring
- Structured debate phases
- Real-time chat
- Matchmaking system

## 📝 License

MIT 