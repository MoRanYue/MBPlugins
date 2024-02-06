import type { CustomEventEmitter } from "../../../types/CustomEventEmitter";
import type { DataType } from "../../../types/dataType";
import type { Rcon } from "./rcon";
import type { ResponseContent } from "./responseContent";
import type { Socket } from "net";

export namespace EventEmitter {
  interface WebHookServerEventEmitter extends CustomEventEmitter.CustomEventEmitter {
    on(eventName: "message", listener: (message: ResponseContent.Message) => void): this
    on(eventName: string | symbol, listener: DataType.AnyFunction): this

    once(eventName: "message", listener: (message: ResponseContent.Message) => void): this
    once(eventName: string | symbol, listener: DataType.AnyFunction): this

    emit(eventName: "message", message: ResponseContent.Message): boolean
    emit(eventName: string | symbol, ...args: any[]): boolean;
  }
  interface RconClientEventEmitter extends CustomEventEmitter.CustomEventEmitter {
    // on(eventName: "response", listener: (packetData: Rcon.PacketStructure, isAuthPacket: boolean) => void): this
    on(eventName: "connect", listener: (socket: Socket) => void): this
    on(eventName: string | symbol, listener: DataType.AnyFunction): this

    // once(eventName: "response", listener: (packetData: Rcon.PacketStructure, isAuthPacket: boolean) => void): this
    once(eventName: "connect", listener: (socket: Socket) => void): this
    once(eventName: string | symbol, listener: DataType.AnyFunction): this

    // emit(eventName: "response", packetData: Rcon.PacketStructure, isAuthPacket: boolean): boolean
    emit(eventName: "connect", socket: Socket): boolean
    emit(eventName: string | symbol, ...args: any[]): boolean;
  }
}