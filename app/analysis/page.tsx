import { AnalysisRunner } from "@/components/analysis/AnalysisRunner";
import { FxSectionSwitch } from "@/components/fx/FxBits";

export default function AnalysisPage() {
  return (
    <div className="space-y-6">
      <FxSectionSwitch />
      <h1 className="ns-title text-ns-ink">Analysis</h1>
      <AnalysisRunner />
    </div>
  );
}
