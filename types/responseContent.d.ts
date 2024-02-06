import { MessageEnums } from "./enums"

export namespace ResponseContent {
  interface Message {
    server: string
    msgtype: MessageEnums.MessageType.normal
    data: {
      title: string
      content: string
    }
  }
}