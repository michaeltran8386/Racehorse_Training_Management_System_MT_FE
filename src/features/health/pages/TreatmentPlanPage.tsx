import { useTranslation as useScreenTranslation } from "react-i18next";
import { Navigate, useParams } from "react-router-dom";

export default function TreatmentPlanPage() {
  useScreenTranslation();
  const { id } = useParams();
  if (id) {
    return <Navigate to={`/medical/records/${id}`} replace />;
  }
  return <Navigate to="/medical/records" replace />;
}
