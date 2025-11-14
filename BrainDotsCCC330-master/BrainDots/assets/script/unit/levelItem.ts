import {
    _decorator,
    BoxCollider2D,
    Component,
    ERigidBody2DType,
    Graphics,
    instantiate,
    Label,
    Node,
    PolygonCollider2D,
    Prefab,
    RigidBody2D,
    tween,
    UITransformComponent,
    v2,
    v3,
    Vec2,
    Vec3,
} from 'cc';

import { DrawManager } from '../draw/drawManager';
import { clientEvent } from '../framework/clientEvent';
import { Constant } from '../framework/constant';


const { ccclass, property } = _decorator;


@ccclass('LevelItem')
export class LevelItem extends Component {
    private _btnNode: Node = null;
    private _tagNode: Node = null;
    private _resultNode: Node = null;
    private _uiTransform: UITransformComponent = undefined;
    private _drawNode: Node = null;//画线的节点
    private _linePre: Prefab = null;//画线预制体
    private _balldot: Prefab = null;//点预制体
    private _isTouchMoving: boolean = false;
    private _startPos: Vec3 = null;
    private _posList: Vec2[] = [];//画线，线上的点
    private _drawParent: Node = null;//线条的parent节点
    private _isStart: boolean = false;
    private _isAddedPhysices: boolean = false;
    private _originPos: Vec3 = null;
    private _isOverLevel: boolean = false; //过关
    private _isGameOver: boolean = false; //失败
    private _isWined: boolean = false; //过关
    private _isFirstLine: boolean = false;//画的第一条线

    onLoad() {
        this._originPos = this.node.getPosition();
        this._drawBgLine();
        this._uiTransform = this.node.getComponent(UITransformComponent);
        this.node.on(Node.EventType.TOUCH_START, this._touchStart, this);
        this.node.on(Node.EventType.TOUCH_MOVE, this._touchMove, this);
        this.node.on(Node.EventType.TOUCH_END, this._touchEnd, this);
        this.node.on(Node.EventType.TOUCH_CANCEL, this._touchEnd, this);
        clientEvent.on(Constant.EVENT_TYPE.OverLevel, this._evtOverLevel, this);
        clientEvent.on(Constant.EVENT_TYPE.GameOver, this._evtGameOver, this);
        this._init();
    }

    private _init() {
        this._drawParent = new Node();
        this.node.addChild(this._drawParent);
        this._btnNode = this.node.getChildByName('btn');
        this._tagNode = this.node.getChildByName('taglv');
        this._resultNode = this.node.getChildByName('result');
        this._tagNode.getChildByName('level').getComponent(Label).string = this.node.name.substr(this.node.name.length - 1, 1);
        this._tagNode.getChildByName('gou').active = this._isWined;
        this._btnNode.active = false;
        this._resultNode.active = false;
    }

    /**
     * 开始游戏
     * @returns 
     */
    private _startGame() {
        if (this._isStart) return;
        this._isStart = true;
        this._isGameOver = false;
        this._isOverLevel = false;
        this._resultNode.active = false
        clientEvent.dispatchEvent(Constant.EVENT_TYPE.ShowOrHideLevel, Constant.ShowHideLevel.hide, this.node.name);
        this._drawParent.removeAllChildren();
        tween(this.node).to(1, { scale: new Vec3(1, 1, 1), position: new Vec3(650) }).call(() => {
            this._btnNode.active = true;
            this._tagNode.active = false;
            //添加刚体和碰撞器械
            clientEvent.dispatchEvent(Constant.EVENT_TYPE.AddPhysices);
            this._addWallPhysices();
        }).start();
    }

    private _touchStart(evt: any) {
        if (!this._isStart) {
            this._startGame();
            return;
        }
        if (!this._isAddedPhysices) return;
        if (this._isGameOver) return;
        if (this._isOverLevel) return;
        if (!this._linePre) {
            this._linePre = DrawManager.Inst.getUnitPre(Constant.resUnit.drawNode);
            if (!this._linePre) {
                return;
            }
        }
        // clientEvent.dispatchEvent(Constant.EVENT_TYPE.AwakePhysices);
        this._posList.splice(0);
        let touchPos = new Vec3(evt.getUILocation().x, evt.getUILocation().y);
        let pos: Vec3 = this._uiTransform.convertToNodeSpaceAR(touchPos);
        this._startPos = pos;
        this._startPos = pos;
        let node = instantiate(this._linePre);
        this._drawNode = node;
        this._drawParent.addChild(this._drawNode);
        this._posList.push(this._getV2Pos(pos));
    }

