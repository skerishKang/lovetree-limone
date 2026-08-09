import type { DesignScenarioId } from "./design-lab";
import {
  EXPERIENCE_CAPABILITIES as BASE_EXPERIENCE_CAPABILITIES,
  type ExperienceCapability,
  type ExperienceCapabilitySourceProject,
} from "./experience-capabilities";
import {
  AUDITED_EXPERIENCE_CAPABILITIES_BATCH1,
  type AuditedExperienceCapability,
  type AuditedExperienceCapabilitySourceProject,
} from "./experience-capability-audit-batch1";
import {
  AUDITED_EXPERIENCE_CAPABILITIES_BATCH2,
  type AuditedExperienceCapabilityBatch2,
  type AuditedExperienceCapabilityBatch2SourceProject,
} from "./experience-capability-audit-batch2";
import {
  AUDITED_EXPERIENCE_CAPABILITIES_BATCH3,
  type AuditedExperienceCapabilityBatch3,
  type AuditedExperienceCapabilityBatch3SourceProject,
} from "./experience-capability-audit-batch3";

export type ExperienceCapabilityRegistryItem =
  | ExperienceCapability
  | AuditedExperienceCapability
  | AuditedExperienceCapabilityBatch2
  | AuditedExperienceCapabilityBatch3;
export type ExperienceCapabilityRegistrySourceProject =
  | ExperienceCapabilitySourceProject
  | AuditedExperienceCapabilitySourceProject
  | AuditedExperienceCapabilityBatch2SourceProject
  | AuditedExperienceCapabilityBatch3SourceProject;

export const EXPERIENCE_CAPABILITY_REGISTRY: readonly ExperienceCapabilityRegistryItem[] = [
  ...BASE_EXPERIENCE_CAPABILITIES,
  ...AUDITED_EXPERIENCE_CAPABILITIES_BATCH1,
  ...AUDITED_EXPERIENCE_CAPABILITIES_BATCH2,
  ...AUDITED_EXPERIENCE_CAPABILITIES_BATCH3,
];

export function validateExperienceCapabilityRegistry(
  capabilities: readonly ExperienceCapabilityRegistryItem[] = EXPERIENCE_CAPABILITY_REGISTRY,
): readonly string[] {
  const problems: string[] = [];
  const ids = new Set<string>();

  for (const capability of capabilities) {
    if (!capability.id.trim()) problems.push("capability id must not be empty");
    if (ids.has(capability.id)) problems.push(`duplicate capability id: ${capability.id}`);
    ids.add(capability.id);

    if (!capability.label.trim()) problems.push(`capability has no label: ${capability.id}`);
    if (capability.applicableScenarios.length === 0) problems.push(`capability has no scenario: ${capability.id}`);
    if (capability.dataNeeds.length === 0) problems.push(`capability has no data contract: ${capability.id}`);
    if (!capability.integrationRule.trim()) problems.push(`capability has no integration rule: ${capability.id}`);
    if (capability.evidence.length === 0) problems.push(`capability has no evidence: ${capability.id}`);

    for (const evidence of capability.evidence) {
      if (!evidence.project.trim()) problems.push(`capability evidence has no project: ${capability.id}`);
      if (!evidence.artifact.trim()) problems.push(`capability evidence has no artifact: ${capability.id}`);
      if (evidence.observed.length === 0) problems.push(`capability evidence has no observations: ${capability.id}`);
    }
  }

  return problems;
}

export function registryCapabilitiesForScenario(
  scenarioId: DesignScenarioId,
  capabilities: readonly ExperienceCapabilityRegistryItem[] = EXPERIENCE_CAPABILITY_REGISTRY,
): readonly ExperienceCapabilityRegistryItem[] {
  return capabilities.filter((capability) => capability.applicableScenarios.includes(scenarioId));
}
