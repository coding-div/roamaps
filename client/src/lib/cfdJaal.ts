/**
 * CFD Jaal file format — a local-only, data-only Roadmap exchange envelope.
 * Import always validates the complete document before it can reach storage.
 */

import { COLOR_ORDER, type ChildRef, type NodeColor, type NodeData, type TreeMap } from "./treeData";

export const CFD_JAAL_EXTENSION = ".cfdj";
export const CFD_JAAL_FORMAT = "cfd-jaal";
export const CFD_JAAL_VERSION = 1;
export const CFD_JAAL_MAX_BYTES = 20 * 1024 * 1024;
export const CFD_JAAL_MAX_NODES = 2_000;
export const CFD_JAAL_MAX_ARROWS = 4_000;

const MAX_ID_LENGTH = 100;
const MAX_GROUP_ID_LENGTH = 100;
const MAX_TITLE_LENGTH = 120;
const MAX_DESCRIPTION_LENGTH = 2_000;
const MAX_LABEL_LENGTH = 2_000;
const MAX_POPUP_LENGTH = 1_000_000;
const MAX_COORDINATE = 10_000_000;
const ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_-]*$/;
const COLORS = new Set<string>(COLOR_ORDER);

export class CfdJaalValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CfdJaalValidationError";
  }
}

export interface CfdJaalDocument {
  format: typeof CFD_JAAL_FORMAT;
  version: typeof CFD_JAAL_VERSION;
  createdAt: string;
  roadmap: {
    title: string;
    description: string;
    rootId: string | null;
    maxDepth: number;
    nodes: Array<{
      id: string;
      x: number;
      y: number;
      label: string;
      color: NodeColor;
      popupContent: string;
      children: ChildRef[];
    }>;
  };
}

export interface CfdJaalPreview {
  title: string;
  nodeCount: number;
  arrowCount: number;
  noteCount: number;
  createdAt: string;
  isAboveTreeTwo: boolean;
}

function record(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value) || Object.getPrototypeOf(value) !== Object.prototype) {
    throw new CfdJaalValidationError(`${label} must be an object.`);
  }
  return value as Record<string, unknown>;
}

function onlyKeys(value: Record<string, unknown>, allowed: string[], label: string): void {
  for (const key of Object.keys(value)) {
    if (!allowed.includes(key)) throw new CfdJaalValidationError(`${label} contains an unsupported field.`);
  }
}

function text(value: unknown, label: string, maximum: number, allowEmpty = true): string {
  if (typeof value !== "string" || value.length > maximum || (!allowEmpty && value.trim().length === 0)) {
    throw new CfdJaalValidationError(`${label} is not valid.`);
  }
  return value;
}

function identifier(value: unknown, label: string, maximum = MAX_ID_LENGTH): string {
  const id = text(value, label, maximum, false);
  if (!ID_PATTERN.test(id)) throw new CfdJaalValidationError(`${label} contains unsupported characters.`);
  return id;
}

function finiteCoordinate(value: unknown, label: string): number {
  if (typeof value !== "number" || !Number.isFinite(value) || Math.abs(value) > MAX_COORDINATE) {
    throw new CfdJaalValidationError(`${label} is outside the supported canvas range.`);
  }
  return value;
}

function nodeColor(value: unknown, label: string): NodeColor {
  if (typeof value !== "string" || !COLORS.has(value)) throw new CfdJaalValidationError(`${label} is not a supported colour.`);
  return value as NodeColor;
}

function parseChild(value: unknown, label: string): ChildRef {
  const child = record(value, label);
  onlyKeys(child, ["targetId", "color", "groupId"], label);
  const result: ChildRef = {
    targetId: identifier(child.targetId, `${label} target ID`),
    color: nodeColor(child.color, `${label} colour`),
  };
  if (child.groupId !== undefined) result.groupId = identifier(child.groupId, `${label} group ID`, MAX_GROUP_ID_LENGTH);
  return result;
}

