import { auth as nextAuth } from "@/auth";

export const auth = {
  api: {
    async getSession() {
      return nextAuth();
    },
  },
};
