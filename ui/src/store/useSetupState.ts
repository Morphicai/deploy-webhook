import { create } from 'zustand'

interface SetupState {
  needsSetup: boolean
  setNeedsSetup: (value: boolean) => void
}

export const useSetupState = create<SetupState>((set) => ({
  needsSetup: false,
  setNeedsSetup: (value) => set({ needsSetup: value }),
}))
