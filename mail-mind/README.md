# 📧 MailMind

MailMind is an intelligent, modern, AI-powered email client built to help you manage your inbox with unprecedented speed and clarity. Built with the powerful T3 Stack, MailMind seamlessly integrates your Gmail and Google Calendar while using AI to automatically categorize, prioritize, and even draft your emails.

![MailMind Inbox](./docs/inbox-screenshot.png) *(Placeholder for screenshot)*

## ✨ Features

- **🧠 AI-Powered Categorization & Prioritization**: Automatically classifies emails into categories (Work, Social, Events, Personal) and assigns priority levels (Urgent, High, Normal, Low) so you know exactly what needs your attention first.
- **📝 AI Drafting & Smart Replies**: Integrated AI tools to help you draft new emails or write context-aware replies instantly right from the compose window.
- **⚡ Blazing Fast UI & Keyboard Shortcuts**: Designed for efficiency. Navigate your inbox effortlessly using a built-in Command Palette and intuitive keyboard shortcuts (e.g., `E` to archive, `#` to delete, `S` to star).
- **📅 Integrated Calendar Timeline**: A beautiful, timeline-based calendar view to see your upcoming events and schedules at a glance.
- **🔄 Infinite Scrolling**: Seamlessly browse through your inbox with infinite scrolling (supports up to 300 recent threads).
- **🎨 Modern Design**: Features a clean, premium, and dynamic interface inspired by modern aesthetics (Ultrahuman style).
- **🔒 Secure Authentication**: Robust Google OAuth integration powered by Better Auth.

## 🛠 Tech Stack

- **Framework**: [Next.js](https://nextjs.org) (App Router)
- **Styling**: [Tailwind CSS](https://tailwindcss.com)
- **Database**: PostgreSQL with [Drizzle ORM](https://orm.drizzle.team)
- **API**: [tRPC](https://trpc.io) for end-to-end typesafe APIs
- **Authentication**: [Better Auth](https://better-auth.com/)
- **AI Integration**: [OpenRouter](https://openrouter.ai/) (utilizing Gemini Flash Lite and others)
- **Integrations**: [@corsair-dev](https://github.com/corsair-dev) packages for Gmail and Google Calendar APIs

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+)
- pnpm (recommended)
- A PostgreSQL database
- Google Cloud Console project (for OAuth credentials)
- OpenRouter account (for AI API key)

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/abhi26623/MailMind.git
   cd mail-mind
   ```

2. **Install dependencies:**
   ```bash
   pnpm install
   ```

3. **Environment Setup:**
   Copy the example environment file and fill in your secrets.
   ```bash
   cp .env.example .env
   ```
   
   Configure the following in your `.env`:
   - `BETTER_AUTH_SECRET`: Generate a random secret.
   - `BETTER_AUTH_GOOGLE_CLIENT_ID` & `BETTER_AUTH_GOOGLE_CLIENT_SECRET`: From your Google Cloud console.
   - `DATABASE_URL`: Your PostgreSQL connection string.
   - `OPENROUTER_API_KEY`: Your OpenRouter API key for AI features.
   - `CORSAIR_KEK`: Key Encryption Key for Corsair API integrations.
   - `NEXT_PUBLIC_APP_URL`: Set to `http://localhost:3000` for local development.

4. **Database Migration:**
   Push the database schema to your PostgreSQL instance:
   ```bash
   pnpm run db:push
   ```

5. **Start the Development Server:**
   ```bash
   pnpm run dev
   ```
   Your app will be available at [http://localhost:3000](http://localhost:3000).

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `E` | Archive |
| `#` | Delete |
| `S` | Star |
| `R` | Reply |
| `Cmd/Ctrl + K` | Open Command Palette |

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request or open an Issue.

## 📜 License

This project is licensed under the MIT License.

---
*Built with [create-t3-app](https://create.t3.gg/)*
