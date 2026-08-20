# UU-MLC Nexus

Membership, points, and task-management dashboard for the UU-MLC club committee.

## Features

- **Authentication** — email/password login via Supabase Auth, with a guest view for pending accounts
- **Role-based permissions** — Guest, Member, Executive, Administrator, and Head Administrator roles, each with a configurable permission set (see `src/constants/roles.js`)
- **Member directory & management** — approve members, change roles, activate/deactivate accounts
- **Points system** — award, track, and reset member points, with history
- **To-Do / task management**
- **News feed**
- **Admin activity log** — audit trail of administrative actions
- **Role manager** — create custom roles and assign granular permissions

## Tech stack

- [React 19](https://react.dev/) + [Vite](https://vitejs.dev/)
- [Tailwind CSS 4](https://tailwindcss.com/)
- [Supabase](https://supabase.com/) (Postgres, Auth, Storage)
- [Motion](https://motion.dev/) for animations

## Getting started

### Prerequisites

- Node.js 18+
- A [Supabase](https://supabase.com/) project

### Setup

1. Clone the repo and install dependencies:

   ```bash
   git clone https://github.com/MrUnknown2005/UU-MLC-Nexus.git
   cd UU-MLC-Nexus
   npm install
   ```

2. Copy the example environment file and fill in your Supabase credentials:

   ```bash
   cp .env.example .env
   ```

   You'll need `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`, both available under
   **Supabase Dashboard → Settings → API**.

3. Run the dev server:

   ```bash
   npm run dev
   ```

### Available scripts

| Command           | Description                          |
| ------------------ | ------------------------------------- |
| `npm run dev`       | Start the Vite dev server             |
| `npm run build`     | Build for production                  |
| `npm run preview`   | Preview the production build locally  |
| `npm run lint`      | Run ESLint                            |

## Project structure

```
src/
  components/
    auth/        # Login / guest auth screens
    common/       # Shared UI pieces (Header, Tab, Stat, etc.)
    dashboard/    # Main authenticated dashboard shell
    guest/        # Limited view for pending/guest accounts
    landing/      # Public landing page
    pages/        # Directory, Members, Points, Todo, News, Profile, Admin, Roles
  constants/      # Role & permission definitions
  hooks/          # Data-fetching / dashboard state hooks
  lib/            # Supabase client, role helpers, file uploads
  styles/         # Custom theme (glassmorphism)
```

## Roles & permissions

Permissions are defined centrally in `src/constants/roles.js` and enforced via helpers in
`src/lib/roleHelpers.js`. The system roles (guest → member → executive → administrator →
head_admin) each map to a default permission set, and custom roles can be created through
the Role Manager for finer-grained control.

## Environment variables

| Variable                  | Description                              |
| -------------------------- | ----------------------------------------- |
| `VITE_SUPABASE_URL`        | Your Supabase project URL                 |
| `VITE_SUPABASE_ANON_KEY`   | Your Supabase project's public anon key   |

Never commit your `.env` file — it's excluded via `.gitignore`. Use `.env.example` as a
template for the variables you need.

## Contributing

1. Create a feature branch off `main`
2. Run `npm run lint` before committing
3. Write descriptive commit messages
4. Open a pull request

## License

Internal club project — no license specified.
