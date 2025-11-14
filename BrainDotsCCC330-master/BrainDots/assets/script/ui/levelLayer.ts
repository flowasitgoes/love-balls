import { _decorator, Component } from 'cc';

import { clientEvent } from '../framework/clientEvent';
import { Constant } from '../framework/constant';


const { ccclass, property } = _decorator;

@ccclass('LevelLayer')
export class LevelLayer extends Component {
    onLoad() {
        clientEvent.on(Constant.EVENT_TYPE.ShowOrHideLevel, this._evtShowOrHideLevel, this);
    }

    private _evtShowOrHideLevel(option: number, levelName: string) {
        let layout = this.node.getChildByName('Layout');
        let childs = layout.children;
        if (option == Constant.ShowHideLevel.showAll) {
            for (let i = 0; i < childs.length; i++) {
                childs[i].active = true;
            }
        }
        else if (option == Constant.ShowHideLevel.hide) {
            for (let i = 0; i < childs.length; i++) {
                if (childs[i].name == levelName) {
                    childs[i].active = true;
                }
                else {
                    childs[i].active = false;
                }
            }
        }
    }

    onDestroy() {
        clientEvent.off(Constant.EVENT_TYPE.ShowOrHideLevel, this._evtShowOrHideLevel, this);
    }
}

