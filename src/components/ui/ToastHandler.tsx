"use client";

import { useEffect } from "react";
import { toast } from "sonner";

export function ToastHandler({ message, type = "error" }: { message?: string, type?: "success" | "error" }) {
  useEffect(() => {
    if (message) {
      if (type === "error") {
        toast.error(message);
      } else {
        toast.success(message);
      }
    }
  }, [message, type]);

  return null;
}
