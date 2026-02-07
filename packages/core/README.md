# @xovis/core

JSON 计算图解析与类型，严格遵循 [json-spec](../../doc/json-spec.md)。

## 安装

```bash
pnpm add @xovis/core
```

## API

```ts
import { parseGraph, type Graph, type GraphNode, type GraphEdge, type Tensor } from '@xovis/core';
import { formatBytes, formatTime, formatPercent, formatNumber } from '@xovis/core';

const graph = parseGraph(jsonString);
```

- **parseGraph(json: string): Graph** — 解析 JSON 字符串为计算图
- **类型** — Graph, Tensor, GraphNode, GraphEdge, NodePerformance
- **format\*** — formatBytes, formatTime, formatPercent, formatNumber
