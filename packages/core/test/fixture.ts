// Same data as the shadcn-ui-tree-view demo (lib/demo_data.ts).
export interface Item {
  id: string;
  name: string;
  type: string;
  children?: Item[];
}

const leaf = (id: string, name: string): Item => ({ id, name, type: "item" });

export const data: Item[] = [
  {
    id: "science",
    name: "Science",
    type: "region",
    children: [
      {
        id: "physics",
        name: "Physics",
        type: "store",
        children: [
          {
            id: "mechanics",
            name: "Mechanics",
            type: "department",
            children: [
              leaf("newton1", "Newton's First Law"),
              leaf("newton2", "Newton's Second Law"),
              leaf("newton3", "Newton's Third Law"),
              leaf("momentum", "Conservation of Momentum"),
            ],
          },
          {
            id: "thermo",
            name: "Thermodynamics",
            type: "department",
            children: [
              leaf("thermo1", "First Law of Thermodynamics"),
              leaf("thermo2", "Second Law of Thermodynamics"),
              leaf("entropy", "Entropy"),
            ],
          },
        ],
      },
      {
        id: "chemistry",
        name: "Chemistry",
        type: "store",
        children: [
          {
            id: "organic",
            name: "Organic Chemistry",
            type: "department",
            children: [
              leaf("alkanes", "Alkanes"),
              leaf("alkenes", "Alkenes"),
              leaf("alcohols", "Alcohols"),
              leaf("ketones", "Ketones"),
            ],
          },
        ],
      },
    ],
  },
  {
    id: "math",
    name: "Mathematics",
    type: "region",
    children: [
      {
        id: "algebra",
        name: "Algebra",
        type: "store",
        children: [
          {
            id: "linear",
            name: "Linear Algebra",
            type: "department",
            children: [
              leaf("matrices", "Matrices"),
              leaf("vectors", "Vectors"),
              leaf("eigen", "Eigenvalues"),
            ],
          },
          {
            id: "abstract",
            name: "Abstract Algebra",
            type: "department",
            children: [
              leaf("groups", "Group Theory"),
              leaf("rings", "Ring Theory"),
              leaf("fields", "Field Theory"),
              leaf("galois", "Galois Theory"),
            ],
          },
        ],
      },
    ],
  },
];

export const keys = (nodes: readonly { key: string }[]) => nodes.map((n) => n.key);
