export const domainPlacementContract = {
  legacyIntentDomainSegments: ["inception", "domain"],
  intentNoteFiles: ["domain-notes.md", "terminology-notes.md"],
  legacySharedDomainRoot: "amadeus/spaces/default/domain",
  sharedDomainArtifacts: ["amadeus/spaces/default/knowledge/domain-map.md", "amadeus/spaces/default/knowledge/context-map.md"],
  glossaryPath: "amadeus/spaces/default/knowledge/glossary.md",
  functionalDesignRootPattern: "construction/<unit-id>-<slug>/functional-design",
} as const;
