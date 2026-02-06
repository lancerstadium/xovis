# xovis

![Deploy to GitHub Pages](https://github.com/lancerstadium/xovis/actions/workflows/deploy.yml/badge.svg)
![Build and Package](https://github.com/lancerstadium/xovis/actions/workflows/build.yml/badge.svg)
![License](https://img.shields.io/badge/license-GPL--3.0-blue.svg)
![Node.js](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)
![pnpm](https://img.shields.io/badge/pnpm-%3E%3D8.0.0-orange.svg)

> [中文](README.zh.md) | [English](README.md)

JSON computation graph visualization tool with dagre layout and multi-format export support.

## Features

- 📊 Visualize JSON computation graphs (see [docs/json-spec.md](docs/json-spec.md) for format)
- 🎨 Customizable themes, languages, layout directions, fonts, and node sizes
- 📤 Export to SVG, PNG, JPG, WebP, PDF, and more formats
- 📱 Support for Web, desktop apps (Windows/macOS/Linux), and VSCode extension
- 🌐 Chinese/English interface switching

## Quick Start

### Online Usage

Visit the [online version](https://lancerstadium.github.io/xovis/) to use directly without installation.

### Local Development

```bash
# Clone repository
git clone https://github.com/lancerstadium/xovis.git
cd xovis

# Install dependencies
pnpm install

# Start development server
pnpm dev
```

After opening in your browser, select a JSON file or load from the "Examples" dropdown; switch language, theme, and layout in "Settings".

## Downloads

| Platform | Build Status | Download Link | Description |
|----------|-------------|---------------|-------------|
| 🌐 **Web** | ![Deploy to GitHub Pages](https://github.com/lancerstadium/xovis/actions/workflows/deploy.yml/badge.svg) | [Online Access](https://lancerstadium.github.io/xovis/) | Use directly in browser, no installation required |
| 🪟 **Windows** | ![Build and Package](https://github.com/lancerstadium/xovis/actions/workflows/build.yml/badge.svg) | [Latest Release](https://github.com/lancerstadium/xovis/releases/latest) | `.exe` installer |
| 🍎 **macOS** | ![Build and Package](https://github.com/lancerstadium/xovis/actions/workflows/build.yml/badge.svg) | [Latest Release](https://github.com/lancerstadium/xovis/releases/latest) | `.dmg` disk image |
| 🐧 **Linux** | ![Build and Package](https://github.com/lancerstadium/xovis/actions/workflows/build.yml/badge.svg) | [Latest Release](https://github.com/lancerstadium/xovis/releases/latest) | `.AppImage` executable |
| 📦 **VSCode Extension** | ![Build and Package](https://github.com/lancerstadium/xovis/actions/workflows/build.yml/badge.svg) | [Latest Release](https://github.com/lancerstadium/xovis/releases/latest) | `.vsix` extension package |

## Development

### Build

```bash
# Build all packages
pnpm build

# Build specific platform
pnpm build:electron:win    # Windows
pnpm build:electron:mac    # macOS
pnpm build:electron:linux  # Linux
pnpm package:vscode        # VSCode extension
```

### Project Structure

```
packages/
  core/   # JSON parsing and types
  web/    # React application
docs/
  json-spec.md   # JSON computation graph format specification
```

## License

This project is licensed under the [GNU General Public License v3.0](LICENSE) (GPL-3.0).

Copyright (C) 2024 lancerstadium
