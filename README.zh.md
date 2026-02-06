# xovis

![Deploy to GitHub Pages](https://github.com/lancerstadium/xovis/actions/workflows/deploy.yml/badge.svg)
![Build and Package](https://github.com/lancerstadium/xovis/actions/workflows/build.yml/badge.svg)
![License](https://img.shields.io/badge/license-GPL--3.0-blue.svg)
![Node.js](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)
![pnpm](https://img.shields.io/badge/pnpm-%3E%3D8.0.0-orange.svg)

> [中文](README.zh.md) | [English](README.md)

JSON 计算图可视化工具，支持 dagre 布局和多种格式导出。

## 功能特性

- 📊 可视化 JSON 计算图（格式见 [docs/json-spec.md](docs/json-spec.md)）
- 🎨 可自定义主题、语言、布局方向、字体、节点尺寸
- 📤 支持导出 SVG、PNG、JPG、WebP、PDF 等多种格式
- 📱 支持 Web、桌面应用（Windows/macOS/Linux）、VSCode 扩展
- 🌐 中英文界面切换

## 快速开始

### 在线使用

访问 [在线版本](https://lancerstadium.github.io/xovis/) 直接使用，无需安装。

> **注意**: 如果这是首次部署，需要在 GitHub 仓库设置中启用 Pages：
>
> 1. 访问 https://github.com/lancerstadium/xovis/settings/pages
> 2. 在 "Source" 下选择 **"GitHub Actions"**
> 3. 保存设置后，推送到 `main` 分支会自动触发部署

### 本地运行

```bash
# 克隆仓库
git clone https://github.com/lancerstadium/xovis.git
cd xovis

# 安装依赖
pnpm install

# 启动开发服务器
pnpm dev
```

浏览器打开后，选择 JSON 文件或从「示例」下拉加载；在「设置」中切换语言、主题与布局。

## 下载安装

| 平台                    | 构建状态                                                                                                 | 下载链接                                                           | 说明                     |
| ----------------------- | -------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ | ------------------------ |
| 🌐 **Web**              | ![Deploy to GitHub Pages](https://github.com/lancerstadium/xovis/actions/workflows/deploy.yml/badge.svg) | [在线访问](https://lancerstadium.github.io/xovis/)                 | 无需安装，浏览器直接使用 |
| 🪟 **Windows**          | ![Build and Package](https://github.com/lancerstadium/xovis/actions/workflows/build.yml/badge.svg)       | [最新版本](https://github.com/lancerstadium/xovis/releases/latest) | `.exe` 安装包            |
| 🍎 **macOS**            | ![Build and Package](https://github.com/lancerstadium/xovis/actions/workflows/build.yml/badge.svg)       | [最新版本](https://github.com/lancerstadium/xovis/releases/latest) | `.dmg` 磁盘镜像          |
| 🐧 **Linux**            | ![Build and Package](https://github.com/lancerstadium/xovis/actions/workflows/build.yml/badge.svg)       | [最新版本](https://github.com/lancerstadium/xovis/releases/latest) | `.AppImage` 可执行文件   |
| 📦 **VSCode Extension** | ![Build and Package](https://github.com/lancerstadium/xovis/actions/workflows/build.yml/badge.svg)       | [最新版本](https://github.com/lancerstadium/xovis/releases/latest) | `.vsix` 扩展包           |

> **macOS「应用已损坏」说明**：应用未做代码签名。若提示「已损坏」，先将应用拖到「应用程序」文件夹，再在终端执行：`xattr -cr /Applications/xovis.app`，或右键应用选择「打开」首次启动即可。

## 开发

### 构建

```bash
# 构建所有包
pnpm build

# 构建特定平台
pnpm build:electron:win    # Windows
pnpm build:electron:mac    # macOS
pnpm build:electron:linux  # Linux
pnpm package:vscode        # VSCode 扩展
```

### 项目结构

```
packages/
  core/   # JSON 解析与类型
  web/    # React 应用
docs/
  json-spec.md   # JSON 计算图格式规范
```

## 许可

本项目采用 [GNU General Public License v3.0](LICENSE) (GPL-3.0) 开源协议。

Copyright (C) 2024 lancerstadium
