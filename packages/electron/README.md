# xovis Electron 桌面应用

基于 Electron 的跨平台桌面应用。

## 前置要求

- 已构建 web 应用 (`pnpm build:web`)
- Node.js 18+
- pnpm 8+

## 开发

```bash
# 方式1: 从根目录（推荐）
pnpm build:web
pnpm --filter @xovis/electron electron:dev

# 方式2: 手动
cd packages/web
pnpm dev  # 终端1

cd packages/electron
pnpm dev  # 终端2
```

## 构建

**重要**: 构建前需要先构建 web 应用。

```bash
# 从根目录（推荐，会自动构建 web）
pnpm build:electron:win   # Windows
pnpm build:electron:mac   # macOS
pnpm build:electron:linux # Linux

# 或手动
cd packages/web
pnpm build

cd packages/electron
pnpm build:win   # Windows
pnpm build:mac   # macOS
pnpm build:linux # Linux
```

构建产物位于 `packages/electron/release/` 目录。

## 注意事项

- Windows 构建需要在 Windows 系统上运行
- macOS 构建需要在 macOS 系统上运行
- Linux 构建可以在任何系统上运行
- 首次构建会下载 Electron 二进制文件，可能需要一些时间
- Electron 会加载 `packages/web/dist` 目录，确保已构建 web 应用
