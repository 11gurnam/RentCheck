import { Introduction } from "@/features/introduction/introduction";
import { operationMode } from "@/features/operations/data";

export default async function HomePage() {
  return <Introduction samples={(await operationMode()).allows_demo_data !== false} />;
}
