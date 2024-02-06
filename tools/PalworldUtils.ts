import type { Data } from "../types/data"
import type { Config } from "../types/config";

interface ConfigItemValue {
  servers: Record<string, Config.Server>
  report?: Config.TargetConfig["report"]
}
type ConfigItem = Record<string, ConfigItemValue>
export class PalworldUtils {
  public static parseGroupsAndUsersConfig(groupConfig: ConfigItem, userConfig: ConfigItem, globalReportConfig: Config.MessageReportConfig): Config.MessageSendingConfig {
    const config: Config.MessageSendingConfig = {
      groups: {},
      users: {}
    }

    for (const groupId in groupConfig) {
      if (Object.prototype.hasOwnProperty.call(groupConfig, groupId)) {
        config.groups[parseInt(groupId)] = PalworldUtils.parseConfigItem(groupConfig[groupId], globalReportConfig)
      }
    }
    for (const groupId in userConfig) {
      if (Object.prototype.hasOwnProperty.call(userConfig, groupId)) {
        config.users[parseInt(groupId)] = PalworldUtils.parseConfigItem(userConfig[groupId], globalReportConfig)
      }
    }

    return config
  }
  private static parseConfigItem(item: ConfigItemValue, globalReportConfig: Config.MessageReportConfig): Config.TargetConfig {
    return {
      servers: item.servers,
      report: item.report ?? globalReportConfig
    }
  }

  public static isTheSameReportConfig(a: Partial<Config.MessageReportConfig> & Record<string, boolean>, b: Partial<Config.MessageReportConfig> & Record<string, boolean>): boolean {
    for (const k in a) {
      if (Object.prototype.hasOwnProperty.call(a, k)) {
        if (a[k] != b[k]) {
          return false
        }
      }
    }
    return true
  }

  public static toConfig(groupConfig: Config.MessageSendingConfig["groups"], userConfig: Config.MessageSendingConfig["users"], globalReportConfig: Config.MessageReportConfig): { groups: ConfigItem, users: ConfigItem } {
    const groups: ConfigItem = {}
    const users: ConfigItem = {}

    for (const groupId in groupConfig) {
      if (Object.prototype.hasOwnProperty.call(groupConfig, groupId)) {
        const config = groupConfig[groupId];

        if (Object.keys(config.servers).length == 0) {
          continue
        }
        
        const item: ConfigItemValue = { servers: config.servers }
        if (!PalworldUtils.isTheSameReportConfig(config.report, <Config.MessageReportConfig & Record<string, boolean>>globalReportConfig)) {
          item.report = config.report
        }
        groups[groupId.toString()] = item
      }
    }
    for (const userId in userConfig) {
      if (Object.prototype.hasOwnProperty.call(userConfig, userId)) {
        const config = userConfig[userId];

        if (Object.keys(config.servers).length == 0) {
          continue
        }
        
        const item: ConfigItemValue = { servers: config.servers }
        if (Object.keys(config.report).length != 0 && !PalworldUtils.isTheSameReportConfig(config.report, <Config.MessageReportConfig & Record<string, boolean>>globalReportConfig)) {
          item.report = config.report
        }
        users[userId.toString()] = item
      }
    }

    return { groups, users }
  }

  public static parsePlayerInfos(playerInfos: string): Data.PlayerInfo[] {
    const playerList: Data.PlayerInfo[] = []
    const playerListStr: string[] = playerInfos.split("\n")
    playerListStr.shift()
    playerListStr.forEach(playerInfo => {
      if (!playerInfo) {
        return
      }

      const info: string[] = playerInfo.split(",")
      playerList.push({
        name: info[0],
        uid: info[1],
        steamId: info[2]
      })
    })
    return playerList
  }
}