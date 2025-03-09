# Contributing to Recelled

Thank you for your interest in contributing to **Recelled**, a fork of **Replugged**! We appreciate
your support in improving and expanding the project.

## Prerequisites

- [Git](https://git-scm.com)
- [Node.js](https://nodejs.org/en)
- [PNPM](https://pnpm.io)
- [Discord](https://discord.com)

## Getting Started

1. **Fork the Repository**  
   Click the "Fork" button at the top-right of the repo page to create your own copy.

2. **Clone Your Fork**

   ```sh
   git clone https://github.com/your-username/recelled.git
   cd recelled
   ```

3. **Set Up the Upstream** Link the original Recelled repo as the upstream remote:

   ```sh
   git remote add upstream https://github.com/recelled/recelled.git
   ```

4. **Install Dependencies**
   ```sh
   pnpm install
   ```

## Making Changes

1. **Create a New Branch** Always create a new branch for your changes:

   ```sh
   git checkout -b feature-or-fix-name
   ```

2. **Write Clear Code**

- Follow existing code style and conventions.
- Keep your changes focused and well-documented.

3. **Test Your Changes** Ensure your modifications work as expected before submitting.

4. **Commit Your Changes**

   ```sh
   git add .
   git commit -m "Describe your changes"
   ```

5. **Push Your Changes**
   ```sh
   git push origin feature-or-fix-name
   ```

## Submitting a Pull Request (PR)

1. Go to your fork on GitHub and open a Pull Request to the main branch of Recelled.

2. Clearly describe the changes you made and why they are necessary.

3. Be responsive to any requested changes or feedback.

## Code Guidelines

- Use ESNext syntax and follow modern JavaScript/TypeScript best practices.

- Keep PRs focused; avoid unrelated changes.

- Ensure your code is formatted properly using pnpm lint before submitting.

## Issues & Discussions

- Check existing issues before opening a new one.

- Provide clear details and reproduction steps if reporting a bug.

- Feature requests and suggestions are welcome!

## Contributing via Discord

If you have ideas, code snippets, or small fixes, you can also suggest them in our Discord server
instead of making a full PR. We encourage discussions and community-driven improvements!

## License

Recelled is open-source and follows the same licensing as Replugged. By contributing, you agree that
your code will be part of this license.
