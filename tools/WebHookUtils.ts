import type { IncomingMessage } from "node:http";

export class WebHookUtils {
  public static getClientIp(req: IncomingMessage): string {
    const ip: Record<string, string | undefined> = {
      xRealIp: <string>req.headers['x-real-ip'],
      xForwardedFor: <string>req.headers['x-forwarded-for'],
      xForwarded: <string>req.headers['x-forwarded'],
      forwardedFor: <string>req.headers['forwarded-for'],
      forwarded: <string>req.headers['forwarded'],
      clientIp: <string>req.headers['client-ip'],
      remoteAddress: <string>req.socket.remoteAddress
    }
  
    return ip.xRealIp
    ?? ip.xForwardedFor?.split(/, */).shift() 
    ?? ip.xForwarded?.split(/, */).shift() 
    ?? ip.forwardedFor?.split(/, */).shift()
    ?? ip.forwarded?.split(/, */).shift()
    ?? ip.clientIp
    ?? ip.remoteAddress
    ?? '未知'
  }
}