// src/lib/kinship.ts
import { prisma } from "@/lib/db";

// human ordinals for cousin/removed labels
const ord = (n: number) =>
  ["zeroth","first","second","third","fourth","fifth","sixth","seventh","eighth","ninth","tenth"][n] || `${n}th`;

type ParentKind = "BIOLOGICAL" | "WHANGAI";
type AncInfo = { d: number; whangai: boolean };
type AncMap = Map<string, AncInfo>;
type Gender = "MALE" | "FEMALE" | "OTHER" | "UNKNOWN";

/**
 * Fetch a person's gender from the database.  Returns null if the person cannot be
 * found or has no gender set.
 */
async function getGender(id: string): Promise<Gender | null> {
  const row = await prisma.person.findUnique({
    where: { id },
    select: { gender: true },
  });
  return (row?.gender as Gender) ?? null;
}

/**
 * Convert a gender‑neutral relationship label into a gender‑aware one.  If the
 * gender is unknown or not applicable, the original label is returned.
 */
function gendered(label: string, gender: Gender | null): string {
  switch (label) {
    case "parent":
      if (gender === "FEMALE") return "mother";
      if (gender === "MALE") return "father";
      return label;
    case "grandparent":
      if (gender === "FEMALE") return "grandmother";
      if (gender === "MALE") return "grandfather";
      return label;
    case "child":
      if (gender === "FEMALE") return "daughter";
      if (gender === "MALE") return "son";
      return label;
    case "grandchild":
      if (gender === "FEMALE") return "granddaughter";
      if (gender === "MALE") return "grandson";
      return label;
    case "sibling":
      if (gender === "FEMALE") return "sister";
      if (gender === "MALE") return "brother";
      return label;
    case "aunt/uncle":
      if (gender === "FEMALE") return "aunt";
      if (gender === "MALE") return "uncle";
      return label;
    case "niece/nephew":
      if (gender === "FEMALE") return "niece";
      if (gender === "MALE") return "nephew";
      return label;
    case "brother-/sister-in-law":
      if (gender === "FEMALE") return "sister-in-law";
      if (gender === "MALE") return "brother-in-law";
      return label;
    case "parent-in-law":
      if (gender === "FEMALE") return "mother-in-law";
      if (gender === "MALE") return "father-in-law";
      return label;
    case "child-in-law":
      if (gender === "FEMALE") return "daughter-in-law";
      if (gender === "MALE") return "son-in-law";
      return label;
    default:
      return label;
  }
}
const labelWithKind = (label: string, whangai: boolean) =>
  whangai ? `${label}(whangai)` : label;

// --- helpers that respect soft-deletes and return kind/role ---

async function getParentsDetailed(childId: string): Promise<Array<{ parentId: string; role: "MOTHER"|"FATHER"; kind: ParentKind }>> {
  const rows = await prisma.parentChild.findMany({
    where: { childId, parent: { deletedAt: null }, child: { deletedAt: null } },
    select: { parentId: true, role: true, kind: true },
  });
  // coerce role just in case
  return rows.map(r => ({ parentId: r.parentId, role: r.role as "MOTHER"|"FATHER", kind: (r.kind as ParentKind) || "BIOLOGICAL" }));
}

async function getChildrenDetailed(parentId: string): Promise<Array<{ childId: string; role: "MOTHER"|"FATHER"; kind: ParentKind }>> {
  const rows = await prisma.parentChild.findMany({
    where: { parentId, parent: { deletedAt: null }, child: { deletedAt: null } },
    select: { childId: true, role: true, kind: true },
  });
  return rows.map(r => ({ childId: r.childId, role: r.role as "MOTHER"|"FATHER", kind: (r.kind as ParentKind) || "BIOLOGICAL" }));
}

