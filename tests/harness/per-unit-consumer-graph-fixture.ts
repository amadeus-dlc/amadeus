import type { PerUnitConsumeGraphStage } from "../../packages/framework/core/tools/amadeus-per-unit-consume-fanout.ts";

export const PER_UNIT_CONSUMER_GRAPH_FIXTURE: readonly PerUnitConsumeGraphStage[] = [
  {
    slug: "code-generation",
    for_each: "unit-of-work",
    produces: ["code-generation-plan", "code-summary"],
    consumes: [],
  },
  {
    slug: "nfr-requirements",
    for_each: "unit-of-work",
    produces: ["performance-requirements", "scalability-requirements"],
    consumes: [],
  },
  {
    slug: "nfr-design",
    for_each: "unit-of-work",
    produces: [
      "performance-design",
      "security-design",
      "scalability-design",
      "reliability-design",
    ],
    consumes: [],
  },
  {
    slug: "infrastructure-design",
    for_each: "unit-of-work",
    produces: [
      "deployment-architecture",
      "infrastructure-services",
      "monitoring-design",
      "cicd-pipeline",
    ],
    consumes: [],
  },
  {
    slug: "build-and-test",
    produces: [],
    consumes: [
      { artifact: "code-generation-plan", required: true },
      { artifact: "code-summary", required: true },
    ],
  },
  {
    slug: "ci-pipeline",
    produces: [],
    consumes: [{ artifact: "code-summary", required: true }],
  },
  {
    slug: "performance-validation",
    produces: [],
    consumes: [
      { artifact: "performance-requirements", required: true },
      { artifact: "scalability-requirements", required: true },
      { artifact: "performance-design", required: true },
      { artifact: "scalability-design", required: true },
    ],
  },
  {
    slug: "observability-setup",
    produces: [],
    consumes: [
      { artifact: "performance-design", required: true },
      { artifact: "security-design", required: true },
      { artifact: "reliability-design", required: true },
      { artifact: "monitoring-design", required: true },
      { artifact: "infrastructure-services", required: true },
    ],
  },
  {
    slug: "incident-response",
    produces: [],
    consumes: [
      { artifact: "reliability-design", required: true },
      { artifact: "security-design", required: true },
      { artifact: "deployment-architecture", required: true },
    ],
  },
  {
    slug: "deployment-pipeline",
    produces: [],
    consumes: [
      { artifact: "deployment-architecture", required: true },
      { artifact: "cicd-pipeline", required: true },
    ],
  },
  {
    slug: "environment-provisioning",
    produces: [],
    consumes: [
      { artifact: "deployment-architecture", required: true },
      { artifact: "infrastructure-services", required: true },
    ],
  },
];
