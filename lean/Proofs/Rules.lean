import Claims

theorem externalWriteFinding_of_flag_or_evidence (c : Candidate) (ev : List Evidence)
    (h : c.externalWriteWithoutRollback = true ∨ ∃ e ∈ ev, e.sideEffect = SideEffect.externalWrite) :
    externalWriteFinding c ev = true := by
  unfold externalWriteFinding
  rcases h with hflag | ⟨e, he, hside⟩
  · simp [hflag]
  · simp only [Bool.or_eq_true, List.any_eq_true, decide_eq_true_eq]
    exact Or.inr ⟨e, he, hside⟩

theorem disposition_of_hardFailure (x : Context) (c : Candidate) (ev : List Evidence)
    (h : hardFailure x c ev = true) : disposition x c ev = Disposition.suppress := by
  unfold disposition
  simp [h]

theorem external_write_suppresses : Claim.external_write_suppresses := by
  intro x c ev h
  apply disposition_of_hardFailure
  unfold hardFailure
  simp [externalWriteFinding_of_flag_or_evidence c ev h]

theorem hard_failure_never_promotes : Claim.hard_failure_never_promotes := by
  intro x c ev h
  rw [disposition_of_hardFailure x c ev h]
  decide

theorem activation_requires_promote : Claim.activation_requires_promote := by
  intro x c ev h
  unfold activationEligible at h
  simp only [Bool.and_eq_true, decide_eq_true_eq] at h
  exact h.1.1.1.1

theorem ready_and_clean_promotes : Claim.ready_and_clean_promotes := by
  intro x c ev hclean hcorr hobj hrep
  unfold disposition
  simp [hclean, hcorr, hobj, hrep]
