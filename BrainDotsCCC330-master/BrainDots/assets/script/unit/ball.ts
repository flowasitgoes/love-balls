import { _decorator, CircleCollider2D, Collider2D, Component, Contact2DType, RigidBody2D, Vec3 } from 'cc';

import { clientEvent } from '../framework/clientEvent';
import { Constant } from '../framework/constant';
import { addRigidbody2d } from '../net/util';


const { ccclass, property } = _decorator;


@ccclass('Ball')
export class Ball extends Component {
    private _circleCollider: CircleCollider2D = null;
    private _isOutPlace = false;
    private _originPos: Vec3 = null;
    onLoad() {
        this._originPos = this.node.getPosition();
        clientEvent.on(Constant.EVENT_TYPE.AddPhysices, this._evtAddPhysices, this);
        clientEvent.on(Constant.EVENT_TYPE.AwakePhysices, this._evtAwakePhysices, this);
        clientEvent.on(Constant.EVENT_TYPE.SleepPhysices, this._evtSleepPhysices, this);
        clientEvent.on(Constant.EVENT_TYPE.Replay, this._evtReplay, this);

    }
    /**
     * 添加刚体和碰撞起
     */
    private _evtAddPhysices() {
        this._addPhisicComponent();
    }

    /**
     * 唤醒刚体
     */
    private _evtAwakePhysices() {
        if (this.node.getComponent(RigidBody2D)) {
            this.node.getComponent(RigidBody2D).wakeUp();
        }
    }

    /**
     * 移除刚体
     */
    private async _evtSleepPhysices() {
        await this._removePhysicesComponent();
    }

    /**
     * 重玩
     */
    private async _evtReplay() {
        await this._removePhysicesComponent();
        this._addPhisicComponent();
    }

    /**
     * 物理碰撞回掉
     * @param other 
     * @param self 
     */
    onBeginContact(other: Collider2D, self: Collider2D) {
        if (!this.node.active) return;
        if (this._isOutPlace) return;
        if ((other.node.name == 'ball1' && self.node.name == 'ball2') || (self.node.name == 'ball1' && other.node.name == 'ball2')) {
            this._isOutPlace = true;
            this.node.getComponent(RigidBody2D).enabledContactListener = false;
            clientEvent.dispatchEvent(Constant.EVENT_TYPE.OverLevel);//过关
        }
    }

    //检测是否超出边界
    update() {
        if (this._isOutPlace) return;
        let pos = this.node.getPosition();
        if (pos.x > 510 || pos.x < -510 || pos.y < - 370) {
            this._isOutPlace = true;
            clientEvent.dispatchEvent(Constant.EVENT_TYPE.GameOver);
        }
    }

    /**
     * 添加刚体和碰撞器
     * @param g 
     * @param listPos 
     */
    private _addPhisicComponent() {
        this.node.setPosition(this._originPos);
        //加刚体
        if (!this.node.getComponent(RigidBody2D)) {
            addRigidbody2d(this.node, false);
        }

        //加碰撞器
        if (!this.node.getComponent(CircleCollider2D)) {
            this.node.addComponent(CircleCollider2D);
            let bc = this.node.getComponent(CircleCollider2D);
            bc.radius = 28;
            bc.density = 1;
            bc.friction = 0.8;
            bc.restitution = 0.5;
            bc.apply();
            //监听物理碰撞事件
            bc.on(Contact2DType.BEGIN_CONTACT, this.onBeginContact.bind(this), this);
        }
        this._isOutPlace = false;
    }

    /**
     * 移除刚体和碰撞器
     */
    private async _removePhysicesComponent() {
        return new Promise(resolve => {
            if (this.node.getComponent(RigidBody2D)) {
                this.node.getComponent(RigidBody2D).destroy();
            }
            if (this.node.getComponent(CircleCollider2D)) {
                this.node.getComponent(CircleCollider2D).destroy();
            }
            resolve(null);
        });
    }

    onDestroy() {
        clientEvent.off(Constant.EVENT_TYPE.AwakePhysices, this._evtAwakePhysices, this);
        clientEvent.off(Constant.EVENT_TYPE.SleepPhysices, this._evtSleepPhysices, this);
        clientEvent.off(Constant.EVENT_TYPE.AddPhysices, this._evtAddPhysices, this);
        clientEvent.off(Constant.EVENT_TYPE.Replay, this._evtReplay, this);
    }
}


