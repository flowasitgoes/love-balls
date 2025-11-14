import { ERigidBody2DType, Node, RigidBody2D, Vec3 } from 'cc';

export enum IpType {
    local = 0,
    remote = 1
}

export enum ServerType {
    connectorServer = 100,
    gameServer = 101,
    userServer = 102,
}

export enum ServerPort {
    gameServer = 9000,
    userServer = 9001,
    connector = 8999,
}

export function getIp(type: number): string {
    if (type == IpType.local) {
        return "ws://192.168.0.192:9000/ws";
        // return "ws://192.168.0.192:8999/ws";
        // return "ws://192.168.0.192:8089/ws";
    }
    else if (type == IpType.remote) {
        return "ws://139.199.80.239:9000/ws"
    }
    return "";
}

/**
 * 将V3 Math.floor
 * @param v3 
 */
export function unitVec3(v3: Vec3): Vec3 {
    let re: Vec3 = new Vec3(Math.floor(v3.x), Math.floor(v3.y), Math.floor(v3.z));
    return re;
}


/**
 * 复制Vec3数组
 * @param arr 
 * @returns Vec3[]
 */
export function copyVec3Array(arr: any[]) {
    let copy: any[] = [];
    for (let i = 0; i < arr.length; i++) {
        let v3 = new Vec3(arr[i].x, arr[i].y, arr[i].z);
        copy.push(v3);
    }
    return copy;
}

/**
 * 加2d刚体
 * @param node 
 */
export function addRigidbody2d(node: Node, isAwake: boolean) {
    //加刚体
    if (!node.getComponent(RigidBody2D)) {
        node.addComponent(RigidBody2D)
        let rb = node.getComponent(RigidBody2D);
        rb.gravityScale = 0.5;
        rb.enabledContactListener = true;
        rb.type = ERigidBody2DType.Dynamic;
        rb.sleep();
        if (isAwake) {
            rb.wakeUp();
        }
    }
}
