/* tslint:disable */
/* eslint-disable */

export function operator_manifest_demo_fixtures_json(): string;

export function operator_manifest_schema_json(): string;

export function operator_manifest_tool_version_json(): string;

/**
 * input = the manifest JSON (object) or `{ "manifest": <object> }`; MALFORMED handled inside.
 */
export function operator_manifest_validate_json(input: string): string;
