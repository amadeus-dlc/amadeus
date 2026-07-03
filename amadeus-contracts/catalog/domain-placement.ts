export const domainPlacementContract = {
  legacyIntentDomainSegments: ["inception", "domain"],
  intentNoteFiles: ["domain-notes.md", "terminology-notes.md"],
  legacySharedDomainRoot: "aidlc/spaces/default/domain",
  sharedDomainArtifacts: ["aidlc/spaces/default/knowledge/domain-map.md", "aidlc/spaces/default/knowledge/context-map.md"],
  glossaryPath: "aidlc/spaces/default/knowledge/glossary.md",
  functionalDesignRootPattern: "construction/<unit-id>-<slug>/functional-design",
} as const;