    private _tempPos = null;
    private _touchMove(evt: any) {
        if (!this._isAddedPhysices) return;
        if (this._isGameOver) return;
        if (this._isOverLevel) return;
        if (!this._linePre || !this._drawNode) return;
        this._isTouchMoving = true;
        let touchPos = new Vec3(evt.getUILocation().x, evt.getUILocation().y);
        let pos: Vec3 = this._uiTransform.convertToNodeSpaceAR(touchPos);
        if (!this._tempPos) {
            this._tempPos = pos;
        }
        else {
            let distance = Vec2.distance(this._tempPos, pos);
            //忽略掉相隔太近的点
            if (distance >= 5) {
                distance = this._jugement(pos);
                if (distance >= 5) {
                    this._posList.push(this._getV2Pos(pos));
                    this._tempPos = pos;
                }
            }
        }
        //画线
        let g = this._drawNode.getComponent(Graphics);
        g.strokeColor.fromHEX('#ff0000');
        g.moveTo(this._startPos.x, this._startPos.y);
        g.lineTo(pos.x, pos.y);
        g.close();
        g.stroke();
        this._startPos = pos;
    }

    private async _touchEnd(evt: any) {
        if (!this._isAddedPhysices) return;
        if (this._isGameOver) return;
        if (this._isOverLevel) return;
        if (!this._linePre) return;
        let touchPos = new Vec3(evt.getUILocation().x, evt.getUILocation().y);
        let pos: Vec3 = this._uiTransform.convertToNodeSpaceAR(touchPos);
        //没有画线，打点
        if (!this._isTouchMoving) {
            if (!this._balldot) {
                this._balldot = DrawManager.Inst.getUnitPre(Constant.resUnit.balldot);
                if (!this._balldot) {
                    return;
                }
            }
            let dt = instantiate(this._balldot);
            dt.setPosition(pos);
            this._drawParent.addChild(dt);
            return;
        }
        this._isTouchMoving = false;
        this._posList = DrawManager.Inst.handlePointList(this._posList);
        this._addPhysices();
    }

    /**
     * 添加物理属性
     */
    private _addPhysices() {
        try {
            this._addPhisicComponent(this._drawNode);
        } catch (error) {
            try {
                this._deleteDuplicatesAll();
                this._addPhisicComponent(this._drawNode);
            }
            catch (error) {
                console.log(error);
                this._drawNode.destroy();
                return;
            }
        }
        if (!this._isFirstLine) {
            clientEvent.dispatchEvent(Constant.EVENT_TYPE.AwakePhysices);
            this._isFirstLine = true;
        }
    }

    /**
     * 添加刚体和碰撞器
     * @param g 
     * @param listPos 
     */
    private _addPhisicComponent(g: Node) {
        //加刚体
        if (!g.getComponent(RigidBody2D)) {
            g.addComponent(RigidBody2D)
            let rb = g.getComponent(RigidBody2D);
            rb.gravityScale = 1;
            rb.type = ERigidBody2DType.Dynamic;
            rb.wakeUp();
        }

        //加碰撞器
        if (!g.addComponent(PolygonCollider2D)) {
            g.addComponent(PolygonCollider2D);
        }
        let bc = g.getComponent(PolygonCollider2D);
        bc.density = 1;
        bc.friction = 0.1;
        bc.restitution = 0.5;
        if (this._posList.length < 3 && this._posList.length > 0) {
            let dis = 3;
            let pos = this._posList[0];
            //画太短，加个默认的形状
            bc.points = [
                v2(pos.x - dis, pos.y + dis),
                v2(pos.x + dis, pos.y + dis),
                v2(pos.x + dis, pos.y - dis),
                v2(pos.x - dis, pos.y - dis),
            ]
        }
        else {
            bc.points = this._posList;
        }
        bc.apply();
    }

    /**
     * Vec3 -> Vec2
     * @param pos 
     * @returns 
     */
    private _getV2Pos(pos: Vec3) {
        return v2(pos.x, pos.y);
    }

    /**
   * 测距
   * @param pos 
   * @returns 
   */
    private _jugement(pos: Vec3) {
        let distance = 100;
        for (let i = 0; i < this._posList.length; i++) {
            let dis = Vec2.distance(pos, v3(this._posList[i].x, this._posList[i].y));
            distance = dis < distance ? dis : distance;
        }
        return distance;
    }

    /**
      * 检测每个点与其他点的距离，太小的移除掉
      * @param temp 
      */
    _deleteDuplicatesAll() {
        let temp = this._posList;
        let bool = true;
        do {
            let i = 0;
            let j = 0;
            lb:
            for (i = 0; i < temp.length - 1; i++) {
                for (j = i + 1; j < temp.length; j++) {
                    let distance = Vec3.distance(v3(temp[i].x, temp[i].y, 0), v3(temp[j].x, temp[j].y, 0));
                    if (distance < 10) {
                        temp.splice(j, 1);
                        bool = true;
                        break lb;
                    }
                }
            }
            if (i == temp.length - 1) bool = false;
            if (temp.length <= 1) bool = false;
        }
        while (bool);
    }

