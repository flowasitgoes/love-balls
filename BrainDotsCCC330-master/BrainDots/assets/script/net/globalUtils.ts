
/**
 * 消息格式
 */
export interface ModelAny {
    code?: number,
    msg?: any,
    err?: any,
}

/**
 * 协议头信息
 */
export interface Head {
    /* 唯一标示id */
    id: number,
    /* 服务器类型 */
    serverType: number,
    router: string,
}
