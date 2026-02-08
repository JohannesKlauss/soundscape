type EngineState = {
  activeMood?: number
}

const _engineState = $state<EngineState>({})

export const engineState: Readonly<EngineState> = _engineState