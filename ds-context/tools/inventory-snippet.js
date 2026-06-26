// APS Inventory Snippet
// Run this inside a use_figma call against the APS source file.
// Outputs a JSON object representing the CURRENT state of APS, 
// for comparison against the documented manifest via aps-doc-drift-checker.py
//
// Usage:
//   1. Open Figma with APS file (AbCdEf1234567890GhIjKl)
//   2. Run via use_figma — copy the entire output
//   3. Save output as aps-actual.json
//   4. Run: python aps-doc-drift-checker.py aps-manifest.json aps-actual.json

const inventory = { variables: [], textStyles: [], components: [], generatedAt: new Date().toISOString() };

// ── Variables ──
const allVars = await figma.variables.getLocalVariablesAsync();
const collections = await figma.variables.getLocalVariableCollectionsAsync();
const collectionMap = {};
for (const c of collections) collectionMap[c.id] = c.name;

for (const v of allVars) {
  inventory.variables.push({
    name: v.name,
    id: v.id,
    key: v.key,
    type: v.resolvedType,
    collection: collectionMap[v.variableCollectionId],
    hasDescription: !!v.description,
    descriptionLength: v.description?.length || 0,
  });
}

// ── Text Styles ──
const styles = await figma.getLocalTextStylesAsync();
for (const s of styles) {
  inventory.textStyles.push({
    name: s.name,
    key: s.key,
    fontSize: s.fontSize,
    weight: s.fontName?.style,
    fontFamily: s.fontName?.family,
    lineHeight: s.lineHeight,
    letterSpacing: s.letterSpacing,
  });
}

// ── Components (component sets and standalone) ──
for (const page of figma.root.children) {
  await page.loadAsync();
  
  const sets = page.findAll(n => n.type === "COMPONENT_SET");
  for (const s of sets) {
    inventory.components.push({
      name: s.name,
      id: s.id,
      type: "COMPONENT_SET",
      variants: s.children.length,
      page: page.name,
      // Store all variant keys for completeness
      variantKeys: s.children.map(v => ({ name: v.name, key: v.key })),
    });
  }
  
  const standalone = page.findAll(n => 
    n.type === "COMPONENT" && 
    (!n.parent || n.parent.type !== "COMPONENT_SET")
  );
  for (const c of standalone) {
    inventory.components.push({
      name: c.name,
      id: c.id,
      type: "COMPONENT",
      key: c.key,
      page: page.name,
    });
  }
}

// Output as JSON. Copy this to aps-actual.json.
return { inventoryJSON: JSON.stringify(inventory, null, 2) };
