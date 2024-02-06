import { RconEnums } from "./enums"

export namespace Rcon {
  interface PacketStructure {
    size: number
    id: number
    type: RconEnums.PacketType
    body: string
  }

  type ResponsePacketFunc = (packetData: Rcon.PacketStructure & { utf8: string }) => void | Promise<void>
}