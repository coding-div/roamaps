import { getNodeBox } from "../client/src/lib/collision";
import { getOrthogonalRoute } from "../client/src/components/TreeCanvas";
import type { NodeData } from "../client/src/lib/treeData";

function node(id: string, x: number, y: number): NodeData {
  return { id, x, y, label: "", color: "blue", children: [], popupContent: "" };
}

const source = { ...node("source", 0, 0), label: "Main Topic" };
const target = node("target", 0, -180);
const blocker = node("blocker", 0, -90);
const route = getOrthogonalRoute(source, target, getNodeBox(source, true), getNodeBox(target, false), [getNodeBox(blocker, false)]);
console.log(JSON.stringify(route, null, 2));