// Co-parents: people who share a child with this person.
// Returns both the co-parent ids and a flag if any shared-child link uses whāngai.
async function getCoParentsWithKind(personId: string): Promise<Array<{ coParentId: string; whangai: boolean }>> {
  // personId -> their child links (with kind)
  const my = await prisma.parentChild.findMany({
    where: { parentId: personId, parent: { deletedAt: null }, child: { deletedAt: null } },
    select: { childId: true, kind: true },
  });
  if (my.length === 0) return [];
  const childIds = Array.from(new Set(my.map(r => r.childId)));

  // other parents on those children
  const others = await prisma.parentChild.findMany({
    where: {
      childId: { in: childIds },
      parentId: { not: personId },
      parent: { deletedAt: null },
      child: { deletedAt: null },
    },
    select: { parentId: true, childId: true, kind: true },
  });

  // Aggregate by co-parent; whāngai = true if any shared link is whāngai on either side
  const myKindByChild = new Map(childIds.map(cid => {
    const ks = my.filter(x => x.childId === cid).map(x => (x.kind as ParentKind) || "BIOLOGICAL");
    // if any link to that child is whāngai, mark whāngai
    return [cid, ks.includes("WHANGAI")];
  }));

  const agg = new Map<string, boolean>();
  for (const r of others) {
    const wh = ((r.kind as ParentKind) || "BIOLOGICAL") === "WHANGAI" || (myKindByChild.get(r.childId) ?? false);
    agg.set(r.parentId, (agg.get(r.parentId) ?? false) || wh);
  }
  return Array.from(agg.entries()).map(([coParentId, whangai]) => ({ coParentId, whangai }));
}

// BFS up the tree to map all ancestors with distance and whether path used any whāngai edges
async function ancestorsDepthMap(id: string, maxDepth = 12): Promise<AncMap> {
  const map: AncMap = new Map();
  type Q = { id: string; d: number; whangai: boolean };
  let frontier: Q[] = [{ id, d: 0, whangai: false }];
  const seen = new Set<string>([id]);

  while (frontier.length) {
    const next: Q[] = [];
    for (const { id: cur, d, whangai } of frontier) {
      if (d >= maxDepth) continue;
      const parents = await getParentsDetailed(cur);
      for (const p of parents) {
        if (seen.has(p.parentId)) continue;
        const w = whangai || p.kind === "WHANGAI";
        seen.add(p.parentId);
        map.set(p.parentId, { d: d + 1, whangai: w });
        next.push({ id: p.parentId, d: d + 1, whangai: w });
      }
    }
    frontier = next;
  }
  return map;
}

async function shareParentDetailed(a: string, b: string): Promise<{ shared: boolean; whangai: boolean }> {
  const [ap, bp] = await Promise.all([getParentsDetailed(a), getParentsDetailed(b)]);
  // same parentId?
  for (const p1 of ap) {
    const p2 = bp.find(x => x.parentId === p1.parentId);
    if (p2) {
      // whāngai if either link is whāngai
      return { shared: true, whangai: p1.kind === "WHANGAI" || p2.kind === "WHANGAI" };
    }
  }
  return { shared: false, whangai: false };
}

function ancestorLabel(steps: number) {
  if (steps === 1) return "parent";
  if (steps === 2) return "grandparent";
  return `${"great-".repeat(steps - 2)}grandparent`;
}
function descendantLabel(steps: number) {
  if (steps === 1) return "child";
  if (steps === 2) return "grandchild";
  return `${"great-".repeat(steps - 2)}grandchild`;
}

// --- main ---

