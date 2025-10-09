"use client";

const showAlert = (message: string) => {
  if (typeof window === "undefined") return;
  if (typeof window.alert === "function") {
    window.alert(message);
  }
};

export const toast = {
  error(message: string) {
    showAlert(message);
  },
};
