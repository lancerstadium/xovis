/** JSON 计算图类型（见 docs/json-spec.md） */

export type Dtype = 'float32' | 'float16' | 'int32' | 'int64' | 'uint8' | 'bool' | 'string';

/** 张量：id 唯一标识，name 为类型 input|output|weight|activation，与 JSON 一一对应；支持可选 metadata */
export interface Tensor {
  id: string;
  name: 'input' | 'output' | 'weight' | 'activation';
  shape?: number[];
  dtype?: Dtype;
  metadata?: Record<string, unknown>;
}

/** 节点：name 即算子类型（如 Conv、Relu），见 json-spec；扩展信息统一在 metadata */
export interface GraphNode {
  id: string;
  name: string;
  inputs: number[];
  outputs: number[];
  attributes: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  sourceOutput?: string;
  targetInput?: string;
  data?: { shape?: number[]; dtype?: Dtype };
}

export interface Graph {
  id: string;
  name: string;
  tensors: Tensor[];
  nodes: GraphNode[];
  edges: GraphEdge[];
  inputs: number[];
  outputs: number[];
  metadata?: Record<string, unknown>;
}
