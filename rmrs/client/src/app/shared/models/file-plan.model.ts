/**
 * Disposal actions that can be applied when retention expires.
 */
export type DisposalAction = 'Destroy' | 'Archive' | 'Review';

/**
 * Represents a retention rule defining how long records must be kept.
 */
export interface RetentionRule {
  id: number;
  ruleName: string;
  retentionYears: number;
  retentionMonths: number;
  disposalAction: DisposalAction;
  description: string | null;
  isActive: boolean;
  createdAt: string;
}

/**
 * Represents a single entry in the hierarchical file plan.
 */
export interface FilePlanEntry {
  id: number;
  parentId: number | null;
  classificationCode: string;
  title: string;
  description: string | null;
  level: number;
  retentionRuleId: number;
  disposalAuthorityRef: string;
  defaultClassificationLevel: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  deactivatedAt: string | null;
}

/**
 * Represents the full file plan tree structure returned from the API.
 */
export interface FilePlanTree {
  entries: FilePlanTreeNode[];
}

/**
 * A file plan entry with its children for tree rendering.
 */
export interface FilePlanTreeNode extends FilePlanEntry {
  children: FilePlanTreeNode[];
}
