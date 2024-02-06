import net from "node:net"
import { RconUtils } from "./tools/RconUtils"
import { Utils } from "../../tools/Utils"
import { Logger } from "../../tools/Logger"
import { RconEnums } from "./types/enums"
import type { Rcon } from "./types/rcon"
import type { EventEmitter } from "./types/eventEmitter"
import { CustomEventEmitter } from "../../tools/CustomEventEmitter"

export class RconClient {
  protected servers: Record<string, { socket: net.Socket, auth: boolean, authPacketId: number, requestSendingTime: number }> = {}
  protected logger: Logger = new Logger("幻兽帕鲁服务器←RCON客户端")
  public ev: EventEmitter.RconClientEventEmitter = new CustomEventEmitter()
  protected packetCbs: Record<number, Rcon.ResponsePacketFunc> = {}

  public authTimeout: number = 5000

  public connect(port: number, host: string, adminPassword: string): this {
    const socket = net.createConnection({
      host,
      port,
      keepAlive: true
    })
    socket.on("connect", () => {
      const address = Utils.showHostWithPort(socket.remoteAddress, socket.remotePort)
      this.logger.success(`成功与服务器“${address}”建立RCON连接`)
      this.servers[address] = {
        socket,
        auth: false,
        // 进行验证
        authPacketId: this.sendPacket(socket, RconEnums.PacketType.auth, adminPassword)[1],
        requestSendingTime: Utils.getCurrentTimestamp()
      }

      setTimeout(() => {
        if (!this.servers[address].auth) {
          this.logger.error(`发送至服务器“${address}”的验证请求超时`)
        }
      }, this.authTimeout)
    })
    socket.on("data", data => {
      const packetData = RconUtils.parsePacket(data)

      const address = Utils.showHostWithPort(socket.remoteAddress, socket.remotePort)
      this.logger.debug(`接收到来自“${address}”数据包`)
      this.logger.debug(`长度：${packetData.size}`)
      this.logger.debug(`ID：${packetData.id}`)
      this.logger.debug(`类型：${packetData.type}`)
      this.logger.debug(`内容：${packetData.body}`)
      this.logger.debug(`UTF-8内容：${packetData.utf8}`)

      if (packetData.type == RconEnums.PacketType.communicating && !this.servers[address].auth) {
        if (packetData.id == this.servers[address].authPacketId) {
          this.servers[address].auth = true
          this.logger.success(`成功通过服务器“${address}”的密码验证`)
          this.ev.emit("connect", socket)
        }
        else {
          this.logger.warning(`与服务器“${address}”的密码验证失败，请检查管理员密码是否正确`)
          socket.end()
        }
      }
      else if (packetData.type == RconEnums.PacketType.responseValue) {
        if (this.servers[address].auth) {
          if (Object.hasOwn(this.packetCbs, packetData.id)) {
            this.packetCbs[packetData.id](packetData)
            delete this.packetCbs[packetData.id]
          }
          return
        }

        this.logger.info("成功接收到测试数据包")
      }
    })
    socket.on("error", err => {
      if (err) {
        this.logger.error(`与服务器“${Utils.showHostWithPort(socket.remoteAddress, socket.remotePort)}”通讯时出现错误`)
        this.logger.error(err)
      }
    })
    socket.on("close", () => {
      const address = Utils.showHostWithPort(socket.remoteAddress, socket.remotePort)
      this.logger.info(`与服务器“${address}”断开连接`)
      delete this.servers[address]
    })

    return this
  }

  private sendPacket(socket: net.Socket, type: RconEnums.PacketType, body: string, cb?: Rcon.ResponsePacketFunc): [boolean, number] {
    const id = Utils.randomInt(0, 2147483647)
    if (cb) {
      this.packetCbs[id] = cb
    }
    return [
      socket.write(RconUtils.constructPacket(type, id, body)),
      id
    ]
  }

  public executeCommand(port: number, host: string, adminPassword: string, command: string, cb?: Rcon.ResponsePacketFunc): [boolean, number] | undefined {
    const address = Utils.showHostWithPort(host, port)
    if (!Object.hasOwn(this.servers, address)) {
      this.connect(port, host, adminPassword)
      this.ev.once("connect", () => this.executeCommand(port, host, adminPassword, command, cb))
      return
    }
    return this.sendPacket(this.servers[address].socket, RconEnums.PacketType.communicating, command, cb)
  }
}