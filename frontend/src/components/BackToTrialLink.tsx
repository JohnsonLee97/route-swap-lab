export function BackToTrialLink({ trialId }: { trialId: number }) {
  return (
    <a className="route-back-link" href={`/?trial=${trialId}`}>
      <span aria-hidden="true">←</span> Back to trial
    </a>
  );
}
