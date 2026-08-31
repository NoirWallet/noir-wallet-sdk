export interface Caip25ScopeRequest {
  chains?: readonly string[]
  accounts?: readonly string[]
  methods: readonly string[]
  notifications: readonly string[]
}

export interface Caip25CreateSessionRequest {
  scopes: Readonly<Record<string, Caip25ScopeRequest>>
  properties?: Readonly<Record<string, unknown>>
}

export interface Caip25SessionScope {
  accounts: readonly string[]
  methods: readonly string[]
  notifications: readonly string[]
  capabilities?: Readonly<Record<string, unknown>>
}

export interface Caip25Session {
  scopes: Readonly<Record<string, Caip25SessionScope>>
  properties?: Readonly<Record<string, unknown>>
}

export interface Caip27InvokeMethodRequest {
  scope: string
  request: {
    method: string
    params?: readonly unknown[] | Readonly<Record<string, unknown>>
  }
}

export interface MultichainRequestArguments {
  method:
    | 'wallet_createSession'
    | 'wallet_getSession'
    | 'wallet_revokeSession'
    | 'wallet_invokeMethod'
  params?: readonly unknown[] | Readonly<Record<string, unknown>>
}

export type MultichainProviderListener = (session: Caip25Session) => void

export interface MultichainProvider {
  request<T = unknown>(args: MultichainRequestArguments): Promise<T>
  createSession(params: Caip25CreateSessionRequest): Promise<Caip25Session>
  getSession(): Promise<Caip25Session | null>
  invokeMethod<T = unknown>(params: Caip27InvokeMethodRequest): Promise<T>
  revokeSession(): Promise<null>
  on(event: 'wallet_sessionChanged', handler: MultichainProviderListener): MultichainProvider
  removeListener(
    event: 'wallet_sessionChanged',
    handler: MultichainProviderListener
  ): MultichainProvider
}
