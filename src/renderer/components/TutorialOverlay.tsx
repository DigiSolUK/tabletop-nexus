import { useEffect, useState } from 'react';
import { useAppState } from '../state/app-state';

export const TutorialOverlay = () => {
  const { activeTutorial, activeTutorialStep, previousTutorialStep, nextTutorialStep, closeTutorial } = useAppState();
  const [disableFuture, setDisableFuture] = useState(false);

  useEffect(() => {
    const targetId = activeTutorial?.steps[activeTutorialStep]?.targetId;
    if (!targetId) {
      return;
    }
    document.getElementById(targetId)?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }, [activeTutorial, activeTutorialStep]);

  if (!activeTutorial) {
    return null;
  }

  const step = activeTutorial.steps[activeTutorialStep];
  const lastStep = activeTutorialStep === activeTutorial.steps.length - 1;

  return (
    <div className="tutorial-overlay" role="dialog" aria-modal="true">
      <div className="tutorial-card">
        <span className="eyebrow">Tutorial</span>
        <h3>{step.title}</h3>
        <p>{step.body}</p>
        <p className="tutorial-counter">
          Step {activeTutorialStep + 1} / {activeTutorial.steps.length}
        </p>
        {activeTutorial.allowDisable ? (
          <label className="toggle-row">
            <input type="checkbox" checked={disableFuture} onChange={(event) => setDisableFuture(event.target.checked)} />
            Don&apos;t show tutorials automatically
          </label>
        ) : null}
        <div className="button-row">
          <button type="button" className="ghost-button" onClick={previousTutorialStep} disabled={activeTutorialStep === 0}>
            Back
          </button>
          {!lastStep ? (
            <button type="button" className="primary-button" onClick={nextTutorialStep}>
              Next
            </button>
          ) : (
            <button type="button" className="primary-button" onClick={() => closeTutorial(disableFuture)}>
              Finish
            </button>
          )}
          <button type="button" className="ghost-button" onClick={() => closeTutorial(disableFuture)}>
            Skip
          </button>
        </div>
      </div>
    </div>
  );
};
