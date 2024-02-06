export namespace Config {
  type ServerIp = string
  interface ServerItem {
    rcon: boolean
    rconPort: number
    adminPassword: string
    admins: number[]
  }
  type Server = Partial<ServerItem>
  interface MessageReportConfig {
    playerJoining: boolean
    playerLeaving: boolean
    memoryThresholdAchieving: boolean
    rconStatus: boolean
    saveBackupSaving: boolean
    serverStarting: boolean
    onlinePlayers: boolean
    unknownMessage: boolean
  }
  interface TargetConfig {
    servers: Record<string, Server>
    report: Partial<MessageReportConfig>
  }
  interface MessageSendingConfig {
    groups: Record<number, TargetConfig>
    users: Record<number, TargetConfig>
  }

  type ServerAliasConfig = Record<string, string>
}