function parseNode(value: unknown, index: number): NodeData {
  const label = `Node ${index + 1}`;
  const node = record(value, label);
  onlyKeys(node, ["id", "x", "y", "label", "color", "popupContent", "children"], label);
  if (!Array.isArray(node.children)) throw new CfdJaalValidationError(`${label} children must be a list.`);
  if (node.children.length > CFD_JAAL_MAX_ARROWS) throw new CfdJaalValidationError(`${label} contains too many arrows.`);
  const children = node.children.map((child, childIndex) => parseChild(child, `${label} arrow ${childIndex + 1}`));
  const targetIds = new Set<string>();
  for (const child of children) {
    if (child.targetId === node.id || targetIds.has(child.targetId)) throw new CfdJaalValidationError(`${label} contains a duplicate or self arrow.`);
    targetIds.add(child.targetId);
  }
  return {
    id: identifier(node.id, `${label} ID`),
    x: finiteCoordinate(node.x, `${label} x coordinate`),
    y: finiteCoordinate(node.y, `${label} y coordinate`),
    label: text(node.label, `${label} label`, MAX_LABEL_LENGTH),
    color: nodeColor(node.color, `${label} colour`),
    popupContent: text(node.popupContent, `${label} note`, MAX_POPUP_LENGTH),
    children,
  };
}

function validateCopyGroups(nodes: NodeData[]): void {
  const members = new Map<string, Array<{ sourceId: string; targetId: string }>>();
  for (const node of nodes) {
    for (const child of node.children) {
      if (!child.groupId) continue;
      const group = members.get(child.groupId) ?? [];
      group.push({ sourceId: node.id, targetId: child.targetId });
      members.set(child.groupId, group);
    }
  }
  members.forEach((group, groupId) => {
    const sameSource = group.every((member) => member.sourceId === group[0].sourceId);
    const sameTarget = group.every((member) => member.targetId === group[0].targetId);
    if (group.length < 2 || (!sameSource && !sameTarget)) {
      throw new CfdJaalValidationError(`Copy group ${groupId} is not a valid shared-head or shared-tail group.`);
    }
  });
}

export function createCfdJaalDocument(tree: TreeMap): CfdJaalDocument {
  return {
    format: CFD_JAAL_FORMAT,
    version: CFD_JAAL_VERSION,
    createdAt: new Date().toISOString(),
    roadmap: {
      title: tree.title,
      description: tree.description,
      rootId: tree.root?.id ?? null,
      maxDepth: tree.maxDepth,
      nodes: Object.values(tree.nodeMap).map((node) => ({
        id: node.id,
        x: node.x,
        y: node.y,
        label: node.label,
        color: node.color,
        popupContent: node.popupContent ?? "",
        children: node.children.map((child) => ({ ...child })),
      })),
    },
  };
}

