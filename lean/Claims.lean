inductive SideEffect where
  | read
  | boundedWrite
  | externalWrite
  | unknown
  deriving DecidableEq

structure Evidence where
  sideEffect : SideEffect

structure Candidate where
  externalWriteWithoutRollback : Bool

structure Context where
  otherHardFailure : Bool
  corroborated : Bool
  objectiveReady : Bool
  replayReady : Bool
  autoEnable : Bool
  portable : Bool
  autoCaps : Bool
  highAuthority : Bool

inductive Disposition where
  | suppress
  | review
  | promote
  deriving DecidableEq

def externalWriteFinding (c : Candidate) (ev : List Evidence) : Bool :=
  c.externalWriteWithoutRollback || ev.any (fun e => decide (e.sideEffect = SideEffect.externalWrite))

def hardFailure (x : Context) (c : Candidate) (ev : List Evidence) : Bool :=
  x.otherHardFailure || externalWriteFinding c ev

def disposition (x : Context) (c : Candidate) (ev : List Evidence) : Disposition :=
  if hardFailure x c ev then Disposition.suppress
  else if x.corroborated && x.objectiveReady && x.replayReady then Disposition.promote
  else Disposition.review

def activationEligible (x : Context) (c : Candidate) (ev : List Evidence) : Bool :=
  decide (disposition x c ev = Disposition.promote) && x.autoEnable && x.portable && x.autoCaps && !x.highAuthority

def Claim.external_write_suppresses : Prop :=
  ∀ (x : Context) (c : Candidate) (ev : List Evidence),
    (c.externalWriteWithoutRollback = true ∨ ∃ e ∈ ev, e.sideEffect = SideEffect.externalWrite) →
    disposition x c ev = Disposition.suppress

def Claim.hard_failure_never_promotes : Prop :=
  ∀ (x : Context) (c : Candidate) (ev : List Evidence),
    hardFailure x c ev = true → disposition x c ev ≠ Disposition.promote

def Claim.activation_requires_promote : Prop :=
  ∀ (x : Context) (c : Candidate) (ev : List Evidence),
    activationEligible x c ev = true → disposition x c ev = Disposition.promote

def Claim.ready_and_clean_promotes : Prop :=
  ∀ (x : Context) (c : Candidate) (ev : List Evidence),
    hardFailure x c ev = false → x.corroborated = true → x.objectiveReady = true → x.replayReady = true →
    disposition x c ev = Disposition.promote
