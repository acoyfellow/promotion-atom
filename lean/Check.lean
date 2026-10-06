import Claims
import Proofs.Rules
example : Claim.external_write_suppresses := external_write_suppresses
example : Claim.hard_failure_never_promotes := hard_failure_never_promotes
example : Claim.activation_requires_promote := activation_requires_promote
example : Claim.ready_and_clean_promotes := ready_and_clean_promotes
#print axioms external_write_suppresses
#print axioms hard_failure_never_promotes
#print axioms activation_requires_promote
#print axioms ready_and_clean_promotes
