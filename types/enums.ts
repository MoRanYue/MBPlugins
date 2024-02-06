export namespace MessageEnums {
  export enum MessageType {
    normal = "normal"
  }
  export enum MessageTitle {
    test = "测试标题",
    SuccessfulToStartServer = "服务端启动成功",
    failedToStartServer = "服务端启动失败",
    saveBackupHasCreated = "存档备份",
    failedToSaveBackup = "存档备份失败",
    achievedMemoryThreshold = "内存达到警戒阈值",
    failedToExecuteRconCommand = "Rcon失败",
    playerHasJoined = "玩家加入游戏",
    playerHasLeft = "玩家离开游戏",
    onlinePlayerStatistics = "在线玩家统计"
  }
}

export namespace RconEnums {
  export enum PacketType {
    auth = 3,
    communicating = 2,
    responseValue = 0
  }
}