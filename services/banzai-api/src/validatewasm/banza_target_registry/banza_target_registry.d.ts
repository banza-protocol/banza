/* tslint:disable */
/* eslint-disable */

export function registry_catalogue_json(): string;

export function registry_certification_readiness_json(step_verdicts_json: string, profile: string): string;

/**
 * The profile→step applicability map (REQUIRED / OPTIONAL / NOT_APPLICABLE) — Rust-decided.
 */
export function registry_profile_applicability_json(profile: string): string;

export function registry_resolve_json(operator_id: string, implementation_id: string): string;

export function registry_step_status_json(step: string, engine_output_json: string): string;

export function registry_tool_version_json(): string;

export function registry_validate_discovery_json(resolved_target_json: string, discovery_json: string): string;
