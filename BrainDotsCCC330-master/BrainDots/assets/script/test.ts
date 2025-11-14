import { _decorator, Collider2D, Component, Contact2DType } from 'cc';


const { ccclass, property } = _decorator;

@ccclass('Test')
export class Test extends Component {
    onLoad() {
        let bc = this.node.getComponent(Collider2D);
        bc.on(Contact2DType.BEGIN_CONTACT, () => { console.log('concat') }, this);
        bc.on(Contact2DType.END_CONTACT, () => { console.log('concat') }, this);
        bc.on(Contact2DType.PRE_SOLVE, () => { console.log('concat') }, this);
        bc.on(Contact2DType.POST_SOLVE, () => { console.log('concat') }, this);
    }
}