    /**
      * 画背景网格线条
      */
    private _drawBgLine() {
        let nd = this.node.getChildByName('draw');
        let gp = nd.getComponent(Graphics);
        gp.lineWidth = 2;
        for (let i = 0; i < 30; i++) {
            let yy = -400 + 30 * i;
            gp.moveTo(-600, yy);
            gp.lineTo(900, yy);
            gp.close();
            gp.stroke();
        }
        for (let i = 0; i < 50; i++) {
            let xx = -600 + 30 * i;
            gp.moveTo(xx, -400);
            gp.lineTo(xx, 400);
            gp.close();
            gp.stroke();
        }
    }

    private _addWallPhysices() {
        let walls = this.node.getChildByName('wall').children;
        for (let i = 0; i < walls.length; i++) {
            let item = walls[i];
            item.addComponent(RigidBody2D)
            let rb = item.getComponent(RigidBody2D);
            rb.type = ERigidBody2DType.Static;
            item.addComponent(BoxCollider2D);
            let cl = item.getComponent(BoxCollider2D);
            cl.size.set(100, 50)
            cl.friction = 0.2;
            cl.restitution = 0.1;
            cl.apply();
        }
        this._isAddedPhysices = true;
    }
    private _reMoveWallPhysices() {
        let walls = this.node.getChildByName('wall').children;
        for (let i = 0; i < walls.length; i++) {
            let item = walls[i];
            if (item.getComponent(RigidBody2D)) {
                item.getComponent(RigidBody2D).destroy();
            }
            if (item.getComponent(BoxCollider2D)) {
                item.getComponent(BoxCollider2D).destroy();
            }
        }
    }

    /**
     * 按钮事件
     * @param evt 
     * @param info 
     */
    handleButtonEvent(evt: any, info: string) {
        if (info == "0") {//返回
            this._btnNode.active = false;
            this._tagNode.active = true;
            this._removePhysicesAndCollider();
            tween(this.node).to(1, { scale: new Vec3(0.3, 0.3, 0.3), position: this._originPos }).call(() => {
                this._isStart = false;
                this._isFirstLine = false;
                this._isGameOver = false;
                this._isOverLevel = false;
                clientEvent.dispatchEvent(Constant.EVENT_TYPE.ShowOrHideLevel, Constant.ShowHideLevel.showAll);
            }).start();
        }
        else {//刷新
            this._isGameOver = false;
            this._isOverLevel = false;
            this._drawParent.removeAllChildren();
            clientEvent.dispatchEvent(Constant.EVENT_TYPE.Replay);
            // this._reMoveWallPhysices();
            // this._addWallPhysices();
            this._isFirstLine = false;
            this._resultNode.active = false;
        }
    }

    /**
     * 移除刚体和碰撞器
     */
    private _removePhysicesAndCollider() {
        console.log('remove');
        setTimeout(() => {
            this._isAddedPhysices = false;
            clientEvent.dispatchEvent(Constant.EVENT_TYPE.SleepPhysices);

            let walls = this.node.getChildByName('wall').children;
            for (let i = 0; i < walls.length; i++) {
                let item = walls[i];
                if (item.getComponent(RigidBody2D)) {
                    item.getComponent(RigidBody2D).destroy();
                }
                if (item.getComponent(BoxCollider2D)) {
                    item.getComponent(BoxCollider2D).destroy();
                }
            }


            let child = this._drawParent.children;
            for (let i = 0; i < child.length; i++) {
                let rigidbody: RigidBody2D = child[i].getComponent(RigidBody2D);
                let collider: PolygonCollider2D = child[i].getComponent(PolygonCollider2D);
                if (rigidbody) {
                    child[i].getComponent(RigidBody2D).destroy();
                }
                if (collider) {
                    child[i].getComponent(PolygonCollider2D).destroy();
                }
            }
        }, 10);
    }

    /**
     * 过关
     */
    private _evtOverLevel() {
        if (!this.node.active) return;
        if (this._isOverLevel) return;
        this._isOverLevel = true;
        this._removePhysicesAndCollider();
        this._isWined = true;
        this._tagNode.getChildByName('gou').active = this._isWined;
        this._refreshResultInfo();
    }

    /**
     * 失败
     */
    private _evtGameOver() {
        if (this._isGameOver) return;
        this._removePhysicesAndCollider();
        this._isGameOver = true;
        if (this._isOverLevel) return;
        this._refreshResultInfo();
    }

    private _refreshResultInfo() {
        if (this.node.active)
            this._resultNode.active = true;
        if (this._isOverLevel) {
            this._resultNode.getChildByName('win').active = true;
            this._resultNode.getChildByName('lose').active = false;
        }
        if (this._isGameOver) {
            this._resultNode.getChildByName('win').active = false;
            this._resultNode.getChildByName('lose').active = true;
        }
    }

    onDestroy() {
        clientEvent.off(Constant.EVENT_TYPE.GameOver, this._evtGameOver, this);
        clientEvent.off(Constant.EVENT_TYPE.OverLevel, this._evtOverLevel, this);
    }
}