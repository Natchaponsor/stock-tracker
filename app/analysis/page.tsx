import { AnalysisRunner } from "@/components/analysis/AnalysisRunner";

export default function AnalysisPage() {
  return (
    <div className="space-y-6">
      <h1 className="font-serif text-2xl font-medium text-fg">Analysis</h1>
      <AnalysisRunner />
    </div>
  );
}