export function cfdJaalFileName(title: string): string {
  const safeTitle = title.trim().replace(/[\\/:*?"<>|]+/g, "-").slice(0, 80) || "New Roadmap";
  return `${safeTitle}${CFD_JAAL_EXTENSION}`;
}

export function parseCfdJaal(textValue: string): CfdJaalDocument {
  let parsed: unknown;
  try {
    parsed = JSON.parse(textValue);
  } catch {
    throw new CfdJaalValidationError("This file is not readable CFD Jaal data.");
  }

  const document = record(parsed, "CFD Jaal file");
  onlyKeys(document, ["format", "version", "createdAt", "roadmap"], "CFD Jaal file");
  if (document.format !== CFD_JAAL_FORMAT) throw new CfdJaalValidationError("This is not a CFD Jaal file.");
  if (document.version !== CFD_JAAL_VERSION) throw new CfdJaalValidationError("This CFD Jaal version is not supported yet.");
  const createdAt = text(document.createdAt, "Creation time", 80, false);
  if (Number.isNaN(Date.parse(createdAt))) throw new CfdJaalValidationError("Creation time is not valid.");

  const roadmap = record(document.roadmap, "Roadmap");
  onlyKeys(roadmap, ["title", "description", "rootId", "maxDepth", "nodes"], "Roadmap");
  const title = text(roadmap.title, "Roadmap name", MAX_TITLE_LENGTH, false);
  const description = text(roadmap.description, "Roadmap description", MAX_DESCRIPTION_LENGTH);
  if (!Number.isInteger(roadmap.maxDepth) || (roadmap.maxDepth as number) < 1 || (roadmap.maxDepth as number) > 100) {
    throw new CfdJaalValidationError("Roadmap depth is not valid.");
  }
  if (roadmap.rootId !== null && typeof roadmap.rootId !== "string") throw new CfdJaalValidationError("Roadmap root is not valid.");
  if (!Array.isArray(roadmap.nodes) || roadmap.nodes.length > CFD_JAAL_MAX_NODES) throw new CfdJaalValidationError("This file contains too many nodes.");

  const nodes = roadmap.nodes.map((node, index) => parseNode(node, index));
  const nodeMap = new Map<string, NodeData>();
  for (const node of nodes) {
    if (nodeMap.has(node.id)) throw new CfdJaalValidationError("This file contains duplicate node IDs.");
    nodeMap.set(node.id, node);
  }
  if (roadmap.rootId !== null && !nodeMap.has(identifier(roadmap.rootId, "Roadmap root ID"))) {
    throw new CfdJaalValidationError("The Roadmap root does not exist.");
  }

  let arrowCount = 0;
  for (const node of nodes) {
    for (const child of node.children) {
      if (!nodeMap.has(child.targetId)) throw new CfdJaalValidationError("An arrow points to a missing node.");
      arrowCount += 1;
      if (arrowCount > CFD_JAAL_MAX_ARROWS) throw new CfdJaalValidationError("This file contains too many arrows.");
    }
  }
  validateCopyGroups(nodes);

  return {
    format: CFD_JAAL_FORMAT,
    version: CFD_JAAL_VERSION,
    createdAt,
    roadmap: {
      title,
      description,
      rootId: roadmap.rootId === null ? null : identifier(roadmap.rootId, "Roadmap root ID"),
      maxDepth: roadmap.maxDepth as number,
      nodes: nodes.map((node) => ({ ...node, popupContent: node.popupContent ?? "", children: node.children.map((child) => ({ ...child })) })),
    },
  };
}

export function getCfdJaalPreview(document: CfdJaalDocument): CfdJaalPreview {
  const arrowCount = document.roadmap.nodes.reduce((total, node) => total + node.children.length, 0);
  return {
    title: document.roadmap.title,
    nodeCount: document.roadmap.nodes.length,
    arrowCount,
    noteCount: document.roadmap.nodes.filter((node) => node.popupContent.trim().length > 0).length,
    createdAt: document.createdAt,
    isAboveTreeTwo: document.roadmap.nodes.length > 44 || arrowCount > 43,
  };
}

export function uniqueRoadmapTitle(baseTitle: string, existingTitles: string[]): string {
  const normalizedTitles = new Set(existingTitles.map((title) => title.trim().toLocaleLowerCase()));
  const base = baseTitle.trim() || "New Roadmap";
  if (!normalizedTitles.has(base.toLocaleLowerCase())) return base;
  for (let index = 2; index < 10_000; index++) {
    const candidate = `${base} (${index})`;
    if (!normalizedTitles.has(candidate.toLocaleLowerCase())) return candidate;
  }
  return `${base} ${Date.now()}`;
}

export function createTreeFromCfdJaal(document: CfdJaalDocument, existingTrees: TreeMap[]): TreeMap {
  const nodeMap = Object.fromEntries(document.roadmap.nodes.map((node) => [node.id, { ...node, children: node.children.map((child) => ({ ...child })) }])) as Record<string, NodeData>;
  const root = document.roadmap.rootId ? nodeMap[document.roadmap.rootId] ?? null : null;
  const existingIds = new Set(existingTrees.map((tree) => tree.id));
  let treeId = `tree-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  while (existingIds.has(treeId)) treeId = `tree-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  return {
    id: treeId,
    title: uniqueRoadmapTitle(document.roadmap.title, existingTrees.map((tree) => tree.title)),
    description: document.roadmap.description,
    root,
    nodeMap,
    maxDepth: document.roadmap.maxDepth,
  };
}
