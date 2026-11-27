import { createRoot } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import { AuthProvider } from "../../src/shared/components/layout/AuthProvider";
import { ToastProvider } from "../../src/shared/components/ui/Toast";
import { WorkoutDialog } from "../../src/features/training/components/WorkoutDialogs";
import { DemoMagicToolkit } from "../../src/shared/components/DemoMagicToolkit";
import type { TrainingPlan } from "../../src/features/training/types";
import "../../src/shared/i18n";
import "../../src/shared/styles/tokens.css";
import "../../src/shared/styles/global.css";
const plan: TrainingPlan = {
  id: "plan-test",
  planCode: "GA-000001",
  name: "Chu kỳ thể lực",
  horseId: "horse-test",
  horseName: "Bạch Long Mã",
  horseCode: "HR-000001",
  startDate: "2026-11-28",
  endDate: "2026-12-10",
  status: "ACTIVE",
  phases: [],
  headTrainerName: "HLV Tuấn",
  workoutCount: 0,
  progress: { completed: 0, due: 0, overdue: 0 },
  isLockedByMedical: false,
  createdAt: "2026-11-01",
};
const toolkit = new URLSearchParams(location.search).has("toolkit");
createRoot(document.getElementById("root")!).render(
  <MemoryRouter>
    <AuthProvider>
      <ToastProvider>
        {toolkit ? (
          <>
            <button
              onClick={() =>
                window.dispatchEvent(new Event("equiflow_open_magic_toolkit"))
              }
            >
              Open ToolDemoKit
            </button>
            <DemoMagicToolkit />
          </>
        ) : (
          <WorkoutDialog
            plan={plan}
            defaultDate="2026-11-29"
            defaultType={
              new URLSearchParams(location.search).has("trial")
                ? "TRIAL"
                : new URLSearchParams(location.search).has("swim") ? "SWIM" : undefined
            }
            onClose={() => {}}
            onSaved={() => {}}
          />
        )}
      </ToastProvider>
    </AuthProvider>
  </MemoryRouter>,
);
