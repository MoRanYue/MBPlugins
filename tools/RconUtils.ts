import { RconEnums } from "../types/enums";
import type { Rcon } from "../types/rcon";

export class RconUtils {
  public static constructPacket(type: RconEnums.PacketType, id: number, body: string): Buffer {
    const size = Buffer.byteLength(body) + 14

    const buf = Buffer.alloc(size)
    buf.writeInt32LE(size - 4, 0)
    buf.writeInt32LE(id, 4)
    buf.writeInt32LE(type, 8)
    
    buf.write(body, 12, size - 2, "ascii")
    buf.writeInt16LE(0, size - 2)

    return buf
  }

  public static parsePacket(buf: Buffer): Rcon.PacketStructure & { utf8: string } {
    return {
      size: buf.readInt32LE(0),
      id: buf.readInt32LE(4),
      type: buf.readInt32LE(8),
      body: buf.toString("ascii", 12, buf.length - 2),
      utf8: buf.toString("utf-8", 12, buf.length - 2)
    }
  }
}