export async function describeRelationship(aId: string, bId: string): Promise<string> {
  if (aId === bId) return "the same person";

  const [aGender, bGender] = await Promise.all([getGender(aId), getGender(bId)]);

  // Build ancestor maps (with whāngai tracking) first
  const [aAnc, bAnc] = await Promise.all([ancestorsDepthMap(aId), ancestorsDepthMap(bId)]);

  // 1) Direct ancestor / descendant
  if (aAnc.has(bId)) {
    const { d, whangai } = aAnc.get(bId)!; // B is ancestor of A
    const base0 = ancestorLabel(d);
    const base = base0.endsWith("grandparent")
      ? base0.replace(/grandparent$/, gendered("grandparent", bGender))
      : base0.endsWith("parent")
      ? gendered("parent", bGender)
      : base0;
    return labelWithKind(base, whangai);
  }
  if (bAnc.has(aId)) {
    const { d, whangai } = bAnc.get(aId)!; // B is descendant of A
    const base0 = descendantLabel(d);
    const base = base0.endsWith("grandchild")
      ? base0.replace(/grandchild$/, gendered("grandchild", bGender))
      : base0.endsWith("child")
      ? gendered("child", bGender)
      : base0;
    return labelWithKind(base, whangai);
  }

  // 2) Siblings (share any parent) — PRIORITIZED over co-parent
  const sib = await shareParentDetailed(aId, bId);
  if (sib.shared) {
    const base = gendered("sibling", bGender);
    return sib.whangai ? `${base}(whangai)` : base;
  }

  // 3) Aunt/Uncle ↔ Niece/Nephew
  const aParents = await getParentsDetailed(aId);
  for (const ap of aParents) {
    const sp = await shareParentDetailed(ap.parentId, bId);
    if (sp.shared) {
      const base = gendered("aunt/uncle", bGender);
      const w = sp.whangai || ap.kind === "WHANGAI";
      return w ? `${base}(whangai)` : base;
    }
  }
  const bParents = await getParentsDetailed(bId);
  for (const bp of bParents) {
    const sp = await shareParentDetailed(bp.parentId, aId);
    if (sp.shared) {
      const base = gendered("niece/nephew", bGender);
      const w = sp.whangai || bp.kind === "WHANGAI";
      return w ? `${base}(whangai)` : base;
    }
  }

  // 4) Cousins
  let best: { anc: string; m: number; n: number; whangai: boolean } | null = null;
  for (const [anc, infoA] of aAnc) {
    const infoB = bAnc.get(anc);
    if (infoB) {
      const sum = infoA.d + infoB.d;
      const wh = infoA.whangai || infoB.whangai;
      if (!best || sum < best.m + best.n || (sum === best.m + best.n && best.whangai && !wh)) {
        best = { anc, m: infoA.d, n: infoB.d, whangai: wh };
      }
    }
  }
  if (best) {
    const { m, n, whangai } = best;
    if (m === 1 && n === 1) {
      const base = gendered("sibling", bGender);
      return labelWithKind(base, whangai);
    }
    const degree = Math.min(m, n) - 1; // 1 => first cousins
    const removed = Math.abs(m - n);
    let label = `${ord(degree)} cousin`;
    if (removed === 1) label += " once removed";
    else if (removed > 1) label += ` ${ord(removed)} removed`;
    return labelWithKind(label, whangai);
  }

  // 5) Co-parents (only after exhausting blood relations)
  const [aCoParents, bCoParents] = await Promise.all([
    getCoParentsWithKind(aId),
    getCoParentsWithKind(bId),
  ]);
  const coA = aCoParents.find(x => x.coParentId === bId);
  if (coA) return labelWithKind("co-parent", coA.whangai);

  // 6) In-law approximations (use co-parents data computed above)
  // spouse's sibling: co-parent's sibling
  const aSibs = new Set<string>();
  for (const ap of aParents) {
    const kids = await getChildrenDetailed(ap.parentId);
    kids.forEach(k => aSibs.add(k.childId));
  }
  aSibs.delete(aId);

  const siblingCoParents = new Map<string, boolean>(); // id -> whāngai?
  for (const s of aSibs) {
    for (const { coParentId, whangai } of await getCoParentsWithKind(s)) {
      siblingCoParents.set(coParentId, (siblingCoParents.get(coParentId) ?? false) || whangai);
    }
  }
  if (siblingCoParents.has(bId)) {
    const base = gendered("brother-/sister-in-law", bGender);
    const w = siblingCoParents.get(bId)!;
    return w ? `${base}(whangai)` : base;
  }

  // parent/child in-law via co-parents
  const aCoById = new Map(aCoParents.map(x => [x.coParentId, x.whangai]));
  for (const [coId, wh] of aCoById) {
    const coParents = await getParentsDetailed(coId);
    if (coParents.some(p => p.parentId === bId)) {
      const base = gendered("parent-in-law", bGender);
      return wh ? `${base}(whangai)` : base;
    }
    const coChildren = await getChildrenDetailed(coId);
    const myChildren = new Set((await getChildrenDetailed(aId)).map(c => c.childId));
    for (const kid of coChildren) {
      if (!myChildren.has(kid.childId) && kid.childId === bId) {
        const base = gendered("child-in-law", bGender);
        return wh ? `${base}(whangai)` : base;
      }
    }
  }

  return "related (complex/step) or unknown";
}
