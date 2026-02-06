# xovis VSCode Extension

在 VSCode 中可视化 JSON 计算图的扩展。

## 功能

- 在 VSCode 中直接打开和可视化 JSON 计算图文件
- 支持 `.graph.json` 和 `.computation-graph.json` 文件
- 自定义编辑器视图

## 开发

```bash
cd packages/vscode-extension
pnpm install
pnpm run compile
pnpm run watch  # 监听模式
```

## 打包

```bash
pnpm run package
```

会生成 `.vsix` 文件，可以在 VSCode 中通过 "Extensions: Install from VSIX..." 安装。

## 安装

1. 打包生成 `.vsix` 文件
2. 在 VSCode 中按 `F1`，输入 "Extensions: Install from VSIX..."
3. 选择生成的 `.vsix` 文件

## 使用

1. 打开一个 JSON 计算图文件
2. 右键选择 "打开 xovis 可视化" 或使用命令面板
3. 或者直接打开 `.graph.json` 文件会自动使用 xovis 编辑器
