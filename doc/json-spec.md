# JSON 计算图格式规范

## 概述

JSON 格式用于表示神经网络计算图，采用精简设计，不向前兼容旧版本。

## 文件结构

```json
{
  "id": "string",
  "name": "string",
  "tensors": [...],
  "nodes": [...],
  "inputs": [...],
  "outputs": [...],
  "metadata": {...}
}
```

## 根级字段说明

| 字段       | 类型   | 必需   | 说明                                              |
| ---------- | ------ | ------ | ------------------------------------------------- |
| `id`       | string | **是** | 图/算子的唯一标识，对应 Operator.name             |
| `name`     | string | **是** | 图/算子的名称，由 Operator.name 直接解析          |
| `tensors`  | array  | **是** | 全局张量列表                                      |
| `nodes`    | array  | **是** | 节点（算子）列表                                  |
| `inputs`   | array  | **是** | 输入张量索引，指向 tensors                        |
| `outputs`  | array  | **是** | 输出张量索引，指向 tensors                        |
| `metadata` | object | 否     | 元数据，仅包含 attrs 中存在的字段，不硬编码默认值 |

## tensors（张量）

```json
{
  "id": "string",
  "name": "input",
  "shape": [1, 3, 224, 224],
  "dtype": "float32",
  "metadata": {...}
}
```

| 字段       | 必需   | 说明                                                                          |
| ---------- | ------ | ----------------------------------------------------------------------------- | ------------------------------------------------- |
| `id`       | 是     | 张量唯一标识                                                                  |
| `name`     | 是     | 张量类型：`input` \| `output` \| `weight` \| `activation`                     |
| `shape`    | 是     | 整数数组                                                                      |
| `dtype`    | 是     | `float32` \| `float16` \| `int32` \| `int64` \| `uint8` \| `bool` \| `string` |
| `metadata` | object | 否                                                                            | 元数据，仅包含 attrs 中存在的字段，不硬编码默认值 |

**注意**：张量以 `id` 标识，无冗余字段；边的输入输出由 nodes 的 inputs/outputs 索引即可推导，无需 `operator_id`。

## nodes（节点）

```json
{
  "id": "string",
  "name": "Conv",
  "inputs": [0, 1],
  "outputs": [2],
  "attributes": { "kernel_shape": [3, 3], "strides": [1, 1] },
  "metadata": { "level": 0, "performance": { "time": { "cpu": 12.5 } } }
}
```

| 字段         | 必需 | 说明                                                                           |
| ------------ | ---- | ------------------------------------------------------------------------------ |
| `id`         | 是   | 节点唯一标识                                                                   |
| `name`       | 是   | 算子类型，统一 ONNX 格式（如 `Conv`、`Relu`）                                  |
| `inputs`     | 是   | 输入张量索引                                                                   |
| `outputs`    | 是   | 输出张量索引                                                                   |
| `attributes` | 是   | **仅 schema 内** ONNX 属性                                                     |
| `metadata`   | 否   | 非 schema 的 attrs，可选信息（level、parent_id、children_ids、performance 等） |

## metadata（根级）

- **可选**：仅当 attrs 存在时输出，否则为 `{}`
- **无硬编码**：不输出 version、name、format 等默认值，仅输出 attrs 中实际存在的字段
- 字段来自 `Operator.attrs()`，dotted key 导出时展开为嵌套结构

## 示例

```json
{
  "id": "simple_model",
  "name": "simple_model",
  "tensors": [
    { "id": "tensor_0", "name": "input", "shape": [1, 3, 224, 224], "dtype": "float32" },
    { "id": "tensor_1", "name": "weight", "shape": [64, 3, 3, 3], "dtype": "float32" },
    { "id": "tensor_2", "name": "activation", "shape": [1, 64, 224, 224], "dtype": "float32" }
  ],
  "nodes": [
    {
      "id": "node_0",
      "name": "Conv",
      "inputs": [0, 1],
      "outputs": [2],
      "attributes": { "kernel_shape": [3, 3], "strides": [1, 1], "pads": [1, 1] }
    }
  ],
  "inputs": [0],
  "outputs": [2],
  "metadata": {}
}
```

（无 attrs 时 metadata 为空对象；有 attrs 时按实际内容输出）

## 映射关系（XOC Operator）

| JSON            | XOC                                 |
| --------------- | ----------------------------------- |
| `json.id`       | Operator.name                       |
| `json.name`     | Operator.name                       |
| `json.tensors`  | Operator.vars()                     |
| `json.nodes`    | Operator.getSubOps()                |
| `json.inputs`   | Operator.inputs() 在 vars 中的索引  |
| `json.outputs`  | Operator.outputs() 在 vars 中的索引 |
| `json.metadata` | Operator.attrs()，dotted key 展开   |

| JSON                       | XOC                                                                                                                 |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `json.nodes[i].id`         | 节点索引                                                                                                            |
| `json.nodes[i].name`       | 算子类型（如 Conv、Relu），即 Expr.name / 算子注册名                                                                |
| `json.nodes[i].attributes` | attrs 中 **schema 内** 属性                                                                                         |
| `json.nodes[i].metadata`   | attrs 中 **非 schema** 部分（无 "metadata." 前缀）：`level`、`parent_id`、`children_ids`、`performance.time.cpu` 等 |

| JSON                   | XOC                                 |
| ---------------------- | ----------------------------------- |
| `json.tensors[i].id`   | 张量唯一标识                        |
| `json.tensors[i].name` | 类型 input/output/weight/activation |

## 导出规则

1. **attributes**：仅输出 schema 内定义的 ONNX 属性
2. **metadata**：非 schema 的 attrs 全部放入 metadata，**不硬编码**默认值
3. **dotted key 展开**：`attrs["perf.time.cpu"]` → `"metadata":{"perf":{"time":{"cpu":12.5}}}`
4. **可选子段**：仅输出实际存在的字段，不擅自添加默认值

## 设计原则

1. **精简**：形状用整数数组；tensor 支持可选 metadata，与 nodes 一致
2. **分离**：`attributes` 仅 schema；`metadata` 承载可选/扩展信息
3. **必选**：根级 `id`、`name` 必选，来自 Operator.name
4. **可选无默认**：metadata 等可选字段不硬编码默认值
5. **统一索引**：张量统一存于 tensors，节点通过索引引用

## 注意事项

- `shape` 直接使用整数数组
- 张量 `name` 为类型（input/output/weight/activation），以 `id` 标识，无 operator_id
- `nodes[].name` 为算子类型，支持任意字符串
- `edges` 可从 inputs/outputs 推导，导出时可选
- 张量节点由非 activation 张量自动创建
