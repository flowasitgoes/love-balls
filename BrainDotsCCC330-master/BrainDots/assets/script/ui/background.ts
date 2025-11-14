import { _decorator, Component, Graphics, PhysicsSystem2D, Prefab, UITransformComponent, Vec3 } from 'cc';


const { ccclass, property } = _decorator;

 
@ccclass('Background')
export class Background extends Component {
    @property(Number)
    debug:number = 0;
    
    private _uiTransform:UITransformComponent = undefined;
    
    private _isTouchMoving:boolean = false;
    
    private _startPos:Vec3 = null;

    private _drawNodePre:Prefab = null;
    
    onLoad(){
        this._drawBgLine();
        PhysicsSystem2D.instance.debugDrawFlags = this.debug;
    }

    private _drawBgLine(){
        let nd = this.node.getChildByName('draw');
        let gp = nd.getComponent(Graphics);
        gp.lineWidth = 2;
        for(let i = 0; i<30;i++){
            let yy = -400 +30*i;
            gp.moveTo(-500,yy);
            gp.lineTo(900,yy);
            gp.close();
            gp.stroke();
        }
        for(let i = 0; i<50;i++){
            let xx = -500 +30*i;
            gp.moveTo(xx,-400);
            gp.lineTo(xx,400);
            gp.close();
            gp.stroke();
        }
    }
}