// amadeus-mirror-project-gateway.ts — GitHub Project GraphQL boundary.
//
// Owns Project queries, argv construction, response parsing, and mutation
// permit enforcement. HTTP envelope and GraphQL error normalization remain in
// the parent GitHub gateway and enter through one narrow transport port.

import { validateMirrorProjectMutationPermit } from "./amadeus-mirror-capability.ts";
import { MIRROR_PROJECT_FIELD_CONTRACT } from "./amadeus-mirror-project-contract.ts";
import type {
  GatewayOutcome,
  MirrorGitHubGateway,
  MirrorIssueRef,
  MirrorProjectItem,
  MirrorProjectMutationPermit,
  MirrorProjectRef,
  MirrorProjectSingleSelectField,
  MirrorProjectItemsView,
  MirrorResolvedProjectFields,
} from "./amadeus-mirror-types.ts";

type ProjectOperation = "read-only" | "mutation";
type GatewayFailure = Extract<GatewayOutcome<unknown>, { kind: "failure" }>;

export type MirrorProjectGraphqlRuntime = Readonly<{
  run(
    args: readonly string[],
    operation: ProjectOperation,
  ): Promise<GatewayOutcome<Record<string, unknown>>>;
  invalidResponse(operation: ProjectOperation): GatewayFailure;
}>;

export type MirrorProjectGatewayMethods = Pick<
  MirrorGitHubGateway,
  | "listProjectItems"
  | "resolveProjectFields"
  | "addProjectItem"
  | "updateProjectItemSingleSelectField"
>;

export const PROJECT_ITEMS_PER_PAGE = 50;

export const LIST_PROJECT_ITEMS_QUERY =
  "query($owner:String!,$name:String!,$number:Int!,$first:Int!){" +
  "repository(owner:$owner,name:$name){issue(number:$number){id " +
  "projectItems(first:$first){nodes{id " +
  "project{id number owner{__typename ... on Organization{login} ... on User{login}}} " +
  "fieldValues(first:100){nodes{__typename " +
  "... on ProjectV2ItemFieldSingleSelectValue{" +
  "name field{... on ProjectV2SingleSelectField{id}}}" +
  "}}" +
  "}}}}}";

export const RESOLVE_PROJECT_FIELDS_QUERY =
  "query($owner:String!,$number:Int!,$phaseField:String!){" +
  "organization(login:$owner){projectV2(number:$number){id " +
  "intentPhase:field(name:$phaseField){" +
  "... on ProjectV2SingleSelectField{id name options{id name}}} " +
  `workflowStatus:field(name:"${MIRROR_PROJECT_FIELD_CONTRACT.auxiliaryStatus.field}"){` +
  "... on ProjectV2SingleSelectField{id name options{id name}}}" +
  "}}}";

export const ADD_PROJECT_ITEM_MUTATION =
  "mutation($projectId:ID!,$contentId:ID!){" +
  "addProjectV2ItemById(input:{projectId:$projectId,contentId:$contentId})" +
  "{item{id}}}";

export const UPDATE_PROJECT_ITEM_FIELD_MUTATION =
  "mutation($projectId:ID!,$itemId:ID!,$fieldId:ID!,$optionId:String!){" +
  "updateProjectV2ItemFieldValue(input:{projectId:$projectId,itemId:$itemId," +
  "fieldId:$fieldId,value:{singleSelectOptionId:$optionId}})" +
  "{projectV2Item{id}}}";

export function graphqlArgv(
  query: string,
  variables: Readonly<Record<string, string | number>>,
): readonly string[] {
  const args: string[] = [
    "api",
    "graphql",
    "--include",
    "-f",
    `query=${query}`,
  ];
  for (const key of Object.keys(variables)) {
    const value = variables[key];
    args.push(
      typeof value === "number" ? "-F" : "-f",
      `${key}=${String(value)}`,
    );
  }
  return args;
}

