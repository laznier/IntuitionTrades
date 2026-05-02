# Intuition Trades

Intuition Trades is being migrated from a legacy multi-page HTML site to a public-first Vite + React experience backed by Vercel serverless APIs.

Currently includes:

- **Weekly Stock Picks** – A section featuring the Top 3 Buys and Top 3 Shorts of the week.
- **Legacy public tools** – Existing static tools remain available in their current folders while migration continues.
- **Modern React shell** – The staged React app is deployed under `/app` and currently includes the new fundamental analysis experience.
- **Feedback and content pages** – Public pages remain available while auth and billing stay retired.

## Local Development

1. Install root dependencies with `npm install`.
2. Install frontend dependencies with `npm --prefix frontend install`.
3. Start the React migration app with `npm run dev:web`.
4. Build the staged deployment bundle with `npm run build:web`.
5. Legacy pages still exist at the repository root and in their tool folders.

## Vercel Deployment

1. Connect the repository to a Vercel project.
2. Add the required API environment variables in Vercel project settings.
3. The repository `vercel.json` will install frontend dependencies, run `npm run build:web`, and emit the staged React app into `/app`.
4. The legacy landing page remains at `/`, and the React migration shell is available at `/app`.
5. Existing Vercel `api/` routes stay active alongside the staged frontend.

## Roadmap

- Continue moving legacy tools into the React shell.
- Retire remaining static pages once their React replacements are ready.
- Keep proprietary scoring and market logic on the backend.
- Tighten API handling, accessibility, and deployment defaults as migration progresses.

## License

**Proprietary - Free to Use, No Modifications Without Permission**

You are free to **use** this software in its original, unmodified form for personal or internal purposes at no charge. However:

1. **No Modification or Distribution**  
   You may **not** modify, copy, distribute, or create derivative works of this code—either in whole or in part—without **prior written permission** from the owner.

2. **No Commercial Resale**  
   You may **not** resell, sublicense, or otherwise commercially exploit this software without explicit permission.

3. **Disclaimer of Warranty**  
   This software is provided “as is,” without warranty of any kind, express or implied. In no event shall the author or contributors be liable for any claim, damages, or other liability arising from its use.

This project is covered under a **Proprietary** license.  
See [LICENSE.md](LICENSE.md) for full details.

For permission requests or questions, please contact us at admin@intuitiontrades.com
