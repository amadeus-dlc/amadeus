export const domainPlacementContract = {
  legacyIntentDomainSegments: ["inception", "domain"],
  intentNoteFiles: ["domain-notes.md", "terminology-notes.md"],
  legacySharedDomainRoot: ".amadeus/domain",
  sharedDomainArtifacts: [".amadeus/domain-map.md", ".amadeus/context-map.md"],
  glossaryPath: ".amadeus/glossary.md",
  functionalDesignRootPattern: "construction/<unit-id>-<slug>/functional-design",
} as const;
