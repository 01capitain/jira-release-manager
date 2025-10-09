"use client";

const showAlert = (message: string) => {
  if (typeof window === "undefined") return;
const showAlert = (message: string) => {
  if (typeof window === "undefined") return;
  window.alert(message);
};
};

export const toast = {
  error(message: string) {
    showAlert(message);
  },
};
