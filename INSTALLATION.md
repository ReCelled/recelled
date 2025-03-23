# Installing Recelled

Thank you for your interest in using **Recelled**, a fork of **Replugged**!

## Automated Installer

not yet... do manual install

## Prerequisites

- [Git](https://git-scm.com)
- [Node.js](https://nodejs.org/en)
- [PNPM](https://pnpm.io)
- [Discord](https://discord.com)

## Manual Install

1. **Clone The Repo**

   ```sh
   git clone https://github.com/recelled/recelled.git
   cd recelled
   ```

2. **Install Dependencies**

   ```sh
   pnpm install
   ```

3. **Bundle ReCelled**

   ```sh
   pnpm bundle
   ```

4. **Install ReCelled**

   ```sh
   pnpm incell --production
   ```

   - If you want to specify into a specific Discord client, you can add it as an argument:

   ```sh
   pnpm incell --production [stable|ptb|canary|development]
   ```

   - Stable is default if no arguements provided

5. **Open Discord if not opened already**

   - You can verify it's installed by going into Discord settings and looking for the "ReCelled" tab.

## Troubleshooting

- If you're having issues, please reinstall Discord and try step 4.
- Make Sure Discord is closed from Task Manager/Process List and try step 4.

**Still having issues? Please join our [support server](https:/discord.gg/SgKSKyh9gY) and ask for
help with any errors you're getting and any other information you think might be helpful.**
