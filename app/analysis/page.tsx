import { AnalysisRunner } from "@/components/analysis/AnalysisRunner";

export default function AnalysisPage() {
  return (
    <div className="space-y-6">
      <h1 className="ns-title text-ns-ink">Analysis</h1>
      <AnalysisRunner />
    </div>
  );
}