export function listProjectItemsArgv(issue: MirrorIssueRef): readonly string[] {
  return graphqlArgv(LIST_PROJECT_ITEMS_QUERY, {
    owner: issue.repository.owner,
    name: issue.repository.name,
    number: issue.number,
    first: PROJECT_ITEMS_PER_PAGE,
  });
}

export function resolveProjectFieldsArgv(
  project: MirrorProjectRef,
  phaseField: string,
): readonly string[] {
  return graphqlArgv(RESOLVE_PROJECT_FIELDS_QUERY, {
    owner: project.owner,
    number: project.number,
    phaseField,
  });
}

export function addProjectItemArgv(
  projectId: string,
  issueNodeId: string,
): readonly string[] {
  return graphqlArgv(ADD_PROJECT_ITEM_MUTATION, {
    projectId,
    contentId: issueNodeId,
  });
}

export function updateProjectItemSingleSelectFieldArgv(
  projectId: string,
  itemId: string,
  fieldId: string,
  optionId: string,
): readonly string[] {
  return graphqlArgv(UPDATE_PROJECT_ITEM_FIELD_MUTATION, {
    projectId,
    itemId,
    fieldId,
    optionId,
  });
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function nonEmptyString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function parseProjectItemSingleSelectValues(
  value: unknown,
): Record<string, string> | null {
  const connection = asRecord(value);
  if (connection === null || !Array.isArray(connection.nodes)) return null;
  const valuesByFieldId: Record<string, string> = {};
  for (const rawValue of connection.nodes) {
    const record = asRecord(rawValue);
    if (record === null) return null;
    const typename = nonEmptyString(record.__typename);
    if (typename === null) return null;
    if (typename !== "ProjectV2ItemFieldSingleSelectValue") continue;
    const name = nonEmptyString(record.name);
    const field = asRecord(record.field);
    const fieldId = field === null ? null : nonEmptyString(field.id);
    if (name === null || fieldId === null) return null;
    valuesByFieldId[fieldId] = name;
  }
  return valuesByFieldId;
}

function parseProjectItemNode(node: unknown): MirrorProjectItem | null {
  const record = asRecord(node);
  if (record === null) return null;
  const itemId = nonEmptyString(record.id);
  const project = asRecord(record.project);
  if (itemId === null || project === null) return null;
  const projectId = nonEmptyString(project.id);
  const owner = asRecord(project.owner);
  const projectNumber = project.number;
  if (projectId === null || owner === null) return null;
  if (
    typeof projectNumber !== "number" ||
    !Number.isSafeInteger(projectNumber)
  ) {
    return null;
  }
  const projectOwner = nonEmptyString(owner.login);
  if (projectOwner === null) return null;
  const singleSelectValuesByFieldId = parseProjectItemSingleSelectValues(
    record.fieldValues,
  );
  if (singleSelectValuesByFieldId === null) return null;
  return {
    projectId,
    projectNumber,
    projectOwner,
    itemId,
    singleSelectValuesByFieldId,
  };
}

export function parseProjectItemsView(
  data: Record<string, unknown>,
): MirrorProjectItemsView | null {
  const repository = asRecord(data.repository);
  const issue = repository === null ? null : asRecord(repository.issue);
  if (issue === null) return null;
  const issueNodeId = nonEmptyString(issue.id);
  const projectItems = asRecord(issue.projectItems);
  if (issueNodeId === null || projectItems === null) return null;
  const nodes = projectItems.nodes;
  if (!Array.isArray(nodes)) return null;
  const items: MirrorProjectItem[] = [];
  for (const node of nodes) {
    const item = parseProjectItemNode(node);
    if (item === null) return null;
    items.push(item);
  }
  return { issueNodeId, items };
}

function parseSingleSelectField(
  value: unknown,
): MirrorProjectSingleSelectField | null {
  const field = asRecord(value);
  if (field === null) return null;
  const fieldId = nonEmptyString(field.id);
  const fieldName = nonEmptyString(field.name);
  if (fieldId === null || fieldName === null || !Array.isArray(field.options)) {
    return null;
  }
  const options: { id: string; name: string }[] = [];
  for (const raw of field.options) {
    const option = asRecord(raw);
    const id = option === null ? null : nonEmptyString(option.id);
    const name = option === null ? null : nonEmptyString(option.name);
    if (id === null || name === null) return null;
    options.push({ id, name });
  }
  return { fieldId, fieldName, options };
}

export function parseProjectFields(
  data: Record<string, unknown>,
): MirrorResolvedProjectFields | null {
  const organization = asRecord(data.organization);
  const project =
    organization === null ? null : asRecord(organization.projectV2);
  if (project === null) return null;
  const projectId = nonEmptyString(project.id);
  const lifecycle = parseSingleSelectField(project.intentPhase);
  if (projectId === null || lifecycle === null) return null;
  const auxiliaryStatus =
    project.workflowStatus === null
      ? null
      : parseSingleSelectField(project.workflowStatus);
  return { projectId, lifecycle, auxiliaryStatus };
}

function parseAddedItemId(data: Record<string, unknown>): string | null {
  const added = asRecord(data.addProjectV2ItemById);
  const item = added === null ? null : asRecord(added.item);
  return item === null ? null : nonEmptyString(item.id);
}

function parseUpdatedItemId(data: Record<string, unknown>): string | null {
  const updated = asRecord(data.updateProjectV2ItemFieldValue);
  const item = updated === null ? null : asRecord(updated.projectV2Item);
  return item === null ? null : nonEmptyString(item.id);
}

function requireValidProjectPermit(
  permit: MirrorProjectMutationPermit,
  mutation: "add-project-item" | "update-project-item-field",
): void {
  if (!validateMirrorProjectMutationPermit(permit, { mutation })) {
    throw new Error(
      "mirror gateway: rejected Project mutation permit (forged or mismatched binding)",
    );
  }
}

function ok<T>(value: T): GatewayOutcome<T> {
  return { kind: "ok", value };
}

export function createMirrorProjectGatewayMethods(
  runtime: MirrorProjectGraphqlRuntime,
): MirrorProjectGatewayMethods {
  return {
    async listProjectItems(issue) {
      const run = await runtime.run(listProjectItemsArgv(issue), "read-only");
      if (run.kind === "failure") return run;
      const view = parseProjectItemsView(run.value);
      return view === null ? runtime.invalidResponse("read-only") : ok(view);
    },

    async resolveProjectFields(project, phaseField) {
      const run = await runtime.run(
        resolveProjectFieldsArgv(project, phaseField),
        "read-only",
      );
      if (run.kind === "failure") return run;
      const fields = parseProjectFields(run.value);
      return fields === null
        ? runtime.invalidResponse("read-only")
        : ok(fields);
    },

    async addProjectItem(permit, projectId, issueNodeId) {
      requireValidProjectPermit(permit, "add-project-item");
      const run = await runtime.run(
        addProjectItemArgv(projectId, issueNodeId),
        "mutation",
      );
      if (run.kind === "failure") return run;
      const itemId = parseAddedItemId(run.value);
      return itemId === null
        ? runtime.invalidResponse("mutation")
        : ok({ itemId });
    },

    async updateProjectItemSingleSelectField(
      permit,
      projectId,
      itemId,
      fieldId,
      optionId,
    ) {
      requireValidProjectPermit(permit, "update-project-item-field");
      const run = await runtime.run(
        updateProjectItemSingleSelectFieldArgv(
          projectId,
          itemId,
          fieldId,
          optionId,
        ),
        "mutation",
      );
      if (run.kind === "failure") return run;
      return parseUpdatedItemId(run.value) === null
        ? runtime.invalidResponse("mutation")
        : ok<void>(undefined);
    },
  };
}
