import { EventEnum, ListenerEnum } from "../../types/enums";
import { launcher } from "../../app";
import config from "../../config";
import { Plugin } from "../../processors/Plugin";
import { WebHookServer } from "./WebHookServer";
import { PalworldUtils } from "./tools/PalworldUtils";
import type { Config } from "./types/config";
import { MessageEnums } from "./types/enums";
import { ListenerUtils } from "../../tools/ListenerUtils";
import { isIP } from "node:net";
import type { MessageEvent } from "src/events/MessageEvent";
import { RconClient } from "./RconClient";
import { Utils } from "../../tools/Utils";

export default class PalworldServerStatus extends Plugin {
  public name: string = "幻兽帕鲁服务器状态";
  public description: string = "将接收来自“KirosHan/Palworld-server-protector-DotNet”程序的WebHook信息，解析后进行提示。\n包含部分控制命令，且可发送RCON。";
  public instruction: string = "命令：palHelp、palAddServer、palRemoveServer、palServers、palStatus、palRcon";
  public version: string = "1.0.0";

  private reportTargets: Config.MessageSendingConfig
  private webHookServer: WebHookServer = new WebHookServer()
  private rconClient: RconClient = new RconClient()
  
  constructor() {
    super();
    this.logger.setPrefix("幻兽帕鲁服务器")

    if (!config.getPluginData(this)) {
      config.setPluginData(this, "webHookPort", 3011)
      config.setPluginData(this, "webHookHost", "0.0.0.0")

      config.setPluginData(this, "palworldServerIpPerGroup", {})
      config.setPluginData(this, "palworldServerIpPerUser", {})
      config.setPluginData(this, "palworldServerAliases", {})
      config.setPluginData(this, "globalReportMessage", <Config.MessageReportConfig>{
        playerJoining: false,
        playerLeaving: false,
        memoryThresholdAchieving: true,
        rconStatus: true,
        saveBackupSaving: false,
        serverStarting: true,
        onlinePlayers: false,
        unknownMessage: true
      })
    }

    this.reportTargets = PalworldUtils.parseGroupsAndUsersConfig(config.getPluginData(this, "palworldServerIpPerGroup")!, config.getPluginData(this, "palworldServerIpPerUser")!, config.getPluginData(this, "globalReportMessage"))

    this.ev.on("load", () => this.webHookServer.startServer(<number>config.getPluginData(this, "webHookPort"), config.getPluginData(this, "webHookHost"), () => this.logger.success("WebHook服务器正在监听")))
    this.ev.on("unload", complete => {
      this.logger.info("正在关闭WebHook服务器")
      this.webHookServer.stopServer(complete)
      complete()
    })

    const memoryUsagePattern = /\d{1,2}(\.\d{1,2})?%/
    this.webHookServer.ev.on("message", data => {
      const serverAliases: Config.ServerAliasConfig = config.getPluginData(this, "palworldServerAliases")
      let message: string = `服务器“${Object.hasOwn(serverAliases, data.server) ? serverAliases[data.server] + "（" + data.server + "）" : data.server}”上报信息\n`
      let type: keyof Config.MessageReportConfig
      switch (data.data.title) {
        case MessageEnums.MessageTitle.test:
          message += "测试上报"
          return

        case MessageEnums.MessageTitle.SuccessfulToStartServer:
          message += "服务器已开启"
          type = "serverStarting"
          break
        
        case MessageEnums.MessageTitle.achievedMemoryThreshold:
          message += `内存使用阈值已达到\n当前内存使用率：${memoryUsagePattern.exec(data.data.content)![0]}`
          type = "memoryThresholdAchieving"
          break

        case MessageEnums.MessageTitle.failedToExecuteRconCommand:
          message += `RCON命令执行失败`
          type = "rconStatus"
          break

        case MessageEnums.MessageTitle.failedToSaveBackup:
          message += `无法进行存档备份`
          type = "saveBackupSaving"
          break

        case MessageEnums.MessageTitle.failedToStartServer:
          message += "无法启动服务器"
          type = "serverStarting"
          break

        case MessageEnums.MessageTitle.onlinePlayerStatistics:
          message += "在线玩家统计：\n"
          const playerList = data.data.content.split("\n")
          playerList.shift()
          message += playerList.join("\n")
          type = "onlinePlayers"
          break

        case MessageEnums.MessageTitle.playerHasJoined:
          message += `玩家“${data.data.content.substring(0, data.data.content.lastIndexOf("加入了游戏"))}”加入了服务器`
          type = "playerJoining"
          break

        case MessageEnums.MessageTitle.playerHasLeft:
          message += `玩家“${data.data.content.substring(0, data.data.content.lastIndexOf("离开了游戏"))}”离开了服务器`
          type = "playerLeaving"
          break

        case MessageEnums.MessageTitle.saveBackupHasCreated:
          message += `存档已备份`
          type = "saveBackupSaving"
          break
      
        default:
          message += `标题：${data.data.title}\n内容：${data.data.content}`
          type = "unknownMessage"
          break;
      }

      const groups = this.reportTargets.groups
      for (const groupId in groups) {
        if (Object.prototype.hasOwnProperty.call(groups, groupId)) {
          const config = groups[groupId];
          
          if (Object.hasOwn(config.servers, data.server) && config.report[type]) {

            // 群聊查询的逻辑
            launcher.getConnections().forEach(conn => {
              const clients = conn.getClients()
              for (let i = 0; i < clients.length; i++) {
                const client = clients[i]
                if (Object.hasOwn(client.groups, groupId)) {
                  client.groups[groupId].sendMessage(message)
                }
              }
            })

            break
          }
        }
      }

      const users = this.reportTargets.users
      for (const userId in users) {
        if (Object.prototype.hasOwnProperty.call(users, userId)) {
          const config = users[userId];
          
          if (Object.hasOwn(config.servers, data.server) && config.report[type]) {

            // 好友查询的逻辑
            launcher.getConnections().forEach(conn => {
              const clients = conn.getClients()
              for (let i = 0; i < clients.length; i++) {
                const client = clients[i]
                if (Object.hasOwn(client.friends, userId)) {
                  client.friends[userId].sendMessage(message)
                }
              }
            })

            break
          }
        }
      }
    })

    this.onCommand("palHelp", ev => {
      ev.reply(`===MRY_Pal=== ← Palworld帮助信息：
所有命令需要添加前缀，此Bot可用命令前缀：${config.getConfig().listener.command.prompt.join("、")}
带有“*”标记的命令，意味着该命令在群聊中，只可被群主、管理员、超级用户与指定服务器管理员所执行；在私聊中，只可被超级用户与指定服务器管理员所执行
palHelp：输出帮助信息
palStatus：获取服务器的玩家信息
palServers：获取群聊或用户所添加的服务器
palAddServer：* 添加服务器上报
palRemoveServer：* 移除服务器上报
palRcon：* 通过RCON执行服务器命令
`, undefined, true)
    }, ["palworldHelp", "palworldInstruction", "帕鲁_帮助", "帕鲁_帮助信息"], 50)

    this.onCommand("palAddServer", (ev, _, args) => {
      if (args.length == 0) {
        ev.reply("需要指定服务器IP（注：无需端口）\n命令规则：palAddServer <服务器IP>[ <服务器别名>]", undefined, true)
        return
      }

      if (!isIP(args[0])) {
        ev.reply("需要提供正确的IP地址", undefined, true)
        return
      }

      if (ev.messageType == EventEnum.MessageType.group) {
        if (ListenerUtils.comparePermission(ev.client.getGroupMember(ev.groupId!, ev.userId)!.permission, ListenerEnum.Permission.admin)) {
          if (!Object.hasOwn(this.reportTargets.groups, ev.groupId!)) {
            this.reportTargets.groups[ev.groupId!] = {
              servers: {},
              report: {}
            }
          }
          if (Object.hasOwn(this.reportTargets.groups[ev.groupId!].servers, args[0])) {
            ev.reply("服务器IP已存在。不可重复添加", undefined, true)
            return
          }
          this.reportTargets.groups[ev.groupId!].servers[args[0]] = {}
          if (args[1]) {
            const serverAliases: Config.ServerAliasConfig = config.getPluginData(this, "palworldServerAliases")
            serverAliases[args[0]] = args[1]
            config.setPluginData(this, "palworldServerAliases", serverAliases)
          }
        }
        else {
          ev.reply("你没有权限，仅超级用户、群主与管理员才可以在群聊中添加群聊的服务器IP", undefined, true)
          return
        }
      }
      else if (ev.messageType == EventEnum.MessageType.private) {
        if (!Object.hasOwn(this.reportTargets.users, ev.userId!)) {
          this.reportTargets.users[ev.userId!] = {
            servers: {},
            report: {}
          }
        }
        if (Object.hasOwn(this.reportTargets.users[ev.userId!].servers, args[0])) {
          ev.reply("服务器IP已存在。不可重复添加")
          return
        }
        this.reportTargets.users[ev.userId!].servers[args[0]] = {}
      }

      ev.reply("服务器上报添加成功", undefined, true)
      const configSave = PalworldUtils.toConfig(this.reportTargets.groups, this.reportTargets.users, config.getPluginData(this, "globalReportMessage"))
      config.setPluginData(this, "palworldServerIpPerGroup", configSave.groups)
      config.setPluginData(this, "palworldServerIpPerUser", configSave.users)
    }, ["palworldAddServer", "帕鲁_添加服务器"], 50)
    this.onCommand("palRemoveServer", (ev, _, args) => {
      if (args.length == 0) {
        ev.reply("需要指定服务器IP（注：无需端口）\n命令规则：palRemoveServer <服务器IP>", undefined, true)
        return
      }

      if (ev.messageType == EventEnum.MessageType.group) {
        if (ListenerUtils.comparePermission(ev.client.getGroupMember(ev.groupId!, ev.userId)!.permission, ListenerEnum.Permission.admin)) {
          if (Object.hasOwn(this.reportTargets.groups, ev.groupId!)) {
            if (Object.hasOwn(this.reportTargets.groups[ev.groupId!].servers, args[0])) {
              delete this.reportTargets.groups[ev.groupId!].servers[args[0]]
            }
            else {
              ev.reply("没有找到本群聊已指定的服务器上报", undefined, true)
              return
            }
          }
          else {
            ev.reply("群聊没有任何已指定的服务器上报", undefined, true)
            return
          }
        }
        else {
          ev.reply("你没有权限，仅超级用户、指定管理员、群主与群聊管理员才可以在群聊中移除群聊的服务器IP", undefined, true)
          return
        }
      }
      else if (ev.messageType == EventEnum.MessageType.private) {
        if (Object.hasOwn(this.reportTargets.users, ev.userId!)) {
          if (Object.hasOwn(this.reportTargets.users[ev.userId!].servers, args[0])) {
            delete this.reportTargets.users[ev.userId!].servers[args[0]]
          }
          else {
            ev.reply("没有找到已指定的服务器上报")
            return
          }
        }
        else {
          ev.reply("没有任何已指定的服务器上报")
          return
        }
      }

      ev.reply("服务器上报移除成功", undefined, true)
      const configSave = PalworldUtils.toConfig(this.reportTargets.groups, this.reportTargets.users, config.getPluginData(this, "globalReportMessage"))
      config.setPluginData(this, "palworldServerIpPerGroup", configSave.groups)
      config.setPluginData(this, "palworldServerIpPerUser", configSave.users)
    }, ["palworldRemoveServer", "帕鲁_移除服务器", "帕鲁_删除服务器"], 50)

    this.onCommand("palServers", ev => {
      let serverConfig: Config.TargetConfig
      if (ev.messageType == EventEnum.MessageType.group) {
        serverConfig = this.reportTargets.groups[ev.groupId!]
        if (!serverConfig || Object.keys(serverConfig.servers).length == 0) {
          ev.reply("该群聊未添加任何服务器", undefined, true)
          return
        }
      }
      else if (ev.messageType == EventEnum.MessageType.private) {
        serverConfig = this.reportTargets.users[ev.userId!]
        if (!serverConfig || Object.keys(serverConfig.servers).length == 0) {
          ev.reply("未添加任何服务器")
          return
        }
      }
      else {
        return
      }

      const serverAliases: Config.ServerAliasConfig = config.getPluginData(this, "palworldServerAliases")
      let serversInfo: string = "已添加以下服务器："
      for (const ip in serverConfig.servers) {
        if (Object.prototype.hasOwnProperty.call(serverConfig.servers, ip)) {
          const server = serverConfig.servers[ip];
          serversInfo += "\n" + ip + " "
          if (Object.hasOwn(serverAliases, ip)) {
            serversInfo += "【别名：" + serverAliases[ip] + "】"
          }
          if (server.rcon) {
            serversInfo += "【允许RCON】"
          }
        }
      }
      ev.reply(serversInfo, undefined, true)
    }, ["palServer", "palworldServers", "palworldServer", "帕鲁_服务器"], 50)

    this.onCommand("palStatus", (ev, _, args) => {
      let host: string
      let serverConfig: Config.Server
      if (ev.messageType == EventEnum.MessageType.group) {
        const groupConfig: Config.TargetConfig = this.reportTargets.groups[ev.groupId!]
        const isIp = isIP(args[0])
        if (!groupConfig || Object.keys(groupConfig.servers).length == 0) {
          ev.reply("该群聊没有添加任何服务器", undefined, true)
          return
        }
        else if (Object.keys(groupConfig.servers).length > 1 && !isIp) {
          ev.reply("该群聊已经添加多个服务器，需要指定服务器IP\n命令规则：palStatus [<服务器IP>]", undefined, true)
          return
        }
        else if (isIp && !Object.hasOwn(groupConfig.servers, args[0])) {
          ev.reply("群聊未添加此服务器IP", undefined, true)
          return
        }

        host = isIp ? args[0] : Object.keys(groupConfig.servers).shift()!
        serverConfig = groupConfig.servers[host]
      }
      else if (ev.messageType == EventEnum.MessageType.private) {
        const userConfig: Config.TargetConfig = this.reportTargets.users[ev.userId!]
        const isIp = isIP(args[0])
        if (!userConfig || Object.keys(userConfig.servers).length == 0) {
          ev.reply("没有添加任何服务器", undefined, true)
          return
        }
        else if (Object.keys(userConfig.servers).length > 1 && !isIp) {
          ev.reply("已经添加多个服务器，需要指定服务器IP\n命令规则：palStatus [<服务器IP>]", undefined, true)
          return
        }
        else if (isIp && !Object.hasOwn(userConfig.servers, args[0])) {
          ev.reply("未添加此服务器IP", undefined, true)
          return
        }

        host = isIp ? args[0] : Object.keys(userConfig.servers).shift()!
        serverConfig = userConfig.servers[host]
      }
      else {
        return
      }

      if (!serverConfig.rcon) {
        ev.reply("该服务器未开启RCON", undefined, true)
        return
      }
      else if (!serverConfig.adminPassword) {
        ev.reply("未指定该服务器的管理员密码", undefined, true)
        return
      }
      else if (!serverConfig.rconPort) {
        ev.reply("未指定该服务器的RCON端口", undefined, true)
        return
      }
      this.rconClient.executeCommand(serverConfig.rconPort, host, serverConfig.adminPassword, "ShowPlayers", packetData => {
        const serverAliases: Config.ServerAliasConfig = config.getPluginData(this, "palworldServerAliases")
        const playerList = PalworldUtils.parsePlayerInfos(packetData.utf8)
        let message: string = `当前服务器“${Object.hasOwn(serverAliases, host) ? (serverAliases[host] + "（" + host + "）") : host}”信息：
当前玩家数：${playerList.length.toString()}
玩家列表：`
        playerList.forEach(playerInfo => {
          message += "\n" + playerInfo.name + "："
          message += "\n UID：" + playerInfo.uid
          message += "\n Steam ID：" + playerInfo.steamId
        });

        ev.reply(message, undefined, true)
      })
    })

    this.onCommand("palRcon", (ev, state, args) => {
      if (args.length == 0) {
        ev.reply("需要指定命令\n命令规则：palRcon [<服务器IP>] <命令内容>", undefined, true)
        return
      }

      const checkPermission = (ev: MessageEvent, host: string, isGroup: boolean = true) => {
        return ListenerUtils.comparePermission(isGroup ? (ev.client.getGroupMember(ev.groupId!, ev.userId)!.permission) : ev.client.friends[ev.userId].permission, ListenerEnum.Permission.admin) || 
        this.reportTargets.groups[ev.groupId!].servers[host].admins?.includes(ev.userId)
      }

      if (ev.messageType == EventEnum.MessageType.group) {
        const serverHosts = Object.keys(this.reportTargets.groups[ev.groupId!].servers)
        const isIp = isIP(args[0])
        if (isIp) {
          if (!serverHosts.includes(args[0])) {
            ev.reply("群聊未添加此服务器IP", undefined, true)
            return true
          }
          else if (!checkPermission(ev, args[0])) {
            ev.reply("你没有权限，仅超级用户、指定管理员、群主与群聊管理员才可以在群聊中执行RCON命令", undefined, true)
            return true
          }
        }
        
        if (serverHosts.length > 1) {
          if (isIp) {
            state.host = args.unshift()
          }
          state.command = args.join(" ")

          if (args.length < 2) {
            ev.reply("该群聊已经添加多个服务器，需要指定服务器IP。请提供服务器IP", undefined, true)
            return false
          }
        }
        else {
          if (isIp) {
            args.shift()
          }
          state.command = args.join(" ")
          state.host = serverHosts.shift()
          if (!checkPermission(ev, state.host)) {
            ev.reply("你没有权限，仅超级用户、指定管理员、群主与群聊管理员才可以在群聊中执行RCON命令")
            return true
          }
        }

        this.logger.info(JSON.stringify(state))
        this.executeRconCommand(ev, state.host, state.command)

        return true
      }
      else if (ev.messageType == EventEnum.MessageType.private) {
        const serverHosts = Object.keys(this.reportTargets.users[ev.userId!].servers)
        const isIp = isIP(args[0])
        if (isIp) {
          if (!serverHosts.includes(args[0])) {
            ev.reply("未添加此服务器IP", undefined, true)
            return true
          }
          else if (!checkPermission(ev, args[0], false)) {
            ev.reply("你没有权限，仅超级用户与指定管理员才可以执行RCON命令", undefined, true)
            return true
          }
        }
        
        if (serverHosts.length > 1) {
          if (isIp) {
            state.host = args.unshift()
          }
          state.command = args.join(" ")

          if (args.length < 2) {
            ev.reply("已经添加多个服务器，需要指定服务器IP。请提供服务器IP", undefined, true)
            return false
          }
        }
        else {
          if (isIp) {
            args.shift()
          }
          state.command = args.join(" ")
          state.host = serverHosts.shift()
          if (!checkPermission(ev, state.host, false)) {
            ev.reply("你没有权限，仅超级用户与指定管理员才可以执行RCON命令")
            return true
          }
        }

        this.logger.info(JSON.stringify(state))
        this.executeRconCommand(ev, state.host, state.command)

        return true
      }
    }, ["palworldRcon", "palCommand", "palworldCommand", "帕鲁_Rcon", "帕鲁_命令"], 50).receive("host", (ev, state) => {
      const content: string = ev.getPlainText().trim()
      if (isIP(content)) {
        state.host = content
        this.executeRconCommand(ev, state.host, state.command)
        return ListenerEnum.ReceiverReturn.finish
      }
      ev.reply("需要指定正确的IP地址，现在请报告IP地址", undefined, true)
      return ListenerEnum.ReceiverReturn.keep
    })
  }

  public executeRconCommand(ev: MessageEvent, host: string, command: string): void {
    let serverConfig!: Partial<Config.ServerItem>
    if (ev.messageType == EventEnum.MessageType.group) {
      serverConfig = this.reportTargets.groups[ev.groupId!].servers[host]
    }
    else if (ev.messageType == EventEnum.MessageType.private) {
      serverConfig = this.reportTargets.users[ev.userId].servers[host]
    }
    if (!serverConfig.rcon) {
      ev.reply("该服务器未开启RCON", undefined, true)
      return
    }
    else if (!serverConfig.adminPassword) {
      ev.reply("未指定该服务器的管理员密码", undefined, true)
      return
    }
    else if (!serverConfig.rconPort) {
      ev.reply("未指定该服务器的RCON端口", undefined, true)
      return
    }
    
    const serverAliases: Config.ServerAliasConfig = config.getPluginData(this, "palworldServerAliases")
    this.rconClient.executeCommand(serverConfig.rconPort, host, serverConfig.adminPassword, command, packetData => {
      ev.reply(`服务器RCON“${Object.hasOwn(serverAliases, host) ? (serverAliases[host] + "（" + host + "）") : host}”返回信息：\n${packetData.utf8}`, undefined, true)
    })
  }
}