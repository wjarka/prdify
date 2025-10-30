# PRDify

PRDify is a web application designed to streamline the process of creating Product Requirement Documents (PRDs) according to the 10xDevs methodology. It guides users through a structured, three-step process: from an AI-powered planning session, through an automatically generated summary, to a complete PRD.

## 📖 Table of Contents

- [Project Description](#-project-description)
- [✨ Tech Stack](#-tech-stack)
- [🚀 Getting Started Locally](#-getting-started-locally)
- [📜 Available Scripts](#-available-scripts)
- [🎯 Project Scope](#-project-scope)
- [📊 Project Status](#-project-status)
- [📄 License](#-license)

## ✍️ Project Description

The current process of creating PRDs is often laborious and fragmented. Users have to manually manage multiple steps, copy-paste content between different tools, and search for the right prompts. This workflow is inefficient, prone to errors, and distracts from the core task of refining product requirements.

PRDify solves this by providing a seamless, integrated experience. It's built for developers and product managers who want to efficiently transform an initial concept into a ready-to-implement document, minimizing friction and ensuring consistency.

## ✨ Tech Stack

The project uses a modern tech stack to deliver a fast and interactive user experience.

| Category  | Technology                                                                                                  |
| :-------- | :---------------------------------------------------------------------------------------------------------- |
| Frontend  | [Astro 5](https://astro.build/), [React 19](https://react.dev/), [TypeScript 5](https://www.typescriptlang.org/), [Tailwind CSS 4](https://tailwindcss.com/), [Shadcn/ui](https://ui.shadcn.com/) |
| Backend   | [Supabase](https://supabase.com/) (PostgreSQL, Authentication, BaaS)                                        |
| AI        | [OpenRouter.ai](https://openrouter.ai/) (Access to various LLMs like OpenAI, Anthropic, Google)             |
| DevOps    | [GitHub Actions](https://github.com/features/actions) (CI/CD), [Docker](https://www.docker.com/) for hosting |
| Testing   | [Vitest](https://vitest.dev/) (Unit/Integration), [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/) (Components), [Playwright](https://playwright.dev/) (E2E) |

## 🚀 Getting Started Locally

To run the project on your local machine, follow these steps.

### Prerequisites

- **Node.js**: Version `22.14.0`. We recommend using [nvm](https://github.com/nvm-sh/nvm) to manage Node versions (`nvm use`).
- **npm**: Should be installed with Node.js.
- **Supabase Account**: You'll need a Supabase project for the database and authentication.

### Installation

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/wjarka/prdify.git
    cd prdify
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Set up environment variables:**
    Create a `.env` file in the root of the project by copying the example file:
    ```bash
    cp .env.example .env
    ```
    Then, fill in your Supabase project URL and Anon Key in the `.env` file:
    ```
    PUBLIC_SUPABASE_URL="your-supabase-project-url"
    PUBLIC_SUPABASE_ANON_KEY="your-supabase-anon-key"
    ```

4.  **Run the development server:**
    ```bash
    npm run dev
    ```

The application should now be running at `http://localhost:4321`.

## 📜 Available Scripts

In the project directory, you can run the following commands:

- `npm run dev`: Runs the app in development mode.
- `npm run build`: Builds the app for production.
- `npm run preview`: Starts a local server to preview the production build.
- `npm run lint`: Lints the code using ESLint.
- `npm run lint:fix`: Automatically fixes linting issues.
- `npm run format`: Formats the code using Prettier.

## 🎯 Project Scope

### In Scope (MVP Features)

- **User Authentication**: Secure user registration and login.
- **Project Management**: Create, view, resume, and delete projects.
- **Step 1: AI Planning Session**: A guided, multi-round Q&A with an AI to define project requirements.
- **Step 2: AI Summary Generation**: Automatically generate an editable summary from the planning session.
- **Step 3: AI PRD Generation**: Automatically generate a full, editable PRD from the approved summary.
- **Markdown Export**: Export the final PRD to a `prd.md` file.
- **State Persistence**: Application state is saved after each major user action.

## 📊 Project Status

This project is currently in the **initial development phase**. The core features are being built as per the MVP scope.

## 📄 License

This project is licensed under the MIT License. See the `LICENSE` file for more details.
