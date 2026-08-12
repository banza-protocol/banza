-- Final transversal sweep: internal project-milestone codes are not protocol
-- state. The public envelope stopped exposing them (PR #344); this drops the
-- dead seed key from existing deployments. Idempotent.
DELETE FROM protocol_state WHERE k = 'milestones';
