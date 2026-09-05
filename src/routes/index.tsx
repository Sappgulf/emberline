import { createFileRoute } from "@tanstack/react-router";
import { Emberline } from "@/components/emberline";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  return <Emberline />;
}
