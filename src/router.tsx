import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { toast } from "sonner";
import { routeTree } from "./routeTree.gen";
import { translatePgError } from "@/lib/error-messages";

export const getRouter = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      mutations: {
        onError: (err: any) => {
          toast.error(translatePgError(err));
        },
      },
    },
  });

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
  });

  return router;
};
