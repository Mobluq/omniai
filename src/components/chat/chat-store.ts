"use client";

import { create } from "zustand";

export type RoutingMode = "manual" | "suggest" | "auto";

export type ChatModelSelection = {
  provider: string;
  modelId: string;
};

type ChatState = {
  routingMode: RoutingMode;
  selectedModel: ChatModelSelection;
  setRoutingMode: (routingMode: RoutingMode) => void;
  setSelectedModel: (selectedModel: ChatModelSelection) => void;
};

export const useChatStore = create<ChatState>((set) => ({
  routingMode: "suggest",
  selectedModel: {
    provider: "openai",
    modelId: "openai-chat-primary",
  },
  setRoutingMode: (routingMode) => set({ routingMode }),
  setSelectedModel: (selectedModel) => set({ selectedModel }),
}));
