import { createFileRoute } from "@tanstack/react-router";
import { WizardNovaCompeticao } from "@/components/admin/wizard-nova-competicao";

export const Route = createFileRoute("/app/admin/nova-competicao")({
  head: () => ({
    meta: [
      { title: "Nova competição — Admin | Bolão dos Perebas" },
      { name: "description", content: "Assistente administrativo para configurar e criar uma nova competição do Bolão dos Perebas." },
      { property: "og:title", content: "Nova competição — Admin | Bolão dos Perebas" },
      { property: "og:description", content: "Configure identidade, financeiro, pontuação e papéis de uma nova competição." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: WizardNovaCompeticao,
});
