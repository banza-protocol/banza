# Negative-test rosters (executed engine sources)

## SSRF/fetcher (banza-artifact-fetcher/tests/fetch_pipeline.rs)
- drop
- spawn_mock
- loopback_resolver
- req
- happy_path_fetch_succeeds_and_hashes_body
- strict_policy_blocks_the_real_loopback_server
- strict_policy_blocks_loopback_ip_for_https_target
- strict_req
- dns_rebinding_private_ip_blocked
- dns_rebinding_mixed_set_blocked_if_any_ip_is_private
- metadata_ip_blocked_via_resolver
- no_addresses_blocked
- userinfo_url_blocked_end_to_end
- host_mismatch_blocked_end_to_end
- port_not_allowed_blocked_end_to_end
- redirect_blocked_and_never_followed
- redirect_loop_never_loops
- oversized_streamed_body_blocked
- oversized_declared_length_blocked_before_streaming
- wrong_content_type_blocked
- content_encoding_bomb_blocked
- timeout_blocked
- http_status_not_ok_blocked
- tls_invalid_blocked

## Trust Model A (banza-trust/tests/signing_chain.rs)
- root
- revk
- meta
- active_set
- manifest_signed_by
- two_distinct_root_authorities_sign_the_key_manifest
- a_key_outside_the_active_set_cannot_authorise_the_key_manifest
- one_root_authority_cannot_authorise_the_key_manifest_alone
- revocation_domain_key_signs_the_brl
- root_signed_brl_is_rejected
- cross_domain_brl_signature_is_rejected

## Operator Zero e2e (operator-zero-e2e-root/tests/e2e_root.rs)
- dir
- load
- all_artifacts_exist
- public_key_exists_and_is_valid_ed25519
- signed_manifest_verifies
- tampered_payload_fails
- signed_evidence_bundle_verifies
- revocation_blocks_trust_fail_closed
- demo_root_is_not_the_protocol_trust_root
- no_private_key_material_in_any_artifact
- demo_boundary_on_every_json_artifact
- verification_trace_is_complete
