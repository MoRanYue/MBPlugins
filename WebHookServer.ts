import http from "node:http"
import type { EventEmitter } from "./types/eventEmitter"
import { WebHookUtils } from "./tools/WebHookUtils"
import { Logger } from "../../tools/Logger"
import { CustomEventEmitter } from "../../tools/CustomEventEmitter"
import { Utils } from "../../tools/Utils"
import type { ResponseContent } from "./types/responseContent"
import { MessageEnums } from "./types/enums"

export class WebHookServer {
  private server?: http.Server
  private logger: Logger = new Logger("幻兽帕鲁服务器←WebHook服务器")
  public ev: EventEmitter.WebHookServerEventEmitter = new CustomEventEmitter()

  public startServer(port: number, host?: string, cb?: () => void | Promise<void>): this {
    if (this.server) {
      this.stopServer()
    }

    this.server = http.createServer()

    this.server.on("request", async (req, res) => {
      const clientIp: string = WebHookUtils.getClientIp(req)
      this.logger.debug(`接收到来自“${clientIp}”的消息`)

      let data: string = ""
      req.on("data", chunk => data += chunk)
      req.on("error", err => {
        if (err) {
          this.logger.error(`在接收“${clientIp}”的数据时出现错误`)
          this.logger.error(err)
        }
      })
      req.on("end", () => {
        const result: ResponseContent.Message = Utils.jsonToData(data)
        result.server = clientIp

        let messageType: string = result.msgtype
        if (messageType == MessageEnums.MessageType.normal) {
          messageType = "普通"
        }
        this.logger.debug(`消息类型：${messageType}`)
        this.logger.debug("消息内容：")
        this.logger.debug(`标题：${result.data.title}`)
        this.logger.debug(`内容：${result.data.content}`)

        this.ev.emit("message", result)
      })
      
    })
    this.server.on("error", err => {
      if (err) {
        this.logger.error("服务端出现错误")
        this.logger.error(err)
      }
    })

    this.server.listen(port, host, cb)

    return this
  }
  public stopServer(cb?: () => void | Promise<void>): void {
    if (!this.server) {
      return
    }

    this.server.close(err => {
      if (err) {
        this.logger.error("关闭服务器时出现错误")
        this.logger.error(err)
        return
      }
      
      if (cb) {
        cb
      }
      this.server = undefined
    })
  }
}