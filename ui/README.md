# Deploy Webhook UI

Modern web interface for managing Deploy Webhook server with full visual management capabilities.

## Features

- 🎨 **Modern UI** - Built with React, TypeScript, and shadcn UI
- 🌓 **Dark/Light Mode** - Automatic theme switching with system preference support
- 🌍 **Multi-language** - Support for English and Chinese
- 📱 **Responsive Design** - Works on desktop, tablet, and mobile
- 🔐 **Authentication** - Secure login with JWT tokens
- 📊 **Dashboard** - Overview of deployments, applications, and configurations
- 🚀 **Application Management** - Deploy and monitor Docker containers
- ⚙️ **Environment Variables** - Manage global and project-scoped env vars
- 🔑 **Secrets Management** - Integrate with Infisical and other secret providers
- 📖 **API Documentation** - Integrated Swagger UI access

## Quick Start

### Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

The UI will be available at `http://localhost:3001` and will proxy API requests to `http://localhost:9000`.

### Build for Production

```bash
# Build the project
npm run build

# Preview the production build
npm run preview
```

### Environment Variables

Create a `.env` file in the `ui` directory:

```env
VITE_API_BASE_URL=http://localhost:9000
VITE_WEBHOOK_SECRET=your-secret-here
```

## Tech Stack

- **React 19** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool
- **Tailwind CSS** - Styling
- **shadcn/ui** - Component library
- **React Router** - Routing
- **Axios** - API client
- **Lucide React** - Icons

## Project Structure

```
ui/
├── src/
│   ├── components/
│   │   ├── ui/          # shadcn UI components
│   │   └── layout/      # Layout components
│   ├── contexts/        # React contexts (Theme, Language, Auth)
│   ├── pages/           # Page components
│   ├── services/        # API services
│   ├── i18n/           # Translations
│   ├── lib/            # Utilities
│   └── App.tsx         # Main app component
├── public/             # Static assets
└── index.html          # HTML entry point
```

## First Time Setup

When you first access the UI:

1. You'll be redirected to the registration page
2. Create your first admin account
3. After registration, you'll be automatically logged in
4. Access all features from the dashboard

## Development

### Adding a New Page

1. Create a new component in `src/pages/`
2. Add route in `src/App.tsx`
3. Add navigation item in `src/components/layout/Sidebar.tsx`
4. Add translations in `src/i18n/translations.ts`

### Adding Translations

Edit `src/i18n/translations.ts` and add keys for both `en` and `zh` languages.

### Theming

The theme system is based on CSS variables defined in `src/index.css`. Modify these variables to customize colors.

## License

MIT
